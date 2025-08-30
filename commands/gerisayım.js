const { MessageEmbed } = require("discord.js");

module.exports = {
  name: "gerisayım", // Komut adı
  description: "Önemli günler ve tatil günlerine geri sayım yapar.",
  aliases: ["gsayım", "geris", "countdown"],
  usage: "gerisayım", // Komut kullanım şekli

  async execute(client, message, args) {
    let today = new Date();

    // Tatil günlerinin tarihleri
    const importantDates = [
      {
        name: "20 Ocak (15 Tatil)",
        date: new Date(today.getFullYear(), 0, 20),
      },
      {
        name: "30 Mart (Bayram Tatili)",
        date: new Date(today.getFullYear(), 2, 30),
      },
      {
        name: "5 Haziran (Kurban Bayramı)",
        date: new Date(today.getFullYear(), 5, 5),
      },
      { name: "23 Nisan", date: new Date(today.getFullYear(), 3, 23) },
      { name: "1 Mayıs", date: new Date(today.getFullYear(), 4, 1) },
      { name: "15 Temmuz", date: new Date(today.getFullYear(), 6, 15) },
      { name: "30 Ağustos", date: new Date(today.getFullYear(), 7, 30) },
      { name: "29 Ekim", date: new Date(today.getFullYear(), 9, 29) },
    ];

    // Eğer tarih geçmişse, bir sonraki yıla geç
    importantDates.forEach((date) => {
      if (today > date.date) {
        date.date.setFullYear(date.date.getFullYear() + 1);
      }
    });

    // 1 günün milisaniye cinsinden değeri
    let one_day = 1000 * 60 * 60 * 24;

    // Embed mesajı oluşturma
    let description = "";

    importantDates.forEach((date) => {
      let daysLeft = Math.ceil(
        (date.date.getTime() - today.getTime()) / one_day
      );
      description += `**${date.name}**: ${daysLeft} gün kaldı.\n`;
    });

    const embed = new MessageEmbed()
      .setTitle("🎉 Tatil Günlerine Geri Sayım")
      .setDescription(description)
      .setColor("RANDOM");

    message.reply({ embeds: [embed] });
  },

  help: {
    name: "gerisayım",
    aliases: ["gsayım", "geris"],
    usage: "gerisayım",
    description: "Önemli günlere ve tatil günlerine geri sayım yapar.",
    category: "Eğlence",
    cooldown: 5,
  },
};
