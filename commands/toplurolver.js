const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");

exports.execute = async (client, message, args) => {
  // Kullanıcı izni kontrolü
  if (!message.member.permissions.has("MANAGE_ROLES")) {
    return message.reply(
      "⚠️ Bu komutu kullanmak için `Rolleri Yönet` yetkisine sahip olmalısınız."
    );
  }

  // Bot izni kontrolü
  if (!message.guild.me.permissions.has("MANAGE_ROLES")) {
    return message.reply(
      "❌ Bu komutu çalıştırabilmem için bana `Rolleri Yönet` izni verilmiş olmalı."
    );
  }

  const role = message.mentions.roles.first();
  if (!role) {
    return message.reply("⚠️ Lütfen bir rol etiketleyin.\n`toplurolver @rol`");
  }

  const members = await message.guild.members.fetch();
  const toProcess = members.filter(
    (m) => !m.user.bot && !m.roles.cache.has(role.id)
  );
  const total = toProcess.size;
  if (total === 0) return message.reply("❌ İşlem yapılacak üye bulunamadı.");

  const embed = new MessageEmbed()
    .setTitle("Toplu Rol Verme")
    .setDescription(
      `Butonla **${role.name}** rolünü **${total}** üyeye vermeyi onaylayın.`
    )
    .setColor("#5865F2");

  const row = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId("execute")
      .setLabel("Uygula")
      .setStyle("SUCCESS"),
    new MessageButton()
      .setCustomId("cancel")
      .setLabel("İptal")
      .setStyle("DANGER")
  );

  const prompt = await message.channel.send({
    embeds: [embed],
    components: [row],
  });

  const filter = (i) => i.user.id === message.author.id;
  let interaction;
  try {
    interaction = await prompt.awaitMessageComponent({ filter, time: 20000 });
  } catch {
    await prompt.edit({ components: [] });
    return message.channel.send("⏳ Süre doldu, işlem iptal edildi.");
  }

  await interaction.deferUpdate();
  if (interaction.customId === "cancel") {
    return prompt.edit({
      components: [],
      embeds: [embed.setDescription("❌ İşlem iptal edildi.")],
    });
  }

  // İşlem başlatılmadan önce zamanı alıyoruz
  const startTime = Date.now();

  // Toplu rol verme işlemi
  const success = [];
  const failed = [];
  const progressUpdates = [];

  const progressEmbed = new MessageEmbed()
    .setTitle("Toplu Rol Verme - İlerleme")
    .setColor("#5865F2")
    .setDescription(
      `Başarıyla rol verilen üye: 0/${total}\nRol verilirken hata oluşan üye: 0/${total}`
    )
    .addField("Durum", "İşlem Başlamadı...", false)
    .setFooter(`İşlem Süresi: 0 saniye`);

  // Gönderilen Embed mesajını güncellemek
  const progressMessage = await prompt.edit({
    embeds: [progressEmbed],
    components: [],
  });

  try {
    const memberPromises = toProcess.map(async (member, index) => {
      try {
        await member.roles.add(role);
        success.push(member.user.tag);

        if ((index + 1) % 10 === 0 || index + 1 === total) {
          const successCount = success.length;
          const failedCount = failed.length;
          const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

          const updatedEmbed = new MessageEmbed()
            .setTitle("Toplu Rol Verme - İlerleme")
            .setColor("#5865F2")
            .setDescription(
              `Başarıyla rol verilen üye: ${successCount}/${total}\Rol verilirken hata oluşan üye: ${failedCount}/${total}`
            )
            .addField("Durum", `İşlem Tamamlanıyor...`, false)
            .setFooter(`İşlem Süresi: ${totalTime} saniye`);

          await progressMessage.edit({
            embeds: [updatedEmbed],
          });
        }
      } catch (err) {
        failed.push(member.user.tag);
        const failedCount = failed.length;
        const successCount = success.length;
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

        const updatedEmbed = new MessageEmbed()
          .setTitle("Toplu Rol Verme - İlerleme")
          .setColor("#FF0000")
          .setDescription(
            `Başarıyla rol verilen üye: ${successCount}/${total}\nRol verilirken hata oluşan üye: ${failedCount}/${total}`
          )
          .addField("Durum", `İşlem Tamamlanıyor...`, false)
          .setFooter(`İşlem Süresi: ${totalTime} saniye`);

        await progressMessage.edit({
          embeds: [updatedEmbed],
        });
      }
    });

    await Promise.all(memberPromises);

    // İşlem bittiğinde toplam süreyi ve başarı/hata oranlarını göster
    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);
    const successCount = success.length;
    const failedCount = failed.length;

    const finalEmbed = new MessageEmbed()
      .setTitle("Toplu Rol Verme - Tamamlandı")
      .setColor("#00FF00")
      .setDescription(
        `Başarıyla rol verilen üye: ${successCount}/${total}\nRol verilirken hata oluşan üye: ${failedCount}/${total}`
      )
      .addField("Durum", "İşlem Tamamlandı", false)
      .setFooter(`İşlem Süresi: ${totalTime} saniye`);

    await prompt.edit({
      embeds: [finalEmbed],
      components: [],
    });
  } catch (err) {
    console.error("Rol verme işlemi sırasında hata oluştu:", err);
    return prompt.edit({
      components: [],
      embeds: [
        embed.setDescription(
          "❌ Rol verme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin."
        ),
      ],
    });
  }
};

exports.help = {
  name: "toplurolver",
  aliases: ["trolver", "giveallrole"],
  usage: "toplurolver @rol",
  description:
    "Sunucudaki tüm (aktif ve çevrimdışı) üyelere belirtilen rolü verir.",
  category: "Moderasyon",
  cooldown: 10,
  permissions: ["MANAGE_ROLES"],
};
