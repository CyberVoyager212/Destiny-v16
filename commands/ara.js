const axios = require("axios");
const { SERPER_API_KEY } = require("../botConfig"); // Serper API anahtarını config'den alıyoruz.

exports.execute = async (client, message, args) => {
  // Kullanıcının arama yapmak istediği ifadeyi alıyoruz.
  let query = args.join(" ");

  if (!query) {
    return message.reply(
      "Lütfen aramak istediğiniz ifadeyi belirtin. Örnek kullanım: `webde ara [sorgu]`"
    );
  }

  try {
    // Serper.dev API ile arama sorgusu gerçekleştiriyoruz.
    const response = await axios.post(
      "https://google.serper.dev/search",
      { q: query },
      { headers: { "X-API-KEY": SERPER_API_KEY } } // API anahtarı burada kullanılıyor.
    );

    const results = response.data.organic;

    if (!results || results.length === 0) {
      return message.reply("Arama sonucunda hiçbir şey bulunamadı.");
    }

    // Arama sonuçlarını metin olarak hazırlayalım
    let resultMessage = `**"${query}" için arama sonuçları**:\n`;
    results.slice(0, 10).forEach((result, index) => {
      resultMessage += `**${index + 1}.** ${result.title}\n${
        result.snippet
      }\n[Bağlantı](${result.link})\n\n`;
    });

    // 2000 karakterden fazla olan metinleri parçalara ayır
    const chunks = splitIntoChunks(resultMessage, 2000);

    // Her bir parça için düz mesaj olarak gönder
    for (const chunk of chunks) {
      await message.channel.send(chunk);
    }
  } catch (error) {
    console.error(error);
    return message.reply(
      "Arama sırasında bir hata oluştu. Lütfen tekrar deneyin."
    );
  }
};

// Metni 2000 karakterlik parçalara ayıran fonksiyon
function splitIntoChunks(text, maxLength) {
  const chunks = [];
  let currentChunk = "";

  const words = text.split(" ");

  for (const word of words) {
    if ((currentChunk + word).length > maxLength) {
      chunks.push(currentChunk.trim());
      currentChunk = word + " "; // Yeni chunk'a geç
    } else {
      currentChunk += word + " ";
    }
  }

  // Kalan metni ekle
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

exports.help = {
  name: "webde-ara",
  aliases: ["ara", "web-ara"],
  usage: "webde ara [sorgu]",
  description: "Google üzerinden arama yaparak sonuçları getirir.",
  category: "Araçlar",
  cooldown: 5,
};
