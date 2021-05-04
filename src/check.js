// @ts-check
const { projects } = require('./configuration/config');
const checkers = require('./checker');
const { sequential } = require('./utils');

sequential(
  Object.entries(projects),
  async ([name, { type }]) => checkers[type].check(name)
)
.then(() => console.log('Check done'))
.catch(err => console.error(err));

