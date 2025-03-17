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

// 🔹 Configuração do CORS
server.use(cors({ origin: "*", methods: ["GET", "POST", "PATCH", "DELETE"] }));

server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(express.static(path.join(__dirname, "public")));
server.use(middlewares);
server.use(jsonServer.bodyParser);

// 🔹 Verificar se `db.json` existe antes de iniciar o servidor
if (!fs.existsSync("db.json")) {
  console.error("❌ ERRO: O arquivo 'db.json' não foi encontrado.");
  process.exit(1);
}

// 🔹 Configuração do upload de arquivos com `multer`
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/arquivos"); // Define o diretório de upload
  },
  filename: function (req, file, cb) {
    const filename = `${Date.now()}_${file.originalname}`;
    cb(null, filename);
  },
});

const upload = multer({ storage: storage });

// 🔹 Geração de IDs automáticos
const generateId = (collection) => {
  const items = collection.value();
  return items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;
};

// 🔹 Criar recurso com suporte a arquivos
const createResource = (req, res, resourceName) => {
  try {
    const collection = router.db.get(resourceName);
    if (!collection) {
      return res
        .status(400)
        .json({ error: `Recurso '${resourceName}' não encontrado.` });
    }

    // Obtém os campos do formulário
    const newResource = {
      id: generateId(collection),
      ...req.body,
      arquivo: req.files["arquivo"] ? req.files["arquivo"][0].filename : null,
      filename: req.files["filename"]
        ? req.files["filename"][0].filename
        : null,
    };

    collection.push(newResource).write();

    return res.status(201).json({ success: true, data: newResource });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno ao criar recurso" });
  }
};

// 🔹 Atualizar recurso
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

    return res.json({ success: true, data: updatedResource });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno ao atualizar recurso" });
  }
};

// 🔹 Excluir recurso com suporte a arquivos
const deleteResource = (req, res, resourceName, fileFields = []) => {
  try {
    const { id } = req.params;
    const collection = router.db.get(resourceName);
    const resource = collection.find({ id: Number(id) }).value();

    if (!resource) {
      return res.status(404).json({ error: `${resourceName} não encontrado` });
    }

    // 🔹 Excluir arquivos associados
    fileFields.forEach((field) => {
      if (resource[field]) {
        const filePath = path.join(
          __dirname,
          "public/arquivos",
          resource[field]
        );
        fs.unlink(filePath, (err) => {
          if (err)
            console.error(`⚠️ Erro ao excluir arquivo ${filePath}:`, err);
        });
      }
    });

    collection.remove({ id: Number(id) }).write();
    return res.json({
      success: true,
      message: `${resourceName} removido com sucesso`,
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno ao excluir recurso" });
  }
};

// 🔹 Definição das rotas
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
  server.post(
    `/${resource}`,
    upload.fields([{ name: "arquivo" }, { name: "filename" }]),
    (req, res) => createResource(req, res, resource)
  );
  server.patch(`/${resource}/:id`, (req, res) =>
    updateResource(req, res, resource)
  );
  server.delete(`/${resource}/:id`, (req, res) =>
    deleteResource(req, res, resource)
  );
});

// 🔹 Rotas com exclusão de arquivos
server.delete("/publicidadesdb/:id", (req, res) =>
  deleteResource(req, res, "publicidadesdb", ["filename"])
);
server.delete("/aplicativos/:id", (req, res) =>
  deleteResource(req, res, "aplicativos", ["filename", "arquivo"])
);

server.use(router);

// 🔹 Middleware para capturar erros globais
server.use((err, req, res, next) => {
  console.error("❌ Erro no servidor:", err);
  if (!res.headersSent) {
    return res
      .status(500)
      .json({ error: "Erro interno do servidor", details: err.message });
  }
});

// 🔹 Iniciar servidor
const PORT = process.env.PORT || 3000;
server
  .listen(PORT, () => console.log(`🚀 JSON Server rodando na porta ${PORT}`))
  .on("error", (err) => console.error("❌ Erro ao iniciar o servidor:", err));

module.exports = server;
