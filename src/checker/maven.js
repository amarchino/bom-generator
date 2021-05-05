// @ts-check
const init = Date.now();
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { parse } = require('papaparse');
const { maven } = require('../utils');
const { papaConfig, basePath } = require('../configuration/config');

const { parseBom } = maven;

exports.check = async (projectName) => {
  try {
    const pom = readPom(projectName);
    const bom = readBom(projectName);
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

function readBom(projectName) {
  return fs.readFileSync(path.join(basePath, 'output', 'csv', `BOM-${projectName}.csv`), {encoding: 'utf-8'});
}

function readPom(projectName) {
  return parseBom(projectName)
    .reduce((acc, el) => (acc[el.artifactId] = el) && acc, {});
}
