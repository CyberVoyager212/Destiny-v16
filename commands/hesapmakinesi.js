const math = require("mathjs");
const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");

exports.execute = async (client, message, args) => {
  const row1 = new MessageActionRow().addComponents(
    new MessageButton().setCustomId("1").setLabel("1").setStyle("SECONDARY"),
    new MessageButton().setCustomId("2").setLabel("2").setStyle("SECONDARY"),
    new MessageButton().setCustomId("3").setLabel("3").setStyle("SECONDARY"),
    new MessageButton().setCustomId("plus").setLabel("+").setStyle("PRIMARY"),
    new MessageButton()
      .setCustomId("openParen")
      .setLabel("(")
      .setStyle("PRIMARY")
  );

  const row2 = new MessageActionRow().addComponents(
    new MessageButton().setCustomId("4").setLabel("4").setStyle("SECONDARY"),
    new MessageButton().setCustomId("5").setLabel("5").setStyle("SECONDARY"),
    new MessageButton().setCustomId("6").setLabel("6").setStyle("SECONDARY"),
    new MessageButton().setCustomId("minus").setLabel("-").setStyle("PRIMARY"),
    new MessageButton()
      .setCustomId("closeParen")
      .setLabel(")")
      .setStyle("PRIMARY")
  );

  const row3 = new MessageActionRow().addComponents(
    new MessageButton().setCustomId("7").setLabel("7").setStyle("SECONDARY"),
    new MessageButton().setCustomId("8").setLabel("8").setStyle("SECONDARY"),
    new MessageButton().setCustomId("9").setLabel("9").setStyle("SECONDARY"),
    new MessageButton()
      .setCustomId("multiply")
      .setLabel("x")
      .setStyle("PRIMARY"),
    new MessageButton().setCustomId("power").setLabel("^").setStyle("PRIMARY")
  );

  const row4 = new MessageActionRow().addComponents(
    new MessageButton().setCustomId("clear").setLabel("AC").setStyle("DANGER"),
    new MessageButton().setCustomId("0").setLabel("0").setStyle("SECONDARY"),
    new MessageButton().setCustomId("delete").setLabel("⌫").setStyle("DANGER"),
    new MessageButton().setCustomId("divide").setLabel("/").setStyle("PRIMARY"),
    new MessageButton().setCustomId("equals").setLabel("=").setStyle("SUCCESS")
  );

  let currentExpression = "";

  const startMessage = await message.reply({
    content: "Hesap makinesi hazır! İşlemi yapmak için butonlara tıklayın.",
    embeds: [
      new MessageEmbed()
        .setTitle("🧮・Hesap Makinesi")
        .setDescription(`Hesaplama: ${currentExpression}`)
        .setColor("BLUE"),
    ],
    components: [row1, row2, row3, row4],
  });

  const filter = (interaction) => interaction.user.id === message.author.id;
  const collector = startMessage.createMessageComponentCollector({
    filter,
    time: 60000,
  });

  collector.on("collect", async (interaction) => {
    const buttonId = interaction.customId;
    await interaction.deferUpdate();

    if (buttonId === "clear") {
      currentExpression = "";
    } else if (buttonId === "delete") {
      currentExpression = currentExpression.slice(0, -1);
    } else if (buttonId === "equals") {
      try {
        const result = math.evaluate(currentExpression);
        currentExpression = result.toString();
      } catch {
        currentExpression = "Hata!";
      }
    } else if (buttonId === "openParen") {
      currentExpression += "(";
    } else if (buttonId === "closeParen") {
      currentExpression += ")";
    } else {
      currentExpression +=
        buttonId === "plus"
          ? "+"
          : buttonId === "minus"
          ? "-"
          : buttonId === "multiply"
          ? "*"
          : buttonId === "divide"
          ? "/"
          : buttonId === "power"
          ? "^"
          : buttonId;
    }

    await interaction.editReply({
      embeds: [
        new MessageEmbed()
          .setTitle("🧮・Hesap Makinesi")
          .setDescription(`Hesaplama: ${currentExpression}`)
          .setColor("BLUE"),
      ],
      components: [row1, row2, row3, row4],
    });
  });

  collector.on("end", async () => {
    await startMessage.edit({
      content: "Süre doldu, işlem iptal edildi.",
      embeds: [
        new MessageEmbed()
          .setTitle("🧮・Hesap Makinesi")
          .setDescription("Süre doldu, işlem iptal edildi.")
          .setColor("RED"),
      ],
      components: [],
    });
  });
};

exports.help = {
  name: "calculator",
  aliases: ["calc", "hesapla"],
  usage: "calculator",
  description: "Matematiksel işlemler yapmanıza olanak tanır.",
  category: "Araçlar",
  cooldown: 15,
};
