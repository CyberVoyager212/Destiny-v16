const { MessageEmbed } = require("discord.js");

module.exports = {
  help: {
    name: "whohasrole",
    aliases: ["roldekiler", "kimdevar"],
    usage: "whohasrole @Rol",
    description: "Belirtilen role sahip olan kullanıcıları listeler.",
    category: "Moderasyon",
    cooldown: 5,
    permissions: ["MANAGE_ROLES"],
  },

  async execute(client, message, args) {
    if (!message.member.permissions.has("MANAGE_ROLES")) {
      return message.reply(
        "❌ Bu komutu kullanabilmek için **Rolleri Yönet** yetkisine sahip olmalısın!"
      );
    }

    if (!args.length) return message.reply("❌ Lütfen bir rol etiketleyin!");

    let role =
      message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);

    if (!role) return message.reply("❌ Belirtilen rolü bulamadım!");

    let membersWithRole = message.guild.members.cache
      .filter((member) => member.roles.cache.has(role.id))
      .map((m) => m.user.tag);

    if (membersWithRole.length === 0)
      return message.reply("❌ Bu rolde kimse yok!");

    const embed = new MessageEmbed()
      .setTitle(`📜 ${role.name} rolüne sahip kullanıcılar`)
      .setDescription(membersWithRole.join("\n"))
      .setColor("BLUE");

    message.channel.send({ embeds: [embed] });
  },
};
