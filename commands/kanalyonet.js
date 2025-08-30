// kanalyonet.js
const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "kanalyönet",
  aliases: ["kyönet"],
  usage:
    "kanalyönet help\n" +
    "kanalyönet <#kanal|id|isim> <izin> <@rol|rolID> [@rol2]...\n\n" +
    "**izin**: view, send, manage\n" +
    "Örnek: kanalyönet #genel view @ÜyeRol send @ModRol",
  description:
    "Belirtilen kanalda rollerin izinlerini ayarlar. `help` ile kullanım bilgisi alırsınız.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_CHANNELS"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MANAGE_CHANNELS"))
    return message.reply(
      "Bu komutu kullanmak için `Kanalları Yönet` yetkisine sahip olmalısın."
    );

  if (args[0] === "help")
    return message.channel.send({
      embeds: [
        new MessageEmbed()
          .setTitle("kanalyönet Kullanımı")
          .setDescription(this.help.usage)
          .setColor("#00AAFF"),
      ],
    });

  const [target, izin, ...roles] = args;
  if (!target || !izin || !roles.length)
    return message.reply("Doğru kullanım için: `kanalyönet help`");

  const kanal =
    message.mentions.channels.first() ||
    message.guild.channels.cache.get(target) ||
    message.guild.channels.cache.find((c) => c.name === target);
  if (!kanal) return message.reply("Kanal bulunamadı.");

  const permMap = {
    view: "VIEW_CHANNEL",
    send: "SEND_MESSAGES",
    manage: "MANAGE_CHANNEL",
  };
  const discordPerm = permMap[izin.toLowerCase()];
  if (!discordPerm)
    return message.reply("İzin türü geçersiz (view/send/manage).");

  const ok = [];
  const failed = [];
  for (const r of roles) {
    const rol =
      message.mentions.roles.find((x) => x.id === x.id) ||
      message.guild.roles.cache.get(r) ||
      message.guild.roles.cache.find((x) => x.name === r);
    if (!rol) {
      failed.push(r);
      continue;
    }
    try {
      await kanal.permissionOverwrites.edit(rol, {
        [discordPerm]: true,
      });
      ok.push(rol.name);
    } catch {
      failed.push(rol.name);
    }
  }

  const embed = new MessageEmbed()
    .setTitle(`İzin Ayarlandı: ${kanal.name}`)
    .addField("Başarılı", ok.join(", ") || "–")
    .addField("Hatalı", failed.join(", ") || "–")
    .setColor("#FFD700")
    .setTimestamp();
  message.channel.send({ embeds: [embed] });
};
