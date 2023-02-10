import { copyFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import * as chalk from 'chalk';
import { basePath } from '../configuration/config';
import { createFolderIfNotExists } from '../utils';

export function grab (projectName: string, projectPath: string): void {
  createFolderIfNotExists(basePath, 'input', 'maven', projectName);
  cleanOutput(projectName);
  readDir(join(projectPath, 'target'), (folder, f) => f === 'THIRD-PARTY.txt'
    && (copyFileSync(join(folder, f), join(basePath, 'input', 'maven', projectName, f)), console.log(chalk.greenBright(`Copied file ${f}`))));
}

function cleanOutput(projectName: string) {
  const folder = join(basePath, 'input', 'maven', projectName);
  const contents = readdirSync(folder);
  for(const content of contents) {
    unlinkSync(join(folder, content));
  }
}

/**
 * Reads a directory recursively
 * @param folder the folder to start in
 * @param fnc the function to execute
 */
function readDir(folder: string, fnc: (folder: string, file: string) => void) {
  const contents = readdirSync(folder, { withFileTypes: true });
  for(const content of contents) {
    if(content.isDirectory() && content.name !== '.' && content.name !== '..') {
      readDir(join(folder, content.name), fnc);
      continue;
    }
    fnc(folder, content.name);
  }
}
