exports.help = {
  name: "dünyasaati",
  aliases: ["dunyasaati", "worldtime", "wsaat"],
  usage: "dünyasaati",
  description: "Dünyadaki farklı şehirlerin anlık saatlerini gösterir.",
  category: "Eğlence",
  cooldown: 5,
};

exports.execute = async (client, message, args) => {
  const times = {
    "🇹🇷 İstanbul": new Date().toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    "🇺🇸 New York": new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    "🇬🇧 Londra": new Date().toLocaleString("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    "🇯🇵 Tokyo": new Date().toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    "🇦🇺 Sydney": new Date().toLocaleString("en-AU", {
      timeZone: "Australia/Sydney",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    "🇩🇪 Berlin": new Date().toLocaleString("de-DE", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    "🇧🇷 Sao Paulo": new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };

  let reply = "**🌍 Dünya Saatleri:**\n";
  for (const [city, time] of Object.entries(times)) {
    reply += `${city}: ${time}\n`;
  }

  message.channel.send(reply);
};
