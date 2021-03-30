// @ts-check
const init = Date.now();
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const xmlJs = require('xml-js');
const { parse } = require('papaparse');
const { tap } = require('../utils');
const { papaConfig, basePath, projectName } = require('../configuration/config');

exports.check = async () => {
  try {
    const pom = readPom();
    const bom = readBom();
    const csv = parse(bom, papaConfig).data;
    let hasRowsWithoutLicense = true;
    for(const row of csv) {
      if(!row['license*']) {
        hasRowsWithoutLicense = false;
        const packageData = pom[row['name*']];
        const url = `https://mvnrepository.com/artifact/${packageData.groupId}/${row['name*']}/${row['version*']}`;
        console.log(`${packageData.groupId} - ${row['name*']} - ${row['version*']} without a correct license ( please check ${url} )`);
      }
    }
    if(hasRowsWithoutLicense) {
      console.log(chalk.cyanBright('All dependencies have a correct license'))
    }
  } catch(e) {
    console.log(e);
  } finally {
    console.log(chalk.greenBright(`Elapsed time: ${Date.now() - init}ms`))
  }
};

function readBom() {
  return fs.readFileSync(path.join(basePath, 'output', 'csv', `BOM-${projectName}.csv`), {encoding: 'utf-8'});
}

function readPom() {
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
    .reduce((acc, el) => (acc[el.artifactId] = el) && acc, {});
}
