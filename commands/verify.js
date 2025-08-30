const { MessageAttachment } = require("discord.js");
const { createCanvas } = require("canvas");
// CAPTCHA yardımcı fonksiyonlarını içe aktar
const { generateCaptcha, generateCaptchaImage } = require("../utils/captcha");

module.exports = {
  name: "verify",
  aliases: ["doğrulama"],
  usage:
    "verify [ayar yap <@rol1,@rol2,...> <#kanal> [@customRole]|ayar sil|help]",
  description:
    "Kullanıcının doğrulama rolü almasını sağlar. Yönetici verify ayar yap, ayar sil komutlarıyla yapılandırabilir.",
  cooldown: 5,

  async execute(client, message, args) {
    try {
      const { guild, member, channel } = message;

      // Ayar komutları
      if (args[0] === "ayar") {
        if (!member.permissions.has("ADMINISTRATOR"))
          return message.reply(
            "Bu komutu yalnızca sunucu yöneticileri kullanabilir."
          );

        // Yap alt komutu
        if (args[1] === "yap") {
          if (args[2] === "help") {
            return message.channel.send(
              `**verify ayar yap** komutuyla doğrulama ayarlarını yapabilirsiniz:\n` +
                `• \`verify ayar yap @Rol1,@Rol2,... #Kanal @CustomRole\` — Bir veya birden fazla doğrulama rolü, kanal ve isteğe bağlı custom rolü ayarlar.\n` +
                `• Rol mentions virgülle ayrılmalıdır.\n` +
                `Örnek: verify ayar yap @Üye,@Yetkili #doğrulama @Bekleyen`
            );
          }

          // Roller ve kanal kontrolü
          const mentionedRoles = [...message.mentions.roles.values()];
          const targetChannel = message.mentions.channels.first();
          const customRole =
            mentionedRoles.length > 1 ? mentionedRoles.pop() : null;

          if (!mentionedRoles.length || !targetChannel) {
            return message.reply(
              "Lütfen en az bir rol ve bir kanal etiketleyin. `verify ayar yap help` ile örnekleri görebilirsiniz."
            );
          }

          const roleIDs = mentionedRoles.map((r) => r.id);
          const customRoleID =
            customRole && customRole.id !== roleIDs[0] ? customRole.id : null;

          // Ayarları DB'ye kaydet
          await client.db.set(`verify_${guild.id}`, {
            roleIDs,
            channelID: targetChannel.id,
            customRoleID,
          });

          // Geri bildirim
          const rolesList = roleIDs.map((id) => `<@&${id}>`).join(", ");
          const customText = customRoleID
            ? `\n• Custom Rol: <@&${customRoleID}>`
            : "";
          return message.channel.send(
            `Doğrulama ayarları güncellendi:
• Roller: ${rolesList}
• Kanal: <#${targetChannel.id}>${customText}`
          );
        }

        // Sil alt komutu
        if (args[1] === "sil") {
          const exists = await client.db.get(`verify_${guild.id}`);
          if (!exists) {
            return message.reply(
              "Bu sunucu için herhangi bir doğrulama ayarı bulunamadı."
            );
          }
          await client.db.delete(`verify_${guild.id}`);
          return message.channel.send("Doğrulama ayarları başarıyla silindi.");
        }

        // Yanlış alt komut
        return message.reply(
          "Geçersiz alt komut. `verify ayar yap`, `verify ayar sil` veya `verify ayar yap help` kullanabilirsiniz."
        );
      }

      // Yardım
      if (args[0] === "help") {
        return message.channel.send(
          `**verify** komutu:
• **verify ayar yap** — Sunucu yöneticileri için doğrulama ayarlarını yapılandırır. (\`verify ayar yap help\`)
• **verify ayar sil** — Sunucudaki doğrulama ayarlarını siler.
• **verify** — Kullanıcılar için doğrulama kodu üretir ve verilen kanalda çalışır.`
        );
      }

      // Normal doğrulama akışı
      const config = await client.db.get(`verify_${guild.id}`);
      if (!config)
        return message.reply(
          "Bu sunucu için doğrulama ayarlanmamış. Yönetici `verify ayar yap` komutunu kullanmalı."
        );

      const { roleIDs, channelID, customRoleID } = config;
      if (channel.id !== channelID) {
        const msg = await message.reply(
          `Bu komut sadece <#${channelID}> kanalında çalışabilir!`
        );
        setTimeout(() => msg.delete(), 5000);
        return;
      }

      if (roleIDs.some((r) => member.roles.cache.has(r))) {
        const msg = await message.reply("Zaten doğrulanmışsınız!");
        setTimeout(() => msg.delete(), 5000);
        return;
      }

      // CAPTCHA oluştur
      const captcha = generateCaptcha();
      const captchaImage = generateCaptchaImage(captcha);
      const filter = (response) => response.author.id === member.id;
      const captchaMessage = await message.channel.send({
        content: "Lütfen aşağıdaki CAPTCHA kodunu girin:",
        files: [{ attachment: captchaImage, name: "captcha.png" }],
      });

      let attempts = 0;
      const maxAttempts = 3;
      const captchaTimeout = 50000;

      const checkCaptcha = async () => {
        const response = await message.channel
          .awaitMessages({
            filter,
            max: 1,
            time: captchaTimeout,
            errors: ["time"],
          })
          .catch(() => null);

        if (!response) {
          const timeoutMsg = await message.channel.send(
            "Doğrulama süresi doldu! Lütfen tekrar komutu kullanın."
          );
          setTimeout(() => timeoutMsg.delete(), 5000);
          setTimeout(() => captchaMessage.delete(), 5000);
          return;
        }

        const userResponse = response.first().content;
        if (userResponse === captcha) {
          if (customRoleID) {
            try {
              const oldRole = await guild.roles.fetch(customRoleID);
              if (oldRole) await member.roles.remove(customRoleID);
            } catch (err) {
              console.error("Custom role removal error:", err);
            }
          }
          for (const id of roleIDs) await member.roles.add(id);

          const successMessage = await message.channel.send(
            `Tebrikler, <@${member.id}>! Başarıyla doğrulandınız.`
          );
          setTimeout(() => successMessage.delete(), 5000);
          setTimeout(() => message.delete(), 5000);
          setTimeout(() => captchaMessage.delete(), 5000);
          setTimeout(() => response.first().delete(), 5000);
        } else {
          attempts++;
          if (attempts < maxAttempts) {
            const retryMsg = await message.channel.send(
              "Yanlış CAPTCHA! Tekrar deneyin."
            );
            setTimeout(() => retryMsg.delete(), 5000);
            setTimeout(() => response.first().delete(), 5000);
            checkCaptcha();
          } else {
            const failureMsg = await message.channel.send(
              "Doğrulama başarısız! 3 deneme hakkınızı da kullandınız."
            );
            setTimeout(() => failureMsg.delete(), 5000);
            setTimeout(() => response.first().delete(), 5000);
          }
        }
      };

      checkCaptcha();
      setTimeout(() => captchaMessage.delete(), captchaTimeout);
    } catch (error) {
      console.error("Doğrulama sırasında bir hata oluştu:", error);
      const errorMsg = await message.reply(
        "Doğrulama sırasında bir hata oluştu. Lütfen tekrar deneyin."
      );
      setTimeout(() => errorMsg.delete(), 5000);
    }
  },

  help: {
    name: "doğrulama",
    aliases: ["verify"],
    usage: "doğrulama",
    description: "Kullanıcının doğrulama rolü almasını sağlar.",
    category: "Eğlence",
    cooldown: 5,
  },
};
