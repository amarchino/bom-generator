// @ts-check
const { projects } = require('./configuration/config');
const executors = require('./executor');

Promise.all(
  Object.entries(projects)
    .map(([name, { type }]) => executors[type].execute(name))
)
.then(() => console.log('Execution done'))
.catch(err => console.error(err));
