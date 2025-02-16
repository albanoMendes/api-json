const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(router);

const PORT = process.env.PORT || 3000;

server
  .listen(PORT, () => {
    console.log(`JSON Server está rodando na porta ${PORT}`);
  })
  .on("error", (err) => {
    console.error("Erro ao iniciar o servidor:", err);
  });
