const { MessageEmbed } = require("discord.js");
const ms = require("ms");
const botConfig = require("../botConfig.js");
const axios = require("axios");
const emojis = require("../emoji.json"); // emoji verilerini içe aktar

// Levenshtein distance hesaplama
function levenshtein(a, b) {
  const dp = Array(b.length + 1)
    .fill(null)
    .map((_, i) => [i]);
  dp[0] = Array(a.length + 1)
    .fill(0)
    .map((_, j) => j);
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      dp[i][j] =
        b[i - 1] === a[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
    }
  }
  return dp[b.length][a.length];
}

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

/* ----------------- OTOMOD YARDIMCILARI (EKLENDI) ----------------- */

// Runtime hafızalar (restart'ta temizlenir)
const recentMessages = new Map(); // key: guildId-userId -> [timestamps]
const lastMessage = new Map(); // key: guildId-userId -> { content, count, ts }

function isUrl(text) {
  const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+/i;
  return urlRegex.test(text);
}
function isInvite(text) {
  const inviteRegex =
    /(discord\.gg|discordapp\.com\/invite|discord.com\/invite)\/[A-Za-z0-9]+/i;
  return inviteRegex.test(text);
}
function countEmojis(text) {
  const custom = (text.match(/<a?:\w+:\d+>/g) || []).length;
  const unicode = (text.match(/\p{Extended_Pictographic}/gu) || []).length;
  return custom + unicode;
}
function capsPercent(text) {
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (!letters.length) return 0;
  const uppers = letters.replace(/[^A-Z]/g, "").length;
  return Math.round((uppers / letters.length) * 100);
}

const DEFAULT_AUTOMOD = {
  enabled: true,
  muteRoleId: null,
  features: {
    profanity: { enabled: true, words: ["s*ç", "oç", "amk"], action: "delete" },
    antispam: {
      enabled: true,
      messages: 5,
      interval: 7,
      action: "mute",
      muteMinutes: 10,
    },
    antiinvite: { enabled: true, action: "delete" },
    antilink: { enabled: false, action: "delete" },
    massmention: { enabled: true, threshold: 5, action: "delete" },
    anticaps: {
      enabled: true,
      thresholdPercent: 70,
      minLength: 8,
      action: "delete",
    },
    repeated: { enabled: true, repeats: 3, action: "delete" },
    antiattachment: { enabled: false, action: "delete" },
    emojiSpam: { enabled: false, threshold: 10, action: "delete" },
    minAccountAge: { enabled: false, days: 3, action: "kick" },
  },
  ignoreRoles: [],
  ignoreChannels: [],
};

async function applyAction(action, message, reason, cfg) {
  try {
    if (action === "delete") {
      if (message.deletable) await message.delete().catch(() => {});
    } else if (action === "warn") {
      try {
        await message.author.send(`Uyarı: ${reason}`);
      } catch {}
    } else if (action === "mute") {
      const roleId = cfg.muteRoleId;
      if (!roleId) {
        if (message.deletable) await message.delete().catch(() => {});
        return;
      }
      const member = message.member;
      if (member && !member.roles.cache.has(roleId)) {
        await member.roles.add(roleId).catch(() => {});
        const muteMinutes = cfg.features?.antispam?.muteMinutes || 10;
        setTimeout(async () => {
          try {
            if (member && member.roles.cache.has(roleId))
              await member.roles.remove(roleId).catch(() => {});
          } catch {}
        }, muteMinutes * 60 * 1000);
      }
      if (message.deletable) await message.delete().catch(() => {});
    } else if (action === "kick") {
      if (message.deletable) await message.delete().catch(() => {});
      if (message.member && message.member.kickable)
        await message.member.kick(reason).catch(() => {});
    } else if (action === "ban") {
      if (message.deletable) await message.delete().catch(() => {});
      if (message.member && message.member.bannable)
        await message.member.ban({ reason }).catch(() => {});
    }
  } catch (err) {
    console.error("applyAction error:", err);
  }
}

/* ---------------------------------------------------------------- */

