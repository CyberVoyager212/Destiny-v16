// commands/botban.js
const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "botban",
  aliases: ["bb"],
  usage:
    "botban ekle <@user|id|isim> | botban çıkar <@user|id|isim> | botban liste",
  description: "Botbanlı kullanıcıları ekler, çıkarır veya listeler.",
  category: "Moderasyon",
  cooldown: 5,
  admin: true,
};

exports.execute = async (client, message, args) => {
  const db = client.db;
  const admins = client.config.admins || [];
  const authorId = message.author.id;

  // Yetki kontrolü
  if (!admins.includes(authorId)) {
    return message.reply("❌ Bu komutu kullanmak için yetkiniz yok.");
  }

  const sub = args[0]?.toLowerCase();
  let botbans = (await db.get("botbans")) || [];

  // Helper: parse kullanıcı argümanı (mention, id veya isim)
  const parseUserId = (arg) => {
    // Mention formatı
    const mentionMatch = arg.match(/^<@!?(\d+)>$/);
    if (mentionMatch) return mentionMatch[1];
    // Direkt ID
    if (/^\d+$/.test(arg)) return arg;
    // Kullanıcı ismiyle bul
    const member = message.guild.members.cache.find(
      (m) =>
        m.user.username.toLowerCase() === arg.toLowerCase() ||
        m.displayName.toLowerCase() === arg.toLowerCase()
    );
    return member?.user.id;
  };

  // botban ekle
  if (["ekle", "add"].includes(sub)) {
    const targetArg = args[1];
    if (!targetArg)
      return message.reply("❌ Eklemek için bir kullanıcı belirtin.");
    const userId = parseUserId(targetArg);
    if (!userId) return message.reply("❌ Geçerli bir kullanıcı bulunamadı.");
    if (botbans.includes(userId)) {
      return message.reply(`❌ <@${userId}> zaten botban listesinde.`);
    }
    botbans.push(userId);
    await db.set("botbans", botbans);
    return message.channel.send(`✅ <@${userId}> botban listesine eklendi.`);
  }

  // botban çıkar
  if (["çıkar", "cikar", "remove"].includes(sub)) {
    const targetArg = args[1];
    if (!targetArg)
      return message.reply("❌ Çıkarmak için bir kullanıcı belirtin.");
    const userId = parseUserId(targetArg);
    if (!userId || !botbans.includes(userId)) {
      return message.reply(`❌ Kullanıcı botban listesinde bulunamadı.`);
    }
    botbans = botbans.filter((id) => id !== userId);
    await db.set("botbans", botbans);
    return message.channel.send(
      `✅ <@${userId}> botban listesinden çıkarıldı.`
    );
  }

  // botban liste
  if (["liste", "list"].includes(sub)) {
    if (!botbans.length) {
      return message.channel.send("📋 Botban listesi boş.");
    }
    const embed = new MessageEmbed()
      .setTitle("📋 Botban Listesi")
      .setColor("#FFA500")
      .setDescription(
        botbans.map((id, i) => `**${i + 1}.** <@${id}> (\`${id}\`)`).join("\n")
      );
    return message.channel.send({ embeds: [embed] });
  }

  // Hatalı kullanım
  return message.reply(`❌ Geçersiz kullanım. Kullanım: ${exports.help.usage}`);
};
