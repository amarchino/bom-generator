// @ts-check
const { projects } = require('./configuration/config');
const grabbers = require('./grabber');

Promise.all(
  Object.entries(projects)
    .map(([name, { type, path }]) => grabbers[type].grab(name, path))
)
.then(() => console.log('Grabbing done'))
.catch(err => console.error(err));

