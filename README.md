# BOM Generator
Generates `BOM.csv` and `THIRD_PARTY_NOTE.md` files for Open Source publication
of projects, following the standard provided by CSI Piemonte.

### Prerequisites for execution
The following prerequisites are necessary for the execution:
- for Node.js projects: the `package.json` and the `package-lock.json` files
must be present in the original project
- for Maven projects:
  - the old syntax requires the `bom-pom` files to be generated, for example by
  running the plugin
  `org.jboss.maven.plugins:bom-builder-maven-plugin:build-bom`.
  - the new syntax allows for the use of the output of the already packaged
  `org.apache.maven.plugins:maven-dependency-plugin:list` plugin. Simply run
  ```bash
  mvn clean org.apache.maven.plugins:maven-dependency-plugin:list '-DoutputFile=target/${project.artifactId}.bom-pom.txt'
  ```
  Note that with Maven &lt; 4 it is required to also run the `compile` goal to
  correctly handle multi-module projects.

Please refer to the project page for informations

### Instructions for execution
First, install the dependencies via `npm install`.

There are three possible goals for the execution:
- `npm run grab`: grabs the required files for the BOM generation
- `npm run run`: runs the script generating the BOM
- `npm run check`: verifies the BOM files without a license
- `npm run put`: puts the BOM and THIRD_PARTY_NOTE files in the correct folders

The `grab` goal should be run before the `run` one, so as to populate the
required input files.

### Configuration
The configuration of the project must be set in the file
`/src/configuration/config.js` by cloning the template file
`/src/configuration/config.template.js` and correctly populating the
properties. In particular:
- `projects`: a map pro project names against their configurations
  - `path`: the path to the source project in the file system; correctly
tested as an absolute file
  - `type`: the type of the project to parse. Possible values are:
    - `node`
    - `maven`

The following properties should not be changed, unless proper caution is used:
- `basePath`: the base path for input/output of the generator
- `papaConfig`: the configuration of `papaparse`

### Output
The project produces its output in the `/output` folder, or more specificately:
- `/output/csv/BOM-${projectName}.csv` is the BOM file created
- `/output/markdown/THIRD_PARTY_NOTE-${projectName}.md` is the Third Party
Note file created

### TODOs
- [ ] provide more robust logic for handling packages
- [ ] Ivy integration
- [ ] Handle other languages (Python, PHP, ...)
