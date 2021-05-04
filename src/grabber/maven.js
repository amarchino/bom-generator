// @ts-check
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { basePath } = require('../configuration/config');
const { createFolderIfNotExists } = require('../utils');

exports.grab = async (projectName, projectPath) => {
  createFolderIfNotExists(basePath, 'input', 'maven', projectName);
  cleanOutput(projectName);
  readDir(projectPath, (folder, f) => (f.indexOf('.bom-pom.txt') !== -1 || f.indexOf('.bom-pom.xml') !== -1)
    && (fs.copyFileSync(path.join(folder, f), path.join(basePath, 'input', 'maven', projectName, f)), console.log(chalk.greenBright(`Copied file ${f}`))));
};

function cleanOutput(projectName) {
  const folder = path.join(basePath, 'input', 'maven', projectName);
  const contents = fs.readdirSync(folder);
  for(const content of contents) {
    fs.unlinkSync(path.join(folder, content));
  }
}

/**
 * Reads a directory recursively
 * @param {string} folder the folder to start in
 * @param {(folder: string, file: string) => void} fnc the function to execute
 */
function readDir(folder, fnc) {
  const contents = fs.readdirSync(folder, { withFileTypes: true });
  for(const content of contents) {
    if(content.isDirectory() && content.name !== '.' && content.name !== '..') {
      readDir(path.join(folder, content.name), fnc);
      continue;
    }
    fnc(folder, content.name);
  }
}
