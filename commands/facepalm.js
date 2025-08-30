const { MessageAttachment } = require("discord.js");
const Canvas = require("canvas");

module.exports.help = {
  name: "facepalm",
  aliases: [],
  description: "Belirtilen kullanıcının avatarına facepalm efekti uygular.",
  usage: "facepalm [@kullanıcı]",
  category: "Eğlence",
  cooldown: 3,
};

module.exports.execute = async (bot, message, args) => {
  // Kullanıcıyı bul (etiket, ID, isim, takma ad veya mesaj sahibini varsayılan al)
  let user =
    message.mentions.members.first() ||
    message.guild.members.cache.get(args[0]) ||
    message.guild.members.cache.find(
      (r) => r.user.username.toLowerCase() === args.join(" ").toLowerCase()
    ) ||
    message.guild.members.cache.find(
      (r) => r.displayName.toLowerCase() === args.join(" ").toLowerCase()
    ) ||
    message.member;

  if (!user)
    return message.channel.send("**Lütfen geçerli bir kullanıcı belirtin!**");

  let m = await message.channel.send("**Lütfen bekleyin...**");

  // Canvas oluştur
  const canvas = Canvas.createCanvas(632, 357);
  const ctx = canvas.getContext("2d");

  // Arka planı siyah yap
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 632, 357);

  // Kullanıcının avatarını yükle ve çiz
  let avatar = await Canvas.loadImage(
    user.user.displayAvatarURL({ format: "png", size: 512 })
  );
  ctx.drawImage(avatar, 199, 112, 235, 235);

  // Facepalm efekt katmanını yükle ve çiz
  let layer = await Canvas.loadImage(
    "https://raw.githubusercontent.com/Androz2091/AtlantaBot/master/assets/img/facepalm.png"
  );
  ctx.drawImage(layer, 0, 0, 632, 357);

  // Görüntüyü ataçman olarak hazırla
  let attachment = new MessageAttachment(canvas.toBuffer(), "facepalm.png");

  await m.delete();
  return message.channel.send({ files: [attachment] });
};
