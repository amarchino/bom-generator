import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { basePath } from '../configuration/config';
import { MavenBom } from '../interfaces';

export function parseBom (projectName: string): MavenBom[] {
  const folder = join(basePath, 'input', 'maven', projectName);
  if(!existsSync(folder)) {
    return [];
  }
  const files = readdirSync(folder);
  const tmp = parseThirdParty(folder, files);

  return Object.values(tmp)
    .sort((a, b) => a.artifactId.localeCompare(b.artifactId));
}

function parseThirdParty(folder: string, files: string[]): Record<string, MavenBom>  {
  const lineRegex = /\((.*?)\)/g;
  const file = files.find(f => f === 'THIRD-PARTY.txt');
  const content = readFileSync(join(folder, file), {encoding: 'utf-8'});
  return content.split(/\r?\n/)
    .filter(Boolean)
    .filter(line => line.charAt(0) == ' ')
    .map(line => line.trim())
    .reduce((acc, line) => {
      const content: string[] = [];
      let data;
      while((data = lineRegex.exec(line)) !== null) {
        content.push(data[1]);
      }
      const dependencyData = content.pop();
      const [groupId, artifactId, version] = dependencyData.split(' - ')[0].trim().split(':');
      acc[`${groupId}$$$${artifactId}$$$${version}`] = {groupId, artifactId, version, elaborated: false, license: content.filter(l => l.charAt(0) == l.charAt(0).toUpperCase())};
      return acc;
    }, {});
}
