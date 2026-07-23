let app;
try {
  app = require("../src/app");
} catch (err) {
  console.error("FATAL:", err);
  const express = require("express");
  app = express();
  app.all("*", (req, res) => {
    res.status(500).json({ error: "Erro ao iniciar: " + err.message });
  });
}

module.exports = app;
