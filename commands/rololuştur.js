// rololuştur.js
const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "rololuştur",
  aliases: ["rololuştur"],
  usage: "rololuştur help\nrololuştur <isim> [renk(hex)] [izin1,izin2,...]",
  description:
    "Yeni bir rol oluşturur. `help` ile izinler ve renk formatlarını görebilirsin.",
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
          .setTitle("rololuştur Kullanımı")
          .setDescription(this.help.usage)
          .addField(
            "Geçerli İzinler",
            Object.keys(require("discord.js").Permissions.FLAGS).join(", ")
          )
          .addField("Renk Örneği", "`#FF0000`, `BLUE`, `RANDOM`")
          .setColor("#00AAFF"),
      ],
    });

  const [isim, renk = "DEFAULT", izinler = ""] = args;
  const perms = izinler.split(",").filter((i) => i);
  try {
    const rol = await message.guild.roles.create({
      name: isim,
      color: renk,
      permissions: perms,
    });
    message.channel.send(
      `✅ Rol oluşturuldu: ${rol} (Renk: ${renk}, İzinler: ${
        perms.join(", ") || "–"
      })`
    );
  } catch (e) {
    console.error(e);
    message.reply("❌ Rol oluştururken hata oldu.");
  }
};
