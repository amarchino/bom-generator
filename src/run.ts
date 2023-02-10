import { projects } from './configuration/config';
import * as executors from './executor';

Promise.all(
  Object.entries(projects)
    .map(([name, { type }]) => executors[type].execute(name))
)
.then(() => console.log('Execution done'))
.catch(err => console.error(err));
