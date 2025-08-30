const { Permissions } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD))
    return message.reply(
      "❌ Bu komutu kullanmak için `Sunucuyu Yönet` izni gerekli!"
    );

  const sub = args[0]?.toLowerCase();
  const dbKey = `autoVC_${message.guild.id}`;

  // Yeni: status alt komutu
  if (sub === "status") {
    const data = await client.db.get(dbKey);
    if (data?.id) {
      const chan = message.guild.channels.cache.get(data.id);
      return message.reply(
        `🔊 Otomatik katılma ayarlı: **${chan?.name || data.id}** kanalına.`
      );
    } else {
      return message.reply("ℹ️ Otomatik katılma şu anda kapalı.");
    }
  }

  if (!["join", "leave"].includes(sub)) {
    return message.reply(
      "⚠️ Alt komut kullanın: `vc join` `vc leave` veya `vc status`"
    );
  }

  if (sub === "join") {
    const channel = message.member.voice.channel;
    if (!channel)
      return message.reply("❌ Önce bir ses kanalına katılmalısın!");
    try {
      joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });
      await client.db.set(dbKey, { id: channel.id, name: channel.name });
      return message.channel.send(
        `✅ **${channel.name}** kanalına katıldım ve otomatik katılma aktif!`
      );
    } catch (err) {
      console.error(err);
      return message.reply("❌ Ses kanalına katılırken hata oluştu.");
    }
  }

  // leave
  try {
    await client.db.delete(dbKey);
    const conn = getVoiceConnection(message.guild.id);
    if (conn) conn.destroy();
    return message.channel.send(
      "✅ Otomatik katılma devre dışı bırakıldı ve bağlantı kesildi."
    );
  } catch (err) {
    console.error(err);
    return message.reply("❌ Ses kanalından çıkarken hata oluştu.");
  }
};

exports.help = {
  name: "vc",
  aliases: ["ses"],
  usage: "vc <join|leave|status>",
  description:
    "join: otomatik katılmayı ayarla / leave: kapat / status: hangi kanala katılacağını gösterir",
  category: "Araçlar",
  cooldown: 5,
  permissions: ["MANAGE_GUILD"],
};
