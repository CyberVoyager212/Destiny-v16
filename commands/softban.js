// softban.js
const { MessageEmbed } = require("discord.js");

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("BAN_MEMBERS"))
    return message.reply("❌ Üyeleri Yasakla izni gerekli.");

  let user =
    message.mentions.members.first() ||
    message.guild.members.cache.get(args[0]) ||
    message.guild.members.cache.find(
      (m) => m.user.username.toLowerCase() === args[0]?.toLowerCase()
    );
  if (!user) return message.reply("❌ Kullanıcı bulunamadı.");

  let reason = args.slice(1).join(" ") || "Sebep belirtilmedi";
  let invite = await message.channel
    .createInvite({ maxAge: 0, maxUses: 1 })
    .catch(() => null);

  try {
    await user.send(
      `⚠️ Geçici yasaklandınız! Sebep: ${reason}\n🔗 Geri davet: ${
        invite?.url || "Yok"
      }`
    );
  } catch {}
  await message.guild.members.ban(user, { reason, days: 7 });
  await message.guild.members.unban(user.id);

  message.channel.send(`✅ ${user.user.tag} softbanlandı.`);
};

exports.help = {
  name: "softban",
  aliases: ["yumuşakban", "silban"],
  usage: "softban <@kullanıcı|ID|isim> [sebep]",
  description: "Kullanıcıyı yasaklayıp çıkarır, böylece mesajları silinir.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["BAN_MEMBERS"],
};
