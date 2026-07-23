const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const { execSync } = require("child_process");
const { chat } = require("./groq");

let client = null;
let qrCodeData = null;
let isReady = false;
let connectResolve = null;
let reconnectTimer = null;
let initTimer = null;
let shouldReconnect = true;
let isStarting = false;
let sendingNow = false;

function killChrome() {
  try {
    execSync("taskkill /f /im chrome.exe 2>nul", { stdio: "ignore" });
  } catch {}
  try {
    execSync("taskkill /f /im opera.exe 2>nul", { stdio: "ignore" });
  } catch {}
}

function findBrowser() {
  const paths = [
    "C:\\Users\\roberth\\AppData\\Local\\Programs\\Opera GX\\opera.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const p of paths) {
    try { if (require("fs").existsSync(p)) return p; } catch {}
  }
  return null;
}

function startClient() {
  if (isStarting) return;
  isStarting = true;

  killChrome();
  clearTimeout(reconnectTimer);
  clearTimeout(initTimer);

  if (client) {
    try { client.destroy(); } catch {}
    client = null;
  }

  qrCodeData = null;
  isReady = false;

  const browserPath = findBrowser();
  const launchOpts = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--disable-extensions",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--no-zygote",
      "--mute-audio",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-features=MemorySaverMode",
      "--memory-pressure-off",
    ],
  };
  if (browserPath) {
    launchOpts.executablePath = browserPath;
    console.log(`🌐 Usando navegador: ${browserPath}`);
  }

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: "./data/whatsapp" }),
    puppeteer: launchOpts,
  });

  client.on("qr", async (qr) => {
    try {
      qrCodeData = await qrcode.toDataURL(qr);
    } catch {
      qrCodeData = qr;
    }
    console.log("📱 Escaneie o QR code do WhatsApp!");
  });

  client.on("ready", () => {
    isReady = true;
    isStarting = false;
    qrCodeData = null;
    console.log("✅ WhatsApp conectado!");
    console.log("  └ isReady=" + isReady);
    if (connectResolve) { connectResolve(); connectResolve = null; }
  });

  client.on("disconnected", async (reason) => {
    isReady = false;
    isStarting = false;
    console.log("❌ WhatsApp desconectado:", reason, "| isReady:", isReady);
    if (reason === "LOGOUT") {
      console.log("📱 Sessão expirada! Remova o dispositivo em WhatsApp > Dispositivos conectados e reinicie.");
      shouldReconnect = false;
      return;
    }
    if (shouldReconnect) {
      console.log("🔄 Reconectando em 5 segundos...");
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(startClient, 5000);
    }
  });

  client.on("message", async (msg) => {
    if (msg.from === "status@broadcast") return;
    if (sendingNow) { return; }
    console.log("📩 WA msg:", { from: msg.from?.substring(0,15), body: msg.body?.substring(0,50), fromMe: msg.fromMe, hasMedia: msg.hasMedia, isReady });
    if (!isReady) { console.log("  ↪ ignorada (!isReady)"); return; }

    const from = msg.from.replace(/@c\.us/, "");
    const text = msg.body?.trim();
    const hasMedia = msg.hasMedia;

    let imageBase64;
    if (hasMedia) {
      try {
        const media = await msg.downloadMedia();
        if (media?.mimetype?.startsWith("image/")) {
          imageBase64 = media.data;
        }
      } catch {}
    }

    try {
      console.log("  ↪ chamando chat()...");
      const result = await chat(from, text || "O que tem nessa imagem?", imageBase64);
      console.log("  ↪ chat() retornou:", result ? "ok" : "null");
      if (result?.text) {
        console.log("  ↪ enviando resposta...");
        await sendMessage(from, result.text);
        console.log("  ↪ resposta enviada!");
      }
      if (result?.action && result?.result) {
        await sendMessage(from, `⚙️ Ação executada!\n\n${result.result}`);
      }
    } catch (err) {
      console.error("WhatsApp chat error:", err.message?.substring(0, 100));
    }
  });

  client.on("auth_failure", (msg) => {
    console.log("❌ Falha de autenticação:", msg);
    isStarting = false;
  });

  client.on("disconnected", async (reason) => {
    isReady = false;
    isStarting = false;
    console.log("❌ WhatsApp desconectado:", reason);
    if (reason === "LOGOUT") {
      console.log("📱 Sessão expirada! Remova o dispositivo em WhatsApp > Dispositivos conectados e reinicie.");
      shouldReconnect = false;
      return;
    }
    if (shouldReconnect) {
      console.log("🔄 Reconectando em 5 segundos...");
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(startClient, 5000);
    }
  });

  client.pupPage?.browser()?.on("disconnected", () => {
    console.log("💥 Navegador Chromium fechou inesperadamente!");
    if (!isReady && !isStarting) {
      console.log("🔄 Tentando reiniciar...");
      startClient();
    }
  });

  client.initialize().catch((err) => {
    console.error("❌ Erro ao iniciar WhatsApp:", err.message?.substring(0, 100));
    isStarting = false;
    clearTimeout(initTimer);
    if (shouldReconnect) {
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(startClient, 10000);
    }
  });

  // Monitor browser crashes (delay longer to let initialization complete)
  setTimeout(() => {
    try {
      const page = client.pupPage;
      if (page) {
        const browser = page.browser();
        browser.on("disconnected", () => {
          if (!isReady && shouldReconnect && !isStarting) {
            console.log("💥 Navegador Chromium fechou. Reconectando...");
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(startClient, 10000);
          }
        });
      }
    } catch {}
  }, 15000);

  initTimer = setTimeout(() => {
    if (!isReady && !qrCodeData) {
      console.log("⏳ WhatsApp ainda iniciando... Se travar, Ctrl+C e tente de novo.");
    }
    isStarting = false;
  }, 35000);
}

async function sendMessage(to, text) {
  if (!isReady || !client) return { error: "WhatsApp não conectado" };
  sendingNow = true;
  try {
    const maxLen = 4096;
    if (text.length <= maxLen) {
      await client.sendMessage(`${to}@c.us`, text);
      return { ok: true };
    }
    for (let i = 0; i < text.length; i += maxLen) {
      await client.sendMessage(`${to}@c.us`, text.slice(i, i + maxLen));
    }
    return { ok: true };
  } catch (err) {
    return { error: err.message?.substring(0, 100) };
  } finally {
    sendingNow = false;
  }
}

function getQrCode() {
  return qrCodeData;
}

function getStatus() {
  return { connected: isReady, hasQr: !!qrCodeData };
}

function waitForConnection() {
  return new Promise((resolve) => {
    if (isReady) return resolve();
    connectResolve = resolve;
  });
}

function stop() {
  shouldReconnect = false;
  clearTimeout(reconnectTimer);
  isStarting = false;
  if (client) {
    try { client.destroy(); } catch {}
    client = null;
  }
  isReady = false;
  qrCodeData = null;
}

startClient();

module.exports = { sendMessage, getQrCode, getStatus, waitForConnection, stop };
