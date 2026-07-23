const Groq = require("groq-sdk");
const { ALMA_SYSTEM_PROMPT } = require("./persona");
const actions = require("./actions");
const memory = require("./memory");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const conversations = new Map();

function tryParseAction(text) {
  try {
    let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
    if (match) {
      let jsonStr = match[0];
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.action) return parsed;
      } catch {
        jsonStr = jsonStr.replace(/\}+$/, "}");
        const parsed = JSON.parse(jsonStr);
        if (parsed.action) return parsed;
      }
    }
  } catch {}
  return null;
}

async function chat(userId, userMessage, imageBase64) {
  if (!conversations.has(userId)) {
    conversations.set(userId, []);
  }

  const history = conversations.get(userId);

  if (imageBase64) {
    history.push({
      role: "user",
      content: [
        { type: "text", text: userMessage || "O que tem nessa imagem?" },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    });
  } else {
    history.push({ role: "user", content: userMessage });
  }

  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }

  // --- User recognition ---
  let userName = await memory.getUserName(userId);
  if (!userName && userId !== "default") {
    userName = await memory.getUserName("default");
  }
  let systemPrompt = ALMA_SYSTEM_PROMPT;

  if (userName) {
    systemPrompt += `\n\nVOCÊ ESTÁ FALANDO COM: ${userName}, seu Pai. Chame-o pelo nome "${userName}" e de "Pai".`;
  } else {
    systemPrompt += `\n\nATENÇÃO: Você AINDA não sabe o nome dessa pessoa. NÃO a chame de "Pai" ainda. Seja educada, pergunte o nome dela de forma natural. Quando ela disser o nome, use a ação "meu_nome" para salvar. Ex: {"action":"meu_nome","args":"João"}`;
  }

  const hasImage = history.some(
    (m) => Array.isArray(m.content) && m.content.some((c) => c.type === "image_url")
  );

  const models = hasImage
    ? ["meta-llama/llama-4-scout-17b-16e-instruct", "qwen/qwen3.6-27b"]
    : ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile"];

  let reply = null;
  let lastErr = null;
  for (const model of models) {
    try {
      const response = await groq.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
        ],
        temperature: 0.8,
        max_tokens: 500,
      });
      reply = response.choices[0]?.message?.content;
      if (reply) break;
    } catch (err) {
      lastErr = err;
      console.error(`Model ${model} falhou:`, err.message?.substring(0, 80));
    }
  }

  if (!reply) {
    return { text: "Desculpa, Pai... estou sem energia agora 😵 Tenta de novo em alguns minutos!", action: null, result: null };
  }

  const historyEntry = imageBase64
    ? { role: "assistant", content: `[Imagem analisada] ${reply}` }
    : { role: "assistant", content: reply };
  history.push(historyEntry);

  const action = tryParseAction(reply);
  if (action) {
    history[history.length - 1] = { role: "assistant", content: `[Executou ação: ${action.action}]` };
    const result = await actions.execute(action.action, action.args || "", userId);
    return { text: null, action: action.action, result };
  }

  return { text: reply, action: null, result: null };
}

function clearHistory(userId) {
  conversations.delete(userId);
}

function getHistory(userId) {
  return conversations.get(userId) || [];
}

module.exports = { chat, clearHistory, getHistory };
