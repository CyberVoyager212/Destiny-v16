const { Permissions } = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");
const botConfig = require("../botConfig.js"); // Dosya yolunu kendi yapına göre ayarla

module.exports = async (client) => {
  client.invites = new Map(); // invite cache'i başlat

  for (const [guildId, guild] of client.guilds.cache) {
    try {
      const invites = await guild.invites.fetch();
      const inviteMap = new Map();
      invites.forEach((i) => {
        inviteMap.set(i.code, {
          uses: i.uses,
          inviter: i.inviter?.id,
        });
      });
      client.invites.set(guildId, inviteMap);
    } catch (err) {
      console.error(`[Ready] ${guild.name} davetleri alınamadı:`, err);
    }
  }

  for (const guild of client.guilds.cache.values()) {
    const data = await client.db.get(`autoVC_${guild.id}`);
    if (!data?.id) continue;

    const channel = guild.channels.cache.get(data.id);
    if (!channel) {
      console.warn(`[AutoVC] Kanal bulunamadı: ${guild.name} (${data.id})`);
      continue;
    }
    if (!channel.permissionsFor(client.user).has(Permissions.FLAGS.CONNECT)) {
      console.warn(`[AutoVC] İzin yok: ${guild.name} › ${channel.name}`);
      continue;
    }

    try {
      joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
      });
    } catch (err) {
      console.error(`[AutoVC] Katılamadı: ${guild.name}/${channel.name}`, err);
    }
  }

  // 3) Döngüsel durum metinleri
  const statuses = [
    {
      name: `${botConfig.prefix}help ile yardım alabilirsiniz`,
      type: "LISTENING",
    },
    {
      name: `Bir sorun mu var? ${botConfig.prefix}bildir kullan 🆘`,
      type: "PLAYING",
    },
    { name: `${botName} geliştiriliyor`, type: "PLAYING" },
    {
      name: `If you don't know Turkish, use ${botConfig.prefix}autotranslate (your language code here)`,
      type: "LISTENING",
    },
  ];
  let idx = 0;
  setInterval(() => {
    const s = statuses[idx];
    client.user.setActivity(s.name, { type: s.type });
    idx = (idx + 1) % statuses.length;
  }, 10 * 1000);
};
