import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { xml2js } from 'xml-js';
import { basePath } from '../configuration/config';
import { MavenBom, ThirdPartDependencies } from '../interfaces';

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
  const xml: ThirdPartDependencies = (xml2js(content, { compact: true, trim: true, nativeType: false, addParent: false }) as any).ThirdPartDependencies;
  return xml.Dependencies.Dependency
    .reduce((acc, dep) => {
      acc[`${dep.GroupId._text}$$$${dep.ArtifactId._text}$$$${dep.Version._text}`] = {
        groupId: dep.GroupId._text,
        artifactId: dep.ArtifactId._text,
        version: dep.Version._text,
        elaborated: false,
        license: Array.isArray(dep.Licenses.License) ? dep.Licenses.License.map(l => l._text) : [ dep.Licenses.License._text ]
      };
      return acc;
    }, {});
}
