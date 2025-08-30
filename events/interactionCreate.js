// events/interactionCreate.js
const {
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  Permissions,
} = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, interaction) => {
  if (!interaction.isButton()) return;
  const { customId, user, channel, guild } = interaction;

  // Sadece ticket kanallarında çalışsın
  const ownerId = await db.get(`ticket_channel_${channel.id}`);
  if (!ownerId) return;

  // Üye bilgisi ve yetki kontrolü
  const member = await guild.members.fetch(user.id);
  const isOwner = user.id === ownerId;
  const isStaff = member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS);

  // KAPAT butonu
  if (customId === "ticket_close") {
    if (!isOwner && !isStaff) {
      return interaction.reply({
        content: "❌ Yetkiniz yok.",
        ephemeral: true,
      });
    }
    if (isOwner && !isStaff) {
      // Kullanıcı kapatırsa sadece görüntüleme iznini al
      await channel.permissionOverwrites.edit(ownerId, { VIEW_CHANNEL: false });
      return interaction.reply({
        content: "✅ Ticket kapatıldı; artık görmüyorsun.",
        ephemeral: true,
      });
    }
    if (isStaff) {
      await interaction.deferReply({ ephemeral: true });
      // Arşiv kategori
      let archiveCat = guild.channels.cache.find(
        (c) => c.name === "ticket-arsiv" && c.type === "GUILD_CATEGORY"
      );
      if (!archiveCat) {
        archiveCat = await guild.channels.create("ticket-arsiv", {
          type: "GUILD_CATEGORY",
        });
      }
      // Mesajları al
      const msgs = await channel.messages.fetch({ limit: 100 });
      const content = msgs
        .map(
          (m) =>
            `[${new Date(m.createdTimestamp).toLocaleString()}] ${
              m.author.tag
            }: ${m.content}`
        )
        .reverse()
        .join("\n");
      // Arşiv kanalı adı
      let arcName = `${channel.name}-arsiv`,
        idx = 1;
      while (guild.channels.cache.find((c) => c.name === arcName)) {
        idx++;
        arcName = `${channel.name}-arsiv-${idx}`;
      }
      const arcChannel = await guild.channels.create(arcName, {
        type: "GUILD_TEXT",
        parent: archiveCat.id,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [Permissions.FLAGS.VIEW_CHANNEL],
          },
          {
            id: member.roles.highest.id,
            allow: [Permissions.FLAGS.VIEW_CHANNEL],
          },
        ],
      });
      // Gönder
      if (content.length > 2000) {
        for (let i = 0; i < content.length; i += 1990) {
          await arcChannel.send("```" + content.slice(i, i + 1990) + "```");
        }
      } else {
        await arcChannel.send("```" + content + "```");
      }
      // DB temizle ve kanal sil
      await db.delete(`ticket_user_${ownerId}`);
      await db.delete(`ticket_channel_${channel.id}`);
      await channel.delete().catch(() => {});
    }
  }

  // KULLANICI EKLE butonu
  if (customId === "ticket_adduser") {
    if (!isStaff) {
      return interaction.reply({
        content: "❌ Yetkiniz yok.",
        ephemeral: true,
      });
    }
    // İlk geri bildirim
    await interaction.reply({
      content:
        "Lütfen eklenecek kullanıcının **ID**'sini bu kanala yazın (60s):",
      ephemeral: true,
    });

    // Collector: yalnızca bu kanaldaki mesajları dinler
    const filter = (m) =>
      m.channel.id === channel.id && m.author.id === user.id;
    const collector = channel.createMessageCollector({
      filter,
      max: 1,
      time: 60000,
    });

    collector.on("collect", async (msg) => {
      const input = msg.content.trim();
      // ID format kontrolü
      if (!/^\d{17,19}$/.test(input)) {
        await channel.send({
          content: "❌ Geçersiz ID. Lütfen geçerli bir kullanıcı ID'si girin.",
          ephemeral: true,
        });
        msg.delete().catch(() => {});
        return;
      }
      collector.stop("ok");
      msg.delete().catch(() => {});

      // Üyeyi fetch et
      let target;
      try {
        target = await guild.members.fetch(input);
      } catch {
        target = null;
      }
      if (!target) {
        return channel.send({
          content: "❌ Bu ID'ye sahip kullanıcı bulunamadı.",
          ephemeral: true,
        });
      }

      // İzinleri güncelle
      await channel.permissionOverwrites.edit(target.id, {
        VIEW_CHANNEL: true,
        SEND_MESSAGES: true,
      });

      channel.send({
        content: `✅ ${target.user.tag} ticket kanalına eklendi.`,
        ephemeral: true,
      });
    });

    collector.on("end", (collected, reason) => {
      if (reason !== "ok") {
        interaction.followUp({
          content: "⌛ Süre doldu, işlem iptal edildi.",
          ephemeral: true,
        });
      }
    });
  }
  const [prefix, action, userId] = interaction.customId.split("_");

  if (prefix === "yazigpt" && action === "newchat") {
    if (interaction.user.id !== userId) {
      return interaction.reply({
        content: "❌ Bu buton sana ait değil.",
        ephemeral: true,
      });
    }

    // Kullanıcının önceki channelId’sini kontrol et
    const channelKey = `destiny_channel_${userId}`;
    const existingChannelId = await db.get(channelKey);

    let channel;
    if (existingChannelId) {
      // varsa kanalı bul
      channel = interaction.guild.channels.cache.get(existingChannelId);
    }

    if (!channel) {
      // yoksa yeni kanal oluştur
      channel = await interaction.guild.channels.create({
        name: `yazıgpt-${interaction.user.username}`,
        type: "GUILD_TEXT",
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: ["VIEW_CHANNEL"],
          },
          {
            id: interaction.user.id,
            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"],
          },
        ],
      });
      await db.set(channelKey, channel.id);
    }

    // Geçmişi sıfırla (restart gibi)
    await db.set(`destiny_history_${userId}`, []);

    return interaction.reply({
      content: `✅ Yeni sohbet hazırlandı! <#${channel.id}> kanalına gidebilirsin.`,
      ephemeral: true,
    });
  }
};
