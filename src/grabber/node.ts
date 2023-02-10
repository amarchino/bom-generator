import * as chalk from 'chalk';
import { copyFileSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { basePath } from '../configuration/config';
import { createFolderIfNotExists } from '../utils';

export function grab (projectName: string, projectPath: string): void {
  createFolderIfNotExists(basePath, 'input', 'node', projectName);
  cleanOutput(projectName);
  copyFile(projectName, projectPath, 'package.json');
  copyFile(projectName, projectPath, 'package-lock.json');
};

function copyFile(projectName: string, folder: string, fileName: string): void {
  if(!existsSync(join(folder, fileName))) {
    return;
  }
  copyFileSync(join(folder, fileName), join(basePath, 'input', 'node', projectName, fileName));
  console.log(chalk.greenBright(`Copied file ${fileName}`));
}

function cleanOutput(projectName: string): void {
  const folder = join(basePath, 'input', 'node', projectName);
  const contents = readdirSync(folder);
  for(const content of contents) {
    unlinkSync(join(folder, content));
  }
}
