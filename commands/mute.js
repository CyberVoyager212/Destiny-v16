const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "mute",
  aliases: [],
  usage: "mute <@kullanıcı|id|isim> [süre(m)]",
  description:
    "Belirtilen süre boyunca Discord'un yerleşik susturma rolünü (TIMEOUT) uygular.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MODERATE_MEMBERS"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MODERATE_MEMBERS"))
    return message.reply(
      "Bu komutu kullanmak için `Üyeleri Sustur` yetkisine sahip olmalısın."
    );

  const target = args[0];
  const member =
    message.mentions.members.first() ||
    message.guild.members.cache.get(target) ||
    message.guild.members.cache.find((m) => m.user.username === target);
  if (!member) return message.reply("Susturulacak kullanıcıyı belirt.");

  const minutes = parseInt(args[1]) || 5;
  if (minutes < 1 || minutes > 1440)
    return message.reply("1 ile 1440 dakika arasında gir.");

  await member.timeout(minutes * 60 * 1000, `Süreli mute: ${minutes} dakika`);
  const embed = new MessageEmbed()
    .setDescription(`✅ ${member.user.tag} ${minutes} dakika susturuldu.`)
    .setColor("#99AAB5")
    .setTimestamp();
  message.channel.send({ embeds: [embed] });
};
