// @ts-check
const init = Date.now();
const path = require('path');
const fs = require('fs');
const xmlJs = require('xml-js');
const chalk = require('chalk');
const { parse, unparse } = require('papaparse');
const { tap, httpRequest, writeOutput, generateThirdPartyNoticeMarkdown, licenseMappings } = require('../utils');
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
    .sort((a, b) => a.artifactId.localeCompare(b.artifactId));
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
    const license = await readLicense(dep);
    dep.license = license || [];
  }
  return bom;
}

async function readLicense(dep) {
  const url = `https://repo.maven.apache.org/maven2/${dep.groupId.replace(/\./g, '/')}/${dep.artifactId}/${dep.version}/${dep.artifactId}-${dep.version}.pom`;
  const content = await httpRequest(url);
  let xml;
  try {
    xml = xmlJs.xml2js(content, { compact: true, trim: true, nativeType: false });
  } catch(e) {
    console.log(chalk.redBright(`Error in XML parsing. Please check https://mvnrepository.com/artifact/${dep.groupId}/${dep.artifactId}/${dep.version}`));
    return [];
  }
  let licenseList = xml['project'].licenses?.license;
  if(!Array.isArray(licenseList)) {
    licenseList = [ licenseList ];
  }
  const licenses = licenseList
    .filter(Boolean)
    .flatMap(l => ({licenseText: l.name._text, license: l.name._text.toUpperCase()}))
    .map(({licenseText, license}) => {
      const tmp = {licenseText, license: licenseMappings.reduce((acc, [key,el]) => (el.substitutions.indexOf(license) !== -1 && acc.push(key), acc), [])};
      if(!tmp.license.length) {
        tmp.license.push(license);
      }
      return tmp;
    })
    .filter(el => el.license)
    .flatMap(el => el.license);

  if(licenses.length) {
    return licenses;
  }
  console.log(chalk.redBright(`License data not found. Please check https://mvnrepository.com/artifact/${dep.groupId}/${dep.artifactId}/${dep.version}`));
  return [];
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
