// commands/yazıgpt.js
const {
  Permissions,
  MessageActionRow,
  MessageButton,
  WebhookClient,
  MessageEmbed,
} = require("discord.js");
const axios = require("axios");
const config = require("../botConfig.js");

// --- CONFIG ---
const botname = config.botname || "Bot";
const conversationHistories = {}; // kanalId => { ... }
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "z-ai/glm-4.5-air:free";
const DEEP_MODEL = "deepseek/deepseek-r1-0528-qwen3-8b:free";

// --- EXPORT ---
module.exports = {
  name: "yazıgpt",
  description: `Yazılı modda ${botname} ile sohbet (embed, butonlar, multimodal, history UI).`,
  usage: "yazıgpt <create|restart|close>",
  category: "Araçlar",
  cooldown: 5,

  async execute(client, message, args) {
    const member = message.member;
    const guild = message.guild;
    if (!guild)
      return safeMessageReply(message, "Bu komut sunucuda kullanılmalı.");

    const sub = args[0]?.toLowerCase();

    // kanal ismi formatı
    const displayFormat = config.displayNameFormat || "{username}";
    const channelNameFromMember = displayFormat
      .replace("{username}", member.user.username)
      .slice(0, 90);

    const existingChannel = guild.channels.cache.find(
      (ch) => ch.name === channelNameFromMember
    );

    // CREATE
    if (sub === "create") {
      if (existingChannel)
        return safeMessageReply(message, `Zaten açılmış: ${existingChannel}`);

      const channel = await guild.channels.create(channelNameFromMember, {
        type: "GUILD_TEXT",
        permissionOverwrites: [
          { id: guild.id, deny: [Permissions.FLAGS.VIEW_CHANNEL] },
          {
            id: member.id,
            allow: [
              Permissions.FLAGS.VIEW_CHANNEL,
              Permissions.FLAGS.SEND_MESSAGES,
            ],
          },
          {
            id: client.user.id,
            allow: [
              Permissions.FLAGS.VIEW_CHANNEL,
              Permissions.FLAGS.SEND_MESSAGES,
              Permissions.FLAGS.MANAGE_WEBHOOKS,
            ],
          },
        ],
      });

      const webhook = await channel.createWebhook(member.displayName, {
        avatar: member.user.displayAvatarURL({ format: "png" }),
      });

      conversationHistories[channel.id] = {
        webhookId: webhook.id,
        webhookToken: webhook.token,
        messages: [
          {
            role: "system",
            content: `Sen ${botname} adlı bir Discord botusun. Türkçe, samimi ve anlaşılır cevap ver. Cevaplarının sonunda kullanıcıyı yönlendirmek için kısa "devam" önerileri üret ve bunları JSON blok içinde "suggestions" anahtarıyla belirt.`,
          },
        ],
        keepHistory: true,
        suggestionsMap: {},
        lastEmbedMessageId: null,
        defaultMode: "normal",
        toggleActive: false,
        historyPageByUser: {},
        lastModelUsed: DEFAULT_MODEL,
        suppressUserMessageCollector: false,
        _savedEmbedState: null,
      };

      listenToTextChannel(client, channel, member, botname);
      return safeMessageReply(message, `Oluşturuldu ve dinleniyor: ${channel}`);
    }

    // RESTART -> geçmişi kanaldan çekip konversationHistories'e koy
    if (sub === "restart") {
      if (!existingChannel)
        return safeMessageReply(message, "Önce `create` ile kanal açmalısın.");

      let webhookId = null,
        webhookToken = null;
      try {
        const webhooks = await existingChannel.fetchWebhooks();
        const wh =
          webhooks.find((w) => w.owner?.id === client.user.id) ||
          webhooks.first();
        if (wh) {
          webhookId = wh.id;
          webhookToken = wh.token;
        } else {
          const newWh = await existingChannel.createWebhook(member.displayName, {
            avatar: member.user.displayAvatarURL({ format: "png" }),
          });
          webhookId = newWh.id;
          webhookToken = newWh.token;
        }
      } catch (e) {
        console.warn("Webhook bulunamadı/oluşturulamadı (restart):", e.message);
      }

      // kanal mesajlarını çek (limit 200, ascending)
      const loadedMessages = [];
      try {
        const fetched = await existingChannel.messages.fetch({ limit: 200 });
        const ordered = Array.from(fetched.values()).sort(
          (a, b) => a.createdTimestamp - b.createdTimestamp
        );
        for (const m of ordered) {
          if (m.content && m.content.startsWith(config.prefix)) continue;
          if (!m.content && (!m.embeds || m.embeds.length === 0)) continue;

          if (m.author && !m.author.bot) {
            loadedMessages.push({ role: "user", content: m.content || "" });
          } else {
            // bot/embed mesajlarını assistant olarak al
            let assistantText = "";
            if (m.embeds && m.embeds.length > 0) {
              const emb = m.embeds[0];
              if (emb.description) assistantText += emb.description + "\n";
              if (emb.fields && emb.fields.length)
                assistantText += emb.fields.map((f) => `${f.name}: ${f.value}`).join("\n");
            }
            if (m.content) assistantText = (assistantText ? assistantText + "\n" : "") + m.content;
            if (assistantText.trim()) loadedMessages.push({ role: "assistant", content: assistantText.trim() });
          }
        }
      } catch (e) {
      }

      const baseMessages = [
        {
          role: "system",
          content: `Sen ${botname} adlı bir Discord botusun. Türkçe, samimi ve anlaşılır cevap ver. Cevaplarının sonunda kullanıcıyı yönlendirmek için kısa "devam" önerileri üret ve bunları JSON blok içinde "suggestions" anahtarıyla belirt.`,
        },
      ];
      const messagesToStore = baseMessages.concat(loadedMessages);

      conversationHistories[existingChannel.id] = {
        webhookId,
        webhookToken,
        messages: messagesToStore,
        keepHistory: true,
        suggestionsMap: {},
        lastEmbedMessageId: null,
        defaultMode: "normal",
        toggleActive: false,
        historyPageByUser: {},
        lastModelUsed: DEFAULT_MODEL,
        suppressUserMessageCollector: false,
        _savedEmbedState: null,
      };

      listenToTextChannel(client, existingChannel, member, botname);
      return safeMessageReply(
        message,
        `Yeniden dinleniyor ve geçmiş yüklendi: ${existingChannel}`
      );
    }

    // CLOSE
    if (sub === "close") {
      if (!existingChannel)
        return safeMessageReply(message, "Kapatılacak bir kanalın yok.");
      delete conversationHistories[existingChannel.id];
      await existingChannel.delete();
      return safeMessageReply(message, "Kanal kapatıldı ve geçmiş silindi.");
    }

    return safeMessageReply(
      message,
      "Lütfen `create`, `restart` veya `close` altkomutlarını kullanın."
    );
  },
};

