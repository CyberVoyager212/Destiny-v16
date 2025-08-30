// commands/otocevap.js
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const { MessageEmbed } = require("discord.js");
const config = require("../botConfig.js"); // commands klasöründen bir üstte olduğu için ../

/** Opsiyon parse fonksiyonu */
function parseOptions(str) {
  const opts = {
    mention: false,
    delete: false,
    dm: false,
    webhook: false,
    typing: false,
    ephemeral: false,
    ephemeralSec: 8,
  };
  if (!str) return opts;

  const parts = str
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  for (const p of parts) {
    if (p.includes("=")) {
      const [k, vRaw] = p.split("=").map((s) => s.trim());
      if (!k) continue;
      const v = (vRaw || "").toLowerCase();
      if (k.toLowerCase() === "ephemeralsec") {
        const num = Number(v);
        if (!isNaN(num) && num > 0) opts.ephemeralSec = Math.floor(num);
        continue;
      }
      opts[k] = v === "1" || v === "true" || v === "yes" || v === "on";
    } else {
      const key = p.toLowerCase();
      if (key in opts) opts[key] = true;
    }
  }
  return opts;
}

exports.execute = async (client, message, args) => {
  const prefix = config.prefix;

  if (!message.member.permissions.has("MANAGE_MESSAGES"))
    return message.reply(
      "❌ Bu komutu kullanmak için **Mesajları Yönet** yetkisine sahip olmalısın."
    );

  const sub = (args[0] || "").toLowerCase(); // ekle / sil / liste / help
  const guildId = message.guild.id;

  // ----- HELP alt komutu -----
  if (sub === "help" || sub === "yardım") {
    const helpEmbed = new MessageEmbed()
      .setTitle("📘 Oto-Cevap Komut Yardımı")
      .setColor("BLUE")
      .setDescription(
        `**Komut yapısı:**\n` +
          `\`${prefix}oto-cevap ekle <tetikleyici> ; <cevap> ; <embed:0/1> ; <tam/parça:0/1> ; [başlık] ; [opsiyonlar]\`\n\n` +
          `**Alt komutlar:**\n` +
          `• \`${prefix}oto-cevap ekle ...\` — Yeni oto-cevap ekler.\n` +
          `• \`${prefix}oto-cevap sil <tetikleyici>\` — Belirtilen tetikleyiciyi siler.\n` +
          `• \`${prefix}oto-cevap liste\` — Sunucudaki oto-cevapları listeler.\n` +
          `• \`${prefix}oto-cevap help\` — Bu yardım mesajını gösterir.\n\n` +
          `**Opsiyonlar (opsiyonlar virgülle ayrılır, örn: mention,delete veya mention=1,ephemeralSec=5):**\n` +
          `• \`mention\` — Cevapta kullanıcıyı etiketler.\n` +
          `• \`delete\` — Tetikleyen mesajı siler.\n` +
          `• \`dm\` — Cevabı kullanıcıya DM olarak gönderir (kanala gönderilmez).\n` +
          `• \`webhook\` — Cevabı bir webhook ile gönderir (display name ve avatar taklidi).\n` +
          `• \`typing\` — Göndermeden önce yazıyormuş efekti verir.\n` +
          `• \`ephemeral\` — Botun gönderdiği mesajı belirli saniye sonra siler.\n` +
          `• \`ephemeralSec=<saniye>\` — ephemeral kullanıldığında kaç saniye sonra silineceğini ayarlar (varsayılan 8).\n\n` +
          `**Notlar:**\n` +
          `• \`dm\` ve \`webhook\` aynı anda verilirse öncelik DM'dir.\n` +
          `• \`webhook\` için botun kanalda **MANAGE_WEBHOOKS** yetkisi olmalıdır.\n\n` +
          `**Örnekler:**\n` +
          `• Basit metin oto-cevap:\n` +
          `\`${prefix}oto-cevap ekle merhaba ; Selam dostum! ; 0 ; 0\`\n\n` +
          `• Embed ile tam eşleşme, başlıklı, webhook ile gönder:\n` +
          `\`${prefix}oto-cevap ekle selam ; Hoş geldin! ; 1 ; 1 ; Hoşgeldin Başlık ; webhook,typing\`\n\n` +
          `• Tetikleyeni sil ve kullanıcıyı etiketle:\n` +
          `\`${prefix}oto-cevap ekle kötü ; Lütfen böyle konuşma. ; 0 ; 0 ; mention,delete\`\n\n` +
          `• Cevabı kullanıcıya DM olarak at:\n` +
          `\`${prefix}oto-cevap ekle özel ; Bu mesaj sadece sana özel. ; 0 ; 0 ; dm\`\n\n` +
          `Herhangi bir soru varsa bana söyle, örnek bir oto-cevap ekleyip test edebilirim.`
      )
      .setFooter({ text: "Oto-Cevap Sistemi — Yardım" });

    return message.channel.send({ embeds: [helpEmbed] });
  }

  // Eğer sub yoksa kullanıcıyı yönlendir
  if (!sub) {
    return message.reply(
      `⚙️ Kullanım: \`${prefix}oto-cevap ekle/sil/liste/help\`. Yardım için: \`${prefix}oto-cevap help\`.`
    );
  }

  // 📌 Ekle
  if (sub === "ekle") {
    const input = args.slice(1).join(" ").split(";");
    if (input.length < 4)
      return message.reply(
        "❌ Eksik parametre! Örnek: `" +
          prefix +
          "oto-cevap ekle Merhaba ; Selam! ; 0 ; 1`"
      );

    const trigger = input[0].trim();
    const response = input[1].trim();
    const embed = parseInt(input[2].trim()) === 1 ? 1 : 0;
    const exact = parseInt(input[3].trim()) === 1 ? 1 : 0;

    // title ve options
    let title = null;
    let optionsStr = null;
    if (embed === 1) {
      title = input[4] ? input[4].trim() : null;
      optionsStr = input[5] ? input[5].trim() : null;
      if (!title) return message.reply("❌ Embed için başlık belirtmelisin!");
    } else {
      optionsStr = input[4] ? input[4].trim() : null;
    }

    const options = parseOptions(optionsStr);

    const otoCevaplar = (await db.get(`otoCevap_${guildId}`)) || [];
    otoCevaplar.push({ trigger, response, embed, exact, title, options });
    await db.set(`otoCevap_${guildId}`, otoCevaplar);

    const info = new MessageEmbed()
      .setTitle("✅ Oto-Cevap Eklendi")
      .addField("Tetikleyici", `\`${trigger}\``, true)
      .addField(
        "Cevap",
        response.length > 1024 ? response.slice(0, 1021) + "..." : response,
        true
      )
      .addField("Embed", embed ? "Evet" : "Hayır", true)
      .addField("Eşleşme", exact ? "Tam" : "Parça", true)
      .addField(
        "Opsiyonlar",
        Object.entries(options)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n") || "yok",
        false
      )
      .setColor("GREEN");

    return message.reply({ embeds: [info] });
  }

  // 📌 Sil
  if (sub === "sil") {
    const trigger = args.slice(1).join(" ").trim();
    if (!trigger) return message.reply("❌ Silmek istediğin cümleyi gir.");

    let otoCevaplar = (await db.get(`otoCevap_${guildId}`)) || [];
    const before = otoCevaplar.length;
    otoCevaplar = otoCevaplar.filter((c) => c.trigger !== trigger);

    if (otoCevaplar.length === before)
      return message.reply("❌ Böyle bir oto-cevap bulunamadı.");
    await db.set(`otoCevap_${guildId}`, otoCevaplar);

    return message.reply({
      embeds: [
        new MessageEmbed()
          .setTitle("🗑️ Oto-Cevap Silindi")
          .setDescription(`Silinen: \`${trigger}\``)
          .setColor("RED"),
      ],
    });
  }

  // 📌 Liste
  if (sub === "liste") {
    const otoCevaplar = (await db.get(`otoCevap_${guildId}`)) || [];
    if (!otoCevaplar.length) return message.reply("ℹ️ Hiç oto-cevap yok.");

    const embed = new MessageEmbed()
      .setTitle("📋 Oto-Cevap Listesi")
      .setColor("BLUE")
      .setDescription(
        otoCevaplar
          .map((c, i) => {
            const opts = c.options
              ? Object.entries(c.options)
                  .map(([k, v]) => `${k}:${v}`)
                  .join(", ")
              : "yok";
            return (
              `**${i + 1}.** \`${c.trigger}\`\n` +
              `↳ **Cevap:** ${c.response}\n` +
              `↳ **Embed:** ${c.embed ? "Evet" : "Hayır"} | **Eşleşme:** ${
                c.exact ? "Tam" : "Parça"
              }${c.embed ? ` | **Başlık:** ${c.title}` : ""}\n` +
              `↳ **Opsiyonlar:** ${opts}`
            );
          })
          .join("\n\n")
      );

    return message.channel.send({ embeds: [embed] });
  }

  // bilinmeyen alt komut
  return message.reply(
    `⚠️ Geçersiz alt komut. Kullanım: \`${prefix}oto-cevap ekle/sil/liste/help\`. Yardım: \`${prefix}oto-cevap help\`.`
  );
};

exports.help = {
  name: "otocevap",
  aliases: ["oto-cevap", "otocvp"],
  usage: "otocevap ekle/sil/liste/help <...>",
  description: "Oto cevap verme sistemi (opsiyonlu davranışlarla)",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_MESSAGES"],
};
