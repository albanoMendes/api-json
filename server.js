const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// 🔹 Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("✅ Iniciando servidor...");

const server = express();
server.use(cors({ origin: "*", methods: ["GET", "POST", "PATCH", "DELETE"] }));
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(express.static(path.join(__dirname, "public")));

// 🔹 Configuração do upload de arquivos com `multer`
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/arquivos");
  },
  filename: function (req, file, cb) {
    const filename = `${Date.now()}_${file.originalname}`;
    cb(null, filename);
  },
});
const upload = multer({ storage: storage });

// 🔹 Buscar dados do Supabase (GET)
server.get("/:table", async (req, res) => {
  const { table } = req.params;

  try {
    const { data, error } = await supabase.from(table).select("*");

    if (error)
      return res
        .status(400)
        .json({ error: "Erro ao buscar dados", details: error.message });
    if (!data || data.length === 0)
      return res.status(404).json({ error: "Nenhum dado encontrado" });

    res.json(data);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Erro ao buscar dados", details: error.message });
  }
});

// 🔹 Inserir dados no Supabase (POST)
server.post(
  "/:table",
  upload.fields([{ name: "arquivo" }, { name: "filename" }]),
  async (req, res) => {
    const { table } = req.params;

    try {
      // Construir novo objeto de dados com suporte a arquivos
      let newResource = {};
      // Obtém os campos do formulário
      if (table === "aplicativos") {
        newResource = {
          ...req.body,
          arquivo: req.files["arquivo"]
            ? req.files["arquivo"][0].filename
            : null,
          filename: req.files["filename"]
            ? req.files["filename"][0].filename
            : null,
        };
      } else if (table === "publicidadesdb") {
        newResource = {
          ...req.body,
          filename: req.files["filename"]
            ? req.files["filename"][0].filename
            : null,
        };
      } else {
        newResource = req.body;
      }
      console.log(req.body);
      const { data, error } = await supabase.from(table).insert([newResource]);
      console.log(data);
      if (error)
        return res
          .status(400)
          .json({ error: "Erro ao inserir dados", details: error.message });

      res.status(201).json(data);
    } catch (error) {
      res
        .status(500)
        .json({ error: "Erro ao inserir dados", details: error.message });
    }
  }
);

// 🔹 Atualizar dados no Supabase (PATCH)
server.patch("/:table/:id", async (req, res) => {
  const { table, id } = req.params;

  try {
    const { data, error } = await supabase
      .from(table)
      .update(req.body)
      .eq("id", id);

    if (error)
      return res
        .status(400)
        .json({ error: "Erro ao atualizar dados", details: error.message });

    res.json({ success: true, data });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Erro ao atualizar dados", details: error.message });
  }
});

// 🔹 Excluir dados no Supabase (DELETE)
server.delete("/:table/:id", async (req, res) => {
  const { table, id } = req.params;

  try {
    // Buscar o item antes de excluir (para remover arquivos, se houver)
    const { data: item, error: fetchError } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !item)
      return res.status(404).json({ error: "Registro não encontrado" });

    // Remover arquivos associados, se existirem
    if (item.filename) {
      const filePath = path.join(__dirname, "public/arquivos", item.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    if (item.arquivo) {
      const filePath = path.join(__dirname, "public/arquivos", item.arquivo);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    // Excluir o item do banco de dados
    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error)
      return res
        .status(400)
        .json({ error: "Erro ao excluir dados", details: error.message });

    res.json({ success: true, message: "Registro excluído com sucesso" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Erro ao excluir dados", details: error.message });
  }
});

// 🔹 Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
