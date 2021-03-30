// @ts-check
const util = require('util');
const path = require('path');
const crypto = require('crypto');
const JSON5 = require('json5');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { projectName } = require('../configuration/config');
const eol = '\n';

exports.licenseMappings = Object.entries(require('./license-mappings.json'));

exports.log = (...args) => console.log(...args.map(arg => util.inspect(arg, { showHidden: false, depth: null, colors: true })));

exports.sha1 = (input) => crypto.createHash('sha1').update(input).digest('hex');

/**
 * Gets the unique items
 * @template T
 * @param {T[]} a
 * @param {(a: T) => any} key
 * @returns {T[]}
 */
exports.uniqBy = (a, key) => {
  let seen = new Set();
  return a.filter(item => {
    let k = key(item);
    return seen.has(k) ? false : seen.add(k);
  });
};

exports.tap = f => x => (f(x), x);

exports.getJson = endpoint => JSON5.parse(fs.readFileSync(endpoint, { encoding: 'utf-8' }));

exports.httpRequest = async url => new Promise((resolve, reject) => {
  if (url.indexOf('https://') === 0) {
    https.get(url, res => httpCallback(res, resolve, reject));
    return;
  }
  http.get(url, res => httpCallback(res, resolve, reject));
});

exports.writeOutput = (basePath, {csv, markdown}) => {
  writeCsv(basePath, csv);
  writeMarkdown(basePath, markdown);
};

exports.createFolderIfNotExists = (baseFolder, ...subpaths) => subpaths.reduce((acc, fld) => {
  const tmp = path.join(acc, fld);
  if(!fs.existsSync(tmp)) {
    fs.mkdirSync(tmp);
  }
  return tmp;
}, baseFolder);

exports.generateThirdPartyNoticeMarkdown = (bom, nameField, versionField) => {
  const aggregate = aggregateLicenses(bom);

  return Object.entries(aggregate)
  .sort(([a], [b]) => a.localeCompare(b))
  .reduce((acc, [license, elts]) => {
    const tmp = elts.reduce((acc, el, idx) => `${acc}${idx === 0 ? '' : `\\${eol}`}${el[nameField]},${el[versionField]}`, '');
    const [, mapping] = exports.licenseMappings.find(([key]) => key === license) || [];
    const link = mapping?.link ? `(${mapping.link})` : ''
    const licenseString = link ? `[${license}]` : license;
    return `${acc}${eol}${eol}${licenseString || 'UNKNOWN'}${link}\\${eol}${tmp}`;
  }, `This file is based on or incorporates material from the projects listed below${eol}(collectively, "Third Party Code").${eol}${eol}CSI-Piemonte is not the original author of the Third Party Code.${eol}The original copyright notice and the license, under which CSI-Piemonte received such Third Party Code,${eol}are set forth below. You can find the original source code at the link set hereafter.${eol}Please refer to the accompanying credits file for additional notices.`) + eol;
};

function writeCsv(basePath, csv) {
  exports.createFolderIfNotExists(basePath, 'output', 'csv');
  fs.writeFileSync(path.join(basePath, 'output', 'csv', `BOM-${projectName}.csv`), csv, {encoding: 'utf-8'});
}
function writeMarkdown(basePath, md) {
  exports.createFolderIfNotExists(basePath, 'output', 'markdown');
  fs.writeFileSync(path.join(basePath, 'output', 'markdown', `THIRD_PARTY_NOTE-${projectName}.md`), md, {encoding: 'utf-8'});
}
function httpCallback(res, resolve, reject) {
  const chunks = [];
  res.on('data', chunk => chunks.push(chunk));
  res.on('end', () => resolve(chunks.join('')));
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
