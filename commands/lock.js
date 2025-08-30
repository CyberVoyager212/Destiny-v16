module.exports = {
  name: "lock",
  description:
    "Yöneticiler hariç tüm rollerin belirtilen kanallara yazmasını kilitler veya açar.",
  usage: "lock <lock|unlock> [#kanal ...]",
  aliases: [],
  category: "Moderasyon",
  cooldown: 10,

  async execute(client, message, args) {
    if (!message.member.permissions.has("MANAGE_CHANNELS")) {
      return message.reply(
        "❌ Bu komutu kullanmak için **Kanalları Yönet** yetkisine sahip olmalısınız."
      );
    }

    if (!args[0] || !["lock", "unlock"].includes(args[0].toLowerCase())) {
      return message.reply(
        "❌ Lütfen `lock` veya `unlock` argümanını belirtin. Örnek: `lock lock` veya `lock unlock`"
      );
    }

    const action = args[0].toLowerCase();

    // Kanal etiketleri alınır, eğer yoksa komutun yazıldığı kanal kullanılır
    const channels =
      message.mentions.channels.size > 0
        ? message.mentions.channels
        : new Map([[message.channel.id, message.channel]]);

    // Yönetici olmayan roller
    const roles = message.guild.roles.cache.filter(
      (role) => !role.permissions.has("ADMINISTRATOR")
    );

    try {
      for (const [, channel] of channels) {
        for (const [roleId, role] of roles) {
          await channel.permissionOverwrites.edit(role, {
            SEND_MESSAGES: action === "lock" ? false : null,
          });
        }

        if (action === "lock") {
          await channel.send(
            "🔒 Bu kanal kilitlendi! Yöneticiler hariç tüm roller yazamaz."
          );
        } else {
          await channel.send(
            "🔓 Bu kanalın kilidi açıldı! Roller tekrar yazabilir."
          );
        }
      }
    } catch (error) {
      console.error(error);
      return message.reply("❌ Kanal kilitlenirken/açılırken bir hata oluştu.");
    }
  },

  help: {
    name: "lock",
    description:
      "Yöneticiler hariç tüm rollerin belirtilen kanallara mesaj göndermesini kilitler veya açar.",
    usage: "lock <lock|unlock> [#kanal ...]",
    aliases: [],
    category: "Moderasyon",
    cooldown: 10,
    permissions: ["MANAGE_CHANNELS"],
  },
};
