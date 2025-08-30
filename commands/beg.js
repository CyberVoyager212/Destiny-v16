const ms = require("ms");
const emojis = require("../emoji.json"); // emoji.json'u içe aktar

function turkishDuration(msAmount) {
  let totalSeconds = Math.floor(msAmount / 1000);
  let minutes = Math.floor(totalSeconds / 60);
  let seconds = totalSeconds % 60;
  let result = [];
  if (minutes > 0) result.push(`${minutes} dakika`);
  if (seconds > 0) result.push(`${seconds} saniye`);
  return result.join(" ");
}

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message, args) => {
  try {
    const userId = message.author.id;

    // Cooldown kontrolü kaldırıldı, bu kısım yok artık.

    const amount = Math.floor(Math.random() * 41) + 10;
    let money = (await client.db.get(`money_${userId}`)) || 0;
    money += amount;

    await client.db.set(`money_${userId}`, money);
    // Cooldown zamanı set etme kısmı kaldırıldı.

    const users = [
      "PewDiePie",
      "T-Series",
      "Sans",
      "Zero",
      "Ninja",
      "Jacksepticeye",
      "Markiplier",
      "Dream",
      "Pokimane",
      "Ariana Grande",
    ];
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const emoji = chooseEmoji(money);

    return message.reply(
      `🎉 **${randomUser}** size **${amount}** bağışladı! Şu anda toplamda **${money}** ${emoji} paranız var.`
    );
  } catch (error) {
    console.error("beg komutu hata:", error);
    return message.reply("❌ Bir hata oluştu, lütfen tekrar deneyin.");
  }
};

exports.help = {
  name: "beg",
  aliases: [],
  usage: "beg",
  description: "Yardım dilenmek için kullanılır, cooldown süresi vardır.",
  category: "Ekonomi",
  cooldown: 300,
};
