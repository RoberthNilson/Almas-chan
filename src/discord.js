require("dotenv").config();
const { Client, GatewayIntentBits, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const https = require("https");
const http = require("http");
const { chat, clearHistory } = require("./groq");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
      res.on("error", reject);
    }).on("error", reject);
  });
}

client.once("ready", () => {
  console.log(`🤖 Alma-chan online como ${client.user.tag}`);
  client.user.setActivity("🌸 ALM-01P | @me para falar", { type: 0 });
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const isMentioned = message.mentions.has(client.user);
  const isDM = message.channel.isDMBased();

  if (!isMentioned && !isDM) return;

  const content = message.content.replace(/<@!?\d+>/g, "").trim();
  const imageAttachment = message.attachments.find((a) =>
    a.contentType?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(a.name)
  );

  if (!content && !imageAttachment) {
    const embed = new EmbedBuilder()
      .setColor("#ff6b9d")
      .setTitle("🌸 ALM-01P ativada!")
      .setDescription("Precisa de algo? Me marca e me pede! ✨\nTambém pode mandar imagem que eu analiso! 📷");
    return message.reply({ embeds: [embed] });
  }

  if (content.toLowerCase() === "clear" || content.toLowerCase() === "reset") {
    clearHistory(message.author.id);
    return message.reply("🧹 Memória limpa! ✨ Começamos de novo! 🌸");
  }

  if (content.toLowerCase() === "help") {
    const embed = new EmbedBuilder()
      .setColor("#e94560")
      .setTitle("🌸 Comandos da Alma-chan")
      .setDescription(
        "**Chat:**\n`@Alma-chan <mensagem>` - Fala comigo\n`@Alma-chan + imagem` - Analiso a foto!\n`clear` - Limpa memória\n\n" +
        "**PC:**\n`screenshot` - Tira print\n`sistema` - Info do PC\n`processos` - Lista processos\n" +
        `bloquear` - Bloqueia PC\n`desligar` / `reiniciar`\n\n`abre <app>` - Abre qualquer programa\n\n" +
        "**Util:**\n`alarme 5min algo` - Timer\n`data` - Hora atual\n`piada` - Piada\n`dado` - Rola dado\n`moeda` - Cara ou coroa"
      );
    return message.reply({ embeds: [embed] });
  }

  try {
    await message.channel.sendTyping();

    let imageBase64 = null;
    if (imageAttachment) {
      imageBase64 = await downloadImage(imageAttachment.url);
    }

    const result = await chat(message.author.id, content || "O que tem nessa imagem?", imageBase64);

    if (result.action) {
      try {
        const parsed = JSON.parse(result.result);
        if (parsed.type === "image") {
          const attachment = new AttachmentBuilder(Buffer.from(parsed.base64, "base64"), { name: "alma-img.png" });
          return message.reply({ content: "📸 Imagem gerada:", files: [attachment] });
        }
        if (parsed.type === "music") {
          const fs = require("fs");
          const attachment = new AttachmentBuilder(parsed.path, { name: "alma-musica.mid" });
          const embed = new EmbedBuilder()
            .setColor("#ff6b9d")
            .setTitle("🎵 Música Gerada!")
            .setDescription(`Estilo: **${parsed.desc}**\nNotas: ${parsed.notes}`);
          return message.reply({ embeds: [embed], files: [attachment] });
        }
      } catch {}

      const embed = new EmbedBuilder()
        .setColor("#ff6b9d")
        .setTitle(`⚙️ ${result.action}`)
        .setDescription(`\`\`\`\n${result.result}\n\`\`\``);
      return message.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor(imageAttachment ? "#ff6b9d" : "#16213e")
      .setDescription(result.text)
      .setFooter({ text: imageAttachment ? "🌸 Alma-chan analisou a imagem" : "🌸 Alma-chan" })
      .setTimestamp();
    await message.reply({ embeds: [embed] });
  } catch (err) {
    console.error("Erro Discord:", err.message);
    await message.reply("Alma-chan travou... 😵 Tenta de novo!");
  }
});

client.login(process.env.DISCORD_TOKEN);
