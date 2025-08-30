const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "purge",
  aliases: ["temizle"],
  usage: "purge <@kullanıcı|kelime> ; [#kanal|all]",
  description:
    "Belirtilen kullanıcının veya kelime içeren mesajları belirtilen kanal(lar)da veya tüm sunucuda toplu siler.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_MESSAGES"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MANAGE_MESSAGES"))
    return message.reply(
      "❌ Bu komutu kullanmak için `Mesajları Yönet` yetkisine sahip olmalısın."
    );

  if (!args.length) {
    return message.reply("❌ Kullanıcı veya kelime belirtmelisin.");
  }

  // Mesajı split edelim -> "arama ifadesi ; hedef"
  const fullArgs = args.join(" ").split(";");
  const searchTerm = fullArgs[0].trim();
  const targetPart = fullArgs[1]?.trim()?.toLowerCase();

  if (!searchTerm)
    return message.reply("❌ Bir kullanıcı veya kelime belirtmelisin.");

  // Kullanıcı ID/mention/isim
  const user =
    message.mentions.users.first() ||
    client.users.cache.get(searchTerm) ||
    message.guild.members.cache.find(
      (m) => m.user.username.toLowerCase() === searchTerm.toLowerCase()
    )?.user;

  // Hedef kanallar
  let targetChannels = [];

  if (targetPart === "all") {
    targetChannels = message.guild.channels.cache.filter(
      (ch) => ch.type === "GUILD_TEXT"
    );
  } else if (message.mentions.channels.size > 0) {
    targetChannels = message.mentions.channels;
  } else {
    targetChannels = new Map([[message.channel.id, message.channel]]);
  }

  let totalDeleted = 0;

  for (const [, channel] of targetChannels) {
    try {
      const fetched = await channel.messages.fetch({ limit: 100 });
      let toDelete;

      if (user) {
        toDelete = fetched.filter((m) => m.author.id === user.id);
      } else {
        const term = searchTerm.toLowerCase();
        toDelete = fetched.filter((m) =>
          m.content.toLowerCase().includes(term)
        );
      }

      if (toDelete.size > 0) {
        const deleted = await channel.bulkDelete(toDelete, true);
        totalDeleted += deleted.size;
      }
    } catch (err) {
      console.error(`[Purge] ${channel.name} kanalında hata:`, err);
    }
  }

  if (totalDeleted === 0) {
    return message.channel.send("⚠️ Silinecek mesaj bulunamadı.");
  }

  message.channel
    .send(`✅ Toplam **${totalDeleted}** mesaj silindi.`)
    .then((m) => setTimeout(() => m.delete().catch(() => {}), 3000))
    .catch(() => {});
};
