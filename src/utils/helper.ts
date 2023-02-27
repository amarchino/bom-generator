import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { parse } from 'json5';
import { inspect } from 'util';
import * as http from 'http';
import * as https from 'https';
import { ExportContainer } from '../interfaces';
import { join } from 'path';
import { EOL } from 'os';

let currentTimer: NodeJS.Timeout;
const timeout = 10000;

export const licenseMappings = Object.entries(parse(readFileSync(join(__dirname, 'license-mappings.json'), { encoding: 'utf-8' })));
export const licenseFallbacks = parse(readFileSync(join(__dirname, 'license-fallbacks.json'), { encoding: 'utf-8' }));

export function log (...args: any[]) {
  console.log(...args.map(arg => inspect(arg, { showHidden: false, depth: null, colors: true })));
}

export function sha1 (input: string) {
  createHash('sha1').update(input).digest('hex');
}

/**
 * Gets the unique items
 * @template T
 * @param {T[]} a
 * @param {(a: T) => any} key
 * @returns {T[]}
 */
export function uniqBy<T>(a: T[], key: (a: T) => any): T[] {
  let seen = new Set<T>();
  return a.filter(item => {
    let k = key(item);
    return seen.has(k) ? false : seen.add(k);
  });
}

export function tap<T>(f: (x: T) => void): (x: T) => T {
  return function(x: T) {
    f(x);
    return x;
  };
}

export function getJson (endpoint: string) {
  return parse(readFileSync(endpoint, { encoding: 'utf-8' }));
}

export function httpRequest(urlToInvoke: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let req: http.ClientRequest;
    if (urlToInvoke.indexOf('https://') === 0) {
      req = https.get(urlToInvoke, res => httpCallback(res, resolve, reject));
    } else {
      req = http.get(urlToInvoke, res => httpCallback(res, resolve, reject));
    }
    req.on('socket', () => {
      currentTimer = setTimeout(() => req.destroy(new Error('Timeout exceeded')), timeout);
    });
    req.on('error', err => {
      clearTimeout(currentTimer);
      reject(err)
    });
  });
}

export function writeOutput (basePath: string, projectName: string, {csv, markdown}: ExportContainer) {
  writeCsv(basePath, projectName, csv);
  writeMarkdown(basePath, projectName, markdown);
}

export function createFolderIfNotExists(baseFolder: string, ...subpaths: string[]) {
  return subpaths.reduce((acc, fld) => {
    const tmp = join(acc, fld);
    if(!existsSync(tmp)) {
      mkdirSync(tmp);
    }
    return tmp;
  }, baseFolder);
}

export function generateThirdPartyNoticeMarkdown (bom, nameField, versionField) {
  const aggregate = aggregateLicenses(bom);

  return Object.entries(aggregate)
  .sort(([a], [b]) => a.localeCompare(b))
  .reduce((acc, [license, elts]) => {
    const tmp = (elts as any[]).reduce((acc, el, idx) => `${acc}${idx === 0 ? '' : `\\${EOL}`}${el[nameField]},${el[versionField]}`, '');
    const [, mapping] = exports.licenseMappings.find(([key]) => key === license) || [];
    const link = mapping?.link ? `(${mapping.link})` : ''
    const licenseString = link ? `[${license}]` : license;
    return `${acc}${EOL}${EOL}${licenseString || 'UNKNOWN'}${link}\\${EOL}${tmp}`;
  }, `# Third Party Code${EOL}${EOL}This file is based on or incorporates material from the projects listed below${EOL}(collectively, "Third Party Code").${EOL}${EOL}CSI-Piemonte is not the original author of the Third Party Code.${EOL}The original copyright notice and the license, under which CSI-Piemonte received such Third Party Code,${EOL}are set forth below. You can find the original source code at the link set hereafter.${EOL}Please refer to the accompanying credits file for additional notices.`) + EOL;
}

function writeCsv(basePath: string, projectName: string, csv: string) {
  createFolderIfNotExists(basePath, 'output', 'csv');
  writeFileSync(join(basePath, 'output', 'csv', `BOM-${projectName}.csv`), csv, {encoding: 'utf-8'});
}
function writeMarkdown(basePath, projectName, md) {
  exports.createFolderIfNotExists(basePath, 'output', 'markdown');
  writeFileSync(join(basePath, 'output', 'markdown', `THIRD_PARTY_NOTE-${projectName}.md`), md, {encoding: 'utf-8'});
}
function httpCallback(res, resolve, reject) {
  const chunks = [];
  res.on('data', chunk => chunks.push(chunk));
  res.on('end', () => {
    clearTimeout(currentTimer);
    resolve(chunks.join(''));
  });
  res.on('error', e => reject(e));
}
function aggregateLicenses(bom) {
  return bom.reduce((acc, el) => {
    let licenses = el.license;
    if(typeof licenses === 'string') {
      licenses = el.license.split(',');
    }
    if(!Array.isArray(licenses)) {
      licenses = [licenses];
    }
    licenses.forEach(lic => {
      if(!acc[lic]) {
        acc[lic] = [];
      }
      acc[lic].push(el);
    });
    return acc;
  }, {});
}
