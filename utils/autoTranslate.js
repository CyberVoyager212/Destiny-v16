// utils/autoTranslate.js
const {
  Interaction,
  Message,
  TextChannel,
  DMChannel,
  NewsChannel,
  ThreadChannel,
  MessageEmbed,
  WebhookClient,
} = require("discord.js");
const translate = require("translate-google");
const fs = require("fs");
const path = require("path");

// JSON dosya yolu
const filePath = path.join(__dirname, "autotranslateforusers.json");

// JSON yükleme / kaydetme (aynı)
function loadJSON() {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error("JSON yüklenemedi:", err);
    return {};
  }
}
function saveJSON(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
function getUserLang(userId) {
  const data = loadJSON();
  return data[userId] || null;
}
function setUserLang(userId, lang) {
  const data = loadJSON();
  data[userId] = lang;
  saveJSON(data);
}
function deleteUserLang(userId) {
  const data = loadJSON();
  delete data[userId];
  saveJSON(data);
}

// çeviri wrapper (aynı)
async function translateText(text, userId) {
  if (!text || typeof text !== "string") return text;

  const lang = getUserLang(userId);
  if (!lang) return text; // kullanıcı çeviri açmamışsa orijinali döndür

  try {
    const res = await translate(text, { to: lang });
    return typeof res === "string" ? res : res.text ?? text;
  } catch (err) {
    console.error("Çeviri hatası (text):", err);
    return text;
  }
}

// embed/components çevirisi (aynı)
async function translateEmbedObject(embedOriginal, userId) {
  const isInstance = embedOriginal instanceof MessageEmbed;
  const plain =
    typeof embedOriginal.toJSON === "function"
      ? embedOriginal.toJSON()
      : { ...embedOriginal };

  if (plain.title) plain.title = await translateText(plain.title, userId);
  if (plain.description)
    plain.description = await translateText(plain.description, userId);
  if (plain.footer && plain.footer.text)
    plain.footer.text = await translateText(plain.footer.text, userId);
  if (plain.author && plain.author.name)
    plain.author.name = await translateText(plain.author.name, userId);
  if (Array.isArray(plain.fields)) {
    for (const f of plain.fields) {
      if (f.name) f.name = await translateText(f.name, userId);
      if (f.value) f.value = await translateText(f.value, userId);
    }
  }

  if (isInstance) return new MessageEmbed(plain);
  return plain;
}

async function translateComponents(components, userId) {
  if (!components || !Array.isArray(components)) return components;

  const newRows = [];
  for (const row of components) {
    const newRow = JSON.parse(JSON.stringify(row));
    if (Array.isArray(newRow.components)) {
      for (const comp of newRow.components) {
        if (comp.label) comp.label = await translateText(comp.label, userId);
        if (comp.placeholder)
          comp.placeholder = await translateText(comp.placeholder, userId);
        if (Array.isArray(comp.options)) {
          for (const opt of comp.options) {
            if (opt.label) opt.label = await translateText(opt.label, userId);
            if (opt.description)
              opt.description = await translateText(opt.description, userId);
          }
        }
      }
    }
    newRows.push(newRow);
  }
  return newRows;
}

// ---------- Yeni yardımcı: hedef kullanıcıyı tespit et ----------
/**
 * options: gönderim seçenekleri (channel.send / message.edit etc.)
 * thisMessage: method'u çağıran mesaj örneği (varsa)
 * channel: target channel instance (varsa)
 *
 * Döndürülen: kullanıcı id'si veya null
 */
async function getTargetUserId({ options, thisMessage, channel }) {
  try {
    // 1) options içinde açıkça verildiyse kullan
    if (options && options.userId) return options.userId;

    // 2) options.reply içinde messageReference olabilir (farklı şekillerde gelebilir)
    const maybeRefId =
      options?.reply?.messageReference?.messageId ||
      options?.reply?.messageReference ||
      options?.reply?.messageId ||
      options?.messageReference?.messageId ||
      options?.messageReference;

    if (
      maybeRefId &&
      channel &&
      typeof channel.messages?.fetch === "function"
    ) {
      try {
        const ref = await channel.messages.fetch(maybeRefId).catch(() => null);
        if (ref && ref.author) return ref.author.id;
      } catch (err) {
        // fetch başarısız olabilir, devam edeceğiz
      }
    }

    // 3) thisMessage (örneğin edit edilen mesaj) bir referans içeriyorsa, referans edilen mesajın sahibini al
    if (thisMessage && thisMessage.reference && thisMessage.channel) {
      const refId = thisMessage.reference.messageId;
      if (refId) {
        try {
          const ref = await thisMessage.channel.messages
            .fetch(refId)
            .catch(() => null);
          if (ref && ref.author) return ref.author.id;
        } catch (err) {
          // ignore
        }
      }
    }

    // 4) kanalın son mesajı bir kullanıcı tarafından yazıldıysa onu al (basit fallback)
    if (
      channel &&
      channel.lastMessage &&
      channel.lastMessage.author &&
      !channel.lastMessage.author.bot
    ) {
      return channel.lastMessage.author.id;
    }

    return null;
  } catch (err) {
    console.error("getTargetUserId hata:", err);
    return null;
  }
}

// ana handler - artık userId doğrudan alıyoruz
async function handleOptions(options, userId) {
  if (!userId || !getUserLang(userId)) return options; // JSON’da yoksa çeviri yok

  if (typeof options === "string") return await translateText(options, userId);

  const newOptions = Object.assign({}, options);

  if (newOptions.content)
    newOptions.content = await translateText(newOptions.content, userId);

  if (newOptions.embeds && Array.isArray(newOptions.embeds)) {
    const translatedEmbeds = [];
    for (const emb of newOptions.embeds) {
      translatedEmbeds.push(await translateEmbedObject(emb, userId));
    }
    newOptions.embeds = translatedEmbeds;
  }

  if (newOptions.components) {
    newOptions.components = await translateComponents(
      newOptions.components,
      userId
    );
  }

  // Boş mesaj gönderilmesin
  if (
    (!newOptions.content || newOptions.content === "") &&
    (!newOptions.embeds || newOptions.embeds.length === 0) &&
    (!newOptions.components || newOptions.components.length === 0)
  ) {
    return null;
  }

  return newOptions;
}

/* =========================
   Patch'ler (gelişmiş)
   ========================= */
function patchAll() {
  // Interaction patch (var olan - korunuyor)
  if (Interaction && Interaction.prototype) {
    ["reply", "followUp", "editReply", "update"].forEach((fn) => {
      if (!Interaction.prototype[`_${fn}`])
        Interaction.prototype[`_${fn}`] = Interaction.prototype[fn];

      Interaction.prototype[fn] = async function (options) {
        try {
          // interaction'ların hedef kullanıcısı genelde interaction.user
          const userId =
            this.user?.id || this.member?.user?.id || this.author?.id || null;
          const newOptions = await handleOptions(options, userId);
          if (!newOptions) return;
          return this[`_${fn}`](newOptions);
        } catch (err) {
          console.error(`Çeviri hatası (interaction.${fn}):`, err);
          return this[`_${fn}`](options);
        }
      };
    });
  }

  // Message.reply patch (aynı)
  if (Message && Message.prototype) {
    if (!Message.prototype._reply)
      Message.prototype._reply = Message.prototype.reply;

    Message.prototype.reply = async function (options) {
      try {
        const userId = this.author?.id; // cevap verilen kullanıcının id'si
        const newOptions = await handleOptions(options, userId);
        if (!newOptions) return;
        return this._reply(newOptions);
      } catch (err) {
        console.error("Çeviri hatası (message.reply):", err);
        return this._reply(options);
      }
    };

    // Message.edit patch -> bot kendi mesajını düzenlediğinde çeviri uygulasın
    if (!Message.prototype._edit)
      Message.prototype._edit = Message.prototype.edit;

    Message.prototype.edit = async function (options) {
      try {
        // Hedef kullanıcıyı tespit et (örn. bot mesajının referans verdiği kullanıcı)
        const userId = await getTargetUserId({
          options,
          thisMessage: this,
          channel: this.channel,
        });
        const newOptions = await handleOptions(options, userId);
        if (!newOptions) return this._edit(options); // boş döndüyse orijinali yap
        return this._edit(newOptions);
      } catch (err) {
        console.error("Çeviri hatası (message.edit):", err);
        return this._edit(options);
      }
    };
  }

  // Channel patch (geliştirilmiş: reply.messageReference olursa referans mesajı fetch et)
  const channelClasses = [TextChannel, DMChannel, NewsChannel, ThreadChannel];
  for (const C of channelClasses) {
    if (!C || !C.prototype) continue;
    if (!C.prototype._send) C.prototype._send = C.prototype.send;

    C.prototype.send = async function (options) {
      try {
        // Önce hızlı fallback: options.userId ya da kanal bağlamından tahmin
        let userId = options?.userId || null;

        // Eğer options.reply içinde bir referans varsa onu kullanmaya çalış
        if (!userId) {
          const detected = await getTargetUserId({
            options,
            thisMessage: null,
            channel: this,
          });
          userId = detected || null;
        }

        const newOptions = await handleOptions(options, userId);
        if (!newOptions) return; // boşsa gönderme
        return this._send(newOptions);
      } catch (err) {
        console.error(`Çeviri hatası (send) ${C.name}:`, err);
        return this._send(options);
      }
    };
  }

  // WebhookClient.send patch (webhook ile yapılan gönderimler)
  if (WebhookClient && WebhookClient.prototype) {
    if (!WebhookClient.prototype._send)
      WebhookClient.prototype._send = WebhookClient.prototype.send;

    WebhookClient.prototype.send = async function (options) {
      try {
        // Webhook tarafından gönderilen mesajlar genelde bir kullanıcının yerine gönderildiği için
        // options.username/options.avatar gibi info olabilir; çeviri için options.userId varsa kullan
        let userId = options?.userId || null;
        // Webhook'larda referanslı gönderim varsa options?.reply olabilir
        if (!userId && this?.client && this.client.channels) {
          // zor bir fallback: eğer options.reference/messageReference varsa fetch dene (kısıtlı)
          // Burada kanal referansını bilmediğimiz için atlıyoruz — kullanıcının webhook kullanımına göre gerekiyorsa genişlet.
        }

        const newOptions = await handleOptions(options, userId);
        if (!newOptions) return;
        return this._send(newOptions);
      } catch (err) {
        console.error("Çeviri hatası (WebhookClient.send):", err);
        return this._send(options);
      }
    };
  }

  console.log(
    "✅ autoTranslate patch yüklendi (gelişmiş). Referanslı reply/edit ve webhook'lar için geliştirmeler eklendi."
  );
}

module.exports = {
  patchAll,
  getUserLang,
  setUserLang,
  deleteUserLang,
};
