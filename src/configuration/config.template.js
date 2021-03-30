// @ts-check
const path = require('path');
/**
 * @typedef {Object} Configuration
 * @property {string} projectPath the path to the project to read the files from
 * @property {string} projectName the name of the project
 * @property {string} basePath the base path
 * @property {'maven'|'ivy'|'node'} type the type of the project
 * @property {import('papaparse').ParseConfig} the configuration for papaparse
 */

/**
 * @returns {Configuration}
 */
module.exports = {
  projectPath: '/path/to/project/root',
  // maven / node
  projectName: 'prj',
  type: 'maven',
  basePath: path.resolve(__dirname, '..', '..'),
  papaConfig: {
    delimiter: ',',
    header: true,
    quoteChar: '"'
  }
};
