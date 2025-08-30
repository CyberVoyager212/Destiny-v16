exports.execute = async (client, message, args) => {
  if (!args.length) return message.reply("❌ Lütfen bir metin girin!");

  let text = args.join(" ").toLowerCase();
  let alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
  let numbers = "0123456789".split("");
  let bigText = "";

  for (let char of text) {
    if (alphabet.includes(char)) {
      bigText += `:regional_indicator_${char}: `;
    } else if (numbers.includes(char)) {
      // Sayılar için emoji kodları (Discord standart)
      const numberEmojis = {
        0: ":zero:",
        1: ":one:",
        2: ":two:",
        3: ":three:",
        4: ":four:",
        5: ":five:",
        6: ":six:",
        7: ":seven:",
        8: ":eight:",
        9: ":nine:",
      };
      bigText += `${numberEmojis[char]} `;
    } else {
      bigText += char + " ";
    }
  }

  message.channel.send(bigText);
};

exports.help = {
  name: "bigtext",
  aliases: ["büyükmetin"],
  usage: "bigtext <metin>",
  description: "Girilen metni büyük harfli ve sayı emojilerine çevirir.",
  category: "Eğlence",
  cooldown: 5,
};
