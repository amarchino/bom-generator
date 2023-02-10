import { ParseConfig, UnparseConfig } from 'papaparse';
import { resolve } from 'path';
import { ProjectConfiguration } from '../interfaces';

export const projects: Record<string, ProjectConfiguration> = {
  projectName: {
    path: '',
    type: 'node'
  }
};
export const basePath = resolve(__dirname, '..', '..');
export const papaConfig: ParseConfig & UnparseConfig = {
  delimiter: ',',
  header: true,
  quoteChar: '"'
};
