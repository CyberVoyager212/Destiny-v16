// utils/battlefriend.js
const { MessageEmbed } = require("discord.js");

async function sendChallenge(
  message,
  challengerUser,
  targetUser,
  timeout = 300000
) {
  // returns {accepted: bool, msg: the original message sent}
  const channel = message.channel;
  const challengerTag = `<@${challengerUser.id}>`;
  const targetTag = `<@${targetUser.id}>`;

  const prompt = await channel.send(
    `${targetTag}, ${challengerTag} seni savaşa davet ediyor. 5 dakika içinde ✅ ile kabul et veya ❌ ile reddet.`
  );

  await prompt.react("✅");
  await prompt.react("❌");

  const filter = (reaction, user) => {
    return (
      ["✅", "❌"].includes(reaction.emoji.name) && user.id === targetUser.id
    );
  };

  try {
    const collected = await prompt.awaitReactions({
      filter,
      max: 1,
      time: timeout,
      errors: ["time"],
    });
    const reaction = collected.first();
    if (reaction.emoji.name === "✅") return { accepted: true, msg: prompt };
    return { accepted: false, msg: prompt };
  } catch (e) {
    // timeout
    await prompt
      .edit({
        content: `${targetTag} 5 dakika içinde cevap vermedi. Savaş iptal edildi.`,
      })
      .catch(() => {});
    return { accepted: false, msg: prompt, timeout: true };
  }
}

module.exports = {
  sendChallenge,
};
