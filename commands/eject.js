const { MessageEmbed } = require("discord.js");
const fetch = require("node-fetch");

module.exports.help = {
  name: "eject",
  aliases: ["ejected", "impostor"],
  description: "Belirtilen kullanıcıyı Among Us tarzında uzaya fırlatır.",
  usage: "eject [@kullanıcı]",
  category: "Eğlence",
  cooldown: 3,
};

module.exports.execute = async (client, message, args) => {
  try {
    // Kullanıcıyı belirle: önce mention, sonra displayName üzerinden arama, sonra fallback mesajı atan kişi
    const userMember =
      message.mentions.members.first() ||
      message.guild.members.cache.find((m) =>
        m.displayName.toLowerCase().includes(args.join(" ").toLowerCase())
      ) ||
      message.member;

    const user = userMember.user;

    // Rastgele impostor olup olmama
    const isImpostor = Math.random() < 0.5;

    // Rastgele crewmate rengi seç
    const colors = [
      "black",
      "blue",
      "brown",
      "cyan",
      "darkgreen",
      "lime",
      "orange",
      "pink",
      "purple",
      "red",
      "white",
      "yellow",
    ];
    const crewmateColor = colors[Math.floor(Math.random() * colors.length)];

    // API isteği
    const apiUrl = `https://vacefron.nl/api/ejected?name=${encodeURIComponent(
      user.username
    )}&impostor=${isImpostor}&crewmate=${crewmateColor}`;
    const res = await fetch(apiUrl);

    if (!res.ok) throw new Error(`API hatası: ${res.status} ${res.statusText}`);

    // Embed mesajı
    const embed = new MessageEmbed()
      .setAuthor({
        name: `${message.member.displayName}`, // mesajı atan kişinin takma adı
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTitle(`🛸 ${userMember.displayName} uzaya fırlatıldı!`) // hedef kişinin takma adı
      .setDescription(
        `${userMember.displayName} ${
          isImpostor ? "**bir impostordu.** 😈" : "**bir impostor değildi.** 😇"
        }`
      )
      .setImage(res.url)
      .setColor("RANDOM");

    return message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Eject komut hatası:", error);

    const embedError = new MessageEmbed()
      .setTitle("❌ Bir hata oluştu.")
      .setDescription(
        "Kullanıcı adı çok uzun ya da özel karakter içeriyor olabilir. Lütfen tekrar deneyin."
      )
      .setColor("RED");

    return message.channel.send({ embeds: [embedError] });
  }
};
