const { exec } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const DESKTOP = path.join(os.homedir(), "Desktop");
const DOWNLOADS = path.join(os.homedir(), "Downloads");
const DOCUMENTS = path.join(os.homedir(), "Documents");

const timers = new Map();
const IS_VERCEL = !!process.env.VERCEL;

const PROTECTED_PROCESSES = [
  "node.exe", "node", "alma-chan", "explorer.exe", "svchost.exe",
  "csrss.exe", "smss.exe", "wininit.exe", "winlogon.exe",
  "services.exe", "lsass.exe", "dwm.exe", "conhost.exe",
  "sihost.exe", "taskhostw.exe", "ShellExperienceHost.exe",
  "SearchUI.exe", "StartMenuExperienceHost.exe",
  "RuntimeBroker.exe", "SearchIndexer.exe",
  "fontdrvhost.exe", "Memory Compression",
  "MsMpEng.exe", "SecurityHealthService.exe",
];

function isProtected(proc) {
  const lower = proc.toLowerCase();
  return PROTECTED_PROCESSES.some(p => lower === p.toLowerCase());
}

function runCommand(cmd, timeout = 15000) {
  if (IS_VERCEL) return Promise.resolve("🌐 Indisponível na versão web.");
  return new Promise((resolve) => {
    exec(cmd, { timeout, encoding: "utf-8", shell: "cmd.exe" }, (err, stdout, stderr) => {
      if (err) resolve(`❌ Erro: ${err.message}`);
      else if (stderr) resolve(stderr.trim());
      else resolve(stdout.trim() || "(sem saída)");
    });
  });
}

function getEmailConfig() {
  const email = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!email || !pass) return null;
  const domain = email.split("@")[1]?.toLowerCase() || "";
  if (domain.includes("gmail")) {
    return { email, pass, host: "smtp.gmail.com", port: 587 };
  }
  if (domain.includes("outlook") || domain.includes("hotmail")) {
    return { email, pass, host: "smtp-mail.outlook.com", port: 587 };
  }
  if (domain.includes("yahoo")) {
    return { email, pass, host: "smtp.mail.yahoo.com", port: 587 };
  }
  return { email, pass, host: process.env.EMAIL_HOST || "smtp.gmail.com", port: parseInt(process.env.EMAIL_PORT) || 587 };
}

