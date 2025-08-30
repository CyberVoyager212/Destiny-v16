// ghostmode.js
module.exports = {
  help: {
    name: "ghostmode",
    aliases: ["gizlimesaj", "silinmesiçin"],
    usage: "ghostmode <süre (saniye)> <mesaj>",
    description:
      "Gönderilen mesajları belirli bir süre sonra otomatik olarak siler.",
    category: "Moderasyon",
    cooldown: 5, // saniye
    permissions: ["MANAGE_MESSAGES"],
  },

  async execute(client, message, args) {
    if (!message.member.permissions.has("MANAGE_MESSAGES")) {
      return message.reply(
        "❌ Bu komutu kullanabilmek için **Mesajları Yönet** yetkisine sahip olmalısın!"
      );
    }

    let time = parseInt(args[0]);
    if (isNaN(time) || time <= 0)
      return message.reply(
        "❌ Geçerli bir süre girin! (Örn: `ghostmode 5 Bu mesaj 5 saniye sonra silinecek`)"
      );

    let content = args.slice(1).join(" ");
    if (!content) return message.reply("❌ Silinecek mesajı girin!");

    message.channel.send(content).then((sentMessage) => {
      setTimeout(() => {
        sentMessage.delete().catch(() => {});
      }, time * 1000);
    });

    message.delete().catch(() => {});
  },
};
