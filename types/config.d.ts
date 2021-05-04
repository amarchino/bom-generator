import { ParseConfig, UnparseConfig } from 'papaparse';

declare type ProjectConfiguration = {
  path: string;
  type: 'maven' | 'node';
}

declare type Configuration = {
  projects: Record<string, ProjectConfiguration>;
  basePath: string;
  papaConfig: ParseConfig & UnparseConfig;
}
