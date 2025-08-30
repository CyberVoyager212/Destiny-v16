module.exports = {
  config: {
    name: "wideavatar",
    description: "Bir kullanıcının avatarını genişletilmiş olarak gönderir.",
  },
  execute: async (client, message, args) => {
    const mention = message.mentions.members.first() || message.member;
    const avatar = mention.user.displayAvatarURL({
      dynamic: true,
      size: 2048,
      format: "png",
    });

    message.channel.send({
      files: [
        {
          attachment: `https://vacefron.nl/api/wide?image=${avatar}`,
          name: "wideavatar.png",
        },
      ],
    });
  },
  help: {
    name: "wideavatar",
    description: "Bir kullanıcının avatarını genişletilmiş olarak gönderir.",
    usage: "wideavatar [@kullanıcı] (isteğe bağlı)",
    aliases: ["wa"],
    category: "Eğlence",
    cooldown: 5,
  },
};
