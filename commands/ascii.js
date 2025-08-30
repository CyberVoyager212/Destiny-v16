const figlet = require("figlet");

module.exports.help = {
  name: "ascii",
  aliases: ["textart", "ascii-art"],
  description: "Verilen metni ASCII sanatı olarak dönüştürür.",
  usage: "ascii <metin>",
  category: "Eğlence",
  cooldown: 5,
};

module.exports.execute = async (client, message, args) => {
  if (!args[0])
    return message.reply("⚠️ Lütfen dönüştürmek istediğiniz bir metin girin!");

  const text = args.join(" ");

  // figlet ile ASCII'ye çevir
  figlet.text(
    text,
    { horizontalLayout: "default", verticalLayout: "default" },
    (err, data) => {
      if (err) {
        console.error("FIGLET HATASI:", err);
        return message.channel.send(
          "❌ ASCII sanatı oluşturulurken bir hata oluştu. Lütfen tekrar deneyin."
        );
      }

      if (data.length <= 2000) {
        return message.channel.send("```" + data + "```");
      } else {
        // Eğer metin 2000 karakterden uzunsa parçalayarak gönder
        const chunks = data.match(/[\s\S]{1,1900}/g);
        chunks.forEach((chunk) => {
          message.channel.send("```" + chunk + "```");
        });
      }
    }
  );
};
