// @ts-check
const init = Date.now();
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { parse, unparse } = require('papaparse');
const { uniqBy, httpRequest, writeOutput, generateThirdPartyNoticeMarkdown, licenseMappings } = require('../utils');
const { papaConfig, basePath } = require('../configuration/config');

exports.execute = async (projectName) => {
  try {
    let bom = initBom(projectName);
    bom = delta(projectName, bom);
    bom = await populateVersionData(bom);
    const output = generateOutput(bom);
    writeOutput(basePath, projectName, output);
  } catch(e) {
    console.log(e);
  } finally {
    console.log(chalk.greenBright(`Elapsed time: ${Date.now() - init} ms`))
  }
};

/**
 * @returns {{name: string, type: 'dev' | 'prod', version: string, license: string, dependencies: string}[]}
 */
function initBom(projectName) {
  const folder = path.join(basePath, 'input', 'node', projectName);
  if(!fs.existsSync(folder)) {
    return [];
  }
  const packageLockDependencies = fs.readdirSync(folder)
    .filter(fn => fn.indexOf('-lock') !== -1)
    .map(fn => fs.readFileSync(path.join(folder, fn), {encoding: 'utf-8'}))
    .map(content => JSON.parse(content))
    .flatMap(obj => parsePackageLock(obj));

  const tmp = [
    // Get all runtime dependencies
    ...packageLockDependencies
      .filter(([, data]) => !data.dev)
      .map(([key, data]) => ({name: key, type: 'prod', ...data})),
    // Get only declared dev dependencies
    ...packageLockDependencies
      .filter(([, data]) => !data.dev)
      .map(([key, data]) => ({name: key, type: 'dev', elaborated: false, ...data}))
  ];
  return uniqBy(tmp, el => el.name).sort((a, b) => a.name.localeCompare(b.name));
}

function parsePackageLock(obj) {
  if(obj.lockfileVersion === 1) {
    // Handle v1
    return Object.entries(obj.dependencies);
  }
  if(obj.lockfileVersion === 2) {
    // Handle v2
    return Object.entries(obj.packages)
      .filter(([name]) => name !== '')
      .map(([ name, dep ]) => [ name.replace(/^.*node_modules\//, ''), dep ]);
  }
  console.log(chalk.yellowBright(`Unknown lockfile version ${obj.lockfileVersion}`))
}

function delta(projectName, bom) {
  const originalBomPath = path.join(basePath, 'output', 'csv', `BOM-${projectName}.csv`);
  if (!fs.existsSync(originalBomPath)) {
    return bom;
  }
  const originalBomFile = fs.readFileSync(originalBomPath, {encoding: 'utf-8'});
  const originalBomCSV = parse(originalBomFile, papaConfig).data;
  const originalBom = originalBomCSV
    .map(el => ({name: el['name*'], version: el['version*'], elaborated: true, license: el['license*'], dependencies: el.dependencies}))
    .filter(el => bom.find(l => l.name === el.name));
  const delta = bom.filter(el => !originalBom.find(l => l.name === el.name));
  return [
    ...originalBom,
    ...delta
  ];
}

async function populateVersionData(bom) {
  let idx = 0;
  const deps = bom.filter(el => !el.elaborated);
  const total = deps.length;
  const padLength = Math.floor(Math.log10(total)) + 1;
  for(let dep of deps) {
    // E.g.: https://registry.npmjs.org/zone.js/0.10.2
    const index = (++idx + '').padStart(padLength, ' ');
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
  const license = parseLicense(metadata?.license || metadata?.licenses);
  return { license, dependencies };
}

function parseLicense(license) {
  if (Array.isArray(license)) {
    return license.flatMap(entry => parseLicense(entry));
  }
  if (typeof license !== 'string') {
    return parseLicense(license?.type || '');
  }
  return (license || '')
    .replace(/^\(?(.*?)\)?$/, '$1')
    .split(/ (?:AND|OR) /)
    .flatMap(lic => parseLicenseArray(lic));
}
function parseLicenseArray(lic) {
  const tmp = licenseMappings.reduce((acc, [key, el]) => (el.substitutions.indexOf(lic.toUpperCase()) !== -1 && acc.push(key), acc), []);
  if(!tmp || !tmp.length) {
    console.log(`  Missing license "${chalk.redBright(lic)}". Using read value`);
  }
  return tmp || lic;
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
