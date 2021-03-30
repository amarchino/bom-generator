const { type } = require('./configuration/config');

const executor = require('./executor/' + type);
executor.execute()
.catch(err => console.error(err));
