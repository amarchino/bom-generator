import * as checkers from './checker';
import { projects } from './configuration/config';
import { sequential } from './utils';

sequential(
  Object.entries(projects),
  async ([name, { type }]) => checkers[type].check(name)
)
.then(() => console.log('Check done'))
.catch(err => console.error(err));

