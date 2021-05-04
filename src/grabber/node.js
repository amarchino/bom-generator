// @ts-check
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { basePath } = require('../configuration/config');
const { createFolderIfNotExists } = require('../utils');

exports.grab = async (projectName, projectPath) => {
  createFolderIfNotExists(basePath, 'input', 'node', projectName);
  cleanOutput(projectName);
  copyFile(projectName, projectPath, 'package.json');
  copyFile(projectName, projectPath, 'package-lock.json');
};

function copyFile(projectName, folder, fileName) {
  if(!fs.existsSync(path.join(folder, fileName))) {
    return;
  }
  fs.copyFileSync(path.join(folder, fileName), path.join(basePath, 'input', 'node', projectName, fileName));
  console.log(chalk.greenBright(`Copied file ${fileName}`));
}

function cleanOutput(projectName) {
  const folder = path.join(basePath, 'input', 'node', projectName);
  const contents = fs.readdirSync(folder);
  for(const content of contents) {
    fs.unlinkSync(path.join(folder, content));
  }
}
