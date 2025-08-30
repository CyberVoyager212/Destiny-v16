// commands/autotranslate.js
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const fs = require("fs");
const path = require("path");

// JSON dosya yolu
const filePath = path.join(__dirname, "../utils/autotranslateforusers.json");

// JSON yükleme
function loadJSON() {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error("JSON yüklenemedi:", err);
    return {};
  }
}

// JSON kaydetme
function saveJSON(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// kullanıcı dilini JSON’dan al
function getUserLang(userId) {
  const data = loadJSON();
  return data[userId] || null;
}

// kullanıcı dilini JSON’a kaydet
function setUserLang(userId, lang) {
  const data = loadJSON();
  data[userId] = lang;
  saveJSON(data);
}

// kullanıcı dilini JSON’dan sil (off)
function deleteUserLang(userId) {
  const data = loadJSON();
  delete data[userId];
  saveJSON(data);
}

exports.execute = async (client, message, args) => {
  const userId = message.author.id;
  const lang = args[0];

  if (!lang) {
    return message.reply(
      "Kullanım: `autotranslate <lang_code|off>`\nÖrnek: `autotranslate en` veya `autotranslate tr` veya `autotranslate off`"
    );
  }

  if (lang.length > 10) {
    return message.reply("Geçersiz dil kodu.");
  }

  // KAPATMA (off) hızlı yol
  if (lang.toLowerCase() === "off") {
    const cur = getUserLang(userId);
    if (!cur) return message.reply("Auto-translate zaten kapalı.");
    deleteUserLang(userId);
    return message.reply(
      "✅ Auto-translate kapatıldı. Artık çeviri uygulanmayacak."
    );
  }

  // Butonlu onay embed'i
  const embed = new MessageEmbed()
    .setTitle("Auto-Translate — Confirmation Required")
    .setDescription(
      `**English:**  
You are about to enable auto-translate for **your account** with language code: **${lang}**.

**Warning:** Changing the bot's language for your messages may cause some UI or text issues in certain commands or embeds. While we try to translate messages as much as possible, some messages might not be translated because the bot has 160+ commands and we cannot integrate each one individually. We apologize for any inconvenience.

If you understand the possible side-effects and want to proceed, confirm by clicking **Enable** within 30 seconds.

You can run this command again to switch back to Turkish (use: \`autotranslate tr\`) or disable completely with \`autotranslate off\`.


**Türkçe:**  
Otomatik çeviri **hesabınız için** etkinleştirilecektir. Seçilen dil kodu: **${lang}**.

**Uyarı:** Botun dilini değiştirmek bazı komutlar veya embedlerde metin sorunlarına yol açabilir. Mesajları elimizden geldiğince çeviriyoruz, ancak bazı mesajlar çevrilmeyebilir. Bunun nedeni botun 160+ komutu olması ve her birine tek tek çeviri entegre edemememizdir. Bu nedenle bazı durumlarda çeviri yapılamayabilir, özür dileriz.

Eğer olası yan etkileri anlıyor ve devam etmek istiyorsanız, 30 saniye içinde **Etkinleştir** butonuna tıklayın.

Çeviriyi tekrar Türkçe’ye çevirmek için \`autotranslate tr\` veya tamamen kapatmak için \`autotranslate off\` komutlarını kullanabilirsiniz.`
    )
    .setColor("YELLOW")
    .setFooter({
      text: "If you don't confirm within 30 seconds this will be cancelled.",
    });

  const row = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId("autotrans_confirm")
      .setLabel("Enable")
      .setStyle("SUCCESS"),
    new MessageButton()
      .setCustomId("autotrans_cancel")
      .setLabel("Cancel")
      .setStyle("DANGER")
  );

  const warnMsg = await message.channel.send({
    embeds: [embed],
    components: [row],
    _noTranslate: true,
  });

  const filter = (i) =>
    i.user.id === message.author.id &&
    ["autotrans_confirm", "autotrans_cancel"].includes(i.customId);
  const collector = warnMsg.createMessageComponentCollector({
    filter,
    max: 1,
    time: 30000,
  });

  collector.on("collect", async (interaction) => {
    try {
      if (interaction.customId === "autotrans_confirm") {
        // JSON’a kaydet
        setUserLang(userId, lang);

        const okEmbed = new MessageEmbed()
          .setTitle("Auto-Translate Enabled")
          .setDescription(
            `✅ Auto-translate has been enabled for language code: **${lang}**.\nYou can change it anytime with \`autotranslate <lang_code|off>\`.`
          )
          .setColor("GREEN");

        await interaction.update({
          embeds: [okEmbed],
          components: [],
          _noTranslate: true,
        });

        try {
          await message.reply(
            `✅ Auto-translate enabled for language code: **${lang}**.`
          );
        } catch (e) {}
      } else {
        const cancelEmbed = new MessageEmbed()
          .setTitle("Auto-Translate Cancelled")
          .setDescription("❌ Auto-translate setup was cancelled.")
          .setColor("RED");

        await interaction.update({
          embeds: [cancelEmbed],
          components: [],
          _noTranslate: true,
        });
      }
    } catch (err) {
      console.error("autotranslate button handler error:", err);
      try {
        await interaction.update({
          content: "An error occurred.",
          components: [],
          _noTranslate: true,
        });
      } catch (e) {}
    }
  });

  collector.on("end", async (collected) => {
    if (collected.size === 0) {
      const timeoutEmbed = new MessageEmbed()
        .setTitle("Auto-Translate Cancelled")
        .setDescription(
          "⌛ No confirmation received. Auto-translate cancelled."
        )
        .setColor("ORANGE");
      try {
        await warnMsg.edit({
          embeds: [timeoutEmbed],
          components: [],
          _noTranslate: true,
        });
      } catch (e) {}
    }
  });
};

exports.help = {
  name: "autotranslate",
  aliases: ["atranslate", "autot"],
  usage: "autotranslate <lang_code|off>",
  description:
    "Enables/disables auto-translate for your account using JSON storage. Asks for confirmation via buttons.",
  category: "Araçlar",
  cooldown: 3,
};
