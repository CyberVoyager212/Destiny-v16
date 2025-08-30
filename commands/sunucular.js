// sunucular.js
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const botConfig = require("../botConfig");

exports.execute = async (client, message, args) => {
  if (!botConfig.admins.includes(message.author.id))
    return message.reply("❌ Yetkiniz yok.");

  const guilds = client.guilds.cache.map((g) => g).slice(0, 10);
  const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

  let embed = new MessageEmbed()
    .setTitle("Sunucular")
    .setColor("BLUE")
    .setTimestamp()
    .addFields(
      guilds.map((g, i) => ({
        name: `${emojis[i]} ${g.name}`,
        value: `Üyeler: ${g.memberCount}`,
        inline: true,
      }))
    );

  let row = new MessageActionRow();
  guilds.forEach((g, i) => {
    row.addComponents(
      new MessageButton()
        .setCustomId(`leave_${i}`)
        .setLabel(emojis[i])
        .setStyle("DANGER")
    );
  });

  const sent = await message.channel.send({
    embeds: [embed],
    components: [row],
  });
  const collector = sent.createMessageComponentCollector({ time: 15000 });

  collector.on("collect", (i) => {
    if (i.user.id !== message.author.id) return;
    const idx = parseInt(i.customId.split("_")[1]);
    guilds[idx].leave();
    i.reply({ content: `✅ Ayrıldım: ${guilds[idx].name}`, ephemeral: true });
    collector.stop();
  });

  collector.on("end", () => sent.edit({ components: [] }).catch(() => {}));
};

exports.help = {
  name: "sunucular",
  aliases: ["servers"],
  usage: "sunucular",
  description:
    "Bağlı olduğum sunuculardan birini seçip ayrılmanıza imkân tanır.",
  category: "Bot",
  cooldown: 10,
};
