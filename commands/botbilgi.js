const { MessageEmbed } = require("discord.js");
const os = require("os");
const process = require("process");

exports.help = {
  name: "botbilgi",
  aliases: ["botinfo", "botbilgisi", "istatistik"],
  usage: "botbilgi",
  description: "Bot hakkında detaylı bilgi verir.",
  category: "Bot",
  cooldown: 5,
};

exports.execute = async (client, message, args) => {
  try {
    // Uptime hesaplama
    const totalSeconds = client.uptime / 1000;
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const seconds = Math.floor(totalSeconds % 60);

    // Toplam kullanıcı sayısı (tüm sunuculardaki)
    const totalUsers = client.guilds.cache.reduce(
      (acc, guild) => acc + guild.memberCount,
      0
    );

    // Discord.js versiyonu
    const discordJSVersion = require("discord.js").version;

    // Node.js versiyonu
    const nodeVersion = process.version;

    // Botun oluşturulma tarihi
    const createdAt = `<t:${Math.floor(
      client.user.createdTimestamp / 1000
    )}:D> (<t:${Math.floor(client.user.createdTimestamp / 1000)}:R>)`;

    // Sunucu sayısı
    const guildCount = client.guilds.cache.size;

    // Komut sayısı
    const commandCount = client.commands.size;

    // CPU ve RAM kullanımı
    const memoryUsageMB = (
      process.memoryUsage().heapUsed /
      1024 /
      1024
    ).toFixed(2);
    const cpuUsage = (os.loadavg()[0] * 100).toFixed(2); // 1 dakikalık CPU ortalaması %

    // Bot ping
    const ping = client.ws.ping;

    const embed = new MessageEmbed()
      .setTitle("🤖 Bot Bilgileri")
      .setColor("#0099ff")
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: "• Kullanıcılar",
          value: `${totalUsers.toLocaleString()}`,
          inline: true,
        },
        {
          name: "• Sunucular",
          value: `${guildCount.toLocaleString()}`,
          inline: true,
        },
        {
          name: "• Kanallar",
          value: `${client.channels.cache.size.toLocaleString()}`,
          inline: true,
        },
        { name: "• Komut Sayısı", value: `${commandCount}`, inline: true },
        {
          name: "• Uptime",
          value: `${days} gün, ${hours} saat, ${minutes} dakika, ${seconds} saniye`,
          inline: true,
        },
        { name: "• Bot Kuruluş Tarihi", value: createdAt, inline: true },
        {
          name: "• Discord.js Versiyonu",
          value: discordJSVersion,
          inline: true,
        },
        { name: "• Node.js Versiyonu", value: nodeVersion, inline: true },
        { name: "• Bot Ping", value: `${ping} ms`, inline: true },
        {
          name: "• İşletim Sistemi",
          value: `${os.type()} ${os.arch()}`,
          inline: true,
        },
        {
          name: "• CPU Kullanımı (Load Avg)",
          value: `${cpuUsage}%`,
          inline: true,
        },
        { name: "• RAM Kullanımı", value: `${memoryUsageMB} MB`, inline: true },
        { name: "• Bot ID", value: `${client.user.id}`, inline: true },
        {
          name: "• Bot Sahibi",
          value: `<@${client.config?.ownerId}>`,
          inline: true,
        },
        { name: "• Node.js Platformu", value: process.platform, inline: true },
        { name: "• CPU Modeli", value: os.cpus()[0].model, inline: true },
        {
          name: "• Toplam CPU Çekirdeği",
          value: `${os.cpus().length}`,
          inline: true,
        },
        {
          name: "• Sistem Uptime",
          value: `${Math.floor(os.uptime() / 60)} dakika`,
          inline: true,
        },
        { name: "• Aktif İşlem ID", value: `${process.pid}`, inline: true },
        {
          name: "• Discord.js WebSocket Bağlantısı",
          value: client.ws.status === 0 ? "Bağlı" : "Bağlı Değil",
          inline: true,
        }
      )
      .setFooter({
        text: `İsteyen: ${message.member.displayName}`,
        iconURL: message.author.displayAvatarURL(),
      })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    message.reply("Bot bilgileri alınırken bir hata oluştu.");
  }
};
