export interface ExportContainer {
  csv: string;
  markdown: string;
}

export interface NodeBom {
  name: string;
  type: 'dev' | 'prod';
  version: string;
  license: string;
  dependencies: string;
}

export interface MavenBom {
  groupId: string;
  artifactId: string;
  version: string;
  elaborated: boolean;
  license: string[];
}

export interface ProjectConfiguration {
  path: string;
  type: 'maven' | 'node';
}

