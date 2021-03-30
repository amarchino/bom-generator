// @ts-check
const init = Date.now();
const path = require('path');
const fs = require('fs');
const xmlJs = require('xml-js');
const chalk = require('chalk');
const { tap, uniqBy, httpRequest, writeOutput, generateThirdPartyNoticeMarkdown, licenseMappings } = require('../utils');
const { basePath, projectName } = require('../configuration/config');

initBom()
.then(bom => populateVersionData(bom))
.then(bom => generateCsv(bom))
.then(csv => writeCsv(csv))
.catch(e => console.error(e));

async function initBom() {
  const folder = path.join(basePath, 'input', 'ivy', projectName);
  if(!fs.existsSync(basePath)) {
    return [];
  }

  const tmp = fs.readdirSync(folder)
    .filter(fn => path.extname(fn) === '.xml')
    .map(fn => fs.readFileSync(path.join(folder, fn), {encoding: 'utf-8'}))
    .map(content => xmlJs.xml2js(content, { compact: true, trim: true, nativeType: false}))
    .filter(obj => obj['ivy-module'].dependencies?.dependency)
    .flatMap(obj => obj['ivy-module'].dependencies.dependency)
    .flatMap(dep => {
      if(dep.artifact) {
        const artifacts = Array.isArray(dep.artifact) ? dep.artifact : [ dep.artifact ];
        return artifacts.map(ar => ({
          org: dep._attributes.org,
          name: dep._attributes.name,
          rev: dep._attributes.rev,
          artifact: ar._attributes.name
        }));
      }
      return [{
        org: dep._attributes.org,
        name: dep._attributes.name,
        rev: dep._attributes.rev
      }];
    })
    // .flatMap(obj => obj['project'].dependencyManagement.dependencies.dependency)
    // .map(obj => ({groupId: obj.groupId._text, artifactId: obj.artifactId._text, version: obj.version._text, elaborated: false}))
    // .filter(dep => !projectGroupIds[dep.groupId])
    // .map(dep => ({key: `${dep.groupId}$$$${dep.artifactId}$$$${dep.version}`, dep}))
    // .reduce((acc, {key, dep}) => (acc[key] = dep, acc), {});
    .forEach(el => console.log(el))
    ;

  console.log(tmp);
  return [];
  // if(!fs.existsSync(path.join(basePath, 'ivy'))) {
  //   return [];
  // }

  // const tmp = fs.readdirSync(path.join(basePath, 'ivy'))
  //   .filter(fn => path.extname(fn) === '.xml')
  //   .map(fn => fs.readFileSync(path.join(basePath, 'ivy', fn), {encoding: 'utf-8'}))
  //   .map(content => xmlJs.xml2js(content, { compact: true, trim: true, nativeType: false}))
  //   .filter(obj => obj['ivy-module']?.dependencies?.dependency)
  //   .flatMap(obj => obj['ivy-module'].dependencies.dependency)
  //   // .map(obj => ({groupId: obj.groupId._text, artifactId: obj.artifactId._text, version: obj.version._text}))
  //   .filter(dep => dep._attributes.name.indexOf('siac-') === -1)
  //   // .map(dep => ({key: `${dep.groupId}$$$${dep.artifactId}$$$${dep.version}`, dep}))
  //   // .reduce((acc, {key, dep}) => (acc[key] = dep, acc), {});
  // log(tmp);
  // return [];
  // return Object.values(tmp)
  //   .sort((a, b) => a.artifactId.localeCompare(b.artifactId))
}
async function populateVersionData(bom) {
  return bom;
  for(let dep of bom) {
    // E.g.: https://mvnrepository.com/artifact/javax.activation/javax.activation-api/1.2.0
    console.log(`Elaborating license for GROUP ID: "${dep.groupId}", ARTIFACT ID: "${dep.artifactId}", VERSION: "${dep.version}"`);
    const url = `https://mvnrepository.com/artifact/${dep.groupId}/${dep.artifactId}/${dep.version}`;
    let license = await readLicense(url);
    if(license === undefined) {
      const url = `https://mvnrepository.com/artifact/${dep.groupId}/${dep.artifactId}`;
      license = await readLicense(url);
    }
    dep.license = license || '';
  }
  return bom;
}

async function readLicense(url) {
  let content = await httpRequest(url);
  const endLicensePlacing = content.indexOf('"snippets"');
  if(endLicensePlacing !== -1) {
    content = content.substring(0, endLicensePlacing);
  }
  const initIdx = content.indexOf('b lic">');

  if(initIdx !== -1) {
    const endIdx = content.indexOf('</', initIdx);
    return content.substring(initIdx + 7, endIdx);
  }
  return undefined;
}

function generateCsv(bom) {
  return bom
    .reduce((acc, el) => `${acc}\n${el.artifactId},${el.version},${el.license},,,,java`, 'name*,version*,license*,vendor/community,end-of-support,dependencies,language');
}

function writeCsv(csv) {
  process.exit(0);
  if(!fs.existsSync(path.join(basePath, 'csv'))) {
    fs.mkdirSync(path.join(basePath, 'csv'));
  }
  fs.writeFileSync(path.join(basePath, 'csv', 'BOM.csv'), csv, {encoding: 'utf-8'});
}
