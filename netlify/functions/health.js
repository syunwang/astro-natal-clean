// netlify/functions/health.js
exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'x-func-ver': 'health-1'
    },
    body: JSON.stringify({
      ok: true,
      name: 'astro-natal health',
      time: new Date().toISOString()
    })
  };
};
