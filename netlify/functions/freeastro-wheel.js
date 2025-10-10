exports.handler = async (event) => ({
  statusCode: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ok: true, echo: "stub", path: event.path })
});
