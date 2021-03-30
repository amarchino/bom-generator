// @ts-check
const init = Date.now();
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { parse, unparse } = require('papaparse');
const { uniqBy, httpRequest, writeOutput, generateThirdPartyNoticeMarkdown, licenseMappings } = require('../utils');
const { papaConfig, basePath, projectName } = require('../configuration/config');

exports.execute = async () => {
  try {
    let bom = initBom();
    bom = delta(bom);
    bom = await populateVersionData(bom);
    const output = generateOutput(bom);
    writeOutput(basePath, output);
  } catch(e) {
    console.log(e);
  } finally {
    console.log(chalk.greenBright(`Elapsed time: ${Date.now() - init}ms`))
  }
};

/**
 * @returns {{name: string, type: 'dev' | 'prod', version: string, license: string, dependencies: string}[]}
 */
function initBom() {
  const folder = path.join(basePath, 'input', 'node', projectName);
  if(!fs.existsSync(folder)) {
    return [];
  }

  const packageLockDependencies = fs.readdirSync(folder)
    .filter(fn => fn.indexOf('-lock') !== -1)
    .map(fn => fs.readFileSync(path.join(folder, fn), {encoding: 'utf-8'}))
    .map(content => JSON.parse(content))
    .filter(obj => obj.dependencies)
    .flatMap(obj => Object.entries(obj.dependencies));

  const tmp = [
    // Get all runtime dependencies
    ...packageLockDependencies
      .filter(([, data]) => !data.dev)
      .map(([key, data]) => ({name: key, type: 'prod', ...data})),
    // Get only declared dev dependencies
    ...fs.readdirSync(folder)
      .filter(fn => fn.indexOf('-lock') === -1)
      .map(fn => fs.readFileSync(path.join(folder, fn), {encoding: 'utf-8'}))
      .map(content => JSON.parse(content))
      .filter(obj => obj.devDependencies)
      .flatMap(obj => Object.entries(obj.devDependencies))
      .map(([key]) => packageLockDependencies.find(([plkey]) => plkey === key))
      .map(([key, data]) => ({name: key, type: 'dev', elaborated: false, ...data}))
  ];
  return uniqBy(tmp, el => el.name).sort((a, b) => a.name.localeCompare(b.name));
}

function delta(bom) {
  const originalBomPath = path.join(basePath, 'output', 'csv', `BOM-${projectName}.csv`);
  if (!fs.existsSync(originalBomPath)) {
    return bom;
  }
  const originalBomFile = fs.readFileSync(originalBomPath, {encoding: 'utf-8'});
  const originalBomCSV = parse(originalBomFile, papaConfig).data;
  const originalBom = originalBomCSV.map(el => ({name: el['name*'], version: el['version*'], elaborated: true, license: el['license*'], dependencies: el.dependencies}));
  const delta = bom.filter(el => originalBom.every(l => l.name !== el.name));
  return [
    ...originalBom,
    ...delta
  ];
}

async function populateVersionData(bom) {
  let idx = 0;
  const deps = bom.filter(el => !el.elaborated);
  let total = deps.length;
  for(let dep of deps) {
    // E.g.: https://registry.npmjs.org/zone.js/0.10.2
    const index = (++idx + '').padStart(Math.floor(Math.log10(total)) + 1, ' ');
    console.log(`(${index}/${total}) Elaborating license for DEPENDENCY: "${chalk.redBright(dep.name)}", VERSION: "${chalk.greenBright(dep.version)}"`);
    const url = `https://registry.npmjs.org/${dep.name}`;
    const packageMetadata = await readPackageMetadata(url, dep.version);
    dep.license = packageMetadata.license;
    dep.dependencies = dep.type === 'prod' ? packageMetadata.dependencies : '';
  }
  return bom;
}

async function readPackageMetadata(baseUrl, version) {
  let content = await httpRequest(`${baseUrl}/${version}`);
  if (content && content.length) {
    return parseMetadata(JSON.parse(content));
  }
  // Fallback
  content = await httpRequest(baseUrl);
  const metadata = JSON.parse(content);
  const datum = Object.entries(metadata.versions || {})
    .find(el => el[0] === version);
  return parseMetadata(datum?.[1]);
}

function parseMetadata(metadata) {
  const dependenciesArray = Object.keys(metadata?.dependencies || {});
  const dependencies = dependenciesArray.length === 0
    ? ''
    : dependenciesArray.length === 1
      ? dependenciesArray[0]
      : dependenciesArray.join(',');
  const license = parseLicense(metadata?.license);
  return { license, dependencies };
}

function parseLicense(license) {
  if (typeof license !== 'string') {
    return license?.type || '';
  }
  return (license || '')
    .replace(/^\(?(.*?)\)?$/, '$1')
    .split(/ (?:AND|OR) /)
    .flatMap(lic => {
      const tmp = licenseMappings.reduce((acc, [key, el]) => (el.substitutions.indexOf(lic.toUpperCase()) !== -1 && acc.push(key), acc), []);
      if(!tmp || !tmp.length) {
        console.log(`Missing license ${lic}`)
      }
      return tmp;
    });
}

function generateOutput(bom) {
  bom.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  const csv = generateBomCsv(bom);
  console.log(chalk.cyanBright('BOM generated'));
  const markdown = generateThirdPartyNoticeMarkdown(bom, 'name', 'version')
  console.log(chalk.cyanBright('MARKDOWN generated'));
  return { csv, markdown };
}

function generateBomCsv(bom) {
  return unparse(bom.map(el => ({
    'name*': el.name,
    'version*': el.version,
    'license*': Array.isArray(el.license) ? el.license.join(',') : el.license,
    'vendor/community': '',
    'end-of-support': '',
    'dependencies': el.dependencies,
    'language': 'javascript'
  })), papaConfig);
}