// --- Yardımcılar ---
// Güvenli reply (DM fallback)
async function safeMessageReply(message, content, options = {}) {
  try {
    if (message.channel && message.channel.send)
      return await message.reply({ content, ...options });
    return await message.author.send({ content, ...options });
  } catch (e) {
    try {
      return await message.author.send({ content, ...options });
    } catch (err) {
      console.error("safeMessageReply hata:", err);
    }
  }
}

// Güvenli defer; zaten defer edilmemişse defer et
async function safeDefer(interaction) {
  try {
    if (!interaction.deferred && !interaction.replied) {
      // deferUpdate hızlı bir ack; uzun işlerde token süresi sorununun önüne geçer
      return await interaction.deferUpdate();
    }
  } catch (e) {
    // ignore
  }
}

// Güvenli etkileşim yanıtı: defer edilmiş mi/replied mi kontrol et, uygun yöntemi kullan
async function safeInteractionRespond(interaction, payload = {}) {
  // payload: { content, embeds, components, ephemeral }
  try {
    if (!interaction.deferred && !interaction.replied) {
      // henüz ack yok => reply (ephemeral ise reply)
      return await interaction.reply(payload);
    } else {
      // Daha önce defer/ack var -> followUp
      return await interaction.followUp(payload);
    }
  } catch (e) {
    // fallback farklı yollar dener
    try {
      if (!interaction.replied) return await interaction.reply(payload);
      return await interaction.followUp(payload);
    } catch (err) {
      console.error("safeInteractionRespond hata:", err);
    }
  }
}

