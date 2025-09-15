const jsonServer = require("json-server");
const multer = require("multer");
const fs = require("fs");
const express = require("express");
const path = require("path");
const cors = require("cors");

console.log("✅ Iniciando JSON Server...");

const server = express();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

// Corrigido CORS para aceitar qualquer origem
server.use(cors({ origin: "*", methods: ["GET", "POST", "PATCH", "DELETE"] }));

server.use(express.json());
server.use(express.static(path.join(__dirname, "public")));
server.use(middlewares);
server.use(jsonServer.bodyParser);

// Verificar se `db.json` existe antes de iniciar o servidor
if (!fs.existsSync("db.json")) {
  console.error("❌ ERRO: O arquivo 'db.json' não foi encontrado.");
  process.exit(1);
}

// Configuração do upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "public/arquivos";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const filename = `${Date.now()}_${file.originalname}`;
    req.body.filename = filename;
    cb(null, filename);
  },
});

const upload = multer({ storage }).any();
server.use(upload);

// Geração de IDs automáticos
const generateId = (collection) => {
  const items = collection.value();
  return items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;
};

// Criar recurso
const createResource = (req, res, resourceName) => {
  try {
    const collection = router.db.get(resourceName);

    if (!collection) {
      return res
        .status(400)
        .json({ error: `Recurso '${resourceName}' não encontrado.` });
    }

    const newResource = { id: generateId(collection), ...req.body };

    collection.push(newResource).write();
    console.log(`✅ Novo recurso criado em '${resourceName}':`, newResource);

    return res.status(201).json({ success: true, data: newResource });
  } catch (error) {
    console.error(`❌ Erro ao criar '${resourceName}':`, error);
    return res.status(500).json({ error: "Erro interno ao criar recurso" });
  }
};

// Atualizar recurso
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
    const updatedResource = { ...resource, ...updates };

    console.log(`✅ Recurso atualizado em '${resourceName}':`, updatedResource);

    return res.json({ success: true, data: updatedResource });
  } catch (error) {
    console.error(`❌ Erro ao atualizar '${resourceName}':`, error);
    return res.status(500).json({ error: "Erro interno ao atualizar recurso" });
  }
};

// Excluir recurso
const deleteResource = (req, res, resourceName, fileFields = []) => {
  try {
    const { id } = req.params;
    const collection = router.db.get(resourceName);
    const resource = collection.find({ id: Number(id) }).value();

    if (!resource) {
      return res.status(404).json({ error: `${resourceName} não encontrado` });
    }

    // Excluir arquivos associados
    fileFields.forEach((field) => {
      if (resource[field]) {
        const filePath = `public/arquivos/${resource[field]}`;
        fs.unlink(filePath, (err) => {
          if (err)
            console.error(`⚠️ Erro ao excluir arquivo ${filePath}:`, err);
        });
      }
    });

    collection.remove({ id: Number(id) }).write();
    console.log(`✅ Recurso removido de '${resourceName}':`, resource);

    return res.json({
      success: true,
      message: `${resourceName} removido com sucesso`,
    });
  } catch (error) {
    console.error(`❌ Erro ao excluir '${resourceName}':`, error);
    return res.status(500).json({ error: "Erro interno ao excluir recurso" });
  }
};

// Definição das rotas
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

// Rotas com exclusão de arquivos
server.delete("/publicidadesdb/:id", (req, res) =>
  deleteResource(req, res, "publicidadesdb", ["filename"])
);
server.delete("/aplicativos/:id", (req, res) =>
  deleteResource(req, res, "aplicativos", ["filename", "arquivo"])
);

server.use(router);

// Middleware para capturar erros globais
server.use((err, req, res, next) => {
  console.error("❌ Erro no servidor:", err);
  if (!res.headersSent) {
    return res
      .status(500)
      .json({ error: "Erro interno do servidor", details: err.message });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server
  .listen(PORT, () => console.log(`🚀 JSON Server rodando na porta ${PORT}`))
  .on("error", (err) => console.error("❌ Erro ao iniciar o servidor:", err));

module.exports = server;

