const path = require('path');

/**
 * Vercel serverless bridge — loads compiled NestJS handler from dist/.
 * Build must run first: npm run build
 */
let handler;
let loadError;

function loadHandler() {
  if (handler) return handler;
  if (loadError) throw loadError;
  try {
    const mod = require(path.join(__dirname, '..', 'dist', 'serverless'));
    handler = mod.default ?? mod;
    if (typeof handler !== 'function') {
      throw new Error('dist/serverless export is not a function');
    }
    return handler;
  } catch (err) {
    loadError = err;
    throw err;
  }
}

module.exports = async (req, res) => {
  try {
    await loadHandler()(req, res);
  } catch (err) {
    console.error('Vercel API error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Server failed to start',
        message: err?.message ?? String(err),
      });
    }
  }
};
