require("dotenv").config();
const express = require("express");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { EdgeTTS } = require("node-edge-tts");
const { chat, clearHistory } = require("./groq");

let tts;
try {
  const { EdgeTTS } = require("node-edge-tts");
  tts = new EdgeTTS({
    voice: "pt-BR-FranciscaNeural",
    lang: "pt-BR",
    outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    pitch: "0%",
    rate: "+10%",
  });
} catch (e) {
  console.error("TTS init error:", e.message);
  tts = null;
}

// Pre-set user name from env
if (process.env.USER_NAME) {
  const memory = require("./memory");
  memory.setUserName("default", process.env.USER_NAME).catch(() => {});
}

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.post("/api/chat", async (req, res) => {
  const { message, image, userId = "web-user" } = req.body;

  if (!message && !image) {
    return res.status(400).json({ error: "Mensagem ou imagem obrigatória" });
  }

  try {
    const result = await chat(userId, message || "O que tem nessa imagem?", image || undefined);

    if (result.action) {
      try {
        const parsed = JSON.parse(result.result);
        if (parsed.type === "image") {
          return res.json({
            reply: null,
            action: result.action,
            image: parsed.base64,
            imagePath: parsed.path,
          });
        }
        if (parsed.type === "music") {
          return res.json({
            reply: `🎵 Música "${parsed.desc}" gerada!\nNotas: ${parsed.notes}\nSalva em: ${parsed.path}`,
            action: result.action,
            musicPath: parsed.path,
          });
        }
      } catch {}
      return res.json({
        reply: `⚙️ Ação \`${result.action}\` executada!\n\n${result.result}`,
        action: result.action,
      });
    }

    res.json({ reply: result.text });
  } catch (err) {
    console.error("Erro Groq:", err.message);
    res.status(500).json({ error: "Alma-chan travou um pouquinho... 😵" });
  }
});

app.post("/api/clear", (req, res) => {
  const { userId = "web-user" } = req.body;
  clearHistory(userId);
  res.json({ ok: true });
});

app.get("/api/status", (req, res) => {
  res.json({
    platform: process.env.VERCEL ? "vercel" : os.platform(),
    uptime: process.uptime().toFixed(1),
    node: process.version,
  });
});

app.get("/api/export/:userId", (req, res) => {
  const history = require("./groq").getHistory(req.params.userId);
  if (!history || history.length === 0) {
    return res.status(404).json({ error: "Nenhuma conversa" });
  }
  let txt = "=== Conversa com Alma-chan 🌸 ===\n\n";
  for (const msg of history) {
    const who = msg.role === "user" ? "👤 Pai" : "🌸 ALM-01P";
    txt += `${who}:\n${msg.content}\n\n`;
  }
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="alma-chan-conversa.txt"`);
  res.send(txt);
});

app.post("/api/tts", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Texto obrigatório" });
  if (!tts) return res.status(503).json({ error: "TTS não disponível" });

  const clean = text.replace(/[🌸🥰✨⚙️📸💻📝🌐📶🔇❌🎉💕🔒📋💾📅🎲🪙😂🍅🧮🐍⚡🔋🔄🎵🔊📋🖼️🎚️⏻🔌💡🧹⌨️]+/g, "").trim();
  if (!clean) return res.json({ ok: true });

  const tmpPath = path.join(os.tmpdir(), `alma-tts-${Date.now()}.mp3`);
  try {
    await tts.ttsPromise(clean, tmpPath);
    res.sendFile(tmpPath, () => fs.unlink(tmpPath, () => {}));
  } catch (err) {
    console.error("TTS error:", err.message);
    res.status(500).json({ error: "Falha no TTS" });
  }
});

module.exports = app;
