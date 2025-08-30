// events/voiceStateUpdate.js
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");

module.exports = async (client, oldState, newState) => {
  // 1) Sadece kendi (bot) state değişikliklerine bak
  if (newState.member?.id !== client.user.id) return;

  // 2) Eğer bot önceden bir kanaldaysa (oldState.channelId var)
  //    ve şimdi artık kanalda değilse (newState.channelId yoksa)…
  if (oldState.channelId && !newState.channelId) {
    const guild = oldState.guild;
    const dbKey = `autoVC_${guild.id}`;
    const channelId = await client.db.get(dbKey);
    if (!channelId) return;

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;

    // Eğer hâlen bir bağlantı objesi varsa onu temizle
    const existingConnection = getVoiceConnection(guild.id);
    if (existingConnection) existingConnection.destroy();

    // 3) Yeniden katıl
    try {
      joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
      });
    } catch (err) {
      console.error(
        `[AutoVC] Yeniden katılamadı: ${guild.name}/${channel.name}`,
        err
      );
    }
  }
};
