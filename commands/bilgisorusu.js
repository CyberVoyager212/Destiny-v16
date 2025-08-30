const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");

let questions = [
  {
    question:
      "Kuantum fiziğinde, gözlemcinin sistemi nasıl etkilediğini açıklayan kavram nedir?",
    options: {
      A: "Süperpozisyon",
      B: "Örüntüleme",
      C: "Kuantum Dolanıklığı",
      D: "Gözlemci Etkisi",
    },
    correct: "D",
  },
  {
    question: "'Gödel'in Eksiksizsizlik Teoremi' neyi ifade eder?",
    options: {
      A: "Tüm matematiksel ifadelerin doğrulanabilir olduğunu",
      B: "Her tutarlı biçimsel sistemin karar verilemez ifadeler içerdiğini",
      C: "Tüm doğa yasalarının birleşik bir teoride açıklanabileceğini",
      D: "Zaman yolculuğunun mümkün olduğunu",
    },
    correct: "B",
  },
  {
    question:
      "Evrenin genişlemesinin hızlanmasından sorumlu olduğu düşünülen gizemli enerji türü nedir?",
    options: {
      A: "Kara madde",
      B: "Kara enerji",
      C: "Nükleer enerji",
      D: "Kinetik enerji",
    },
    correct: "B",
  },
];

exports.execute = async (client, message, args) => {
  if (questions.length === 0) {
    return message.reply("Quiz soruları tükenmiştir.");
  }

  const randomIndex = Math.floor(Math.random() * questions.length);
  const questionData = questions[randomIndex];

  const embed = new MessageEmbed()
    .setTitle("Bilgi Sorusu")
    .setDescription(questionData.question)
    .addFields(
      { name: "A)", value: questionData.options.A, inline: true },
      { name: "B)", value: questionData.options.B, inline: true },
      { name: "C)", value: questionData.options.C, inline: true },
      { name: "D)", value: questionData.options.D, inline: true }
    )
    .setColor("BLUE")
    .setFooter({ text: "Cevaplamak için butonlara tıklayın. Süre: 40 dakika" });

  const row = new MessageActionRow().addComponents(
    new MessageButton().setCustomId("A").setLabel("A").setStyle("PRIMARY"),
    new MessageButton().setCustomId("B").setLabel("B").setStyle("PRIMARY"),
    new MessageButton().setCustomId("C").setLabel("C").setStyle("PRIMARY"),
    new MessageButton().setCustomId("D").setLabel("D").setStyle("PRIMARY")
  );

  const sentMessage = await message.channel.send({
    embeds: [embed],
    components: [row],
  });

  const filter = (interaction) =>
    ["A", "B", "C", "D"].includes(interaction.customId) &&
    !interaction.user.bot;
  const collector = sentMessage.createMessageComponentCollector({
    filter,
    time: 2400000,
  });

  let userAnswers = new Map();

  collector.on("collect", async (interaction) => {
    if (userAnswers.has(interaction.user.id)) {
      return interaction.reply({
        content: "❌ Zaten bir cevap verdiniz!",
        ephemeral: true,
      });
    }

    userAnswers.set(interaction.user.id, interaction.customId);

    await interaction.reply({
      content: `✅ Cevabınızı aldık: **${interaction.customId}**`,
      ephemeral: true,
    });
  });

  collector.on("end", async () => {
    let correctUsers = [];
    let incorrectUsers = [];

    userAnswers.forEach((answer, userId) => {
      const user = message.guild.members.cache.get(userId);
      if (answer === questionData.correct) {
        correctUsers.push(user ? user.user.tag : "Bilinmeyen Kullanıcı");
      } else {
        incorrectUsers.push(user ? user.user.tag : "Bilinmeyen Kullanıcı");
      }
    });

    const resultEmbed = new MessageEmbed()
      .setTitle("Bilgi Sorusu Sonucu")
      .setDescription(`**Doğru Cevap:** ${questionData.correct}`)
      .addFields(
        {
          name: "Doğru Cevap Verenler:",
          value:
            correctUsers.length > 0
              ? correctUsers.join("\n")
              : "Kimse doğru cevap vermedi.",
        },
        {
          name: "Yanlış Cevap Verenler:",
          value:
            incorrectUsers.length > 0
              ? incorrectUsers.join("\n")
              : "Kimse yanlış cevap vermedi.",
        }
      )
      .setColor("GREEN")
      .setFooter({ text: "Süre doldu. Cevaplar sıralandı." })
      .setTimestamp();

    await message.channel.send({ embeds: [resultEmbed] });
    await sentMessage.edit({ components: [] });
  });

  questions.splice(randomIndex, 1); // Kullanılan soruyu listeden çıkar
};

exports.help = {
  name: "bilgisorusu",
  aliases: ["triviasoru", "bsoru"],
  usage: "bilgisorusu",
  description: "Türkçe bilgi sorusu sorar.",
  category: "Eğlence",
  cooldown: 5,
};