// --- CORE: dinleme, butonlar, history, multimodal vb. ---
function listenToTextChannel(client, channel, creator, botNameLocal) {
  listenToTextChannel._listeners = listenToTextChannel._listeners || new Set();
  if (listenToTextChannel._listeners.has(channel.id)) return;
  listenToTextChannel._listeners.add(channel.id);

  // MESSAGE CREATE
  client.on("messageCreate", async (msg) => {
    if (msg.channel.id !== channel.id) return;
    if (msg.author.bot) return;
    if (msg.author.id !== creator.id) return;
    if (msg.content.startsWith(config.prefix)) return;

    const hist = conversationHistories[channel.id];
    if (!hist) {
      console.warn("Bu kanal için geçmiş kaydı yok:", channel.id);
      return safeMessageReply(
        msg,
        "Bu kanalda bot yapılandırması eksik. Yeniden `create` yapın."
      );
    }

    // Eğer edit/delete collector aktifse kullanıcı mesajlarını AI çağırmak için yok say
    if (hist.suppressUserMessageCollector) return;

    // MODE seçimleri
    let modelToUse =
      hist.defaultMode === "deepseek" ? DEEP_MODEL : DEFAULT_MODEL;
    if (hist.defaultMode === "web") modelToUse = DEFAULT_MODEL;

    let modeForThisCall =
      hist.currentModeForNextMessage || hist.defaultMode || "normal";
    if (!hist.toggleActive) delete hist.currentModeForNextMessage;

    if (modeForThisCall === "deepseek") modelToUse = DEEP_MODEL;
    if (modeForThisCall === "web") modelToUse = DEFAULT_MODEL;

    // typing
    try {
      await msg.channel.sendTyping();
    } catch (e) {}

    // build messages to send
    let messagesToSend;
    if (hist.keepHistory) {
      messagesToSend = [
        ...hist.messages,
        { role: "user", content: msg.content },
      ];
    } else {
      const system = hist.messages.find((m) => m.role === "system");
      messagesToSend = [];
      if (system) messagesToSend.push(system);
      messagesToSend.push({ role: "user", content: msg.content });
    }

    // web mode summary
    if (modeForThisCall === "web") {
      try {
        const webSummary = await webSearchAndSummarize(
          config.SERPER_API_KEY,
          msg.content
        );
        if (webSummary) {
          messagesToSend.push({
            role: "system",
            content: `WEB_ARAMA_SONUÇLARI:\n${webSummary}`,
          });
        }
      } catch (e) {
        console.warn("Web arama hatası:", e.message);
      }
    }

    // AI çağrısı - önemli: uzun sürebilir -> hemen typing sonrası devam
    let aiResp;
    try {
      aiResp = await fetchChatFromOpenRouter(
        process.env.OPENROUTER_API_KEY ||
          msg.client?.config?.OPENROUTER_API_KEY,
        messagesToSend,
        modelToUse
      );
    } catch (e) {
      console.error("OpenRouter hata:", e);
      return safeMessageReply(msg, "Cevap alınamadı (AI servisi hata verdi).");
    }

    const fullText = aiResp.text;
    let suggestions = aiResp.suggestions || [];

    // deepseek ise suggestions'ları DEFAULT_MODEL ile yeniden al
    if (modelToUse === DEEP_MODEL) {
      try {
        const suggPrompt = [
          {
            role: "system",
            content:
              'Sen kısa, kullanıcının takip etmesi için 3 adet öneri üreten bir yardımcısın. Sadece JSON formatında, ```json{"suggestions":["..."]}``` şeklinde çıktı ver.',
          },
          {
            role: "user",
            content: `Kontekst: ${fullText}\nLütfen 3 kısa devam önerisi üret.`,
          },
        ];
        const suggResp = await fetchChatFromOpenRouter(
          process.env.OPENROUTER_API_KEY ||
            msg.client?.config?.OPENROUTER_API_KEY,
          suggPrompt,
          DEFAULT_MODEL
        );
        if (suggResp && suggResp.suggestions && suggResp.suggestions.length)
          suggestions = suggResp.suggestions;
      } catch (e) {
        console.warn("Suggestions regen hata:", e.message);
      }
    }

    // history kaydet
    if (hist.keepHistory) {
      hist.messages.push({ role: "user", content: msg.content });
      hist.messages.push({ role: "assistant", content: fullText });
    }
    hist.lastModelUsed = modelToUse;

    // embed & component inşa et
    const embed = new MessageEmbed()
      .setColor("#5865F2")
      .setAuthor({
        name: botNameLocal,
        iconURL: msg.client.user.displayAvatarURL(),
      })
      .setDescription("...")
      .setTimestamp()
      .setFooter({
        text: `✨ ${botNameLocal} • Yapay Zeka destekli yanıt • Model: ${modelToUse}`,
        iconURL: msg.client.user.displayAvatarURL(),
      });

    const components = [];
    if (suggestions.length > 0) {
      const row = new MessageActionRow();
      for (let i = 0; i < Math.min(3, suggestions.length); i++) {
        const customId = `yazigpt_sug_${channel.id}_${Date.now()}_${i}`;
        hist.suggestionsMap[customId] = suggestions[i];
        row.addComponents(
          new MessageButton()
            .setCustomId(customId)
            .setLabel(
              suggestions[i].length > 80
                ? suggestions[i].slice(0, 77) + "..."
                : suggestions[i]
            )
            .setStyle("SECONDARY")
            .setEmoji("➡️")
        );
      }
      components.push(row);
    }

    const mmRow = new MessageActionRow();
    mmRow.addComponents(
      new MessageButton()
        .setCustomId(`yazigpt_multimodal_${channel.id}`)
        .setLabel("Multimodal")
        .setStyle("PRIMARY")
        .setEmoji("🧠"),
      new MessageButton()
        .setCustomId(`yazigpt_history_${channel.id}`)
        .setLabel("History")
        .setStyle("SECONDARY")
        .setEmoji("📜")
    );
    components.push(mmRow);

    // embed gönder
    let sent;
    try {
      sent = await channel.send({ embeds: [embed], components });
      hist.lastEmbedMessageId = sent.id;
      progressiveEditEmbed(sent, embed, fullText, 10, 150);
    } catch (e) {
      console.error("Embed gönderilemedi:", e);
      return safeMessageReply(msg, "Embed gönderilirken hata oluştu.");
    }
  });

  // INTERACTION CREATE
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    const cid = interaction.customId;

    // ---------- SUGGESTION BUTTON ----------
    if (cid.startsWith("yazigpt_sug_")) {
      const parts = cid.split("_");
      const channelId = parts[2];
      if (channelId !== interaction.channel.id)
        return safeInteractionRespond(interaction, {
          content: "Bu düğme bu kanalda geçerli değil.",
          ephemeral: true,
        });

      const hist = conversationHistories[interaction.channel.id];
      if (!hist)
        return safeInteractionRespond(interaction, {
          content: "Bu düğme süresi dolmuş.",
          ephemeral: true,
        });

      const suggestion = hist.suggestionsMap[cid];
      if (!suggestion)
        return safeInteractionRespond(interaction, {
          content: "Öneri artık geçerli değil.",
          ephemeral: true,
        });

      // ACK hemen (deferUpdate) — uzun işlem yapacağız
      await safeDefer(interaction);

      // webhook ile suggestion'ı gönder (kullanıcıymış gibi)
      try {
        const webhookClient = new WebhookClient({
          id: hist.webhookId,
          token: hist.webhookToken,
        });
        const displayName = interaction.member
          ? interaction.member.displayName
          : interaction.user.username;
        await webhookClient.send({
          content: suggestion,
          username: displayName,
          avatarURL: interaction.user.displayAvatarURL({ format: "png" }),
        });
      } catch (e) {
        console.warn("Webhook hatası:", e);
        await interaction.followUp({
          content: `${interaction.user}: ${suggestion}`,
          ephemeral: false,
        });
      }

      // AI çağrısı için mesaj dizisini hazırla
      let modelToUse =
        hist.defaultMode === "deepseek" ? DEEP_MODEL : DEFAULT_MODEL;
      if (hist.defaultMode === "web") modelToUse = DEFAULT_MODEL;

      const modeForThis =
        hist.currentModeForNextMessage || hist.defaultMode || "normal";
      if (!hist.toggleActive) delete hist.currentModeForNextMessage;
      if (modeForThis === "deepseek") modelToUse = DEEP_MODEL;

      let messagesToSend;
      if (hist.keepHistory) {
        hist.messages.push({ role: "user", content: suggestion });
        messagesToSend = [...hist.messages];
      } else {
        const system = hist.messages.find((m) => m.role === "system");
        messagesToSend = [];
        if (system) messagesToSend.push(system);
        messagesToSend.push({ role: "user", content: suggestion });
      }

      if (modeForThis === "web") {
        try {
          const webSummary = await webSearchAndSummarize(
            config.SERPER_API_KEY,
            suggestion
          );
          if (webSummary)
            messagesToSend.push({
              role: "system",
              content: `WEB_ARAMA_SONUÇLARI:\n${webSummary}`,
            });
        } catch (e) {
          console.warn("Web arama hatası (suggestion):", e.message);
        }
      }

      try {
        await interaction.channel.sendTyping();
      } catch (e) {}

      // AI çağrısı
      let aiResp;
      try {
        aiResp = await fetchChatFromOpenRouter(
          process.env.OPENROUTER_API_KEY ||
            interaction.client?.config?.OPENROUTER_API_KEY,
          messagesToSend,
          modelToUse
        );
      } catch (e) {
        console.error("OpenRouter hata (suggestion):", e);
        return interaction.followUp({ content: "AI servisine ulaşılamadı.", ephemeral: true });
      }

      const text = aiResp.text;
      let suggestions = aiResp.suggestions || [];

      // deepseek ise suggestion'ları DEFAULT_MODEL ile yeniden al
      if (modelToUse === DEEP_MODEL) {
        try {
          const suggPrompt = [
            {
              role: "system",
              content:
                'Kısa 3 devam önerisi üret ve JSON içinde önerileri döndür: ```json{ "suggestions": ["...","...","..."] }```',
            },
            {
              role: "user",
              content: `Kontekst: ${text}\nLütfen 3 kısa devam önerisi üret.`,
            },
          ];
          const suggResp = await fetchChatFromOpenRouter(
            process.env.OPENROUTER_API_KEY ||
              interaction.client?.config?.OPENROUTER_API_KEY,
            suggPrompt,
            DEFAULT_MODEL
          );
          if (suggResp && suggResp.suggestions && suggResp.suggestions.length)
            suggestions = suggResp.suggestions;
        } catch (e) {
          console.warn("Suggestions regen hata (suggestion button):", e.message);
        }
      }

      if (hist.keepHistory) hist.messages.push({ role: "assistant", content: text });
      hist.lastModelUsed = modelToUse;

      // Yeni embed gönder (kullanıcı istemişti)
      const embed = new MessageEmbed()
        .setColor("#57F287")
        .setAuthor({
          name: botNameLocal,
          iconURL: interaction.client.user.displayAvatarURL(),
        })
        .setDescription("...")
        .addFields({ name: "Model", value: modelToUse, inline: true })
        .setTimestamp()
        .setFooter({
          text: `✨ ${botNameLocal} • Yapay Zeka destekli yanıt • Model: ${modelToUse}`,
          iconURL: interaction.client.user.displayAvatarURL(),
        });

      const components = [];
      if (suggestions.length > 0) {
        const row = new MessageActionRow();
        for (let i = 0; i < Math.min(3, suggestions.length); i++) {
          const newCid = `yazigpt_sug_${interaction.channel.id}_${Date.now()}_${i}`;
          hist.suggestionsMap[newCid] = suggestions[i];
          row.addComponents(
            new MessageButton()
              .setCustomId(newCid)
              .setLabel(
                suggestions[i].length > 80
                  ? suggestions[i].slice(0, 77) + "..."
                  : suggestions[i]
              )
              .setStyle("SECONDARY")
              .setEmoji("➡️")
          );
        }
        components.push(row);
      }
      const mmRow = new MessageActionRow();
      mmRow.addComponents(
        new MessageButton()
          .setCustomId(`yazigpt_multimodal_${interaction.channel.id}`)
          .setLabel("Multimodal")
          .setStyle("PRIMARY")
          .setEmoji("🧠"),
        new MessageButton()
          .setCustomId(`yazigpt_history_${interaction.channel.id}`)
          .setLabel("History")
          .setStyle("SECONDARY")
          .setEmoji("📜")
      );
      components.push(mmRow);

      const sent = await interaction.channel.send({
        embeds: [embed],
        components,
      });
      hist.lastEmbedMessageId = sent.id;
      progressiveEditEmbed(sent, embed, text, 10, 150);

      return;
    }

    // ---------- MULTIMODAL BUTTON ----------
    if (cid.startsWith("yazigpt_multimodal_")) {
      const parts = cid.split("_");
      const channelId = parts[2];
      if (channelId !== interaction.channel.id)
        return safeInteractionRespond(interaction, {
          content: "Bu düğme burada geçerli değil.",
          ephemeral: true,
        });

      const hist = conversationHistories[interaction.channel.id];
      if (!hist)
        return safeInteractionRespond(interaction, {
          content: "Bu düğme artık geçerli değil.",
          ephemeral: true,
        });

      // ACK immediately
      await safeDefer(interaction);

      // get last embed message if any
      let lastMsg = null;
      try {
        if (hist.lastEmbedMessageId)
          lastMsg = await interaction.channel.messages.fetch(hist.lastEmbedMessageId);
      } catch (e) {}

      // Save current embed snapshot to restore on history-close
      try {
        if (lastMsg) {
          hist._savedEmbedState = {
            embeds: lastMsg.embeds ? lastMsg.embeds.map(e => e) : null,
            components: lastMsg.components ? lastMsg.components : null,
            messageId: lastMsg.id,
          };
        }
      } catch (e) {}

      const modalRow = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(`yazigpt_mode_deepseek_${interaction.channel.id}`)
          .setLabel(hist.defaultMode === "deepseek" ? "🚫 Normal Moda Dön" : "⚡ Düşünme Modu")
          .setStyle(hist.defaultMode === "deepseek" ? "SUCCESS" : "SECONDARY")
          .setEmoji("⚡"),
        new MessageButton()
          .setCustomId(`yazigpt_mode_web_${interaction.channel.id}`)
          .setLabel(hist.defaultMode === "web" ? "🚫 Normal Moda Dön" : "🌐 Web Arama Modu")
          .setStyle(hist.defaultMode === "web" ? "SUCCESS" : "SECONDARY")
          .setEmoji("🌐"),
        new MessageButton()
          .setCustomId(`yazigpt_mode_toggle_${interaction.channel.id}`)
          .setLabel(hist.toggleActive ? "🔁 Toggle: Açık" : "🔁 Toggle: Kapalı")
          .setStyle(hist.toggleActive ? "SUCCESS" : "SECONDARY")
          .setEmoji("🔁")
      );

      // Edit the last embed to show controls if possible, otherwise ephemeral followUp
      try {
        if (lastMsg) {
          const embed = lastMsg.embeds[0] || new MessageEmbed().setDescription("...");
          await lastMsg.edit({ embeds: [embed], components: [modalRow] });
          return interaction.followUp({ content: "Multimodal kontroller açıldı (embed güncellendi).", ephemeral: true });
        } else {
          return interaction.followUp({ content: "Multimodal kontroller (embed bulunamadı — ephemeral).", components: [modalRow], ephemeral: true });
        }
      } catch (e) {
        console.warn("Embed edit hatası (multimodal):", e);
        return interaction.followUp({ content: "Multimodal açılırken hata oluştu.", ephemeral: true });
      }
    }

    // ---------- MULTIMODAL MODE BUTTONS ----------
    if (cid.startsWith("yazigpt_mode_")) {
      const parts = cid.split("_");
      const action = parts[2];
      const channelId = parts[3];
      if (channelId !== interaction.channel.id)
        return safeInteractionRespond(interaction, { content: "Bu düğme burada geçerli değil.", ephemeral: true });

      const hist = conversationHistories[interaction.channel.id];
      if (!hist) return safeInteractionRespond(interaction, { content: "Kayıtlı kanal geçmişi bulunamadı.", ephemeral: true });

      // ACK
      await safeDefer(interaction);

      if (action === "toggle") {
        hist.toggleActive = !hist.toggleActive;
        // update the controls in saved embed if exists
        try {
          if (hist.lastEmbedMessageId) {
            const lastMsg = await interaction.channel.messages.fetch(hist.lastEmbedMessageId);
            const embed = lastMsg.embeds[0] || new MessageEmbed().setDescription("...");
            const row = new MessageActionRow().addComponents(
              new MessageButton()
                .setCustomId(`yazigpt_mode_deepseek_${interaction.channel.id}`)
                .setLabel(hist.defaultMode === "deepseek" ? "🚫 Normal Moda Dön" : "⚡ Düşünme Modu")
                .setStyle(hist.defaultMode === "deepseek" ? "SUCCESS" : "SECONDARY")
                .setEmoji("⚡"),
              new MessageButton()
                .setCustomId(`yazigpt_mode_web_${interaction.channel.id}`)
                .setLabel(hist.defaultMode === "web" ? "🚫 Normal Moda Dön" : "🌐 Web Arama Modu")
                .setStyle(hist.defaultMode === "web" ? "SUCCESS" : "SECONDARY")
                .setEmoji("🌐"),
              new MessageButton()
                .setCustomId(`yazigpt_mode_toggle_${interaction.channel.id}`)
                .setLabel(hist.toggleActive ? "🔁 Toggle: Açık" : "🔁 Toggle: Kapalı")
                .setStyle(hist.toggleActive ? "SUCCESS" : "SECONDARY")
                .setEmoji("🔁")
            );
            await lastMsg.edit({ embeds: [embed], components: [row] });
          }
        } catch (e) {
          console.warn("Embed edit (toggle) hata:", e);
        }

        return interaction.followUp({ content: `Toggle durumu: ${hist.toggleActive ? "Açık — seçilen moda kalıcı geçilecek" : "Kapalı — moda sadece bir sonraki mesaja uygulanacak"}`, ephemeral: true });
      }

      if (action === "deepseek" || action === "web") {
        // Kullanıcı multimodal'den model seçtiğinde -> bir sonraki mesaj yerine son kullanıcı mesajını al, seçilen modelle AI çağır, ve son embed'ı DÜZENLE
        const modelForResponse = action === "deepseek" ? DEEP_MODEL : DEFAULT_MODEL;

        // bul son user mesajı hist'ten ya da kanaldan
        let lastUserMessage = null;
        if (hist && hist.messages) {
          for (let i = hist.messages.length - 1; i >= 0; i--) {
            if (hist.messages[i].role === "user") {
              lastUserMessage = hist.messages[i].content;
              break;
            }
          }
        }

        if (!lastUserMessage) {
          try {
            const fetched = await interaction.channel.messages.fetch({ limit: 50 });
            const nonBot = Array.from(fetched.values()).filter(m => !m.author.bot);
            if (nonBot.length) {
              nonBot.sort((a,b)=>b.createdTimestamp - a.createdTimestamp);
              lastUserMessage = nonBot[0].content;
            }
          } catch (e) {
            console.warn("Kullanıcı mesajı alınamadı (multimodal model seçimi):", e.message);
          }
        }

        if (!lastUserMessage || !lastUserMessage.trim()) {
          return interaction.followUp({ content: "İşlenecek son kullanıcı mesajı bulunamadı.", ephemeral: true });
        }

        // build messages
        let messagesToSend = [];
        if (hist.keepHistory) {
          messagesToSend = [...hist.messages];
          messagesToSend.push({ role: "user", content: lastUserMessage });
        } else {
          const system = hist.messages.find((m)=>m.role==="system");
          if (system) messagesToSend.push(system);
          messagesToSend.push({ role: "user", content: lastUserMessage });
        }

        if (action === "web") {
          try {
            const webSummary = await webSearchAndSummarize(config.SERPER_API_KEY, lastUserMessage);
            if (webSummary) messagesToSend.push({ role: "system", content: `WEB_ARAMA_SONUÇLARI:\n${webSummary}` });
          } catch (e) { console.warn("Web arama hatası (multimodal immediate):", e.message); }
        }

        try { await interaction.channel.sendTyping(); } catch (e) {}

        // AI çağrısı
        let aiResp;
        try {
          aiResp = await fetchChatFromOpenRouter(
            process.env.OPENROUTER_API_KEY || interaction.client?.config?.OPENROUTER_API_KEY,
            messagesToSend,
            modelForResponse
          );
        } catch (e) {
          console.error("OpenRouter hata (multimodal immediate):", e);
          return interaction.followUp({ content: "AI servisine ulaşılamadı.", ephemeral: true });
        }

        let text = aiResp.text;
        let suggestions = aiResp.suggestions || [];

        // deepseek -> suggestions DEFAULT_MODEL ile regen et
        if (modelForResponse === DEEP_MODEL) {
          try {
            const suggPrompt = [
              {
                role: "system",
                content: 'Kısa 3 devam önerisi üret ve JSON içinde önerileri döndür: ```json{ "suggestions": ["...","...","..."] }```',
              },
              { role: "user", content: `Kontekst: ${text}\nLütfen 3 kısa devam önerisi üret.` }
            ];
            const suggResp = await fetchChatFromOpenRouter(process.env.OPENROUTER_API_KEY || interaction.client?.config?.OPENROUTER_API_KEY, suggPrompt, DEFAULT_MODEL);
            if (suggResp && suggResp.suggestions && suggResp.suggestions.length) suggestions = suggResp.suggestions;
          } catch (e) { console.warn("Suggestions regen hata (multimodal immediate):", e.message); }
        }

        if (hist.keepHistory) hist.messages.push({ role: "assistant", content: text });
        hist.lastModelUsed = modelForResponse;

        // Son embed'ı düzenle (varsa)
        try {
          if (hist.lastEmbedMessageId) {
            const lastMsg = await interaction.channel.messages.fetch(hist.lastEmbedMessageId);
            const embed = lastMsg.embeds[0] || new MessageEmbed().setDescription("...");
            embed.setFooter({
              text: `✨ ${botNameLocal} • Yapay Zeka destekli yanıt • Model: ${modelForResponse}`,
              iconURL: interaction.client.user.displayAvatarURL(),
            });

            // yeni component'ları kur
            const newComponents = [];
            if (suggestions.length > 0) {
              const row = new MessageActionRow();
              for (let i = 0; i < Math.min(3, suggestions.length); i++) {
                const newCid = `yazigpt_sug_${interaction.channel.id}_${Date.now()}_${i}`;
                hist.suggestionsMap[newCid] = suggestions[i];
                row.addComponents(
                  new MessageButton()
                    .setCustomId(newCid)
                    .setLabel(suggestions[i].length > 80 ? suggestions[i].slice(0,77)+"..." : suggestions[i])
                    .setStyle("SECONDARY")
                    .setEmoji("➡️")
                );
              }
              newComponents.push(row);
            }
            const mmRow = new MessageActionRow();
            mmRow.addComponents(
              new MessageButton().setCustomId(`yazigpt_multimodal_${interaction.channel.id}`).setLabel("Multimodal").setStyle("PRIMARY").setEmoji("🧠"),
              new MessageButton().setCustomId(`yazigpt_history_${interaction.channel.id}`).setLabel("History").setStyle("SECONDARY").setEmoji("📜")
            );
            newComponents.push(mmRow);

            // edit message then progressively reveal
            const edited = await lastMsg.edit({ embeds: [embed], components: newComponents });
            progressiveEditEmbed(edited, embed, text, 10, 150);
            return interaction.followUp({ content: "Seçilen model ile yanıt eklendi (embed düzenlendi).", ephemeral: true });
          } else {
            // fallback: yeni embed gönder
            const embed2 = new MessageEmbed()
              .setColor("#57F287")
              .setAuthor({ name: botNameLocal, iconURL: interaction.client.user.displayAvatarURL() })
              .setDescription("...")
              .addFields({ name: "Model", value: modelForResponse, inline: true })
              .setTimestamp()
              .setFooter({ text: `✨ ${botNameLocal} • Yapay Zeka destekli yanıt • Model: ${modelForResponse}`, iconURL: interaction.client.user.displayAvatarURL() });

            const components = [];
            if (suggestions.length > 0) {
              const row = new MessageActionRow();
              for (let i = 0; i < Math.min(3, suggestions.length); i++) {
                const newCid = `yazigpt_sug_${interaction.channel.id}_${Date.now()}_${i}`;
                hist.suggestionsMap[newCid] = suggestions[i];
                row.addComponents(
                  new MessageButton().setCustomId(newCid).setLabel(suggestions[i].length > 80 ? suggestions[i].slice(0,77)+"..." : suggestions[i]).setStyle("SECONDARY").setEmoji("➡️")
                );
              }
              components.push(row);
            }
            const mmRow2 = new MessageActionRow();
            mmRow2.addComponents(
              new MessageButton().setCustomId(`yazigpt_multimodal_${interaction.channel.id}`).setLabel("Multimodal").setStyle("PRIMARY").setEmoji("🧠"),
              new MessageButton().setCustomId(`yazigpt_history_${interaction.channel.id}`).setLabel("History").setStyle("SECONDARY").setEmoji("📜")
            );
            components.push(mmRow2);

            const sent = await interaction.channel.send({ embeds: [embed2], components });
            hist.lastEmbedMessageId = sent.id;
            progressiveEditEmbed(sent, embed2, text, 10, 150);
            return interaction.followUp({ content: "Seçilen model ile yanıt gönderildi.", ephemeral: true });
          }
        } catch (e) {
          console.warn("Embed düzenlenemedi (multimodal immediate):", e);
          return interaction.followUp({ content: "Embed düzenlenirken hata oluştu.", ephemeral: true });
        }
      }
    }

    // ---------- HISTORY BUTTON ----------
    if (cid.startsWith("yazigpt_history_")) {
      const parts = cid.split("_");
      const channelId = parts[2];
      if (channelId !== interaction.channel.id)
        return safeInteractionRespond(interaction, { content: "Bu düğme burada geçerli değil.", ephemeral: true });

      const hist = conversationHistories[interaction.channel.id];
      if (!hist) return safeInteractionRespond(interaction, { content: "Geçmiş bulunamadı.", ephemeral: true });

      // kaydet embed snapshot
      try {
        if (hist.lastEmbedMessageId) {
          const msg = await interaction.channel.messages.fetch(hist.lastEmbedMessageId);
          hist._savedEmbedState = {
            embeds: msg.embeds ? msg.embeds.map(e => e) : null,
            components: msg.components ? msg.components : null,
            messageId: msg.id,
          };
        }
      } catch (e) {}

      const userId = interaction.user.id;
      if (typeof hist.historyPageByUser[userId] === "undefined")
        hist.historyPageByUser[userId] = 0;
      const page = hist.historyPageByUser[userId];

      // hemen cevap ver (ephemeral)
      await safeInteractionRespond(interaction, { content: "Geçmiş gösteriliyor...", ephemeral: true });
      await sendHistoryPage(interaction, hist, page);
      return;
    }

    // ---------- HISTORY NAV (prev/next/close/...) ----------
    if (cid.startsWith("yazigpt_histnav_")) {
      const parts = cid.split("_");
      const channelId = parts[2];
      const userId = parts[3];
      const cmd = parts[4];
      let currentPage = Number(parts[5]) || 0;

      if (interaction.user.id !== userId)
        return safeInteractionRespond(interaction, { content: "Bu arayüz sadece butona basan kullanıcı için geçerli.", ephemeral: true });

      const hist = conversationHistories[channelId];
      if (!hist) return safeInteractionRespond(interaction, { content: "Geçmiş bulunamadı.", ephemeral: true });

      const perPage = 10;
      const totalPages = Math.max(1, Math.ceil(Math.max(0, hist.messages.length) / perPage));

      if (cmd === "prev") currentPage = Math.max(0, currentPage - 1);
      if (cmd === "next") currentPage = Math.min(totalPages - 1, currentPage + 1);
      if (cmd === "prev10") currentPage = Math.max(0, currentPage - 10);
      if (cmd === "next10") currentPage = Math.min(totalPages - 1, currentPage + 10);
      if (cmd === "close") {
        // restore saved embed if varsa
        try {
          if (hist._savedEmbedState && hist._savedEmbedState.messageId) {
            const lastMsg = await interaction.channel.messages.fetch(hist._savedEmbedState.messageId);
            const embeds = hist._savedEmbedState.embeds || [];
            const components = hist._savedEmbedState.components || [];
            await lastMsg.edit({ embeds, components });
            hist._savedEmbedState = null;
            return safeInteractionRespond(interaction, { content: "History kapatıldı ve önceki embed geri yüklendi.", ephemeral: true });
          }
        } catch (e) {
          console.warn("History close - eski embed geri yüklenemedi:", e);
        }
        return safeInteractionRespond(interaction, { content: "History kapatıldı.", ephemeral: true });
      }

      hist.historyPageByUser[userId] = currentPage;
      // reply ephemeral/update
      return sendHistoryPage(interaction, hist, currentPage);
    }

    // ---------- HISTORY EDIT (edit flow + delete option) ----------
    if (cid.startsWith("yazigpt_histedit_")) {
      const parts = cid.split("_");
      const channelId = parts[2];
      const userId = parts[3];
      if (interaction.user.id !== userId)
        return safeInteractionRespond(interaction, { content: "Bu arayüz sadece butona basan kullanıcı için geçerli.", ephemeral: true });

      const hist = conversationHistories[channelId];
      if (!hist) return safeInteractionRespond(interaction, { content: "Geçmiş bulunamadı.", ephemeral: true });

      // instructions + buttons (Delete / Edit)
      const row = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(`yazigpt_histdelete_${channelId}_${userId}`)
          .setLabel("🗑️ Delete index")
          .setStyle("DANGER"),
        new MessageButton()
          .setCustomId(`yazigpt_histedit_send_${channelId}_${userId}`)
          .setLabel("✏️ Edit (gönder)")
          .setStyle("PRIMARY")
      );

      await safeInteractionRespond(interaction, {
        content:
          "Lütfen düzenleme için şu formatta bir mesaj gönder: `index | role | yeni metin`\nÖrnek: `5 | assistant | Bu cümle artık şu şekilde.`\n(Veya silmek için 'Delete index' butonuna basın). (15 saniye içinde gönder)",
        components: [row],
        ephemeral: true,
      });

      // baskı: bir sonraki kullanıcının mesajını yakala, ama AI çağırma
      hist.suppressUserMessageCollector = true;
      const filter = (m) => m.author.id === interaction.user.id;
      const collector = interaction.channel.createMessageCollector({ filter, time: 15000, max: 1 });

      collector.on("collect", (m) => {
        const content = m.content;
        const parts = content.split("|").map((s) => s.trim());
        if (parts.length < 3) {
          hist.suppressUserMessageCollector = false;
          return interaction.followUp({ content: "Yanlış format. İşlem iptal edildi.", ephemeral: true });
        }
        const idx = Number(parts[0]);
        const role = parts[1];
        const newText = parts.slice(2).join("|").trim();
        if (isNaN(idx) || !["user", "assistant", "system"].includes(role)) {
          hist.suppressUserMessageCollector = false;
          return interaction.followUp({ content: "Geçersiz index veya role. İptal edildi.", ephemeral: true });
        }
        if (!hist.messages[idx]) {
          hist.suppressUserMessageCollector = false;
          return interaction.followUp({ content: "Geçersiz index.", ephemeral: true });
        }

        hist.messages[idx] = { role, content: newText };
        hist.suppressUserMessageCollector = false;
        return interaction.followUp({ content: `Mesaj #${idx} düzenlendi.`, ephemeral: true });
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          hist.suppressUserMessageCollector = false;
          interaction.followUp({ content: "Zaman aşımı — düzenleme iptal edildi.", ephemeral: true });
        }
      });

      return;
    }

    // ---------- HISTORY DELETE BUTTON (separate) ----------
    if (cid.startsWith("yazigpt_histdelete_")) {
      const parts = cid.split("_");
      const channelId = parts[2];
      const userId = parts[3];
      if (interaction.user.id !== userId)
        return safeInteractionRespond(interaction, { content: "Bu arayüz sadece butona basan kullanıcı için geçerli.", ephemeral: true });

      const hist = conversationHistories[channelId];
      if (!hist) return safeInteractionRespond(interaction, { content: "Geçmiş bulunamadı.", ephemeral: true });

      await safeDefer(interaction);
      await interaction.followUp({ content: "Silmek istediğiniz mesajın index'ini sadece sayı olarak gönderin (15 saniye).", ephemeral: true });

      hist.suppressUserMessageCollector = true;
      const filter = (m) => m.author.id === interaction.user.id;
      const collector = interaction.channel.createMessageCollector({ filter, time: 15000, max: 1 });

      collector.on("collect", (m) => {
        const idx = Number(m.content.trim());
        if (isNaN(idx) || !hist.messages[idx]) {
          hist.suppressUserMessageCollector = false;
          return interaction.followUp({ content: "Geçersiz index veya mesaj bulunamadı. İşlem iptal edildi.", ephemeral: true });
        }
        hist.messages.splice(idx, 1);
        hist.suppressUserMessageCollector = false;
        return interaction.followUp({ content: `Mesaj #${idx} silindi.`, ephemeral: true });
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          hist.suppressUserMessageCollector = false;
          interaction.followUp({ content: "Zaman aşımı — silme iptal edildi.", ephemeral: true });
        }
      });

      return;
    }

    // other buttons ignored
  });
}

