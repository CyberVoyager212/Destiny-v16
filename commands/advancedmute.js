const { MessageEmbed, Permissions } = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

exports.help = {
  name: "advancedmute",
  aliases: ["amute"],
  usage:
    "advancedmute <@kullanıcı|id|isim> <süre(dk)> | kaldır | süre <@kullanıcı>",
  description:
    "Gelişmiş mute sistemi: kurulum, susturma, süre sorgulama ve sistemi kaldırma.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_ROLES"],
};

exports.execute = async (client, message, args) => {
  const guild = message.guild;
  const me = message.member;

  // === Komut: Kaldır ===
  if (args[0]?.toLowerCase() === "kaldır") {
    if (!me.permissions.has(Permissions.FLAGS.MANAGE_ROLES))
      return message.reply(
        "Sistemi kaldırmak için `Rolleri Yönet` yetkisine ihtiyacın var."
      );

    const muteRole = guild.roles.cache.find((r) => r.name === "mute");
    const muteChannel = guild.channels.cache.find(
      (c) => c.name === "muted-only"
    );

    if (muteRole) {
      // Roldeki kullanıcıların rollerini geri ver
      const mutedMembers = guild.members.cache.filter((m) =>
        m.roles.cache.has(muteRole.id)
      );
      for (const member of mutedMembers.values()) {
        const oldRoles = await db.get(`mute_roles_${guild.id}_${member.id}`);
        if (oldRoles) {
          await member.roles.set(oldRoles).catch(() => {});
          await db.delete(`mute_roles_${guild.id}_${member.id}`);
          await db.delete(`mute_end_${guild.id}_${member.id}`);
        }
      }
      await muteRole.delete().catch(() => {});
    }

    if (muteChannel) await muteChannel.delete().catch(() => {});

    return message.channel.send("🔧 Mute sistemi başarıyla kaldırıldı.");
  }

  // === Komut: Süre <kullanıcı> ===
  if (args[0]?.toLowerCase() === "süre") {
    const targetArg = args[1];
    const target =
      message.mentions.members.first() ||
      guild.members.cache.get(targetArg) ||
      guild.members.cache.find((m) => m.user.username === targetArg);

    if (!target) return message.reply("Kullanıcı bulunamadı.");

    const end = await db.get(`mute_end_${guild.id}_${target.id}`);
    if (!end) return message.reply(`${target.user.tag} muteli değil.`);

    const now = Date.now();
    if (now >= end) {
      return message.reply(
        `${target.user.tag} kullanıcısının mute süresi bitmiş.`
      );
    }

    const mins = Math.ceil((end - now) / 60000);
    return message.reply(
      `${target.user.tag} adlı kullanıcının mutesi bitmesine **${mins} dakika** kaldı.`
    );
  }

  // === Komut: Kullanıcıyı mute et ===
  if (!me.permissions.has(Permissions.FLAGS.MANAGE_ROLES))
    return message.reply(
      "Bu komutu kullanmak için `Rolleri Yönet` yetkisine sahip olmalısın."
    );

  // Sistem kontrol
  let muteRole = guild.roles.cache.find((r) => r.name === "mute");
  let muteChannel = guild.channels.cache.find((c) => c.name === "muted-only");

  if (!muteRole || !muteChannel) {
    const confirm = await message.channel.send(
      "🔧 Mute sistemi bulunamadı. Kurulsun mu? (evet/hayır)"
    );
    const collected = await message.channel.awaitMessages({
      filter: (m) => m.author.id === me.id && /^(evet|hayır)$/i.test(m.content),
      max: 1,
      time: 30000,
    });
    if (!collected.size || collected.first().content.toLowerCase() === "hayır")
      return message.reply("Kurulum iptal edildi.");

    muteRole = await guild.roles.create({ name: "mute", permissions: [] });
    muteChannel = await guild.channels.create("muted-only", {
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: ["VIEW_CHANNEL"] },
        { id: muteRole.id, allow: ["VIEW_CHANNEL"] },
      ],
    });

    guild.channels.cache
      .filter((c) => c.id !== muteChannel.id)
      .forEach((c) =>
        c.permissionOverwrites.edit(muteRole, { VIEW_CHANNEL: false })
      );

    await message.channel.send("✅ Mute sistemi kuruldu.");
  }

  const targetArg = args[0];
  const minutes = parseInt(args[1]);
  const member =
    message.mentions.members.first() ||
    guild.members.cache.get(targetArg) ||
    guild.members.cache.find((m) => m.user.username === targetArg);

  if (!member) return message.reply("Susturulacak kullanıcıyı belirt.");
  if (!minutes || minutes < 1)
    return message.reply("Lütfen geçerli bir süre (dk) gir.");
  if (minutes > 1440) return message.reply("Maksimum süre 1440 dakikadır.");

  const now = Date.now();
  const endTimestamp = now + minutes * 60000;
  const existingEnd = await db.get(`mute_end_${guild.id}_${member.id}`);

  if (existingEnd && now < existingEnd) {
    const left = Math.ceil((existingEnd - now) / 60000);
    return message.reply(
      `${member.user.tag} zaten muteli. Kalan süre: ${left} dakika.`
    );
  }

  // Roller kaydet, sadece mute rolü bırak
  const currentRoles = member.roles.cache
    .filter((r) => r.id !== guild.id && r.id !== muteRole.id)
    .map((r) => r.id);

  await db.set(`mute_roles_${guild.id}_${member.id}`, currentRoles);
  await db.set(`mute_end_${guild.id}_${member.id}`, endTimestamp);
  await member.roles.set([muteRole.id]);

  const embed = new MessageEmbed()
    .setTitle("🔇 Kullanıcı Susturuldu")
    .setDescription(
      `**${member.user.tag}** susturuldu.\n**Süre:** ${minutes} dakika`
    )
    .setColor("DARK_GREY")
    .setTimestamp();

  message.channel.send({ embeds: [embed] });

  // Otomatik roller iadesi
  setTimeout(async () => {
    const checkEnd = await db.get(`mute_end_${guild.id}_${member.id}`);
    if (checkEnd && Date.now() >= checkEnd) {
      const oldRoles =
        (await db.get(`mute_roles_${guild.id}_${member.id}`)) || [];
      await member.roles.set(oldRoles).catch(() => {});
      await db.delete(`mute_roles_${guild.id}_${member.id}`);
      await db.delete(`mute_end_${guild.id}_${member.id}`);
    }
  }, minutes * 60000 + 5000);
};
