// rolduzenle.js
const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "roldüzenle",
  aliases: ["rolduzenle"],
  usage:
    "roldüzenle help\n" +
    "roldüzenle <@rol|id|isim> [renk(hex)] [izin1,izin2,...]",
  description:
    "Belirtilen rolün rengini veya izinlerini değiştirir. `help` ile izinleri ve renkleri görebilirsin.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_ROLES"],

};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MANAGE_ROLES"))
    return message.reply(
      "Bu komutu kullanmak için `Rolleri Yönet` yetkisine sahip olmalısın."
    );

  if (args[0] === "help")
    return message.channel.send({
      embeds: [
        new MessageEmbed()
          .setTitle("roldüzenle Kullanımı")
          .setDescription(this.help.usage)
          .addField(
            "Geçerli İzinler",
            Object.keys(require("discord.js").Permissions.FLAGS).join(", ")
          )
          .addField("Renk Örneği", "`#FF0000`, `BLUE`, `RANDOM`")
          .setColor("#00AAFF"),
      ],
    });

  const [target, renk = null, izinler = null] = args;
  const rol =
    message.mentions.roles.first() ||
    message.guild.roles.cache.get(target) ||
    message.guild.roles.cache.find((r) => r.name === target);
  if (!rol) return message.reply("Rol bulunamadı.");

  const options = {};
  if (renk) options.color = renk;
  if (izinler) options.permissions = izinler.split(",").filter((i) => i);

  try {
    await rol.edit(options);
    message.channel.send(`✅ Rol güncellendi: ${rol.name}`);
  } catch (e) {
    console.error(e);
    message.reply("❌ Rol düzenleme sırasında hata oldu.");
  }
};
