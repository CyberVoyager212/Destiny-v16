const { MessageEmbed } = require("discord.js");

module.exports = {
  name: "invisban",
  description:
    'Kullanıcının tüm rollerini alır ve "Yasaklı" rolü vererek onu görünmez şekilde yasaklar.',
  aliases: ["gizliban", "silentban"],
  usage: "invisban <@kullanıcı | kullanıcı ID | kullanıcı adı> <sebep>",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_ROLES"],

  async execute(client, message, args) {
    if (!message.member.permissions.has("MANAGE_ROLES"))
      return message.reply(
        "❌ Bu komutu kullanmak için **Rolleri Yönet** iznine sahip olmalısın!"
      );

    if (!args[0])
      return message.reply(
        "❌ Lütfen yasaklanacak kullanıcıyı **etiketleyin, adını yazın veya ID girin!**"
      );

    let user =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]) ||
      message.guild.members.cache.find(
        (m) => m.user.username.toLowerCase() === args[0].toLowerCase()
      );

    if (!user)
      return message.reply(
        "❌ Kullanıcı bulunamadı! **Doğru bir kullanıcı adı veya ID girdiğinizden emin olun.**"
      );

    let reason = args.slice(1).join(" ") || "Sebep belirtilmedi";

    // Sunucuda "Yasaklı" rolü olup olmadığını kontrol et
    let banRole = message.guild.roles.cache.find((r) => r.name === "Yasaklı");

    // Eğer rol yoksa oluştur
    if (!banRole) {
      try {
        banRole = await message.guild.roles.create({
          name: "Yasaklı",
          color: "BLACK",
          permissions: [],
        });

        // Tüm kanallarda mesaj gönderme ve sesli bağlanma iznini kapat
        message.guild.channels.cache.forEach(async (channel) => {
          await channel.permissionOverwrites.create(banRole, {
            SEND_MESSAGES: false,
            CONNECT: false,
          });
        });
      } catch (err) {
        return message.reply(
          '❌ "Yasaklı" rolü oluşturulurken bir hata oluştu!'
        );
      }
    }

    // Kullanıcının tüm rollerini al ve sadece Yasaklı rolünü ver
    try {
      await user.roles.set([banRole]);
      message.channel.send(
        `✅ **${user.user.tag}** kullanıcısı görünmez şekilde yasaklandı! **Sebep:** ${reason}`
      );
    } catch (err) {
      return message.reply("❌ Kullanıcının rollerini değiştirme iznim yok!");
    }
  },

  help: {
    name: "invisban",
    aliases: ["gizliban", "silentban"],
    usage: "invisban <@kullanıcı | kullanıcı ID | kullanıcı adı> <sebep>",
    description:
      'Kullanıcının tüm rollerini alır ve "Yasaklı" rolü vererek onu görünmez şekilde yasaklar.',
    category: "Moderasyon",
    cooldown: 5,
    permissions: ["MANAGE_ROLES"],
  },
};
