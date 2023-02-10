import * as grabbers from './grabber';
import { projects } from './configuration/config';

Object.entries(projects)
  .map(([name, { type, path }]) => grabbers[type].grab(name, path))
console.log('Grabbing done');

