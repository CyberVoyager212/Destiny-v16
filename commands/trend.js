module.exports = {
  name: "trendanalysis",
  description: "Sunucudaki mesaj aktivitelerini analiz eder.",
  aliases: ["trends", "activity"],
  usage: "trendanalysis",

  async execute(client, message, args) {
    if (!message.guild)
      return message.reply("Bu komut sadece sunucularda kullanılabilir.");

    let guildKey = `messageLogs_${message.guild.id}`;
    let messageLogs = (await client.db.get(guildKey)) || [];

    if (!messageLogs.length) return message.reply("Henüz yeterli veri yok.");

    let hourlyActivity = new Array(24).fill(0);

    messageLogs.forEach((log) => {
      let hour = (new Date(log.timestamp).getUTCHours() + 3) % 24;
      hourlyActivity[hour]++; // Hem normal hem de webhook mesajları dahil ediliyor
    });

    let result = hourlyActivity
      .map((count, hour) => `${hour}:00 - ${hour + 1}:00 ➝ **${count}** mesaj`)
      .join("\n");

    message.channel.send(result || "Henüz analiz edilecek veri yok.");
  },

  help: {
    name: "trendanalysis",
    aliases: ["trends", "activity"],
    usage: "trendanalysis",
    description:
      "Sunucudaki mesaj aktivitelerini embed olmadan analiz eder. Webhook mesajları da dahildir.",
    category: "Moderasyon",
    cooldown: 5,
  },
};
