const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json"); // emoji.json içe aktarılır

exports.execute = async (client, message, args) => {
  const gatewayLatency = Math.floor(client.ws.ping);
  const sentMsg = await message.channel.send("🏓 Pinging...");
  const clientLatency = sentMsg.createdTimestamp - message.createdTimestamp;

  // JSON içinden emoji seçimi
  let emoji;
  if (clientLatency <= 80) {
    emoji = emojis.wifi["4"];
  } else if (clientLatency <= 150) {
    emoji = emojis.wifi["3"];
  } else if (clientLatency <= 300) {
    emoji = emojis.wifi["2"];
  } else {
    emoji = emojis.wifi["1"];
  }

  const embed = new MessageEmbed()
    .setTitle("🏓 Pong!")
    .setColor(
      clientLatency <= 80
        ? "#43B581"
        : clientLatency <= 150
        ? "#FAA61A"
        : "#F04747"
    )
    .addFields(
      { name: "API Latency", value: `${gatewayLatency}ms`, inline: true },
      {
        name: "Client Latency",
        value: `${clientLatency}ms ${emoji}`,
        inline: true,
      }
    )
    .setTimestamp()
    .setFooter({
      text: `Requested by ${message.member.displayName}`,
      iconURL: message.author.displayAvatarURL({ dynamic: true }),
    });

  sentMsg.edit({ content: null, embeds: [embed] });
};

exports.help = {
  name: "ping",
  aliases: ["pong", "latency", "ms", "gecikme"],
  usage: "ping",
  category: "Bot",
  description:
    "Botun API ve istemci gecikmesini ölçer ve durumuna göre wifi sinyal emojisi gösterir.",
};