// progressive edit embed
async function progressiveEditEmbed(messageOrMessageObj, baseEmbed, fullText, steps = 10, intervalMs = 300, components = null) {
  const totalLen = fullText.length;
  const partLen = Math.max(1, Math.ceil(totalLen / steps));
  let current = 0;

  const firstChunk = fullText.slice(0, partLen);
  baseEmbed.setDescription(firstChunk || " ");
  try {
    await messageOrMessageObj.edit({ embeds: [baseEmbed], components });
  } catch (e) {}

  const timer = setInterval(async () => {
    current++;
    const upto = Math.min(totalLen, partLen * (current + 1));
    const chunk = fullText.slice(0, upto);
    baseEmbed.setDescription(chunk || " ");
    try {
      await messageOrMessageObj.edit({ embeds: [baseEmbed], components });
    } catch (e) {}
    if (upto >= totalLen) clearInterval(timer);
  }, intervalMs);
  return;
}

// send history page ephemeral (safe)
async function sendHistoryPage(interactionOrInteractionReplyTarget, hist, page = 0) {
  const messages = hist.messages || [];
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(Math.max(0, messages.length) / perPage));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);

  const start = safePage * perPage;
  const slice = messages.slice(start, start + perPage);

  const lines = slice.map((m, i) => {
    const idx = start + i;
    return `#${idx} [${m.role}] ${m.content.length > 200 ? m.content.slice(0, 200) + "..." : m.content}`;
  }) || ["Geçmiş boş."];

  const embed = new MessageEmbed()
    .setTitle(`Geçmiş — sayfa ${safePage + 1}/${totalPages}`)
    .setDescription(lines.join("\n\n"))
    .setFooter({ text: `Toplam ${messages.length} mesaj • Model: ${hist.lastModelUsed || "unknown"}` })
    .setTimestamp();

  // dynamic buttons
  const navRow = new MessageActionRow();
  if (safePage > 9)
    navRow.addComponents(new MessageButton().setCustomId(`yazigpt_histnav_${interactionOrInteractionReplyTarget.channel.id}_${interactionOrInteractionReplyTarget.user.id}_prev10_${safePage}`).setLabel("<< 10").setStyle("SECONDARY"));
  if (safePage > 0)
    navRow.addComponents(new MessageButton().setCustomId(`yazigpt_histnav_${interactionOrInteractionReplyTarget.channel.id}_${interactionOrInteractionReplyTarget.user.id}_prev_${safePage}`).setLabel("← 1").setStyle("SECONDARY"));
  if (safePage < totalPages - 1)
    navRow.addComponents(new MessageButton().setCustomId(`yazigpt_histnav_${interactionOrInteractionReplyTarget.channel.id}_${interactionOrInteractionReplyTarget.user.id}_next_${safePage}`).setLabel("1 →").setStyle("SECONDARY"));
  if (safePage < totalPages - 10)
    navRow.addComponents(new MessageButton().setCustomId(`yazigpt_histnav_${interactionOrInteractionReplyTarget.channel.id}_${interactionOrInteractionReplyTarget.user.id}_next10_${safePage}`).setLabel("10 →>").setStyle("SECONDARY"));

  const actionRow2 = new MessageActionRow().addComponents(
    new MessageButton().setCustomId(`yazigpt_histedit_${interactionOrInteractionReplyTarget.channel.id}_${interactionOrInteractionReplyTarget.user.id}_${safePage}`).setLabel("✏️ Edit").setStyle("PRIMARY"),
    new MessageButton().setCustomId(`yazigpt_histnav_${interactionOrInteractionReplyTarget.channel.id}_${interactionOrInteractionReplyTarget.user.id}_close_${safePage}`).setLabel("❌ Close").setStyle("DANGER")
  );

  const rows = [];
  if (navRow.components && navRow.components.length > 0) rows.push(navRow);
  if (actionRow2.components && actionRow2.components.length > 0) rows.push(actionRow2);

  try {
    // if interaction object has update/reply -> use followUp if already acknowledged
    if (interactionOrInteractionReplyTarget.update) {
      // interaction.update is risky (may be expired). Use followUp instead.
      await interactionOrInteractionReplyTarget.followUp({ embeds: [embed], components: rows, ephemeral: true });
    } else if (interactionOrInteractionReplyTarget.reply) {
      await interactionOrInteractionReplyTarget.reply({ embeds: [embed], components: rows, ephemeral: true });
    } else {
      await interactionOrInteractionReplyTarget.followUp({ embeds: [embed], components: rows, ephemeral: true });
    }
  } catch (e) {
    try {
      await interactionOrInteractionReplyTarget.followUp({ embeds: [embed], components: rows, ephemeral: true });
    } catch (err) {
      console.error("History view gönderilemedi:", err);
    }
  }
}

