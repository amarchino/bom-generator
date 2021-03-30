// @ts-check
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { basePath, projectPath, projectName } = require('../configuration/config');
const { createFolderIfNotExists } = require('../utils');

exports.grab = async () => {
  createFolderIfNotExists(basePath, 'input', 'ivy', projectName);
  cleanOutput();
  copyFile(projectPath, 'ivy.xml');
};

function copyFile(folder, fileName) {
  if(!fs.existsSync(path.join(folder, 'buildfiles', fileName))) {
    return;
  }
  fs.copyFileSync(path.join(folder, 'buildfiles', fileName), path.join(basePath, 'input', 'ivy', projectName, fileName));
  console.log(chalk.greenBright(`Copied file ${fileName}`));
}

function cleanOutput() {
  const folder = path.join(basePath, 'input', 'ivy', projectName);
  const contents = fs.readdirSync(folder);
  for(const content of contents) {
    fs.unlinkSync(path.join(folder, content));
  }
}
