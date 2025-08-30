// roller.js
const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "roller",
  aliases: [],
  usage: "roller [@kullanıcı]",
  description:
    "Kullanıcının rollerini gösterir. Belirtilmezse kendi rollerini gösterir.",
  category: "Moderasyon",
  cooldown: 5,

};

exports.execute = async (client, message, args) => {
  const member = args[0]
    ? message.mentions.members.first() ||
      message.guild.members.cache.get(args[0])
    : message.member;

  if (!member) return message.reply("Kullanıcı bulunamadı.");

  const roles = member.roles.cache
    .filter((r) => r.id !== message.guild.id)
    .sort((a, b) => b.position - a.position)
    .map((r) => `<@&${r.id}>`);

  let rolList = "Rol yok";
  if (roles.length > 0) {
    if (roles.join(", ").length > 1800) {
      const shownRoles = roles.slice(0, 50);
      rolList = `${shownRoles.join(", ")} ve ${roles.length - 50} rol daha...`;
    } else {
      rolList = roles.join(", ");
    }
  }

  const embed = new MessageEmbed()
    .setTitle(`${member.user.tag} kullanıcısının rolleri`)
    .setDescription(rolList)
    .setColor("#AAAAAA")
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `ID: ${member.id}` })
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
};
