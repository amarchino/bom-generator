// @ts-check
const init = Date.now();
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { parse } = require('papaparse');
const { papaConfig, basePath } = require('../configuration/config');

exports.check = async (projectName) => {
  try {
    const bom = readBom(projectName);
    const csv = parse(bom, papaConfig).data;
    let hasRowsWithoutLicense = true;
    for(const row of csv) {
      if(!row['license*']) {
        hasRowsWithoutLicense = false;
        const url = `https://registry.npmjs.org/${row['name*']}/${row['version*']}`;
        console.log(`${row['name*']} - ${row['version*']} without a correct license (please check ${url} )`);
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
