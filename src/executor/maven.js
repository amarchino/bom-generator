// @ts-check
const init = Date.now();
const path = require('path');
const fs = require('fs');
const xmlJs = require('xml-js');
const chalk = require('chalk');
const { JSDOM } = require('jsdom');
const { parse, unparse } = require('papaparse');
const { tap, uniqBy, httpRequest, writeOutput, generateThirdPartyNoticeMarkdown, licenseMappings } = require('../utils');
const { papaConfig, projectName, basePath } = require('../configuration/config');

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

function initBom() {
  const folder = path.join(basePath, 'input', 'maven', projectName);
  if(!fs.existsSync(folder)) {
    return [];
  }
  const projectGroupIds = {};

  const tmp = fs.readdirSync(folder)
    .filter(fn => path.extname(fn) === '.xml')
    .map(fn => fs.readFileSync(path.join(folder, fn), {encoding: 'utf-8'}))
    .map(content => xmlJs.xml2js(content, { compact: true, trim: true, nativeType: false}))
    .map(tap(el => projectGroupIds[el['project'].groupId._text] = true))
    .filter(obj => obj['project'].dependencyManagement?.dependencies)
    .flatMap(obj => obj['project'].dependencyManagement.dependencies.dependency)
    .map(obj => ({groupId: obj.groupId._text, artifactId: obj.artifactId._text, version: obj.version._text, elaborated: false}))
    .filter(dep => !projectGroupIds[dep.groupId])
    .map(dep => ({key: `${dep.groupId}$$$${dep.artifactId}$$$${dep.version}`, dep}))
    .reduce((acc, {key, dep}) => (acc[key] = dep, acc), {});
  return Object.values(tmp)
    .sort((a, b) => a.artifactId.localeCompare(b.artifactId))
    // .filter(e => e.groupId === 'org.apache.axis' && e.artifactId === 'axis')
    ;
}

function delta(bom) {
  const originalBomPath = path.join(basePath, 'output', 'csv', `BOM-${projectName}.csv`);
  if (!fs.existsSync(originalBomPath)) {
    return bom;
  }
  const originalBomFile = fs.readFileSync(originalBomPath, {encoding: 'utf-8'});
  const originalBomCSV = parse(originalBomFile, papaConfig).data;
  const originalBom = originalBomCSV.map(el => ({groupId: '', artifactId: el['name*'], version: el['version*'], elaborated: true, license: el['license*']}))
  const delta = bom.filter(el => originalBom.every(l => l.artifactId !== el.artifactId && l.version !== el.version));

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
    // E.g.: https://mvnrepository.com/artifact/javax.activation/javax.activation-api/1.2.0
    const index = (++idx + '').padStart(Math.floor(Math.log10(total)) + 1, ' ');
    console.log(`(${index}/${total}) Elaborating license for GROUP ID: "${chalk.redBright(dep.groupId)}", ARTIFACT ID: "${chalk.yellowBright(dep.artifactId)}", VERSION: "${chalk.greenBright(dep.version)}"`);
    const url = `https://mvnrepository.com/artifact/${dep.groupId}/${dep.artifactId}/${dep.version}`;
    let license = await readLicense(url);
    if(!license.license || !license.license.length) {
      const url = `https://mvnrepository.com/artifact/${dep.groupId}/${dep.artifactId}`;
      license = await readLicense(url);
    }
    dep.license = license.license || [];
    dep.licenseOther = license.other || [];

    if(!dep.license) {
      console.log(`WARNING! License not found!`);
    }
  }
  return bom;
}

async function readLicense(url) {
  let content = await httpRequest(url);
  const { document } = (new JSDOM(content)).window;
  const licenses = Array.from(document.querySelectorAll('table.grid'))
    .flatMap(el => Array.from(el.querySelectorAll('tr')))
    .filter(el => el.querySelector('th')?.innerHTML === 'License')
    .flatMap(el => Array.from(el.querySelectorAll('td > span') || []))
    .map(el => el.innerHTML);

  const others = Array.from(document.querySelectorAll('table.grid'))
    .filter(el => el.querySelector('th')?.innerHTML === 'License')
    .flatMap(el => Array.from(el.querySelectorAll('tbody td:first-child')))
    .map(el => el.innerHTML.replace(/\n/g, ' '));

  let returnedLicenses = [...others, ...licenses]
    .flatMap(l => ({licenseText: l, license: l.toUpperCase()}))
    .map(({licenseText, license}) => {
      const tmp = {licenseText, license: licenseMappings.reduce((acc, [key,el]) => (el.substitutions.indexOf(license) !== -1 && acc.push(key), acc), [])};
      if(!tmp.license.length) {
        console.log(chalk.redBright(`WARNING!!! License not found! ${licenseText}`));
      }
      return tmp;
    })
    .filter(el => el.license)
    .flatMap(el => el.license);

  return {
    license: uniqBy(returnedLicenses, el => el),
    other: uniqBy(others, el => el),
  };
}

function generateOutput(bom) {
  bom.sort((a, b) => a.artifactId.localeCompare(b.artifactId) || a.version.localeCompare(b.version));
  const csv = generateBomCsv(bom);
  console.log(chalk.cyanBright('BOM generated'));
  const markdown = generateThirdPartyNoticeMarkdown(bom, 'artifactId', 'version')
  console.log(chalk.cyanBright('MARKDOWN generated'));
  return { csv, markdown };
}

function generateBomCsv(bom) {
  return unparse(bom.map(el => ({
    'name*': el.artifactId,
    'version*': el.version,
    'license*': el.license,
    'vendor/community': '',
    'end-of-support': '',
    'dependencies': '',
    'language': 'java'
  })), papaConfig);
}
