const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { basePath, projectPath, projectName } = require('./configuration/config');
const { createFolderIfNotExists } = require('./utils');

(async () => {
  createFolderIfNotExists(projectPath, 'docs');
  fs.copyFileSync(path.join(basePath, 'output', 'csv', `BOM-${projectName}.csv`), path.join(projectPath, 'docs', 'BOM.csv'));
  console.log(chalk.cyanBright('BOM copied'));
  fs.copyFileSync(path.join(basePath, 'output', 'markdown', `THIRD_PARTY_NOTE-${projectName}.md`), path.join(projectPath, 'docs', 'THIRD_PARTY_NOTE.md'));
  console.log(chalk.cyanBright('THIRD_PARTY_NOTE copied'));
})()
.then(() => console.log('done'))
.catch(err => console.error(err));
