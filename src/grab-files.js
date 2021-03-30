const { type } = require('./configuration/config');

const grabber = require('./grabber/' + type);
grabber.grab()
.then(() => console.log('done'))
.catch(err => console.error(err));
