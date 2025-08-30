exports.help = {
  name: "saat",
  aliases: ["time", "saatkaç"],
  usage: "saat",
  description: "Bulunduğun saat dilimine göre anlık saati gösterir.",
  category: "Eğlence",
  cooldown: 5,
};

exports.execute = async (client, message, args) => {
  const now = new Date().toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  message.channel.send(`🕒 Şu an Türkiye saati ile **${now}**.`);
};
