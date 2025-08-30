const { MessageActionRow, MessageButton } = require("discord.js");

const emojis = require("../emoji.json"); // emoji.json içe aktarılır

// Kazanca göre emoji seçici
function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message, args) => {
  let member =
    message.mentions.members.first() ||
    message.guild.members.cache.get(args[0]);
  if (!member)
    return message.channel.send("Lütfen kişiyi etiketleyin veya ID'sini girin");

  let amount = args[1];
  if (!amount || isNaN(amount) || amount <= 0)
    return message.channel.send("Lütfen geçerli pozitif bir miktar girin");
  amount = Math.floor(amount);

  try {
    // Kullanıcının mevcut bakiyesi (money_ key)
    let authordata = (await client.db.get(`money_${message.author.id}`)) || 0;

    // Borç kontrolü
    let loanData = (await client.db.get(`loan_${message.author.id}`)) || {
      amount: 0,
    };
    if (loanData.amount > 0) {
      return message.channel.send(
        "❌ Mevcut borcunuz varken para transferi yapamazsınız! Önce borcunuzu ödeyin."
      );
    }

    if (authordata < amount) {
      return message.channel.send("Yetersiz bakiye.");
    }

    // Transfer işlemi: Gönderen bakiyesini azalt, alanı artır
    await client.db.add(`money_${member.id}`, amount);
    await client.db.add(`money_${message.author.id}`, -amount);

    const emoji = chooseEmoji(amount);

    // Onay için butonlu mesaj gönder
    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("confirm")
        .setLabel("Onayla ✅")
        .setStyle("SUCCESS"),
      new MessageButton()
        .setCustomId("cancel")
        .setLabel("İptal et ❌")
        .setStyle("DANGER")
    );

    // Kullanıcıya transfer bilgisi
    const sentMessage = await message.channel.send({
      content: `Başarıyla ${emoji} **${amount}** miktarını **${member.user.tag}** kişisine transfer ettiniz. Onaylamak için ✅, iptal etmek için ❌ butonuna tıklayın.`,
      components: [row],
    });

    // Buton etkileşimlerini dinleme
    const filter = (i) => i.user.id === message.author.id;
    const collector = sentMessage.createMessageComponentCollector({
      filter,
      time: 15000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "confirm") {
        await interaction.reply({
          content: "Transfer işlemi başarıyla onaylandı!",
          ephemeral: true,
        });
      } else if (interaction.customId === "cancel") {
        // Transfer iptalinde bakiye geri alınmalı, iptal öncesi bakiye zaten düştü, iptal için geri ekle
        await client.db.add(`money_${member.id}`, -amount);
        await client.db.add(`money_${message.author.id}`, amount);

        await interaction.reply({
          content: "Transfer işlemi iptal edildi.",
          ephemeral: true,
        });
      }
      collector.stop();
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time") {
        message.channel.send("Onay süresi doldu, transfer işlemi onaylanmadı.");

        // Süre dolunca transfer iptal sayılabilir, bakiye geri alınmalı
        client.db.add(`money_${member.id}`, -amount);
        client.db.add(`money_${message.author.id}`, amount);
      }
    });
  } catch (error) {
    console.error(error);
    return message.channel.send("Bir hata oluştu, lütfen tekrar deneyin.");
  }
};

exports.help = {
  name: "transfer",
  aliases: ["give", "share"],
  description:
    "Belirtilen kullanıcıya para transfer eder. Ancak borcunuz varsa transfer yapamazsınız.",
  usage: "transfer <üye> <miktar>",
  category: "Ekonomi",
  cooldown: 5,
};
