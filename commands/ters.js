module.exports = {
  name: "ters",
  async execute(client, message, args) {
    if (!args.length)
      return message.reply("Lütfen ters çevirmek istediğiniz metni girin.");

    const reversedText = args.join(" ").split("").reverse().join("");
    await message.channel.send(`${reversedText}`);
  },
  help: {
    name: "ters",
    aliases: [],
    usage: "ters [metin]",
    description: "Verilen metni ters çevirir.",
    category: "Eğlence",
    cooldown: 5,
  },
};
