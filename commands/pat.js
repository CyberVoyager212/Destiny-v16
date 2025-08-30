const Discord = require("discord.js");
const superagent = require("superagent");

module.exports = {
  config: {
    name: "pat",
    description: "Birine pat yapar",
    aliases: ["pat"],
    usage: "<kullanıcı>",
    category: "Eğlence",
    cooldown: 5,
  },

  execute: async (client, message, args) => {
    let victim =
      message.mentions.users.first() ||
      (args.length > 0
        ? message.guild.members.cache
            .filter((e) =>
              e.user.username
                .toLowerCase()
                .includes(args.join(" ").toLowerCase())
            )
            .first()?.user
        : message.author) ||
      message.author;

    try {
      const { body } = await superagent.get(
        "https://nekos.life/api/v2/img/pat"
      );

      const embed = new Discord.MessageEmbed()
        .setColor("YELLOW")
        .setTitle("İşte patın, 👀")
        .setDescription(`${message.author} ${victim} kullanıcısına pat yaptı!`)
        .setImage(body.url)
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      message.reply("Pat resmi alınırken bir hata oluştu.");
    }
  },

  help: {
    name: "pat",
    description:
      "Birine pat yapar. Birini etiketleyerek ya da isimle bir kullanıcıyı belirterek onlara pat yapabilirsiniz.",
    usage: "pat <kullanıcı>",
    category: "Eğlence",
    cooldown: 5,
    examples: ["pat @kullanıcı", "pat"],
  },
};
