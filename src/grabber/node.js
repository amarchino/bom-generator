// @ts-check
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { basePath, projectPath, projectName } = require('../configuration/config');
const { createFolderIfNotExists } = require('../utils');

exports.grab = async () => {
  createFolderIfNotExists(basePath, 'input', 'node', projectName);
  cleanOutput();
  copyFile(projectPath, 'package.json');
  copyFile(projectPath, 'package-lock.json');
};

function copyFile(folder, fileName) {
  if(!fs.existsSync(path.join(folder, fileName))) {
    return;
  }
  fs.copyFileSync(path.join(folder, fileName), path.join(basePath, 'input', 'node', projectName, fileName));
  console.log(chalk.greenBright(`Copied file ${fileName}`));
}

function cleanOutput() {
  const folder = path.join(basePath, 'input', 'node', projectName);
  const contents = fs.readdirSync(folder);
  for(const content of contents) {
    fs.unlinkSync(path.join(folder, content));
  }
}
