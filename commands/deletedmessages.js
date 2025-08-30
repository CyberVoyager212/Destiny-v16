const botConfig = require("../botConfig.js"); // botConfig.js'yi dahil et

module.exports = {
  name: "deletedmessages",
  description:
    "Son silinen mesajları silinme saatleriyle gösterir veya belirli kayıtları silebilirsiniz.",
  aliases: ["dmsgs", "deletemsgs"],
  usage: "deletedmessages | dmsgs sil <kullanıcı> [saat]",
  permissions: ["MANAGE_MESSAGES"],

  async execute(client, message, args) {
    if (!message.guild)
      return message.reply("Bu komut sadece sunucularda kullanılabilir.");

    // Kullanıcının "Mesajları Yönet" yetkisi var mı kontrol et
    if (!message.member.permissions.has("MANAGE_MESSAGES")) {
      return message.reply(
        "Bu komutu kullanabilmek için **Mesajları Yönet** yetkisine sahip olmalısınız!"
      );
    }

    let guildKey = `deletedMessages_${message.guild.id}`;
    let deletedMessages = (await client.db.get(guildKey)) || [];

    if (!deletedMessages.length)
      return message.reply("Son silinen mesaj bulunamadı.");

    // Eğer "sil" argümanı kullanıldıysa, sadece admins listesinde olanlar kullanabilir
    if (args[0] && args[0].toLowerCase() === "sil") {
      if (!botConfig.admins.includes(message.author.id)) {
        return message.reply("Bu komutu kullanma yetkiniz yok!");
      }

      let username = args[1]; // Kullanıcı adı
      let time = args[2]; // Saat

      if (!username && !time) {
        return message.reply(
          "Silmek için en az bir kriter belirtmelisiniz! (Kullanıcı adı veya saat)"
        );
      }

      // Filtreleme
      let newDeletedMessages = deletedMessages.filter((msg) => {
        let matchUser = username ? msg.includes(`**${username}**`) : true;
        let matchTime = time ? msg.startsWith(`[${time}]`) : true;
        return !(matchUser && matchTime); // Eşleşenleri kaldır
      });

      // Eğer değişiklik olmadıysa, zaten belirtilen mesaj yok demektir
      if (newDeletedMessages.length === deletedMessages.length) {
        return message.reply(
          "Belirtilen kriterlere uygun silinen mesaj bulunamadı."
        );
      }

      // Yeni listeyi kaydet
      await client.db.set(guildKey, newDeletedMessages);
      return message.reply(
        "Belirtilen silinen mesaj(lar) başarıyla kaldırıldı."
      );
    }

    // 2000 karakter sınırını aşmamak için en uzun mesajı sil
    while (
      deletedMessages.length > 0 &&
      deletedMessages.join("\n").length > 2000
    ) {
      let longestMessageIndex = deletedMessages.reduce(
        (maxIndex, msg, index, arr) =>
          msg.length > arr[maxIndex].length ? index : maxIndex,
        0
      );
      deletedMessages.splice(longestMessageIndex, 1);
    }

    // Eğer mesaj hâlâ boşsa, hata almamak için tekrar kontrol et
    if (deletedMessages.length === 0)
      return message.reply("Son silinen mesaj bulunamadı.");

    message.channel.send(deletedMessages.join("\n"));
  },

  help: {
    name: "deletedmessages",
    aliases: ["dmsgs", "deletemsgs"],
    usage: "deletedmessages | dmsgs sil <kullanıcı> [saat]",
    description:
      "Son silinen mesajları embed olmadan, silinme saatleriyle birlikte gösterir.",
    category: "Moderasyon",
    cooldown: 3,
    permissions: ["MANAGE_MESSAGES"],
  },
};
