const { MessageEmbed } = require("discord.js");

const generateRandomColor = () => {
  return `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0")}`;
};

let interval;

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("ADMINISTRATOR")) {
    return message.reply(
      "⛔ **Bu komutu kullanmak için** `Yönetici` **yetkisine sahip olmalısınız!**"
    );
  }

  const role = message.mentions.roles.first();
  if (!role)
    return message.reply(
      "⚠️ Lütfen bir rol etiketleyin. Örnek: `!discomod @rol`"
    );

  if (interval) {
    clearInterval(interval);
    interval = null;
    return message.channel.send({
      embeds: [
        new MessageEmbed()
          .setColor("RED")
          .setTitle("🎨 Rol rengi değiştirme durduruldu.")
          .addField("Hedef Rol", role.name),
      ],
    });
  }

  interval = setInterval(() => {
    const color = generateRandomColor();
    role.setColor(color).catch(console.error);
  }, 6000);

  message.channel.send({
    embeds: [
      new MessageEmbed()
        .setColor("GREEN")
        .setTitle("🎨 Rol rengi değiştirme başlatıldı.")
        .setDescription("Her 6 saniyede bir rol rengi değişecek.")
        .addField("Hedef Rol", role.name),
    ],
  });
};

exports.help = {
  name: "discomod",
  aliases: [],
  usage: "discomod @rol",
  description:
    "Belirtilen rolün rengini her 6 saniyede değiştirir. Tekrar çağrıldığında durdurur.",
  category: "Eğlence",
  cooldown: 10,
  permissions: ["ADMINISTRATOR"],
};
