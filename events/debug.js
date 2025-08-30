const { MessageEmbed } = require("discord.js");
const botConfig = require("../botConfig.js");

const IGNORED_CATEGORIES = [
  "VOICE",
  "WS", // WebSocket
  "GUILD_MEMBERS", // Çok sık gelen sistem mesajları
  "PRESENCE_UPDATE",
  "TYPING_START",
];

// Mesajın sürekli güncellenen veya çok fazla gelen türlerini filtreler
function shouldIgnoreDebug(category) {
  if (!category) return false;
  return IGNORED_CATEGORIES.some((c) => category.toUpperCase().includes(c));
}

// Log kanalı ID'si botConfig’den
const logChannelId = botConfig.logChannelId;

module.exports = async (client, data) => {
  // Debug mod kapalıysa boş çık
  if (!botConfig.debug) return;

  // data = { shardId, type, ws, debug, message, shard }

  // data.debug içinde debug mesajı var
  const raw = data?.debug || data?.message || data;

  // Bazı debug mesajlarının başlıkları/formatları değişken olabilir, parse etmeye çalışalım
  // Mesela "[VOICE] RECEIVED VOICE SERVER: {...}"

  // Category çıkar (köşeli parantez içi)
  const categoryMatch = raw.match(/\[(.*?)\]/);
  const category = categoryMatch ? categoryMatch[1] : null;

  if (shouldIgnoreDebug(category)) return; // Ignore listede ise atla

  // Log kanalını bul
  const logChannel = await client.channels
    .fetch(logChannelId)
    .catch(() => null);
  if (!logChannel || !logChannel.isText()) return;

  // Embed hazırlama
  const embed = new MessageEmbed()
    .setColor("#5865F2")
    .setTitle("🛠️ Debug Log")
    .setDescription("```fix\n" + raw.slice(0, 1900) + "\n```") // max 2000 karakterden az olsun
    .setTimestamp()
    .setFooter({ text: `Shard: ${data.shardId ?? "?"}` });

  // Küçük emoji ve kategori gösterimi
  if (category) embed.setAuthor({ name: `${category} Log`, iconURL: "" });

  // Aynı mesaj sürekli gönderilmesin diye basit bir debounce/cache sistemi yapılabilir,
  // Ama şu an basit haliyle direkt gönderiyoruz.

  try {
    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    // Hata varsa console’a yazabiliriz ama debug modunda zaten sıkıntı olmaz
    console.error("Debug log kanalı gönderim hatası:", err);
  }
};
