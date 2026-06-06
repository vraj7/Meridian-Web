/**
 * Vercel serverless bridge — loads compiled NestJS handler from dist/.
 * Build must run first: npm run build
 */
module.exports = require('../dist/serverless').default;
