// @ts-check
const { extname, join } = require('path');
const { existsSync, readdirSync, readFileSync } = require('fs');
const { xml2js } = require('xml-js');
const { basePath } = require('../configuration/config');
const { tap } = require('./helper');

exports.parseBom = function parseBom(projectName) {
  const folder = join(basePath, 'input', 'maven', projectName);
  if(!existsSync(folder)) {
    return [];
  }
  const files = readdirSync(folder);
  const tmp = parseBomPomTxt(folder, files)
    || parseBomPomXml(folder, files);

  return Object.values(tmp)
    .sort((a, b) => a.artifactId.localeCompare(b.artifactId));
}

function parseBomPomTxt(folder, files) {
  const txtFiles = files
    .filter(fn => extname(fn) === '.txt');
  if(!txtFiles.length) {
    return false;
  }
  return txtFiles
  .map(fn => readFileSync(join(folder, fn), {encoding: 'utf-8'}))
  .flatMap(content => content.split(/\r?\n/))
  .filter(line => line && line !== 'The following files have been resolved:' && line !== '   none')
  .map(line => line.trim().split(':'))
  .reduce((acc, [groupId, artifactId, , version, other]) => {
    if(other.startsWith('compile') || other.startsWith('provided') || other.startsWith('test') || other.startsWith('runtime')) {
      acc[`${groupId}$$$${artifactId}$$$${version}`] = {groupId, artifactId, version, elaborated: false};
    } else {
      acc[`${groupId}$$$${artifactId}$$$${other}`] = {groupId, artifactId, version: other, elaborated: false};
    }
    return acc;
  }, {});
}
function parseBomPomXml(folder, files) {
  const projectGroupIds = {};
  return files
    .filter(fn => extname(fn) === '.xml')
    .map(fn => readFileSync(join(folder, fn), {encoding: 'utf-8'}))
    .map(content => xml2js(content, { compact: true, trim: true, nativeType: false}))
    .map(tap(el => projectGroupIds[el['project'].groupId._text] = true))
    .filter(obj => obj['project'].dependencyManagement?.dependencies)
    .flatMap(obj => obj['project'].dependencyManagement.dependencies.dependency)
    .map(obj => ({groupId: obj.groupId._text, artifactId: obj.artifactId._text, version: obj.version._text, elaborated: false}))
    .filter(dep => !projectGroupIds[dep.groupId])
    .map(dep => ({key: `${dep.groupId}$$$${dep.artifactId}$$$${dep.version}`, dep}))
    .reduce((acc, {key, dep}) => (acc[key] = dep, acc), {});
}
