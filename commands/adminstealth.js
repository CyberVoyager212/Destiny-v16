const { Permissions } = require("discord.js");

function parseDuration(timeString) {
  const regex = /^(\d+)\s*(saniye|dakika|saat|gün|ay|yıl)$/i;
  const match = timeString.match(regex);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    saniye: 1000,
    dakika: 60 * 1000,
    saat: 60 * 60 * 1000,
    gün: 24 * 60 * 60 * 1000,
    ay: 30 * 24 * 60 * 60 * 1000,
    yıl: 365 * 24 * 60 * 60 * 1000,
  };

  return value * (multipliers[unit] || 0);
}

exports.help = {
  name: "adminstealth",
  aliases: ["stealth", "adminghostmode"],
  usage: "adminstealth [süre]",
  description:
    "Admini belirtilen süre için gizli moda alır, kanalları göremez yapar ve sonra eski rollerini geri verir.",
  category: "Moderasyon",
  cooldown: 10,
  permissions: ["ADMINISTRATOR"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
    return message.reply(
      "🚫 Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın."
    );
  }

  const input = args.join(" ") || "20 saniye";
  const duration = parseDuration(input);

  if (!duration) {
    return message.reply(
      "⚠️ Geçersiz süre formatı! Örnek: `10 saniye`, `2 dakika`, `1 saat`"
    );
  }

  const member = message.member;
  const guild = message.guild;

  const savedRoles = member.roles.cache.filter((r) => r.name !== "@everyone");

  let stealthRole = guild.roles.cache.find((r) => r.name === "Stealth Mode");
  if (!stealthRole) {
    try {
      stealthRole = await guild.roles.create({
        name: "Stealth Mode",
        color: "#2C2F33",
        permissions: [],
        reason: "AdminStealth komutu için gizli rol oluşturuldu.",
      });

      guild.channels.cache.forEach(async (channel) => {
        try {
          await channel.permissionOverwrites.edit(stealthRole, {
            VIEW_CHANNEL: false,
            SEND_MESSAGES: false,
            CONNECT: false,
          });
        } catch (e) {
          console.error(
            `Kanal izinleri güncellenirken hata: ${channel.name}`,
            e
          );
        }
      });
    } catch (err) {
      console.error("Stealth Mode rolü oluşturulamadı:", err);
      return message.reply("⚠️ Stealth Mode rolü oluşturulamadı.");
    }
  }

  try {
    await member.roles.set([stealthRole]);
  } catch (err) {
    console.error("Roller ayarlanırken hata:", err);
    return message.reply("⚠️ Roller güncellenirken hata oluştu.");
  }

  message.reply(
    `🕵️ Gizli mod aktif! Artık kanallardan gizlendin. Discord durumunu "Görünmez" yapmayı unutma! (${input} boyunca aktif)`
  );

  setTimeout(async () => {
    try {
      await member.roles.set(savedRoles.map((r) => r.id));
      message.channel.send(`🚨 Gizli mod sona erdi! Roller geri yüklendi.`);
    } catch (err) {
      console.error("Roller geri yüklenirken hata:", err);
      message.channel.send(
        "⚠️ Gizli mod sona erdi fakat roller geri yüklenemedi."
      );
    }
  }, duration);
};
