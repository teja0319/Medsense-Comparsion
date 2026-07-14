const path = require('path');

// Forward execution to the Next.js standalone server
require(path.join(__dirname, '.next', 'standalone', 'server.js'));
