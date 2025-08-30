const { Permissions } = require("discord.js");

exports.execute = async (client, message, rawArgs) => {
  try {
    // 1) İzin kontrolü
    if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_ROLES)) {
      return message.reply(
        "⛔ Bu komutu kullanmak için `Rolleri Yönet` izni gereklidir."
      );
    }

    // 2) Argümanları virgülle ayır ve temizle
    const parts = rawArgs
      .join(" ")
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length);
    // Beklenen parametre sayısı:
    // normal: [0]=user, [1]=isim, [2]=yaş, [3]=üyeRol
    // cinsiyet: [0]=user, [1]=isim, [2]=yaş, [3]=gender, [4]=üyeRol
    if (parts.length < 4) {
      return message.reply(
        "⚠ Eksik parametre! Doğru kullanım:\n" +
          "`kayıt @user/ID, isim, yaş, @üyeRol` **(normal)**\n" +
          "`kayıt @user/ID, isim, yaş, erkek/kadın, @üyeRol` **(cinsiyetli)**"
      );
    }

    // 3) Kullanıcı tespiti
    const userPart = parts[0];
    const member =
      message.mentions.members.first() ||
      message.guild.members.cache.get(userPart) ||
      message.guild.members.cache.find((m) => m.user.tag === userPart);
    if (!member) {
      return message.reply(
        "👤 Lütfen geçerli bir kullanıcı belirtin! (@mention, ID veya tag)."
      );
    }

    // 4) İsim ve yaş
    const name = parts[1];
    const age = parseInt(parts[2], 10);
    if (!name || isNaN(age)) {
      return message.reply("⚠ Lütfen geçerli bir **isim** ve **yaş** girin!");
    }

    // 5) Rol bilgilerini DB'den çek
    const guildId = message.guild.id;
    const unregRoleId = await client.db.get(`kayitsizRol_${guildId}`);
    const maleRoleId = await client.db.get(`maleRol_${guildId}`);
    const femaleRoleId = await client.db.get(`femaleRol_${guildId}`);

    const unregRole = message.guild.roles.cache.get(unregRoleId);
    const maleRole = message.guild.roles.cache.get(maleRoleId);
    const femaleRole = message.guild.roles.cache.get(femaleRoleId);

    const genderMode = Boolean(maleRole && femaleRole);

    // 6) Üye rolü tespiti
    const rolePartIndex = genderMode ? 4 : 3;
    const roleNameOrId = parts[rolePartIndex];
    const memberRole =
      message.guild.roles.cache.get(roleNameOrId) ||
      message.guild.roles.cache.find(
        (r) => r.name.toLowerCase() === roleNameOrId.toLowerCase()
      );
    if (!memberRole) {
      return message.reply(
        "⚠ Lütfen geçerli bir **üye rolü** belirtin (ID veya ad)."
      );
    }

    // 7) Cinsiyet argümanı kontrolü
    let genderArg = null;
    if (genderMode) {
      genderArg = parts[3].toLowerCase();
      if (!["erkek", "male", "kadın", "female"].includes(genderArg)) {
        return message.reply(
          "⚠ Cinsiyet modunda `erkek`/`male` veya `kadın`/`female` girin."
        );
      }
    }

    // 8) Nickname ayarla (isim ve yaş arasında boşluk)
    const newNick = `${name} ${age}`;
    await member.setNickname(newNick).catch(() => {});

    // 9) Kayıtsız rolü kaldır
    if (unregRole && member.roles.cache.has(unregRole.id)) {
      await member.roles.remove(unregRole).catch(() => {});
    }

    // 10) Cinsiyet modunda rol verme
    const assigned = [];
    if (genderMode) {
      let roleToAdd = null;
      if (["erkek", "male"].includes(genderArg)) roleToAdd = maleRole;
      else roleToAdd = femaleRole;
      await member.roles.add(roleToAdd);
      assigned.push(roleToAdd.name);
    }

    // 11) Üye rolünü ekle
    await member.roles.add(memberRole);
    assigned.push(memberRole.name);

    // 12) Sonuç mesajı
    return message.channel.send(
      `✅ **Kayıt Başarılı!**\n` +
        `👤 ${member}\n` +
        `📛 Yeni Ad: \`${newNick}\`\n` +
        `🎭 Verilen Roller: \`${assigned.join("`, `")}\``
    );
  } catch (err) {
    console.error("Kayıt komutu hatası:", err);
    return message.reply("❌ Bir hata oluştu, lütfen tekrar deneyin.");
  }
};

exports.help = {
  name: "kayıt",
  aliases: ["k"],
  usage:
    "kayıt @user/ID, isim, yaş, @üyeRol\n" +
    "kayıt @user/ID, isim, yaş, erkek/erkekRol, @üyeRol (cinsiyetli)",
  description:
    "Kayıtsız kullanıcıyı kayıt eder, cinsiyete göre rol verir ve isim|yaş ayarlar.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_ROLES"],

};
