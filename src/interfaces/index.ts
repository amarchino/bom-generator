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

export interface ThirdPartDependencies {
  Size: XmlElement;
  Message: XmlElement;
  Dependencies: { Dependency: ThirdPartDependenciesDependency[] }
}

export interface ThirdPartDependenciesDependency {
  Name: XmlElement;
  GroupId: XmlElement;
  ArtifactId: XmlElement;
  Version: XmlElement;
  Url: XmlElement;
  Licenses: { License: XmlElement[] | XmlElement }
}

export interface XmlElement {
  _text: string;
}
