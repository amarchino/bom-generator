import { homedir } from 'os';
import { ParseConfig, UnparseConfig } from 'papaparse';
import { resolve } from 'path';
import { ProjectConfiguration } from '../interfaces';

export const projects: Record<string, ProjectConfiguration> = {
  gmfopenapp: {
    path: resolve(homedir(), 'workspace', 'supporto_programmazione_monitoraggio', 'gmfopen', 'gmfopenapp'),
    type: 'node'
  },
  gmfopenapigateway: {
    path: resolve(homedir(), 'workspace', 'supporto_programmazione_monitoraggio', 'gmfopen', 'gmfopenapigateway'),
    type: 'maven'
  },
  gmfopenauthorization: {
    path: resolve(homedir(), 'workspace', 'supporto_programmazione_monitoraggio', 'gmfopen', 'gmfopenauthorization'),
    type: 'maven'
  },
  gmfopencommons: {
    path: resolve(homedir(), 'workspace', 'supporto_programmazione_monitoraggio', 'gmfopen', 'gmfopencommons'),
    type: 'maven'
  },
  gmfopenconfigserver: {
    path: resolve(homedir(), 'workspace', 'supporto_programmazione_monitoraggio', 'gmfopen', 'gmfopenconfigserver'),
    type: 'maven'
  },
  gmfopendiscovery: {
    path: resolve(homedir(), 'workspace', 'supporto_programmazione_monitoraggio', 'gmfopen', 'gmfopendiscovery'),
    type: 'maven'
  },
  gmfopengdpr: {
    path: resolve(homedir(), 'workspace', 'supporto_programmazione_monitoraggio', 'gmfopen', 'gmfopengdpr'),
    type: 'maven'
  },
  gmfopenproject: {
    path: resolve(homedir(), 'workspace', 'supporto_programmazione_monitoraggio', 'gmfopen', 'gmfopenproject'),
    type: 'maven'
  },
  gmfopenregistry: {
    path: resolve(homedir(), 'workspace', 'supporto_programmazione_monitoraggio', 'gmfopen', 'gmfopenregistry'),
    type: 'maven'
  },
};
export const basePath = resolve(__dirname, '..', '..');
export const papaConfig: ParseConfig & UnparseConfig = {
  delimiter: ',',
  header: true,
  quoteChar: '"'
};