// --- OpenRouter çağrısı ---
async function fetchChatFromOpenRouter(apiKey, messages, model = DEFAULT_MODEL) {
  if (!apiKey) throw new Error("OpenRouter API anahtarı yok.");
  const payload = { model, messages, max_tokens: 1200, temperature: 0.8 };

  const res = await axios.post(OPENROUTER_URL, payload, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    timeout: 40000,
  });

  const data = res.data;
  let content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || null;
  if (!content) throw new Error("AI yanıtı beklenmedik formatta geldi.");

  // JSON suggestions parse
  let suggestions = [];
  try {
    const match = content.match(/```json([\s\S]*?)```/);
    if (match) {
      const json = JSON.parse(match[1]);
      if (json.suggestions && Array.isArray(json.suggestions)) suggestions = json.suggestions;
      content = content.replace(/```json([\s\S]*?)```/, "").trim();
    }
  } catch (e) {
    console.warn("Suggestions parse hatası:", e.message);
  }

  return { text: content.trim(), suggestions };
}

// --- Serper web search (basit) ---
async function webSearchAndSummarize(serperKey, query) {
  if (!serperKey) throw new Error("SERPER_API_KEY tanımlı değil.");
  try {
    const endpoint = "https://google.serper.dev/search";
    const res = await axios.get(endpoint, { params: { q: query, num: 5 }, headers: { "X-API-KEY": serperKey }, timeout: 15000 });
    const data = res.data;
    const snippets = [];
    if (data?.organic) {
      for (const item of data.organic.slice(0, 5)) {
        if (item.snippet) snippets.push(`- ${item.title || item.link}\n  ${item.snippet}`);
        else snippets.push(`- ${item.title || item.link}`);
      }
    } else if (data?.organic_results) {
      for (const item of data.organic_results.slice(0, 5)) {
        if (item.snippet) snippets.push(`- ${item.title || item.link}\n  ${item.snippet}`);
        else snippets.push(`- ${item.title || item.link}`);
      }
    }
    return snippets.length ? snippets.join("\n\n") : "Arama sonucu bulunamadı.";
  } catch (e) {
    console.warn("Serper arama hatası:", e.message);
    return null;
  }
}

// help export
module.exports.help = {
  name: "yazıgpt",
  aliases: [],
  usage: "yazıgpt <create|restart|close>",
  description: `${botname} ile yazılı modda sohbet gerçekleştirir.`,
  category: "Araçlar",
  cooldown: 5,
};