const actions = {
  async abrir(args) {
    const alvo = args.trim().toLowerCase().replace(/^o |a |os |as |the /, "");
    if (!alvo) return "❌ O que quer abrir, Pai?";

    const appMap = {
      "chrome": "chrome.exe",
      "google chrome": "chrome.exe",
      "firefox": "firefox.exe",
      "edge": "msedge.exe",
      "navegador": "msedge.exe",
      "brave": "brave.exe",
      "opera": "opera.exe",
      "notepad": "notepad.exe",
      "bloco de notas": "notepad.exe",
      "calculadora": "calc.exe",
      "calc": "calc.exe",
      "explorer": "explorer.exe",
      "gerenciador": "explorer.exe",
      "files": "explorer.exe",
      "arquivos": "explorer.exe",
      "paint": "mspaint.exe",
      "word": "winword.exe",
      "microsoft word": "winword.exe",
      "excel": "excel.exe",
      "powerpoint": "powerpnt.exe",
      "ppt": "powerpnt.exe",
      "vscode": "code.exe",
      "visual studio code": "code.exe",
      "code": "code.exe",
      "terminal": "wt.exe",
      "windows terminal": "wt.exe",
      "cmd": "cmd.exe",
      "prompt": "cmd.exe",
      "powershell": "pwsh.exe",
      "discord": "Discord.exe",
      "spotify": "Spotify.exe",
      "steam": "steam.exe",
      "obs": "obs64.exe",
      "obs studio": "obs64.exe",
      "telegram": "Telegram.exe",
      "whatsapp": "WhatsApp.exe",
      "slack": "Slack.exe",
      "zoom": "Zoom.exe",
      "teams": "ms-teams.exe",
      "skype": "Skype.exe",
      "photoshop": "Photoshop.exe",
      "premiere": "premiere.exe",
      "after effects": "afterfx.exe",
      "blender": "blender.exe",
      "unity": "Unity Hub.exe",
      "unity hub": "Unity Hub.exe",
      "unreal": "UnrealEditor.exe",
      "node": "node.exe",
      "npm": "npm.cmd",
      "git": "git.exe",
      "github desktop": "GitHubDesktop.exe",
      "postman": "Postman.exe",
      "docker": "Docker Desktop.exe",
      "sublime": "sublime_text.exe",
      "sublime text": "sublime_text.exe",
      "notepad++": "notepad++.exe",
      "winrar": "WinRAR.exe",
      "7zip": "7zFM.exe",
      "vlc": "vlc.exe",
      "media player": "wmplayer.exe",
      "galeria": "Microsoft.Photos.exe",
      "fotos": "Microsoft.Photos.exe",
      "camera": "Microsoft.Windows.Photos.exe",
      "configuracoes": "ms-settings:",
      "config": "ms-settings:",
      "settings": "ms-settings:",
      "painel": "ms-settings:",
      "windows update": "ms-settings:windowsupdate",
      "wifi": "ms-settings:network-wifi",
      "bluetooth": "ms-settings:bluetooth",
      "display": "ms-settings:display",
      "tela": "ms-settings:display",
      "som": "ms-settings:sound",
      "volume": "ms-settings:sound",
      "wallpaper": "ms-settings:personalization",
      "paint 3d": "Paint3D.exe",
      "snipping tool": "SnippingTool.exe",
      "captura": "SnippingTool.exe",
      "print": "SnippingTool.exe",
      "task manager": "Taskmgr.exe",
      "gerenciador de tarefas": "Taskmgr.exe",
      "processos": "Taskmgr.exe",
      "cmd": "cmd.exe",
    };

    const resolved = appMap[alvo];
    if (resolved) {
      if (resolved.startsWith("ms-settings:")) {
        return runCommand(`start "${resolved}"`);
      }
      const r = await runCommand(`start "${resolved}"`);
      if (!r.includes("Erro")) return r;
    }

    const searchPaths = [
      path.join(os.homedir(), "AppData", "Local", "Programs"),
      path.join(os.homedir(), "AppData", "Roaming"),
      "C:\\Program Files",
      "C:\\Program Files (x86)",
      "C:\\",
    ];

    for (const searchDir of searchPaths) {
      try {
        const items = fs.readdirSync(searchDir);
        for (const item of items) {
          if (item.toLowerCase().includes(alvo) || alvo.includes(item.toLowerCase().replace(/\.(exe|lnk)$/i, ""))) {
            const fullPath = path.join(searchDir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              const subItems = fs.readdirSync(fullPath).filter(f => f.endsWith(".exe"));
              if (subItems.length > 0) {
                return runCommand(`start "${path.join(fullPath, subItems[0])}"`);
              }
            } else if (item.endsWith(".exe")) {
              return runCommand(`start "${fullPath}"`);
            }
          }
        }
      } catch {}
    }

    const r = await runCommand(`start "${alvo}"`);
    if (r.includes("Erro")) {
      const search = await runCommand(`powershell -Command "Get-Command '${alvo}' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source"`);
      if (search && !search.includes("Erro")) {
        return runCommand(`start "${search}"`);
      }
      return `❌ Não encontrei "${alvo}". Tente o nome exato do .exe`;
    }
    return r;
  },

  async cmd(args) {
    if (!args.trim()) return "❌ Digite um comando para executar.";
    return runCommand(args.trim(), 30000);
  },

  async listar(args) {
    const dir = args.trim() || DESKTOP;
    try {
      const items = fs.readdirSync(dir);
      const list = items.map((i) => {
        const full = path.join(dir, i);
        const stat = fs.statSync(full);
        return stat.isDirectory() ? `📁 ${i}` : `📄 ${i}`;
      });
      return list.join("\n") || "(pasta vazia)";
    } catch {
      return "❌ Não consegui acessar essa pasta.";
    }
  },

  async ler(args) {
    const filePath = args.trim();
    if (!filePath) return "❌ Qual arquivo quer ler?";
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return content.slice(0, 1500) + (content.length > 1500 ? "\n... (cortado)" : "");
    } catch {
      return "❌ Não consegui ler esse arquivo.";
    }
  },

  async sistema() {
    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      return acc + (cpu.times.user + cpu.times.nice) / total;
    }, 0) / cpus.length * 100;

    const info = [
      `💻 ${os.platform()} ${os.release()}`,
      `🧠 CPU: ${cpus[0].model} (${cpus.length} cores) - ${cpuUsage.toFixed(0)}% uso`,
      `🔋 RAM: ${(os.totalmem() / 1e9).toFixed(1)}GB total, ${(os.freemem() / 1e9).toFixed(1)}GB livre (${((1 - os.freemem() / os.totalmem()) * 100).toFixed(0)}% uso)`,
      `⏰ Uptime: ${(os.uptime() / 3600).toFixed(1)}h`,
      `👤 Usuário: ${os.userInfo().username}`,
      `🏠 Host: ${os.hostname()}`,
    ];
    return info.join("\n");
  },

  async screenshot() {
    const outDir = IS_VERCEL ? os.tmpdir() : DOWNLOADS;
    const outPath = path.join(outDir, `alma-screenshot-${Date.now()}.png`);
    const cmd = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen | ForEach-Object { $bmp = New-Object System.Drawing.Bitmap($_.Bounds.Width, $_.Bounds.Height); $gfx = [System.Drawing.Graphics]::FromImage($bmp); $gfx.CopyFromScreen($_.Bounds.Location, [System.Drawing.Point]::Empty, $_.Bounds.Size); $bmp.Save('${outPath}') }"`;
    await runCommand(cmd, 10000);
    if (fs.existsSync(outPath)) {
      const b64 = fs.readFileSync(outPath).toString("base64");
      return JSON.stringify({ type: "image", path: outPath, base64: b64 });
    }
    return "❌ Não consegui tirar screenshot.";
  },

  async notificar(args) {
    const msg = args.trim() || "Olá do Alma-chan! 🌸";
    const cmd = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $n = New-Object System.Windows.Forms.NotifyIcon; $n.Icon = [System.Drawing.SystemIcons]::Information; $n.Visible = $true; $n.ShowBalloonTip(3000, 'Alma-chan', '${msg.replace(/'/g, "''")}', 'Info')"`;
    return runCommand(cmd);
  },

  async pesquisar(args) {
    const q = args.trim();
    if (!q) return "❌ O que quer pesquisar?";

    // Use Gemini with Google Search Grounding when key is available
    if (process.env.GEMINI_API_KEY) {
      const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
      const { GoogleGenAI } = require("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      for (const model of models) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: q,
            config: { tools: [{ google_search: {} }] },
          });

          const text = response.text;
          if (text) {
            let result = `🔍 **Google (via ${model})**\n\n${text}`;
            const meta = response.candidates?.[0]?.groundingMetadata;
            if (meta?.groundingChunks?.length) {
              const sources = meta.groundingChunks
                .filter(c => c.web?.uri)
                .map((c, i) => `${i + 1}. ${c.web.title || c.web.uri}\n   ${c.web.uri}`);
              if (sources.length) result += `\n\n📚 **Fontes:**\n${sources.join("\n")}`;
            }
            return result;
          }
        } catch (e) {
          console.error(`Gemini ${model} search failed:`, e.message);
        }
      }
      // All Gemini models failed, fall through to DuckDuckGo
    }

    // Fallback: DuckDuckGo
    try {
      const https = require("https");
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
      const result = await new Promise((resolve, reject) => {
        https.get(url, (res) => {
          let data = "";
          res.on("data", c => data += c);
          res.on("end", () => {
            try {
              const json = JSON.parse(data);
              let text = json.AbstractText || json.Heading || "";
              if (json.RelatedTopics?.length) {
                const extras = json.RelatedTopics.slice(0, 5).map(t => t.Text || t.FirstURL).filter(Boolean);
                if (extras.length) text += "\n\n" + extras.join("\n");
              }
              resolve(text || "Nada encontrado.");
            } catch { reject(new Error("Parse error")); }
          });
        }).on("error", reject);
      });
      return result ? `🔍 Resultado da pesquisa (DuckDuckGo):\n\n${result.substring(0, 2000)}` : "🔍 Nada encontrado.";
    } catch (err) {
      return `❌ Erro ao pesquisar: ${err.message?.substring(0, 100)}`;
    }
  },

  async digitar(args) {
    const texto = args.trim();
    if (!texto) return "❌ O que quer digitar?";
    const cmd = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${texto.replace(/'/g, "''").replace(/\\/g, "\\\\")}')"`;
    return runCommand(cmd);
  },

  async volume(args) {
    const val = args.trim();
    if (!val) return "❌ Use: volume mute / unmute / 50";
    if (val === "mute" || val === "unmute") return runCommand("powershell -Command \"$obj = New-Object -ComObject WScript.Shell; $obj.SendKeys([char]173)\"");
    return runCommand(`powershell -Command "$obj = New-Object -ComObject WScript.Shell; 1..50 | ForEach-Object { $obj.SendKeys([char]174) }; 1..${Math.floor(Number(val) / 2)} | ForEach-Object { $obj.SendKeys([char]175) }"`);
  },

  async wifi() {
    return runCommand("netsh wlan show interfaces");
  },

  async processos() {
    return runCommand("tasklist /FO CSV | head -20");
  },

  async desligar() {
    return runCommand("shutdown /s /t 60 /c \"Alma-chan desligando o PC...\"");
  },

  async reiniciar() {
    return runCommand("shutdown /r /t 60 /c \"Alma-chan reiniciando o PC...\"");
  },

  async cancelar_desligar() {
    return runCommand("shutdown /a");
  },

  async sites(args) {
    const url = args.trim();
    if (!url) return "❌ Qual site quer abrir?";
    if (!url.startsWith("http")) return runCommand(`start "https://${url}"`);
    return runCommand(`start "${url}"`);
  },

  async bloquear() {
    return runCommand("rundll32.exe user32.dll,LockWorkStation");
  },

  async clipboard() {
    const result = await runCommand("powershell -Command \"Get-Clipboard -ErrorAction SilentlyContinue\"");
    return result || "📋 Clipboard vazio";
  },

  async copiar(args) {
    const texto = args.trim();
    if (!texto) return "❌ O que quer copiar?";
    return runCommand(`powershell -Command "Set-Clipboard -Value '${texto.replace(/'/g, "''")}'"`);
  },

  async espaco() {
    return runCommand("wmic logicaldisk get size,freespace,caption /format:csv");
  },

  async matar(args) {
    const proc = args.trim();
    if (!proc) return "❌ Qual processo quer fechar?";
    if (isProtected(proc)) return `🚫 Processo protegido! Não posso fechar "${proc}" por segurança.`;
    return runCommand(`taskkill /IM "${proc}" /F`);
  },

  async salvar(args) {
    const texto = args.trim();
    if (!texto) return "❌ O que quer salvar?";
    const parts = texto.split("|");
    const conteudo = parts[0].trim();
    const nome = (parts[1] || `alma-${Date.now()}.txt`).trim();
    const filePath = path.join(DOWNLOADS, nome);
    fs.writeFileSync(filePath, conteudo);
    return `📄 Salvo em: ${filePath}`;
  },

  async alarme(args) {
    const text = args.trim();
    if (!text) return "❌ Use: alarme 5min tomar agua";
    const match = text.match(/^(\d+)(min|h|s|m)\s+(.+)/i);
    if (!match) return "❌ Formato: alarme 5min mensagem";
    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const msg = match[3];
    let ms = amount * 1000;
    if (unit === "min" || unit === "m") ms = amount * 60 * 1000;
    if (unit === "h") ms = amount * 3600 * 1000;

    const id = Date.now().toString(36);
    const timeout = setTimeout(() => {
      timers.delete(id);
      exec(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $n = New-Object System.Windows.Forms.NotifyIcon; $n.Icon = [System.Drawing.SystemIcons]::Warning; $n.Visible = $true; $n.ShowBalloonTip(5000, '⏰ Alarme Alma-chan', '${msg.replace(/'/g, "''")}', 'Warning')"`, { windowsHide: true });
    }, ms);
    timers.set(id, timeout);
    return `⏰ Alarme definido! ${amount}${unit} - "${msg}"`;
  },

  async cancelar_alarme() {
    for (const [id, t] of timers) clearTimeout(t);
    timers.clear();
    return "⏰ Todos os alarmes cancelados!";
  },

  async webshot(args) {
    const url = args.trim();
    if (!url) return "❌ Qual site quer capturar?";
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const outPath = path.join(DOWNLOADS, `alma-webshot-${Date.now()}.png`);
    const cmd = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $wc = New-Object System.Net.WebClient; $bmp = New-Object System.Drawing.Bitmap(1280, 720); $gfx = [System.Drawing.Graphics]::FromImage($bmp); $gfx.DrawString('Carregando...', (New-Object System.Drawing.Font('Arial', 20)), [System.Drawing.Brushes]::White, 500, 350); $bmp.Save('${outPath}')"`;
    await runCommand(cmd, 10000);
    return `📸 Webshot de ${url} salvo! (Implementação futura com browser headless)`;
  },

  async python(args) {
    if (!args.trim()) return "❌ Digite o código Python.";
    const tmpFile = path.join(os.tmpdir(), `alma-${Date.now()}.py`);
    fs.writeFileSync(tmpFile, args.trim());
    const result = await runCommand(`python "${tmpFile}"`, 30000);
    try { fs.unlinkSync(tmpFile); } catch {}
    return result;
  },

  async calculator(args) {
    const expr = args.trim();
    if (!expr) return "❌ Use: calculator 2+2*3";
    try {
      const safe = expr.replace(/[^0-9+\-*/().% ]/g, "");
      const result = Function(`"use strict"; return (${safe})`)();
      return `🧮 ${expr} = ${result}`;
    } catch {
      return "❌ Expressão inválida.";
    }
  },

  async data() {
    const now = new Date();
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" };
    return `📅 ${now.toLocaleDateString("pt-BR", options)}`;
  },

  async sorte(args) {
    const items = args.split("|").map(s => s.trim()).filter(Boolean);
    if (items.length < 2) return "❌ Use: sorte opcao1 | opcao2 | opcao3";
    const pick = items[Math.floor(Math.random() * items.length)];
    return `🎲 Sorteio: **${pick}** (de ${items.length} opções)`;
  },

  async moeda() {
    const r = Math.random();
    return r > 0.5 ? "🪙 Cara!" : "🪙 Coroa!";
  },

  async dado() {
    return `🎲 Você tirou: **${Math.floor(Math.random() * 6) + 1}**`;
  },

  async piada() {
    const piadas = [
      "Por que o programador usa óculos? Porque não consegue C#! 😂",
      "O que o HTML falou pro CSS? Você não tem estilo! 😄",
      "Por que o JavaScript foi ao médico? Porque tinha many problems! 😆",
      "Qual a comida favorita do programador? Spaghetti code! 🍝",
      "Por que o programador confunde Halloween e Natal? Porque OCT 31 = DEC 25! 🎃",
      "Um bug entrou num bar. O bartender diz: 'Nós não servimos seu tipo aqui.' O bug responde: 'Mas eu já estou em todo lugar!' 🪲",
      "Como o programador apronta a cama? Com try-catch! 🛏️",
    ];
    return piadas[Math.floor(Math.random() * piadas.length)];
  },

  async joke() {
    return actions.piada();
  },

  async gerar_imagem(args) {
    const prompt = args.trim();
    if (!prompt) return "❌ O que quer que eu desenhe?";
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true`;
    const outPath = path.join(DOWNLOADS, `alma-img-${Date.now()}.png`);
    try {
      const result = await runCommand(`powershell -Command "Invoke-WebRequest -Uri '${url}' -OutFile '${outPath}'"`, 60000);
      if (fs.existsSync(outPath)) {
        const b64 = fs.readFileSync(outPath).toString("base64");
        return JSON.stringify({ type: "image", path: outPath, base64: b64 });
      }
      return "❌ Não consegui gerar a imagem.";
    } catch {
      return "❌ Erro ao gerar imagem.";
    }
  },

  async desenhar(args) {
    return actions.gerar_imagem(args);
  },

  async draw(args) {
    return actions.gerar_imagem(args);
  },

  async gerar(args) {
    return actions.gerar_imagem(args);
  },

  async musica(args) {
    try {
      const MidiWriter = require("midi-writer-js");
      const desc = (args || "alegre").toLowerCase();
      
      const melodies = {
        "alegre": ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
        "triste": ["E4", "D4", "C4", "B3", "A3", "G3", "F3", "E3"],
        "rapida": ["C5", "G4", "E4", "C4", "G3", "E3", "C3", "G2"],
        "calma": ["C4", "E4", "G4", "E4", "C4", "G3", "E3", "C3"],
        "rock": ["E4", "E4", "G4", "A4", "G4", "E4", "D4", "C4"],
        "jazz": ["C4", "Eb4", "G4", "Bb4", "A4", "G4", "F4", "Eb4"],
        "classica": ["C4", "E4", "G4", "C5", "B4", "G4", "E4", "C4"],
        "eletronica": ["C4", "C4", "Eb4", "G4", "C5", "G4", "Eb4", "C4"],
      };

      let notes = melodies["alegre"];
      for (const [key, val] of Object.entries(melodies)) {
        if (desc.includes(key)) { notes = val; break; }
      }

      const track = new MidiWriter.Track();
      track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 0 }));
      
      const noteSequence = [];
      for (let i = 0; i < 16; i++) {
        noteSequence.push(
          new MidiWriter.NoteEvent({ 
            pitch: [notes[i % notes.length]], 
            duration: "8", 
            velocity: 80 + Math.floor(Math.random() * 40) 
          })
        );
      }
      track.addEvent(noteSequence);

      const writer = new MidiWriter.Writer([track]);
      const outDir = IS_VERCEL ? os.tmpdir() : DOWNLOADS;
      const outPath = path.join(outDir, `alma-musica-${Date.now()}.mid`);
      const dataUri = writer.dataUri();
      const base64 = dataUri.split(",")[1];
      fs.writeFileSync(outPath, Buffer.from(base64, "base64"));
      
      return JSON.stringify({ 
        type: "music", 
        path: outPath, 
        desc: desc,
        notes: notes.join(", ")
      });
    } catch (err) {
      return `❌ Erro ao gerar música: ${err.message}`;
    }
  },

  async music(args) {
    return actions.musica(args);
  },

  async foco(args) {
    const mode = (args || "on").toLowerCase();
    if (mode === "off" || mode === "desligar" || mode === "sair") {
      await runCommand("powershell -Command \"Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | ForEach-Object {$_.MainWindowHandle} | ForEach-Object { Add-Type -Name Win -Namespace Native -MemberDefinition '[DllImport(\\\"user32.dll\\\")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);'; [Native.Win]::ShowWindowAsync($_, 9) }\"");
      return "🎯 Modo foco DESATIVADO! Janelas restauradas.";
    }
    
    const distracting = ["Discord.exe", "Steam.exe", "Spotify.exe", "WhatsApp.exe", "Telegram.exe", "Slack.exe"];
    let closed = [];
    for (const proc of distracting) {
      if (!isProtected(proc)) {
        await runCommand(`taskkill /IM "${proc}" /F`);
        closed.push(proc.replace(".exe", ""));
      }
    }
    
    await runCommand("powershell -Command \"Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Focus { [DllImport(\\\"user32.dll\\\")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow); }'; $apps = @('Code.exe', 'chrome.exe', 'msedge.exe'); foreach($app in $apps) { Get-Process -Name $app -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowHandle -ne 0} | ForEach-Object { [Focus]::ShowWindowAsync($_.MainWindowHandle, 3) } }\"");
    
    await runCommand("powershell -Command \"New-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\\Windows.SystemToast\\DoNotDisturb' -Name 'Enabled' -Value 0 -Force -ErrorAction SilentlyContinue\"");
    
    return `🎯 Modo foco ATIVADO!\n${closed.length > 0 ? `❌ Fechou: ${closed.join(", ")}` : "Nenhum app distrativo encontrado"}\n🔇 Notificações silenciadas`;
  },

  async janelas(args) {
    const layout = (args || "split").toLowerCase();
    
    if (layout === "max" || layout === "maximizar") {
      return runCommand("powershell -Command \"Add-Type -Name Win -Namespace Native -MemberDefinition '[DllImport(\\\"user32.dll\\\")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);'; Get-Process | Where-Object {$_.MainWindowTitle -ne '' -and $_.MainWindowHandle -ne 0} | ForEach-Object { [Native.Win]::ShowWindowAsync($_.MainWindowHandle, 3) }\"");
    }
    
    if (layout === "min" || layout === "minimizar") {
      return runCommand("powershell -Command \"Add-Type -Name Win -Namespace Native -MemberDefinition '[DllImport(\\\"user32.dll\\\")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);'; Get-Process | Where-Object {$_.MainWindowTitle -ne '' -and $_.MainWindowHandle -ne 0} | ForEach-Object { [Native.Win]::ShowWindowAsync($_.MainWindowHandle, 6) }\"");
    }
    
    const screen = await runCommand("powershell -Command \"Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width\"");
    const width = parseInt(screen) || 1920;
    const half = Math.floor(width / 2);
    
    return runCommand(`powershell -Command "Add-Type -Name Win -Namespace Native -MemberDefinition '[DllImport(\\\"user32.dll\\\")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int W, int H, bool repaint); [DllImport(\\\"user32.dll\\\")] public static extern bool SetForegroundWindow(IntPtr hWnd);'; $procs = Get-Process | Where-Object {$_.MainWindowTitle -ne '' -and $_.MainWindowHandle -ne 0} | Select-Object -First 2; if($procs.Count -ge 1) { [Native.Win]::MoveWindow($procs[0].MainWindowHandle, 0, 0, ${half}, 1080, $true) }; if($procs.Count -ge 2) { [Native.Win]::MoveWindow($procs[1].MainWindowHandle, ${half}, 0, ${half}, 1080, $true) }"`);
  },

  async spotify(args) {
    const cmd = (args || "play").toLowerCase();
    const actions_map = {
      "play": "[char]179", "pause": "[char]179", "pausar": "[char]179",
      "next": "[char]176", "proximo": "[char]176", "proxima": "[char]176",
      "prev": "[char]177", "anterior": "[char]177", "voltar": "[char]177",
      "volup": "[char]175", "mais": "[char]175", "vol+": "[char]175",
      "voldown": "[char]174", "menos": "[char]174", "vol-": "[char]174",
      "mute": "[char]173", "mutar": "[char]173",
      "like": "^({DOWN}{ENTER})",
    };
    const key = actions_map[cmd] || "[char]179";
    return runCommand(`powershell -Command "$obj = New-Object -ComObject WScript.Shell; Start-Sleep -Milliseconds 200; $obj.SendKeys(${key})"`);
  },

  async media(args) {
    return actions.spotify(args);
  },

  async tocar(args) {
    const query = args.trim().toLowerCase();
    if (!query) return "❌ O que quer tocar?";

    const ytUrls = {
      "lofi": "https://www.youtube.com/watch?v=jfKfPfyJRdk&list=RDi43tkaTXtwI&start_radio=1",
      "lofi study": "https://www.youtube.com/watch?v=jfKfPfyJRdk&list=RDi43tkaTXtwI&start_radio=1",
      "lofi girls": "https://www.youtube.com/watch?v=jfKfPfyJRdk&list=RDi43tkaTXtwI&start_radio=1",
      "estudar": "https://www.youtube.com/watch?v=jfKfPfyJRdk&list=RDi43tkaTXtwI&start_radio=1",
      "trabalhar": "https://www.youtube.com/watch?v=jfKfPfyJRdk&list=RDi43tkaTXtwI&start_radio=1",
      "noite": "https://www.youtube.com/watch?v=i43tkaTXtwI&list=RDi43tkaTXtwI&start_radio=1",
      "lofi noite": "https://www.youtube.com/watch?v=i43tkaTXtwI&list=RDi43tkaTXtwI&start_radio=1",
      "relax": "https://www.youtube.com/watch?v=jfKfPfyJRdk&list=RDi43tkaTXtwI&start_radio=1",
      "chill": "https://www.youtube.com/watch?v=jfKfPfyJRdk&list=RDi43tkaTXtwI&start_radio=1",
      "dormir": "https://www.youtube.com/watch?v=jfKfPfyJRdk&list=RDi43tkaTXtwI&start_radio=1",
    };

    const ytSearch = {
      "lofi gamer": "lofi gaming music mix",
      "lofi anime": "lofi anime music mix",
      "lofi pokemon": "pokemon lofi mix",
      "rock": "rock music mix",
      "metal": "metal music mix",
      "jazz": "jazz music mix",
      "classica": "classical music mix",
      "electronic": "electronic music mix",
      "edm": "edm music mix",
      "hip hop": "hip hop music mix",
      "pop": "pop music mix",
      "country": "country music mix",
      "kpop": "kpop music mix",
      "funk": "funk brasileiro mix",
      "sertanejo": "sertanejo mix",
      "pagode": "pagode mix",
      "mpb": "mpb music mix",
      "samba": "samba mix",
      "reggae": "reggae music mix",
      "ambient": "ambient music mix",
      "treinar": "workout motivation music mix",
      "gaming": "gaming music mix",
    };

    let ytUrl = ytUrls[query];
    if (ytUrl) {
      await runCommand(`start "${ytUrl}"`);
      return `🎵 Abrindo "${query}" no YouTube! 🌸`;
    }

    let ytQuery = ytSearch[query] || query;
    await runCommand(`start https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}`);
    
    return `🎵 Abrindo "${ytQuery}" no YouTube! 🌸`;
  },

  async play(args) {
    return actions.tocar(args);
  },

  async ocr() {
    const outPath = path.join(DOWNLOADS, `alma-ocr-${Date.now()}.png`);
    await runCommand(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen | ForEach-Object { $bmp = New-Object System.Drawing.Bitmap($_.Bounds.Width, $_.Bounds.Height); $gfx = [System.Drawing.Graphics]::FromImage($bmp); $gfx.CopyFromScreen($_.Bounds.Location, [System.Drawing.Point]::Empty, $_.Bounds.Size); $bmp.Save('${outPath}') }"`, 10000);
    
    if (!fs.existsSync(outPath)) return "❌ Não consegui capturar a tela.";
    
    const b64 = fs.readFileSync(outPath).toString("base64");
    return JSON.stringify({ type: "image", path: outPath, base64: b64, requestOCR: true });
  },

  async ler_tela() {
    return actions.ocr();
  },

  async confirmar(args) {
    const action = args.trim();
    if (!action) return "❌ Nenhuma ação pendente.";
    if (action === "desligar") {
      await runCommand("shutdown /s /t 10");
      return "⏻ Desligando em 10 segundos... Adeus, Pai! 🌸";
    }
    if (action === "reiniciar") {
      await runCommand("shutdown /r /t 10");
      return "🔄 Reiniciando em 10 segundos!";
    }
    return `✅ Ação "${action}" confirmada!`;
  },

  async cancelar() {
    await runCommand("shutdown /a");
    return "❌ Operação cancelada! Obrigada por confirmar, Pai! 🌸";
  },

  async memorar(args) {
    const texto = args.trim();
    if (!texto) return "❌ O que quer que eu lembre?";
    const mem = require("./memory");
    await mem.rememberFact(texto);
    return `🧠 Vou lembrar: "${texto}" ✨`;
  },

  async lembrar() {
    const mem = require("./memory");
    const facts = await mem.getFacts();
    if (facts.length === 0) return "🧠 Ainda não lembro de nada específico, Pai.";
    return `🧠 Coisas que lembro:\n${facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}`;
  },

  async esquecer(args) {
    const idx = parseInt(args.trim()) - 1;
    const mem = require("./memory");
    await mem.forgetFact(idx);
    return "🧠 Esqueci! 🌸";
  },

  async nome(args) {
    const nome = args.trim();
    if (!nome) return "❌ Qual seu nome, Pai?";
    const mem = require("./memory");
    await mem.setUserName("default", nome);
    return `🌸 Que belo nome, ${nome}! Vou me lembrar! 🥰`;
  },

  // --- User recognition (per-user) ---
  async meu_nome(args, userId) {
    const nome = args.trim();
    if (!nome) return "❌ Me diz seu nome, Pai!";
    const mem = require("./memory");
    await mem.setUserName(userId, nome);
    return `🌸 Prazer, ${nome}! Agora vou lembrar de você sempre que falar comigo! 🥰`;
  },

  async quem_sou(args, userId) {
    const mem = require("./memory");
    const name = await mem.getUserName(userId);
    if (name) return `🌸 Você é ${name}, meu Pai! Claro que lembro de você! 🥰`;
    return "👀 Hmm, não sei ainda... Me conta seu nome? (usa: meu_nome SeuNome)";
  },

  async relatorio(args) {
    const mem = require("./memory");
    const text = args.trim();
    if (text) {
      await mem.saveLearningLog("default", text);
      return `📋 Relatório salvo no banco de dados! ✨`;
    }
    const logs = await mem.getLearningLogs("default", 7);
    if (logs.length === 0) return "📋 Nenhum relatório ainda, Pai.";
    return `📋 Relatórios de Aprendizado:\n${logs.map((l, i) => `${i + 1}. [${l.created_at}] ${l.summary}`).join("\n")}`;
  },

  // --- Personal Assistant: Tasks ---
  async tarefa(args) {
    const parts = args.split(";").map(s => s.trim());
    const title = parts[0];
    if (!title) return "❌ Use: tarefa título; descrição; prioridade(alta/normal/baixa); data(dd/mm); categoria; repetir(diario/semanal)";
    const mem = require("./memory");
    const task = await mem.addTask("default", title, parts[1], parts[2], parts[3], parts[4], parts[5]);
    return `📝 Tarefa adicionada! #${task.id} - "${title}" ✨`;
  },

  async addtask(args) { return actions.tarefa(args); },

  async tarefas() {
    const mem = require("./memory");
    const all = await mem.listTasks("default");
    if (!all.length) return "📝 Nenhuma tarefa! Tudo em dia, Pai! 🌸";
    const pending = all.filter(t => t.status === "pending");
    const done = all.filter(t => t.status === "done");
    let msg = "📋 **TAREFAS**\n";
    if (pending.length) {
      msg += `\n⏳ Pendentes (${pending.length}):\n`;
      pending.forEach(t => {
        msg += `  #${t.id} ${t.priority === "alta" ? "🔴" : t.priority === "baixa" ? "🟢" : "🟡"} ${t.title}`;
        if (t.due_date) msg += ` (${t.due_date})`;
        msg += "\n";
      });
    }
    if (done.length) {
      msg += `\n✅ Concluídas (${done.length}):\n`;
      done.slice(0, 5).forEach(t => msg += `  #${t.id} ~~${t.title}~~\n`);
    }
    return msg.trim();
  },

  async tasks(args) { return actions.tarefas(args); },
  async listartarefas(args) { return actions.tarefas(args); },

  async completar(args) {
    const id = parseInt(args.trim());
    if (!id) return "❌ Use: completar <número da tarefa>";
    const mem = require("./memory");
    const task = await mem.completeTask("default", id);
    if (!task) return "❌ Tarefa não encontrada!";
    return `✅ Tarefa #${id} "${task.title}" concluída! 🎉`;
  },

  async concluir(args) { return actions.completar(args); },

  async removertarefa(args) {
    const id = parseInt(args.trim());
    if (!id) return "❌ Use: remover_tarefa <número>";
    const mem = require("./memory");
    await mem.deleteTask("default", id);
    return `🗑️ Tarefa #${id} removida!`;
  },

  async deletartarefa(args) { return actions.removertarefa(args); },

  // --- Calendar Events ---
  async evento(args) {
    const parts = args.split(";").map(s => s.trim());
    const title = parts[0];
    if (!title) return "❌ Use: evento título; descrição; data/hora início; data/hora fim; local\nEx: evento Reunião; discutir projeto; 25/12 14:00; 25/12 15:00; Sala 3";
    const mem = require("./memory");
    const ev = await mem.addEvent("default", title, parts[1], parts[2], parts[3], parts[4]);
    return `📅 Evento criado! #${ev.id} - "${title}" ✨`;
  },

  async addevent(args) { return actions.evento(args); },

  async eventos(args) {
    const mem = require("./memory");
    const list = await mem.listEvents("default", args.trim() || null);
    if (!list.length) return "📅 Nenhum evento encontrado!";
    let msg = "📅 **AGENDA**\n";
    list.forEach(ev => {
      msg += `  #${ev.id} ${ev.title} - ${ev.start_time}`;
      if (ev.location) msg += ` 📍${ev.location}`;
      msg += "\n";
    });
    return msg.trim();
  },

  async agenda(args) { return actions.eventos(args); },

  async removerevento(args) {
    const id = parseInt(args.trim());
    if (!id) return "❌ Use: remover_evento <número>";
    const mem = require("./memory");
    await mem.deleteEvent("default", id);
    return `🗑️ Evento #${id} removido!`;
  },

  // --- Weather ---
  async clima(args) {
    const city = args.trim() || (() => { const m = require("./memory"); return m.getPreferences("default").cidade; })();
    if (!city) return "❌ Qual cidade, Pai? Use: clima São Paulo\nou configure: configurar_cidade São Paulo";

    try {
      // Geocode
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt`);
      const geo = await geoRes.json();
      if (!geo.results?.length) return `❌ Cidade "${city}" não encontrada!`;
      const { latitude, longitude, name, country } = geo.results[0];

      // Weather
      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`);
      const w = await wRes.json();

      const codes = { 0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",51:"🌦️",53:"🌦️",55:"🌦️",61:"🌧️",63:"🌧️",65:"🌧️",71:"🌨️",73:"🌨️",75:"🌨️",80:"🌧️",81:"🌧️",82:"🌧️",95:"⛈️",96:"⛈️",99:"⛈️" };
      const code = w.current.weather_code;
      const emoji = codes[code] || "🌡️";

      let msg = `🌤️ **Clima em ${name}, ${country}**\n`;
      msg += `${emoji} ${w.current.temperature_2m}°C (sensação ${w.current.apparent_temperature}°C)\n`;
      msg += `💧 Umidade: ${w.current.relative_humidity_2m}% | 💨 Vento: ${w.current.wind_speed_10m} km/h\n`;
      msg += `📊 Pressão: ${w.current.pressure_msl} hPa\n`;
      if (w.daily) {
        msg += `\n📅 Hoje: ${codes[w.daily.weather_code[0]] || "🌡️"} ${w.daily.temperature_2m_min[0]}°C ~ ${w.daily.temperature_2m_max[0]}°C`;
      }
      return msg;
    } catch (err) {
      return `❌ Erro ao buscar clima: ${err.message}`;
    }
  },

  async tempo(args) { return actions.clima(args); },
  async weather(args) { return actions.clima(args); },

  async configurarcidade(args) {
    const city = args.trim();
    if (!city) return "❌ Use: configurar_cidade São Paulo";
    const mem = require("./memory");
    await mem.setPreference("default", "cidade", city);
    return `🏙️ Cidade padrão configurada: ${city}!`;
  },

  // --- News ---
  async noticias() {
    const feeds = [
      "https://g1.globo.com/rss/g1/",
      "https://rss.uol.com.br/feed/noticias.xml",
      "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml",
    ];
    try {
      const text = await (await fetch(feeds[0])).text();
      const items = [...text.matchAll(/<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g)].slice(0, 8);
      if (!items.length) return "📰 Não consegui buscar notícias agora 😵";

      let msg = "📰 **Últimas Notícias**\n\n";
      items.forEach((item, i) => {
        msg += `${i + 1}. ${item[1].trim()}\n   ${item[2].trim()}\n\n`;
      });
      return msg.trim();
    } catch (err) {
      return `❌ Erro ao buscar notícias: ${err.message}`;
    }
  },

  async news(args) { return actions.noticias(args); },

  async configemail(args) {
    return "📧 Email configurado via .env! Use EMAIL_USER e EMAIL_PASS no .env\nEx: EMAIL_USER=meuemail@gmail.com\n    EMAIL_PASS=senha_app";
  },

  async configuremail(args) { return actions.configemail(args); },

  async enviaremail(args) {
    const cfg = getEmailConfig();
    if (!cfg) return "❌ Configure EMAIL_USER e EMAIL_PASS no .env primeiro!";
    const parts = args.split(";").map(s => s.trim());
    const to = parts[0];
    const subject = parts[1] || "Mensagem de ALM-01P";
    const body = parts[2] || "Enviado por ALM-01P 🌸";
    if (!to) return "❌ Use: enviar_email destinatario; assunto; mensagem";
    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: cfg.host, port: cfg.port, secure: false,
        auth: { user: cfg.email, pass: cfg.pass },
      });
      const info = await transporter.sendMail({
        from: `"ALM-01P 🌸" <${cfg.email}>`, to, subject, text: body,
      });
      return `📧 Email enviado para ${to}! ID: ${info.messageId} ✨`;
    } catch (err) {
      return `❌ Erro ao enviar email: ${err.message}`;
    }
  },

  async sendemail(args) { return actions.enviaremail(args); },

  // --- General-purpose super actions ---
  async executar(args) { return actions.cmd(args); },
  async exec(args) { return actions.cmd(args); },
  async powershell(args) { return actions.cmd(args); },

  async baixar(args) {
    const parts = args.trim().split(/\s+/);
    const url = parts[0];
    if (!url) return "❌ Use: baixar <url> [nome_arquivo]";
    const nome = parts[1] || url.split("/").pop() || `download-${Date.now()}`;
    const outPath = path.join(DOWNLOADS, nome);
    try {
      const r = await runCommand(`powershell -Command "Invoke-WebRequest -Uri '${url}' -OutFile '${outPath}'"`, 120000);
      return `📥 Download concluído: ${outPath}`;
    } catch (e) {
      return `❌ Erro ao baixar: ${e.message?.substring(0, 100)}`;
    }
  },

  async download(args) { return actions.baixar(args); },

  async compactar(args) {
    const parts = args.split(";").map(s => s.trim());
    const pasta = parts[0];
    const zipName = parts[1] || `arquivo-${Date.now()}.zip`;
    if (!pasta) return "❌ Use: compactar pasta_origem; [nome.zip]";
    const outPath = path.join(DOWNLOADS, zipName);
    try {
      await runCommand(`powershell -Command "Compress-Archive -Path '${pasta}' -DestinationPath '${outPath}' -Force"`, 30000);
      return `📦 Compactado: ${outPath}`;
    } catch (e) {
      return `❌ Erro ao compactar: ${e.message?.substring(0, 100)}`;
    }
  },

  async zip(args) { return actions.compactar(args); },

  async extrair(args) {
    const parts = args.split(";").map(s => s.trim());
    const zipFile = parts[0];
    const destino = parts[1] || DOWNLOADS;
    if (!zipFile) return "❌ Use: extrair arquivo.zip; [pasta_destino]";
    try {
      await runCommand(`powershell -Command "Expand-Archive -Path '${zipFile}' -DestinationPath '${destino}' -Force"`, 30000);
      return `📂 Extraído para: ${destino}`;
    } catch (e) {
      return `❌ Erro ao extrair: ${e.message?.substring(0, 100)}`;
    }
  },

  async unzip(args) { return actions.extrair(args); },
  async extract(args) { return actions.extrair(args); },

  async renomear(args) {
    const parts = args.split(";").map(s => s.trim());
    const origem = parts[0];
    const destino = parts[1];
    if (!origem || !destino) return "❌ Use: renomear caminho/arquivo.txt; novo_nome.txt";
    try {
      const dir = path.dirname(origem);
      const novoPath = path.join(dir, destino);
      fs.renameSync(origem, novoPath);
      return `📝 Renomeado para: ${novoPath}`;
    } catch (e) {
      return `❌ Erro ao renomear: ${e.message?.substring(0, 100)}`;
    }
  },

  async rename(args) { return actions.renomear(args); },

  async mover(args) {
    const parts = args.split(";").map(s => s.trim());
    const origem = parts[0];
    const destino = parts[1];
    if (!origem || !destino) return "❌ Use: mover caminho/arquivo; pasta_destino/";
    try {
      const nome = path.basename(origem);
      const destinoFinal = fs.statSync(destino).isDirectory() ? path.join(destino, nome) : destino;
      fs.renameSync(origem, destinoFinal);
      return `📂 Movido para: ${destinoFinal}`;
    } catch (e) {
      return `❌ Erro ao mover: ${e.message?.substring(0, 100)}`;
    }
  },

  async move(args) { return actions.mover(args); },

  async copiar_arquivo(args) {
    const parts = args.split(";").map(s => s.trim());
    const origem = parts[0];
    const destino = parts[1];
    if (!origem || !destino) return "❌ Use: copiar_arquivo caminho/origem; caminho/destino";
    try {
      fs.copyFileSync(origem, destino);
      return `📄 Copiado para: ${destino}`;
    } catch (e) {
      return `❌ Erro ao copiar: ${e.message?.substring(0, 100)}`;
    }
  },

  async cp(args) { return actions.copiar_arquivo(args); },
  async copy(args) { return actions.copiar_arquivo(args); },
};

const ACTION_LIST = Object.keys(actions).map((k) => `- ${k}`).join("\n");

async function execute(actionName, args, userId = "default") {
  const action = actions[actionName.toLowerCase()];
  if (!action) return `❌ Ação desconhecida. Disponíveis:\n${ACTION_LIST}`;
  return action(args, userId);
}

function getActionList() {
  return `Ações disponíveis:\n${ACTION_LIST}`;
}

module.exports = { execute, getActionList };
