// commands/ticket.js
const {
  MessageEmbed,
  MessageActionRow,
  MessageButton,
  Permissions,
} = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

exports.help = {
  name: "ticket",
  aliases: ["destek", "talep"],
  usage: "ticket",
  description: "Destek talebi oluşturur ve butonlarla yönetilir.",
  category: "Araçlar",
  cooldown: 10,
};

exports.execute = async (client, message, args) => {
  const guild = message.guild;
  const user = message.author;

  // 1) Açık ticket kontrolü: kanal isimlerinden
  const base = `ticket-${user.username.toLowerCase()}`.replace(
    /[^a-z0-9\-]/g,
    ""
  );
  const existing = guild.channels.cache.find(
    (ch) => ch.name === base || ch.name.startsWith(`${base}-`)
  );
  if (existing) {
    return message.channel
      .send(`❌ Zaten bir ticket kanalın var: ${existing}`)
      .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
  }

  // 2) Onay sorusu
  const prompt = await message.channel.send(
    `${user}, ticket açmak için **onayla**, iptal etmek için **iptal** yaz. (30s)`
  );
  const filter = (m) =>
    m.author.id === user.id &&
    ["onayla", "iptal"].includes(m.content.toLowerCase()) &&
    m.channel.id === message.channel.id;

  let collected;
  try {
    collected = await message.channel.awaitMessages({
      filter,
      max: 1,
      time: 30000,
      errors: ["time"],
    });
  } catch {
    await prompt.delete().catch(() => {});
    return message.channel
      .send("⌛ Süre doldu, ticket açma iptal edildi.")
      .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
  }

  const reply = collected.first();
  // 3) Temizlik: komut, prompt ve yanıtı sil
  await prompt.delete().catch(() => {});
  await message.delete().catch(() => {});
  await reply.delete().catch(() => {});

  if (reply.content.toLowerCase() === "iptal") {
    return message.channel
      .send("❌ Ticket açma işlemi iptal edildi.")
      .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
  }

  // 4) Kanal ismini oluştur (çakışma varsa -2, -3...)
  let channelName = base;
  let idx = 1;
  while (guild.channels.cache.some((ch) => ch.name === channelName)) {
    idx++;
    channelName = `${base}-${idx}`;
  }

  // 5) Kanalı aç ve izinleri ayarla
  const ticketChannel = await guild.channels.create(channelName, {
    type: "GUILD_TEXT",
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [Permissions.FLAGS.VIEW_CHANNEL] },
      {
        id: user.id,
        allow: [
          Permissions.FLAGS.VIEW_CHANNEL,
          Permissions.FLAGS.SEND_MESSAGES,
        ],
      },
    ],
  });

  // 6) DB kaydı: sadece interaction tarafı için kanal→sahip eşlemesi
  await db.set(`ticket_channel_${ticketChannel.id}`, user.id);

  // 7) Butonları oluştur
  const buttons = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId("ticket_close")
      .setLabel("🗑 Kapat")
      .setStyle("DANGER"),
    new MessageButton()
      .setCustomId("ticket_adduser")
      .setLabel("➕ Kullanıcı Ekle")
      .setStyle("PRIMARY")
  );

  // 8) Embed
  const embed = new MessageEmbed()
    .setTitle("🎫 Ticket Açıldı")
    .setDescription(
      `${user}, destek talebin alındı. Aşağıdaki butonları kullanarak ticket'ını yönetebilirsin.`
    )
    .setColor("#5865F2")
    .setFooter({ text: `Ticket ID: ${ticketChannel.id}` })
    .setTimestamp();

  await ticketChannel.send({
    content: `${user}`,
    embeds: [embed],
    components: [buttons],
  });

  // 9) Başarı mesajı
  message.channel
    .send(`✅ Ticket kanalı oluşturuldu: ${ticketChannel}`)
    .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
};
