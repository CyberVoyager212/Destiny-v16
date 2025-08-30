const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");

exports.execute = async (client, message, args) => {
  // Kullanıcı izni kontrolü
  if (!message.member.permissions.has("MANAGE_NICKNAMES")) {
    return message.reply(
      "⚠️ Bu komutu kullanmak için `Üyelerin Takma Adlarını Yönet` yetkisine sahip olmalısınız."
    );
  }

  // Bot izni kontrolü
  if (!message.guild.me.permissions.has("MANAGE_NICKNAMES")) {
    return message.reply(
      "❌ Bu komutu çalıştırabilmem için bana `Üyelerin Takma Adlarını Yönet` izni verilmiş olmalı."
    );
  }

  const nickname = args.join(" ");
  if (!nickname) {
    return message.reply(
      "⚠️ Lütfen verilecek takma adı belirtin.\n`topluadver <yeni_ad>`"
    );
  }

  // Tüm üyeleri fetch edip offline dahil et
  const members = await message.guild.members.fetch();
  const toProcess = members.filter((m) => !m.user.bot);
  const total = toProcess.size;
  if (total === 0) return message.reply("❌ Üye bulunamadı.");

  // Embed + buton
  const embed = new MessageEmbed()
    .setTitle("Toplu Takma Ad Verme")
    .setDescription(
      `Aşağıdaki butonla **${total}** üyeye **${nickname}** takma adını vermeyi onaylayın.`
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

  // Başlangıç Zamanı
  const startTime = Date.now();

  // Toplu takma ad verme işlemi
  let success = 0;
  let failed = 0;
  const progressEmbed = new MessageEmbed()
    .setTitle("Toplu Takma Ad İşlemi")
    .setDescription(`0/${total} işlendi...`)
    .addField("Başarıyla Takma Ad Verilen Üye", "0", true)
    .addField("Başarısız Olan Üye", "0", true)
    .setFooter("İşlem Süresi: 0 saniye");

  const progressMessage = await prompt.edit({
    embeds: [progressEmbed],
    components: [],
  });

  try {
    const memberPromises = toProcess.map(async (member, index) => {
      try {
        await member.setNickname(nickname);
        success++;

        if ((index + 1) % 10 === 0 || index + 1 === total) {
          const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
          const updatedEmbed = new MessageEmbed()
            .setTitle("Toplu Takma Ad İşlemi")
            .setDescription(`${success}/${total} işlendi...`)
            .addField("Başarıyla Takma Ad Verilen Üye", `${success}`, true)
            .addField("Başarısız Olan Üye", `${failed}`, true)
            .setFooter(`İşlem Süresi: ${totalTime} saniye`);

          await progressMessage.edit({
            embeds: [updatedEmbed],
          });
        }
      } catch (err) {
        failed++;
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        const updatedEmbed = new MessageEmbed()
          .setTitle("Toplu Takma Ad İşlemi")
          .setDescription(`${success}/${total} işlendi...`)
          .addField("Başarıyla Takma Ad Verilen Üye", `${success}`, true)
          .addField("Başarısız Olan Üye", `${failed}`, true)
          .setFooter(`İşlem Süresi: ${totalTime} saniye`);

        await progressMessage.edit({
          embeds: [updatedEmbed],
        });
      }
    });

    await Promise.all(memberPromises);

    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    const finalEmbed = new MessageEmbed()
      .setTitle("Toplu Takma Ad İşlemi - Tamamlandı")
      .setColor("#00FF00")
      .setDescription(
        `✅ Başarıyla ${success}/${total} üyeye takma adı verildi.`
      )
      .addField("Başarıyla Takma Ad Verilen Üye", `${success}`, true)
      .addField("Başarısız Olan Üye", `${failed}`, true)
      .setFooter(`İşlem Süresi: ${totalTime} saniye`);

    await prompt.edit({
      embeds: [finalEmbed],
      components: [],
    });
  } catch (err) {
    console.error("Takma ad verme işlemi sırasında hata oluştu:", err);
    return prompt.edit({
      components: [],
      embeds: [
        embed.setDescription(
          "❌ Takma ad verme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin."
        ),
      ],
    });
  }
};

exports.help = {
  name: "topluadver",
  aliases: ["tadver", "nickall"],
  usage: "topluadver <yeni_ad>",
  description:
    "Sunucudaki tüm (aktif ve çevrimdışı) üyelere aynı takma adı verir.",
  category: "Moderasyon",
  cooldown: 10,
  permissions: ["MANAGE_NICKNAMES"],
};
