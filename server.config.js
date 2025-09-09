// server.config.js
// Centralized server-side configuration for live-events connection.
// NOTE: Environment variables still take precedence if provided.
// Avoid committing real secrets (TOKEN) to source control; use env vars in production.

module.exports = {
  // Keep TOKEN only here or in environment variables
  // TOKEN: 'YOUR_LOCAL_DEV_TOKEN',
  TOKEN: '3debd82ada04ab756d750d3c7d8295e4ad958e440ba7fd7135e31bba370c1a8d777862c62b3e45fe570640e5c54de641b7c89a7c82732a9489fd156c50f6cec8' 
};
