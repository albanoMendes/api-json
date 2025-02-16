const jsonServer = require("json-server");

console.log("Iniciando JSON Server...");

const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(router);

server.use(
  // Add custom route here if needed
  jsonServer.rewriter({
    "/*": "/$1",
  })
);

const PORT = process.env.PORT || 3000;

server
  .listen(PORT, () => {
    console.log(`✅ JSON Server está rodando na porta ${PORT}`);
  })
  .on("error", (err) => {
    console.error("❌ Erro ao iniciar o servidor:", err);
  });
// Export the Server API
module.exports = server;
