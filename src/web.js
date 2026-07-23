const app = require("./app");

const PORT = process.env.PORT || process.env.WEB_PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌸 Alma-chan web rodando em http://localhost:${PORT}`);
});
