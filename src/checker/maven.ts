import * as chalk from 'chalk';
import { readFileSync } from 'fs';
import { parse } from 'papaparse';
import { join } from 'path';
import { basePath, papaConfig } from '../configuration/config';
import { parseBom } from '../utils/maven';

export async function check (projectName: string): Promise<void> {
  const init = Date.now();
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
  return readFileSync(join(basePath, 'output', 'csv', `BOM-${projectName}.csv`), {encoding: 'utf-8'});
}

function readPom(projectName) {
  return parseBom(projectName)
    .reduce((acc, el) => (acc[el.artifactId] = el) && acc, {});
}
