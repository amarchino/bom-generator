const { type } = require('./configuration/config');

const checker = require('./checker/' + type);
checker.check()
.catch(err => console.error(err));
