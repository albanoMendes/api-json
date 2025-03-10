const jsonServer = require("json-server");
const multer = require("multer");
const fs = require("fs");

console.log("Iniciando JSON Server...");

const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/arquivos"),
  filename: (req, file, cb) => {
    const filename = `${Date.now()}_${file.originalname}`;
    req.body.filename = filename;
    cb(null, filename);
  },
});

const bodyParser = multer({ storage }).any();
server.use(bodyParser);

const generateId = (collection) => {
  return collection.size().value() > 0
    ? collection.maxBy("id").value().id + 1
    : 1;
};

const createResource = (req, res, resourceName) => {
  try {
    const collection = router.db.get(resourceName);
    const newResource = { id: generateId(collection), ...req.body };

    collection.push(newResource).write();
    return res.status(201).json(newResource);
  } catch (error) {
    console.error(`Erro ao criar ${resourceName}:`, error);
    return res.status(500).json({ error: "Erro interno ao criar recurso" });
  }
};

const updateResource = (req, res, resourceName) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const collection = router.db.get(resourceName);
    const resource = collection.find({ id: Number(id) }).value();

    if (!resource) {
      return res
        .status(404)
        .json({ message: `${resourceName} não encontrado` });
    }

    collection
      .find({ id: Number(id) })
      .assign(updates)
      .write();
    return res.json({ ...resource, ...updates });
  } catch (error) {
    console.error(`Erro ao atualizar ${resourceName}:`, error);
    return res.status(500).json({ error: "Erro interno ao atualizar recurso" });
  }
};

const deleteResource = (req, res, resourceName, fileFields = []) => {
  try {
    const { id } = req.params;
    const collection = router.db.get(resourceName);
    const resource = collection.find({ id: Number(id) }).value();

    if (!resource) {
      return res
        .status(404)
        .json({ message: `${resourceName} não encontrado` });
    }

    fileFields.forEach((field) => {
      if (resource[field]) {
        const filePath = `public/arquivos/${resource[field]}`;
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Erro ao excluir ${filePath}:`, err);
        });
      }
    });

    collection.remove({ id: Number(id) }).write();
    return res.json({ message: `${resourceName} removido com sucesso` });
  } catch (error) {
    console.error(`Erro ao excluir ${resourceName}:`, error);
    return res.status(500).json({ error: "Erro interno ao excluir recurso" });
  }
};

// Rotas dinâmicas
const resources = [
  "users",
  "message",
  "anunciosdb",
  "downloads",
  "testemunho",
  "publicidadesdb",
  "aplicativos",
];

resources.forEach((resource) => {
  server.post(`/${resource}`, (req, res) => createResource(req, res, resource));
  server.patch(`/${resource}/:id`, (req, res) =>
    updateResource(req, res, resource)
  );
  server.delete(`/${resource}/:id`, (req, res) =>
    deleteResource(req, res, resource)
  );
});

// Rotas com campos de arquivos a serem excluídos
server.delete("/publicidadesdb/:id", (req, res) =>
  deleteResource(req, res, "publicidadesdb", ["filename"])
);
server.delete("/aplicativos/:id", (req, res) =>
  deleteResource(req, res, "aplicativos", ["filename", "arquivo"])
);

server.use(router);

// Middleware para capturar erros globais
server.use((err, req, res, next) => {
  console.error("Erro no servidor:", err);
  if (!res.headersSent) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

const PORT = process.env.PORT || 3000;
server
  .listen(PORT, () => console.log(`✅ JSON Server rodando na porta ${PORT}`))
  .on("error", (err) => console.error("❌ Erro ao iniciar o servidor:", err));

module.exports = server;