module.exports = async (client, message) => {
  // --- 0) Basit filtreler ---
  if (message.author.bot || !message.guild) return;

  const db = client.db;
  const guildId = message.guild.id;
  const userId = message.author.id;
  const channelId = message.channel.id;
  const content = message.content.trim();
  const ownerId = client.config.ownerId;
  const admins = client.config.admins || [];

  const logEntry = {
    userID: message.author.id,
    timestamp: Date.now(),
  };

  const guildKey = `messageLogs_${message.guild.id}`;

  let messageLogs = (await client.db.get(guildKey)) || [];

  messageLogs.push(logEntry);

  // Maksimum 1000 kayıt tut (gereksiz veri birikmesini engellemek için)
  if (messageLogs.length > 1000) {
    messageLogs = messageLogs.slice(messageLogs.length - 1000);
  }

  await client.db.set(guildKey, messageLogs);

  // --- 1) Prefix okuma ---
  const prefix = (await db.get(`prefix_${guildId}`)) || client.config.prefix;

  // --- 2) Onay anahtarları ---
  const acceptKey = `acceptedRules_${guildId}_${userId}`;
  const pendingKey = `${acceptKey}_pending`;

  // --- 3) Tetik kontrolü (prefix, başlangıcı veya bot etiketi) ---
  const lower = content.toLowerCase();
  const isTrigger =
    lower.startsWith(prefix) ||
    lower.startsWith((global.botName || "").toLowerCase());
  message.mentions.users.has(client.user.id);

  const isAccepted = await db.get(acceptKey);

  // 4) Eğer kullanıcı henüz onay vermemiş ve tetik var ise
  if (isTrigger && !isAccepted) {
    const cmd = lower.startsWith(prefix)
      ? lower.slice(prefix.length).trim()
      : null;

    // a) "kabulet" komutu
    if (cmd === "kabulet") {
      await db.set(acceptKey, true);
      await db.delete(pendingKey);

      // Kuralları kabul ettikten sonra eski komutu çalıştır
      const lastCmd = await db.get(`${message.author.id}_lastCommand`);
      const lastMsgId = await db.get(`${message.author.id}_lastMsgId`);
      const welcomeMsgId = await db.get(`${message.author.id}_welcomeMsgId`);

      // Kullanıcının kabulet mesajını sil
      setTimeout(() => {
        message.delete().catch(() => {});
      }, 5000);

      // Kurallar mesajı silinsin
      if (welcomeMsgId) {
        message.channel.messages.delete(welcomeMsgId).catch(() => {});
        await db.delete(`${message.author.id}_welcomeMsgId`);
      }

      // Önceki komutu çalıştır
      if (lastCmd) {
        const fakeMsg = Object.create(message);
        fakeMsg.content = lastCmd;

        await db.delete(`${message.author.id}_lastCommand`);
        await db.delete(`${message.author.id}_lastMsgId`);

        return client.emit("messageCreate", fakeMsg);
      }

      return;
    }

    // b) "reddet" komutu
    if (cmd === "reddet") {
      await db.set(pendingKey, Date.now());

      // reddet mesajını sil
      setTimeout(() => {
        message.delete().catch(() => {});
      }, 5000);

      // Kurallar mesajını sil
      const welcomeMsgId = await db.get(`${message.author.id}_welcomeMsgId`);
      if (welcomeMsgId) {
        message.channel.messages.delete(welcomeMsgId).catch(() => {});
        await db.delete(`${message.author.id}_welcomeMsgId`);
      }

      // Önceki komutu da sil
      const lastMsgId = await db.get(`${message.author.id}_lastMsgId`);
      if (lastMsgId) {
        message.channel.messages.delete(lastMsgId).catch(() => {});
        await db.delete(`${message.author.id}_lastMsgId`);
      }

      return;
    }

    // Kullanıcının mesajını ve komutunu kaydet
    await db.set(`${message.author.id}_lastCommand`, message.content);
    await db.set(`${message.author.id}_lastMsgId`, message.id);

    // 10 dakika geçmişse kuralları tekrar göster
    const sentAt = await db.get(pendingKey);
    if (!sentAt || Date.now() - sentAt > 10 * 60 * 1000) {
      const welcomeText = `Merhaba ${message.author.username}, devam etmeden önce lütfen kuralları kabul et.

• Botu spam veya zorlayıcı şekilde kullanma  
• Sahte para satışı/paylaşımı yasaktır  
• Yetkisiz müdahale ve exploit yasaktır  
• Kullanım sorumluluğu tamamen kullanıcıya aittir  

✅ Kabul için: \`${prefix}kabulet\`  
❌ Reddetmek için: \`${prefix}reddet\``;

      const welcomeMsg = await message.reply(welcomeText);
      await db.set(pendingKey, Date.now());
      await db.set(`${message.author.id}_welcomeMsgId`, welcomeMsg.id);

      // 5 saniye sonra otomatik silmek istersen (opsiyonel)
      // setTimeout(() => welcomeMsg.delete().catch(() => {}), 5000);
    }

    return; // Kuralları kabul etmeden çık
  }

  // --- 5) Hala onay yoksa ve tetik yoksa tüm kontrolleri atla ---
  if (!isAccepted) return;

  /* ----------------- OTOMOD ÇALIŞTIR (yeni eklenen blok) ----------------- */
  try {
    // Admin/owner muafiyeti
    if (!admins.includes(userId) && userId !== ownerId) {
      let cfg = await db.get(`otomod_${guildId}`);
      if (!cfg) {
        cfg = DEFAULT_AUTOMOD;
        await db.set(`otomod_${guildId}`, cfg);
      }

      // Eğer otomod tamamen kapalıysa atla
      if (cfg && cfg.enabled) {
        // ignore check
        if (cfg.ignoreChannels && cfg.ignoreChannels.includes(channelId)) {
          // atla
        } else if (
          message.member &&
          cfg.ignoreRoles &&
          message.member.roles.cache.some((r) => cfg.ignoreRoles.includes(r.id))
        ) {
          // atla
        } else {
          const txt = content || "";

          // 1) profanity
          const pConf = cfg.features.profanity || {};
          if (pConf.enabled && pConf.words && txt) {
            const found = pConf.words.find((w) => {
              if (!w) return false;
              try {
                return txt.toLowerCase().includes(w.toLowerCase());
              } catch {
                return false;
              }
            });
            if (found) {
              await applyAction(
                pConf.action,
                message,
                `Küfür tespit: ${found}`,
                cfg
              );
              return;
            }
          }

          // 2) antiinvite
          const invConf = cfg.features.antiinvite || {};
          if (invConf.enabled && txt && isInvite(txt)) {
            await applyAction(
              invConf.action,
              message,
              "Invite link tespit edildi",
              cfg
            );
            return;
          }

          // 3) antilink
          const linkConf = cfg.features.antilink || {};
          if (linkConf.enabled && txt && isUrl(txt)) {
            await applyAction(
              linkConf.action,
              message,
              "Link tespit edildi",
              cfg
            );
            return;
          }

          // 4) antiattachment
          const attConf = cfg.features.antiattachment || {};
          if (
            attConf.enabled &&
            message.attachments &&
            message.attachments.size > 0
          ) {
            await applyAction(
              attConf.action,
              message,
              "Attachment/ek tespit edildi",
              cfg
            );
            return;
          }

          // 5) massmention
          const mmConf = cfg.features.massmention || {};
          if (mmConf.enabled) {
            const mentionCount =
              message.mentions.users.size + message.mentions.roles.size;
            if (mentionCount >= (mmConf.threshold || 5)) {
              await applyAction(
                mmConf.action,
                message,
                `Çoklu mention: ${mentionCount}`,
                cfg
              );
              return;
            }
          }

          // 6) anticaps
          const ac = cfg.features.anticaps || {};
          if (ac.enabled && txt && txt.length >= (ac.minLength || 8)) {
            const pct = capsPercent(txt);
            if (pct >= (ac.thresholdPercent || 70)) {
              await applyAction(
                ac.action,
                message,
                `Büyük harf spamı (%${pct})`,
                cfg
              );
              return;
            }
          }

          // 7) emoji spam
          const es = cfg.features.emojiSpam || {};
          if (es.enabled && txt) {
            const ecount = countEmojis(txt);
            if (ecount >= (es.threshold || 10)) {
              await applyAction(
                es.action,
                message,
                `Emoji spam: ${ecount}`,
                cfg
              );
              return;
            }
          }

          // 8) repeated message
          const rep = cfg.features.repeated || {};
          if (rep.enabled && txt) {
            const key = `${guildId}-${userId}`;
            const last = lastMessage.get(key);
            if (last && last.content === txt) {
              last.count = (last.count || 1) + 1;
            } else {
              lastMessage.set(key, { content: txt, count: 1, ts: Date.now() });
            }
            const nowLast = lastMessage.get(key);
            if (nowLast.count >= (rep.repeats || 3)) {
              await applyAction(
                rep.action,
                message,
                `Aynı mesaj tekrar: ${nowLast.count}`,
                cfg
              );
              lastMessage.set(key, { content: null, count: 0 });
              return;
            }
          }

          // 9) antispam (rate-based)
          const spam = cfg.features.antispam || {};
          if (spam.enabled) {
            const key = `${guildId}-${userId}`;
            const arr = recentMessages.get(key) || [];
            const now = Date.now();
            arr.push(now);
            const intervalMs = (spam.interval || 7) * 1000;
            const windowStart = now - intervalMs;
            const cleaned = arr.filter((t) => t > windowStart);
            recentMessages.set(key, cleaned);
            if (cleaned.length >= (spam.messages || 5)) {
              await applyAction(
                spam.action,
                message,
                `Spam: ${cleaned.length} mesaj / ${spam.interval}s`,
                cfg
              );
              recentMessages.set(key, []);
              return;
            }
          }

          // 10) minAccountAge
          const mAge = cfg.features.minAccountAge || {};
          if (mAge.enabled) {
            const createdAt = message.author.createdTimestamp;
            const days = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
            if (days < (mAge.days || 3)) {
              await applyAction(
                mAge.action,
                message,
                `Hesap yaşı ${Math.floor(days)} gün < required`,
                cfg
              );
              return;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("otomod hata:", err);
  }
  /* ----------------- OTOMOD BİTİŞ ----------------- */

  // --- 6) Etiket yasak & kelime/sayı engel (prefix'siz mesajlarda) ---
  if (!content.startsWith(prefix)) {
    // 6a) Yasaklı etiket kontrolü
    for (const user of message.mentions.users.values()) {
      if (await db.get(`etiketYasak_${guildId}_${user.id}`)) {
        await message.delete().catch(() => {});
        // Uyarı/sunucu atma logic
        const warnKey = `warn_${guildId}_${userId}`;
        const bwKey = `bw_${guildId}_${userId}`;
        let warnCount = (await db.get(warnKey)) || 0;
        let bwCount = (await db.get(bwKey)) || 0;

        if (bwCount >= 5) {
          await message.guild.members
            .ban(userId, { reason: "5 büyük uyarı" })
            .catch(() => {});
          await db.delete(bwKey);
          return message.channel.send("🚫 5 büyük uyarı → banlandın!");
        }

        warnCount++;
        await db.set(warnKey, warnCount);

        if (warnCount >= 3) {
          const member = message.guild.members.cache.get(userId);
          if (member?.manageable) {
            await member.timeout(ms("10m"), "3 küçük uyarı doldu");
          }
          await db.delete(warnKey);
          await db.add(bwKey, 1);
          return message.channel.send(
            "🚫 3 küçük uyarı → 10dk timeout + 1 büyük uyarı!"
          );
        } else {
          return message.channel.send(
            `🚫 Yasaklı etiket! Küçük uyarı: ${warnCount}/3`
          );
        }
      }
    }

    // 6b) Kelime / sayı / url engel
    const allFilters = (await db.get(`mesajEngel_${guildId}`)) || {};
    const filters = allFilters[channelId] || [];

    if (Array.isArray(filters) && filters.length) {
      const isNumber = (txt) => /^\d+$/.test(txt);
      const isWord = (txt) => /^[\p{L}]+$/u.test(txt);
      const isURL = (txt) =>
        /(?:(?:https?|ftp):\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})([^\s]*)/i.test(
          txt
        );

      // Önce allow-only filtreleri ayır
      const allowOnly = filters
        .filter((f) => f.startsWith("!"))
        .map((f) => f.slice(1));
      if (allowOnly.length) {
        const ok = allowOnly.some((f) =>
          f === "#sayı#"
            ? isNumber(content)
            : f === "#kelime#"
            ? isWord(content)
            : f === "#url#"
            ? isURL(content)
            : content === f
        );

        if (!ok) {
          await message.delete().catch(() => {});
          return;
        }
      } else {
        // normal yasaklama listesi
        for (const f of filters) {
          if (
            (f === "#sayı#" && isNumber(content)) ||
            (f === "#kelime#" && isWord(content)) ||
            (f === "#url#" && isURL(content)) ||
            content === f
          ) {
            await message.delete().catch(() => {});
            return;
          }
        }
      }
    }
  }
  // --- 7) Oto cevap ---
  // db'den oto-cevapları al
  const otoCevaplar = (await db.get(`otoCevap_${guildId}`)) || [];

  // sadece prefix'siz mesajlarda çalışsın
  if (!content.startsWith(prefix)) {
    for (const cev of otoCevaplar) {
      const msgLower = content.toLowerCase();
      const triggerLower = (cev.trigger || "").toLowerCase();

      const isMatch =
        cev.exact === 1
          ? msgLower === triggerLower
          : msgLower.includes(triggerLower);

      if (!isMatch) continue;

      const opts = cev.options || {};

      try {
        // typing efekti
        if (opts.typing) await message.channel.sendTyping();

        // mesajı silmek isteniyorsa
        if (opts.delete) await message.delete().catch(() => {});

        // DM atılacaksa
        if (opts.dm) {
          try {
            if (cev.embed === 1) {
              const embed = new MessageEmbed()
                .setTitle(cev.title || "Oto-Cevap")
                .setDescription(cev.response)
                .setColor("BLUE");
              await message.author.send({ embeds: [embed] });
            } else {
              await message.author.send(
                cev.response + (opts.mention ? ` <@${message.author.id}>` : "")
              );
            }
          } catch (err) {
            console.error("DM gönderilemedi:", err);
          }
          continue; // DM atıldıysa normal kanala gönderme
        }

        // webhook ile gönderim
        if (opts.webhook) {
          let webhook = (await message.channel.fetchWebhooks()).find(
            (wh) => wh.name === "OtoCevap"
          );
          if (!webhook) {
            webhook = await message.channel.createWebhook("OtoCevap", {
              avatar: client.user.displayAvatarURL(),
            });
          }

          const username =
            message.member?.displayName || message.author.username;
          const avatar = message.author.displayAvatarURL({ dynamic: true });

          if (cev.embed === 1) {
            const embed = new MessageEmbed()
              .setTitle(cev.title || "Oto-Cevap")
              .setDescription(cev.response)
              .setColor("BLUE");
            const sent = await webhook.send({
              embeds: [embed],
              username,
              avatarURL: avatar,
            });
            if (opts.ephemeral) {
              const ephemeralDuration = Number(opts.ephemeralSec) || 8;
              setTimeout(
                () => sent.delete().catch(() => {}),
                ephemeralDuration * 1000
              );
            }
          } else {
            const text =
              cev.response + (opts.mention ? ` <@${message.author.id}>` : "");
            const sent = await webhook.send({
              content: text,
              username,
              avatarURL: avatar,
            });
            if (opts.ephemeral) {
              const ephemeralDuration = Number(opts.ephemeralSec) || 8;
              setTimeout(
                () => sent.delete().catch(() => {}),
                ephemeralDuration * 1000
              );
            }
          }
        } else {
          // normal kanal mesajı
          if (cev.embed === 1) {
            const embed = new MessageEmbed()
              .setTitle(cev.title || "Oto-Cevap")
              .setDescription(cev.response)
              .setColor("BLUE");
            const sent = await message.channel.send({ embeds: [embed] });
            if (opts.ephemeral) {
              const ephemeralDuration = Number(opts.ephemeralSec) || 8;
              setTimeout(
                () => sent.delete().catch(() => {}),
                ephemeralDuration * 1000
              );
            }
          } else {
            const text =
              cev.response + (opts.mention ? ` <@${message.author.id}>` : "");
            const sent = await message.channel.send(text);
            if (opts.ephemeral) {
              const ephemeralDuration = Number(opts.ephemeralSec) || 8;
              setTimeout(
                () => sent.delete().catch(() => {}),
                ephemeralDuration * 1000
              );
            }
          }
        }
      } catch (err) {
        console.error("Oto-Cevap Hata:", err);
      }
    }
  }
  // -- 8) AdvencedEngel --
  const engelKelimeler = (await db.get(`engelKelime_${guildId}`)) || [];

  let hasBadWord = false;
  let filteredContent = content; // orijinali bozma, kopya üzerinde çalış

  // Yasaklı kelime var mı kontrol et
  engelKelimeler.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    if (regex.test(filteredContent)) {
      hasBadWord = true;
      filteredContent = filteredContent.replace(regex, ""); // engelli kelimeyi çıkar
    }
  });

  if (hasBadWord) {
    try {
      await message.delete();

      // Eğer geriye hiç yazı kalmadıysa -> sadece sil
      if (!filteredContent.trim()) return;

      // Webhook bul / oluştur
      let webhook = (await message.channel.fetchWebhooks()).find(
        (wh) => wh.name === "AdvencedEngel"
      );

      if (!webhook) {
        webhook = await message.channel.createWebhook("AdvencedEngel", {
          avatar: client.user.displayAvatarURL(),
        });
      }

      // Kullanıcı takma adı varsa onu al, yoksa username
      const displayName =
        message.member?.displayName || message.author.username;

      await webhook.send({
        content: filteredContent.trim(),
        username: displayName,
        avatarURL: message.author.displayAvatarURL({ dynamic: true }),
      });
    } catch (err) {
      console.error("Engel sistemi hatası:", err);
    }
  }

  // --- 9) AFK sistemi: dönen mesaj ---
  {
    const userAfkKey = `afk_${userId}`;
    const afkData = await db.get(userAfkKey);
    if (afkData) {
      await db.delete(userAfkKey);
      const elapsed = Date.now() - afkData.start;
      await message.reply(
        `Artık AFK değilsin. **${ms(elapsed, {
          long: true,
        })}** boyunca AFK idin.`
      );
    }
  }

  // --- 10) AFK etiket uyarıları ---
  if (message.mentions.users.size) {
    for (const [, user] of message.mentions.users) {
      if (user.bot) continue;
      const data = await db.get(`afk_${user.id}`);
      if (data) {
        await message.channel.send(
          `<@${user.id}> şu anda AFK: ${data.reason || "Belirtilmemiş"}`
        );
      }
    }
  }
  const axios = require("axios");

  // 11) Bot tetikleyici & OpenRouter.ai entegrasyonu
  const isMentioned = message.mentions.users.has(client.user.id);
  if (
    lower.startsWith(botName.toLowerCase()) ||
    (isMentioned && lower.includes(botName.toLowerCase()))
  ) {
    const after = content.split(/\s+/).slice(1).join(" ").trim();

    // 11a) Sadece bot adı yazılmışsa sabit mesaj döner
    if (!after) {
      return message.reply(
        `Benimle konuşmak için yazıgpt komutunu kullanabilir veya ${botName} (mesaj) yazabilirsiniz.`
      );
    }

    // 11b) Kullanıcının mesajını OpenRouter API'ye gönder ve cevap al
    const historyKey = `destiny_history_${userId}`;
    let history = (await db.get(historyKey)) || [];

    // Sistem mesajı + önceki geçmiş + yeni kullanıcı mesajı
    const aiMessages = [
      {
        role: "system",
        content: `Sen ${botName} adındaki asistansın. Soruları akıcı ve Türkçe cevapla.`,
      },
      ...history.slice(-8),
      { role: "user", content: after },
    ];

    try {
      const aiRes = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "z-ai/glm-4.5-air:free",
          messages: aiMessages,
          max_tokens: 2048,
          temperature: 0.4,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${botConfig.OPENROUTER_API_KEY}`,
          },
        }
      );

      const aiReply = aiRes.data.choices[0]?.message?.content?.trim();

      if (!aiReply) {
        return message.reply("❌ Yanıt alınamadı, lütfen tekrar deneyin.");
      }

      if (aiReply.length > 2000) {
        return message.reply(
          "Cevap 2000 karakterden uzun. Detaylı bilgi için yazıgpt create moduna geçin."
        );
      }

      // Cevabı gönder ve geçmişe kaydet
      await message.reply(aiReply);
      history.push({ role: "user", content: after });
      history.push({ role: "assistant", content: aiReply });
      await db.set(historyKey, history);
    } catch (err) {
      console.error(err);
      return message.reply("❌ Bir hata oluştu, lütfen tekrar deneyin.");
    }

    return;
  }

  // --- 12) Komut sistemi çalıştırma ---
  if (!content.startsWith(prefix)) return;
  const parts = content.slice(prefix.length).trim().split(/\s+/);
  const cmdName = parts.shift().toLowerCase();

  let command = null;
  let commandName = null;

  // --- Hazırla: tüm komut isimleri + alias'ları, orijinal komut adına referans verecek şekilde ---
  const candidates = [];
  client.commands.forEach((cmd, origName) => {
    // Orijinal isim olarak ekle
    candidates.push({
      entryName: origName,
      trigger: origName.toLowerCase(),
      cmd,
    });
    // Alias'ları ekle; entryName hep orijinal komut adını tutar
    const aliases = cmd.help?.aliases || [];
    for (const a of aliases) {
      candidates.push({ entryName: origName, trigger: a.toLowerCase(), cmd });
    }
  });

  // Yardımcı: kullanıcı bir komutu kullanmaya yetkili mi?
  function userCanUse(cmd) {
    const help = cmd.help || {};
    const callerId = typeof userId !== "undefined" ? userId : message.author.id;
    const botAdmins = Array.isArray(
      typeof admins !== "undefined" ? admins : null
    )
      ? admins
      : Array.isArray(botConfig?.admins)
      ? botConfig.admins
      : [];

    // Owner veya bot-admin muaf (ownerId / admins değişkenleri yoksa bu kontroller false dönebilir)
    if (typeof ownerId !== "undefined" && callerId === ownerId) return true;
    if (Array.isArray(botAdmins) && botAdmins.includes(callerId)) return true;

    // 1) Eğer help.permissions varsa -> Discord izinlerini kontrol et
    if (help.permissions) {
      const perms = Array.isArray(help.permissions)
        ? help.permissions
        : [help.permissions];
      if (!message.guild || !message.member) return false;
      try {
        return message.member.permissions.has(perms);
      } catch (err) {
        return false;
      }
    }

    // 2) permissions yok ama admin:true ise -> botConfig.admins içinde mi kontrol et
    if (help.admin) {
      return Array.isArray(botAdmins) && botAdmins.includes(callerId);
    }

    // Eğer yukarıdaki kurallar yoksa herkes kullanabilir
    return true;
  }

  // 12a) Komutu veya alias'ı bul (candidates üzerinden, entryName orijinal adı verir)
  for (const c of candidates) {
    if (c.trigger === cmdName) {
      // Komutu bulduk; ama önce çağıran kişinin bu komutu çalıştırmaya yetkisi var mı kontrol et
      if (!userCanUse(c.cmd)) {
        // Yetkisi yok: komut yokmuş gibi davran
        command = null;
        commandName = null;
      } else {
        // Yetkisi var: normal şekilde komutu ata (entryName = orijinal isim)
        command = c.cmd;
        commandName = c.entryName;
      }
      break;
    }
  }

  // 12b) Bulunamadıysa öneri (veya yetkin yok gibi davranıldığı durumda)
  if (!command) {
    // Öneri listesi: sadece kullanıcının erişebileceği komut isimleri
    const allNames = Array.from(
      new Set(
        candidates
          .filter((c) => userCanUse(c.cmd))
          .map((c) => c.entryName.toLowerCase())
      )
    );

    // Levenshtein ile en yakın 3 öneriyi al
    const sug = allNames
      .map((n) => ({ n, d: levenshtein(cmdName, n) }))
      .filter((x) => x.d <= 3)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .map((x) => `\`${prefix}${x.n}\``);

    const embed = new MessageEmbed()
      .setTitle("❌ Komut Bulunamadı")
      .setColor("#FF5555")
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: `${botName} | Komut Öneri Sistemi` })
      .setDescription(
        sug.length
          ? `\`${cmdName}\` bulunamadı. Belki şunları denediniz:\n${sug.join(
              "\n"
            )}`
          : `\`${cmdName}\` bulunamadı. \`${prefix}help\` ile listeye bakabilirsiniz.`
      );

    return message.channel.send({ embeds: [embed] });
  }

  // --- 13) Cooldown kontrolü ---
  {
    if (!admins.includes(userId)) {
      const cdSec = command.cooldown || command.help?.cooldown || 5;
      const cdKey = `${commandName}Cooldown_${userId}`;
      const last = await db.get(cdKey);
      if (last && Date.now() - last < cdSec * 1000) {
        const remMs = cdSec * 1000 - (Date.now() - last);
        const remSeconds = Math.ceil(remMs / 1000);
        const timestamp = Math.floor((Date.now() + remMs) / 1000); // saniye cinsinden

        const remMsg = await message.reply(
          `⏳ Lütfen <t:${timestamp}:R> sonra tekrar dene.`
        );
        setTimeout(() => {
          remMsg.delete().catch(() => {});
          message.delete().catch(() => {});
        }, remMs);
        return;
      }
      await db.set(cdKey, Date.now());
    }
  }
  // --- 13.4) Botban kontrolü: botbanned olanlar hiçbir komutu kullanamaz ---
  // Ama admin veya owner iseler bu kontrolü atla
  if (!admins.includes(userId) && userId !== ownerId) {
    const botbans = (await db.get("botbans")) || [];
    if (botbans.includes(userId)) {
      return message.reply(
        "🚫 Botdan banlı olduğunuz için hiçbir komutu kullanamazsınız."
      );
    }
  }

  // --- 13.5) Borç süresi kontrolü: 5 günü aşan borcu olanlar komut kullanamaz, ödeme hariç ---
  // Yine admin veya owner’lar muaf
  if (!admins.includes(userId) && userId !== ownerId) {
    const userLoan = await db.get(`loan_${userId}`);
    if (userLoan && userLoan.amount > 0 && userLoan.time) {
      const loanTime = new Date(userLoan.time).getTime();
      const now = Date.now();
      const fiveDays = 5 * 24 * 60 * 60 * 1000; // 5 gün

      if (now - loanTime > fiveDays && commandName !== "ödeme") {
        return message.reply(
          `🚫 5 günü aşan **borcunuz (${userLoan.amount}) ${chooseEmoji(
            userLoan.amount
          )}** olduğu için komutları kullanamazsınız.\nLütfen \`${prefix}ödeme <miktar>\` komutu ile borcunuzu ödeyiniz.`
        );
      }
    }
  }

  // --- 14) Komutu çalıştır ---
  try {
    await command.execute(client, message, parts);
  } catch (err) {
    console.error(err);
    message.reply("❌ Komut çalıştırılırken bir hata oluştu.");
  }
};
