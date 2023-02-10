import * as chalk from 'chalk';
import { copyFileSync } from 'fs';
import { join } from 'path';
import { basePath, projects } from './configuration/config';
import { createFolderIfNotExists } from './utils';

try {
  for(const [name, { path }] of Object.entries(projects)) {
    createFolderIfNotExists(path, 'docs');
    copyFileSync(join(basePath, 'output', 'csv', `BOM-${name}.csv`), join(path, 'docs', 'BOM.csv'));
    console.log(chalk.cyanBright('BOM copied'));
    copyFileSync(join(basePath, 'output', 'markdown', `THIRD_PARTY_NOTE-${name}.md`), join(path, 'docs', 'THIRD_PARTY_NOTE.md'));
    console.log(chalk.cyanBright('THIRD_PARTY_NOTE copied'));
  }
  console.log('done');
} catch (err) {
  console.error(err);
}
