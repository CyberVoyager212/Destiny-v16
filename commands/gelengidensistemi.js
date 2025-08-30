const { MessageEmbed } = require("discord.js");

exports.execute = async (client, message, args) => {
  // Yetki kontrolü: Sunucuyu Yönet yetkisi
  if (!message.member.permissions.has("MANAGE_GUILD")) {
    return message.reply(
      "❌ **Bu komutu kullanmak için `Sunucuyu Yönet` yetkiniz olmalıdır.**"
    );
  }

  // Eğer argüman yoksa veya help komutu isteniyorsa rehberi göster
  if (!args.length || args[0].toLowerCase() === "help") {
    const embed = new MessageEmbed()
      .setTitle("Gelen-Çıkış Sistemi (ggs) Kullanım Rehberi")
      .setDescription(
        "**Komut Kullanımı:**\n" +
          "`ggs aç/kapat <#gelenkanal/gelenkanalid/gelenkanalismi> ; <#gidenkanal/gidenkanalid/gidenkanalismi> ; <giriş mesajı> ; <çıkış mesajı> ; [otorol <tür> @rol ...] ; [otoisim <tür> <isim> ...]`\n\n" +
          "**Mesaj Değişkenleri:**\n" +
          "• `$etiket` - Kullanıcı etiket\n" +
          "• `$sayı` - Sunucudaki kişi sayısı\n" +
          "• `$embed;başlık` - Embed mesaj (başlık belirtilebilir)\n" +
          "• `$katılım` - Kullanıcının katılım tarihi\n" +
          "• `$davet` - Davet eden kullanıcı bilgisi\n\n" +
          "**Örnek Komut:**\n" +
          "```\n" +
          "ggs aç #ggs  ; #ggs  ; Merhaba $etiket senle beraber $sayı kişi olduk kutlarım ayrıca seni davet eden kişiyede yani $davet'e kullanıcısınada teşşekürler ; Görüşürüz $etiket sen gidince $sayı kişi kaldık herneyse seni davet eden kişide $davet'idi ; otorol kullanıcı @Members ; otorol bot @bot ; otoisim bot DESEKİP ; otoisim kullanıcı DESÜYE\n" +
          "```\n" +
          "**Not:** Otomatik davet sayımı için mesajlarda `$davet` kullanmalısınız."
      )
      .setColor("BLUE");
    return message.channel.send({ embeds: [embed] });
  }

  // Alt komut: aç veya kapat
  const subCommand = args.shift().toLowerCase();
  if (subCommand === "kapat") {
    await client.db.delete(`welcomegoodbye_${message.guild.id}`);
    return message.channel.send(
      "✅ **Gelen-Çıkış sistemi devre dışı bırakıldı.**"
    );
  } else if (subCommand !== "aç") {
    return message.reply(
      "⚠️ **Geçersiz alt komut. Lütfen 'aç', 'kapat' veya 'help' kullanın.**"
    );
  }

  // Kalan argümanları tek stringe çevirip ';' ile bölüyoruz
  const fullArgs = args.join(" ");
  const parts = fullArgs
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Minimum 4 parça zorunlu: gelen kanal, giden kanal, giriş mesajı, çıkış mesajı
  if (parts.length < 4) {
    return message.reply(
      "⚠️ **Lütfen yeterli bilgileri girin:**\n`<#gelenkanal> ; <#gidenkanal> ; giriş mesajı ; çıkış mesajı [; otorol ...] [; otoisim ...]`"
    );
  }

  // Zorunlu parametreler
  const incomingChannelParam = parts[0];
  const outgoingChannelParam = parts[1];
  const entryMessage = parts[2];
  const exitMessage = parts[3];

  // Kanalı çözümlemek için yardımcı fonksiyon
  function resolveChannel(param) {
    let channel = null;
    const idMatch = param.match(/^<#(\d+)>$/);
    if (idMatch) {
      channel = message.guild.channels.cache.get(idMatch[1]);
    }
    if (!channel) {
      channel = message.guild.channels.cache.get(param);
    }
    if (!channel) {
      channel = message.guild.channels.cache.find(
        (ch) => ch.name === param.replace("#", "")
      );
    }
    return channel;
  }

  const incomingChannel = resolveChannel(incomingChannelParam);
  if (!incomingChannel) return message.reply("⚠️ **Gelen kanal bulunamadı.**");

  const outgoingChannel = resolveChannel(outgoingChannelParam);
  if (!outgoingChannel) return message.reply("⚠️ **Giden kanal bulunamadı.**");

  // Opsiyonel ayarlar için başlangıç nesneleri
  let otorolConfig = {}; // Örnek: { kullanıcı: [roleIDs], bot: [roleIDs] }
  let otoisimConfig = {}; // Örnek: { kullanıcı: "DESÜYE", bot: "DESEKİP" }

  // 4. indexten itibaren otorol/otoisim ayarlarını kontrol et
  for (let i = 4; i < parts.length; i++) {
    const part = parts[i];
    const lowerPart = part.toLowerCase();
    if (lowerPart.startsWith("otorol")) {
      // Format: "otorol <tür> <rol1> <rol2> ..."
      const tokens = part.split(" ").filter((t) => t.trim() !== "");
      if (tokens.length < 3) continue; // Yeterli bilgi yoksa atla
      const type = tokens[1].toLowerCase(); // "kullanıcı" veya "bot"
      const roles = tokens.slice(2);
      roles.forEach((roleStr) => {
        let role = null;
        const roleIdMatch = roleStr.match(/^<@&(\d+)>$/);
        if (roleIdMatch) {
          role = message.guild.roles.cache.get(roleIdMatch[1]);
        }
        if (!role) {
          role =
            message.guild.roles.cache.get(roleStr) ||
            message.guild.roles.cache.find(
              (r) => r.name.toLowerCase() === roleStr.toLowerCase()
            );
        }
        if (role) {
          if (!otorolConfig[type]) otorolConfig[type] = [];
          otorolConfig[type].push(role.id);
        }
      });
    } else if (lowerPart.startsWith("otoisim")) {
      // Format: "otoisim <tür> <isim...>"
      const tokens = part.split(" ").filter((t) => t.trim() !== "");
      if (tokens.length < 3) continue;
      const type = tokens[1].toLowerCase(); // "kullanıcı" veya "bot"
      const name = tokens.slice(2).join(" ");
      otoisimConfig[type] = name;
    }
  }

  // Giriş/çıkış mesajlarında $davet varsa invite takibi isteniyor
  let inviteTracking = false;
  if (entryMessage.includes("$davet") || exitMessage.includes("$davet")) {
    inviteTracking = true;
  }

  // Yapılandırma verilerini oluşturuyoruz
  const configData = {
    incomingChannel: incomingChannel.id,
    outgoingChannel: outgoingChannel.id,
    entryMessage: entryMessage,
    exitMessage: exitMessage,
    otorol: otorolConfig,
    otoisim: otoisimConfig,
    inviteTracking: inviteTracking,
    enabled: true,
  };

  // Veritabanına kaydediyoruz (örneğin: client.db.set kullanarak)
  try {
    await client.db.set(`welcomegoodbye_${message.guild.id}`, configData);
    return message.channel.send(
      "✅ **Gelen-Çıkış sistemi başarıyla ayarlandı.**"
    );
  } catch (err) {
    console.error(err);
    return message.reply("❌ **Yapılandırma kaydedilirken bir hata oluştu.**");
  }
};

exports.help = {
  name: "gelengidensistemi",
  aliases: ["ggs"],
  usage:
    "gelengidensistemi aç/kapat/help <kanal parametreleri> ; <mesaj parametreleri> ; [otorol <tür> @rol ...] ; [otoisim <tür> <isim> ...]",
  description:
    "Giriş/Çıkış sistemini ayarlar. aç kapat ve help olmak üzere 3 alt komuttan oluşur",
  category: "Moderasyon",
  cooldown: 3,
  permissions: ["MANAGE_GUILD"],
};
