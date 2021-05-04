// @ts-check
const path = require('path');

/**
 * @returns {Configuration}
 */
module.exports = {
  projects: {
    projectName: {
      path: '',
      type: ''
    }
  },
  basePath: path.resolve(__dirname, '..', '..'),
  papaConfig: {
    delimiter: ',',
    header: true,
    quoteChar: '"'
  }
};
