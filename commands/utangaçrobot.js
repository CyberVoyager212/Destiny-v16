const axios = require("axios");
const botConfig = require("../botConfig.js");

const prefix = [
  "H-hewwo?? ",
  "O-oh... uwu? ",
  "Nyaa~? ",
  "S-sowwy... qwq ",
  "P-pwease no bully! ",
  "U-uwu? W-what’s this? ",
  "M-meep! ",
  "N-notices you... o-oh! ",
  "A-ahh~! >///< ",
  "B-baka! ",
  "H-hmph! ",
  "M-master?? ",
  "N-nani?! ",
  "E-eh?! ",
  "Uwaaa~! ",
  "S-scawy... ",
  "P-pat me? ",
  "O-oh my~ ",
  "H-hiii~ ",
  "U-uwu...? ",
];

const subprefix = [
  " ㅇㅅㅇ",
  " UwU",
  " >w<",
  " QwQ",
  " TwT",
  " nwn",
  " ÚwÚ",
  " 0_0",
  " o3o",
  " ò_ó",
  " >///<",
  " ಥ_ಥ",
  " T_T",
  " x_x",
  " •w•",
  " (≧▽≦)",
  " ಥwಥ",
  " ¬w¬",
  " (⁄ ⁄•⁄ω⁄•⁄ ⁄)",
  " (✿◕‿◕)",
  " (≧ω≦)",
  " (*￣3￣)╭",
  " (๑>ᴗ<๑)",
  " (✧ω✧)",
  " (⌒ω⌒)",
];

exports.help = {
  name: "robot",
  description: "Utangaç yapay zeka ile konuşur.",
  usage: "robot <mesaj>",
  category: "Eğlence",
  cooldown: 5,
};

function removeEmojis(text) {
  return text.replace(
    /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}]/gu,
    ""
  );
}

function removePunctuation(text) {
  return text.replace(/[.,!?;:"'(){}[\]<>/\\|@#$%^&*~`+=_-]/g, "");
}

function applyCustomHyphenInsertion(text) {
  return text
    .split(" ")
    .map((word) => {
      if (word.length === 0) return word;
      if (Math.random() < 0.5) {
        const firstChar = word[0];
        const prefixLetter =
          Math.random() < 0.5 ? firstChar + firstChar : firstChar;
        return `${prefixLetter}-${word}`;
      }
      return word;
    })
    .join(" ");
}

async function getUwUResponse(userInput) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "z-ai/glm-4.5-air:free", // istersen farklı model seçebilirsin
        messages: [
          {
            role: "system",
            content:
              "Sen çok utangaç, çekingen, anime kızına benzeyen tatlı bir yapay zekasın. Türkçe konuş, kibar ol, kısa cümleler kur. R harflerini W yap. Noktalama kullanma. Kullanıcıya her zaman çekingen cevap ver.",
          },
          {
            role: "user",
            content: userInput,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${botConfig.OPENROUTER_API_KEY}`,
        },
      }
    );

    if (
      response.data &&
      response.data.choices &&
      response.data.choices.length > 0
    ) {
      let aiResponse = response.data.choices[0].message.content.trim();

      aiResponse = removePunctuation(aiResponse);
      aiResponse = removeEmojis(aiResponse);
      aiResponse = aiResponse.replace(/r/g, "w").replace(/R/g, "W");
      aiResponse = applyCustomHyphenInsertion(aiResponse);

      return aiResponse;
    } else {
      return "B-biwiymiyowum qwq";
    }
  } catch (error) {
    console.error(
      "hata:",
      error.response ? error.response.data : error.message
    );
    return "A-aa sanıwım biw hata owdu qwq";
  }
}

exports.execute = async (client, message, args) => {
  if (!args[0]) return message.channel.send("Lütfen bir mesaj gir qwq");

  const userInput = args.join(" ");
  const uwuResponse = await getUwUResponse(userInput);

  const randomPrefix = prefix[Math.floor(Math.random() * prefix.length)];
  const randomSubprefix =
    subprefix[Math.floor(Math.random() * subprefix.length)];

  message.channel.send(`${randomPrefix}${uwuResponse}${randomSubprefix}`);
};
