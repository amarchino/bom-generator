// @ts-check
const fs = require('fs');
const { join } = require('path');
const chalk = require('chalk');
const { basePath, projects } = require('./configuration/config');
const { createFolderIfNotExists } = require('./utils');

try {
  for(const [name, { path }] of Object.entries(projects)) {
    createFolderIfNotExists(path, 'docs');
    fs.copyFileSync(join(basePath, 'output', 'csv', `BOM-${name}.csv`), join(path, 'docs', 'BOM.csv'));
    console.log(chalk.cyanBright('BOM copied'));
    fs.copyFileSync(join(basePath, 'output', 'markdown', `THIRD_PARTY_NOTE-${name}.md`), join(path, 'docs', 'THIRD_PARTY_NOTE.md'));
    console.log(chalk.cyanBright('THIRD_PARTY_NOTE copied'));
  }
  console.log('done');
} catch (err) {
  console.error(err);
}
