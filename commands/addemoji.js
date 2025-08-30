// === KOMUT: addemoji ===
const { MessageEmbed, Util } = require("discord.js");

exports.execute = async (bot, message, args) => {
  if (!message.member.permissions.has("MANAGE_EMOJIS_AND_STICKERS")) {
    return message.channel.send(
      "Bu komutu kullanmak için `Emojileri Yönet` yetkisine sahip olmalısın!"
    );
  }

  if (!message.guild.me.permissions.has("MANAGE_EMOJIS_AND_STICKERS")) {
    return message.channel.send(
      "Emoji yükleyebilmem için `Emojileri Yönet` yetkisine ihtiyacım var!"
    );
  }

  const emoji = args[0];
  if (!emoji) return message.channel.send("Lütfen bir emoji girin!");

  let customemoji = Util.parseEmoji(emoji);

  if (customemoji?.id) {
    const Link = `https://cdn.discordapp.com/emojis/${customemoji.id}.${
      customemoji.animated ? "gif" : "png"
    }`;
    const name = args.slice(1).join(" ") || customemoji.name;

    try {
      const newEmoji = await message.guild.emojis.create(Link, name);
      const embed = new MessageEmbed()
        .setTitle("✅ Emoji Eklendi")
        .setColor("RANDOM")
        .setDescription(
          `Emoji başarıyla eklendi!\n**Adı:** ${newEmoji.name}\n[Önizleme](${Link})`
        );

      return message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      return message.channel.send(
        "❌ Emoji eklenirken bir hata oluştu! Sunucuda yeterli emoji slotu olup olmadığını kontrol edin."
      );
    }
  } else {
    return message.channel.send(
      "Bu emoji zaten kullanılabilir, sunucuya eklemeye gerek yok!"
    );
  }
};

exports.help = {
  name: "addemoji",
  aliases: ["emoji-ekle", "emote-ekle"],
  usage: "addemoji <emoji>",
  description: "Belirtilen özel emojiyi sunucuya ekler.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_EMOJIS_AND_STICKERS"],
};
