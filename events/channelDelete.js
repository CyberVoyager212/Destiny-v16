const { joinVoiceChannel } = require("@discordjs/voice");

module.exports = async (client, channel) => {
  if (!channel.guild) return;

  const db = client.db;
  const guildId = channel.guild.id;

  // --- Sticky Message Sistemi ---
  const stickyKey = `stickyMessage_${channel.id}`;
  const sticky = await db.get(stickyKey);

  // --- VC Otomatik Katılım Sistemi ---
  const autoVCKey = `autoVC_${guildId}`;
  const autoVC = await db.get(autoVCKey);
  const isVCTracked = autoVC?.id === channel.id;

  // Eğer sticky veya VC için takip ediliyorsa, kanalı yeniden oluştur
  if (!sticky && !isVCTracked) return;

  try {
    // Kanalı yeniden oluştur
    const newChannel = await channel.guild.channels.create(channel.name, {
      type: channel.type,
      parent: channel.parentId,
      permissionOverwrites: channel.permissionOverwrites.cache.map((ov) => ({
        id: ov.id,
        allow: ov.allow.toArray(),
        deny: ov.deny.toArray(),
        type: ov.type,
      })),
      reason: "Sticky veya VC sistemi nedeniyle yeniden oluşturuldu.",
    });

    // Sticky mesajı yeniden gönder
    if (sticky) {
      const sent = await newChannel.send(sticky.content);
      await db.set(`stickyMessage_${newChannel.id}`, {
        messageId: sent.id,
        content: sticky.content,
      });
      await db.delete(stickyKey);
    }

    // VC sistemi varsa, db'yi güncelle ve kanala bağlan
    if (isVCTracked && newChannel.isVoice()) {
      await db.set(autoVCKey, {
        id: newChannel.id,
        name: newChannel.name,
      });

      // Bağlantı açma işlemi
      const connection = joinVoiceChannel({
        channelId: newChannel.id,
        guildId: guildId,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      // Bağlantının başarıyla sağlandığını kontrol et
      connection.on("stateChange", (oldState, newState) => {
        if (newState.status === "connected") {
        }
      });
    }
  } catch (err) {
    console.error("❌ Kanal yeniden oluşturulurken hata:", err);
  }
};
