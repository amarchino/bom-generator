import * as chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { parse, unparse } from 'papaparse';
import { join } from 'path';
import { xml2js } from 'xml-js';
import { basePath, papaConfig } from '../configuration/config';
import { ExportContainer, MavenBom } from '../interfaces';
import { generateThirdPartyNoticeMarkdown, httpRequest, licenseFallbacks, licenseMappings, writeOutput } from '../utils';
import { parseBom } from '../utils/maven';

export async function execute(projectName: string): Promise<void> {
  const init = Date.now();
  try {
    let bom = parseBom(projectName);
    bom = delta(projectName, bom);
    bom = await populateVersionData(bom);
    const output = generateOutput(bom);
    writeOutput(basePath, projectName, output);
  } catch(e) {
    console.log(e);
  } finally {
    console.log(chalk.greenBright(`Elapsed time: ${Date.now() - init} ms`))
  }
};

function delta(projectName: string, bom: MavenBom[]): MavenBom[] {
  const originalBomPath = join(basePath, 'output', 'csv', `BOM-${projectName}.csv`);
  if (!existsSync(originalBomPath)) {
    return bom;
  }
  const originalBomFile = readFileSync(originalBomPath, {encoding: 'utf-8'});
  const originalBomCSV = parse(originalBomFile, papaConfig).data;
  const originalBom = originalBomCSV
    .map(el => ({groupId: '', artifactId: el['name*'], version: el['version*'], elaborated: true, license: el['license*']}))
    .filter(el => bom.find(l => l.artifactId === el.artifactId && l.version === el.version));
  const delta = bom.filter(el => !originalBom.find(l => l.artifactId === el.artifactId && l.version === el.version) );

  return [
    ...originalBom,
    ...delta
  ];
}

async function populateVersionData(bom) {
  let idx = 0;
  const deps = bom.filter(el => !el.elaborated);
  const total = deps.length;
  const padLength = Math.floor(Math.log10(total)) + 1;
  for(let dep of deps) {
    const index = (++idx + '').padStart(padLength, ' ');
    console.log(`(${index}/${total}) Elaborating license for GROUP ID: "${chalk.redBright(dep.groupId)}", ARTIFACT ID: "${chalk.yellowBright(dep.artifactId)}", VERSION: "${chalk.greenBright(dep.version)}"`);
    const license = await readLicense(dep);
    dep.license = license || [];
  }
  return bom;
}

async function readLicense(dep: MavenBom) {
  let licenseList = dep.license;
  if(!licenseList.length) {
    const url = `https://repo.maven.apache.org/maven2/${dep.groupId.replace(/\./g, '/')}/${dep.artifactId}/${dep.version}/${dep.artifactId}-${dep.version}.pom`;
    let xml;
    try {
      const content = await httpRequest(url);
      xml = xml2js(content, { compact: true, trim: true, nativeType: false });
      let tmpLicenses = xml['project'].licenses?.license;
      if(!Array.isArray(tmpLicenses)) {
        tmpLicenses = [ tmpLicenses ];
      }
      licenseList = tmpLicenses.map(l => l.name._text.trim());
    } catch(e) {
      console.log(chalk.redBright(`Error in XML parsing. Please check https://mvnrepository.com/artifact/${dep.groupId}/${dep.artifactId}/${dep.version}`));
      return [];
    }
  }

  licenseList = licenseList.filter(Boolean);
  // Allow override of license
  if(licenseFallbacks.maven?.[dep.groupId]?.[dep.artifactId]?.[dep.version]) {
    licenseList = licenseFallbacks.maven[dep.groupId][dep.artifactId][dep.version].map(el => ({ name: { _text: el } }));
  }

  const licenses = licenseList
    .flatMap(l => ({licenseText: l, license: l.replace(/\s*(\r\n|\n|\r)\s*/gm, ' ').toUpperCase().trim()}))
    .map(({licenseText, license}) => {
      const tmp = {licenseText, license: licenseMappings.reduce((acc, [key,el]) => ((el as any).substitutions.indexOf(license) !== -1 && acc.push(key), acc), [])};
      if(!tmp.license.length) {
        console.log(chalk.yellowBright(`Unmapped license ${license}`));
        tmp.license.push(license);
      }
      return tmp;
    })
    .filter(el => el.license)
    .flatMap(el => el.license);

  if(licenses.length) {
    return licenses;
  }
  console.log(chalk.redBright(`License data not found. Please check https://mvnrepository.com/artifact/${dep.groupId}/${dep.artifactId}/${dep.version}`));
  return [];
}

function generateOutput(bom: MavenBom[]): ExportContainer {
  bom.sort((a, b) => a.artifactId.localeCompare(b.artifactId) || a.version.localeCompare(b.version));
  const csv = generateBomCsv(bom);
  console.log(chalk.cyanBright('BOM generated'));
  const markdown = generateThirdPartyNoticeMarkdown(bom, 'artifactId', 'version')
  console.log(chalk.cyanBright('MARKDOWN generated'));
  return { csv, markdown };
}

function generateBomCsv(bom: MavenBom[]) {
  return unparse(bom.map(el => ({
    'name*': el.artifactId,
    'version*': el.version,
    'license*': el.license,
    'vendor/community': '',
    'end-of-support': '',
    'dependencies': '',
    'language': 'java'
  })), papaConfig);
}
