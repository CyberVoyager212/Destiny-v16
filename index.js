const autoTranslate = require("./utils/autoTranslate");
autoTranslate.patchAll(); // patch uygula

require("events").EventEmitter.defaultMaxListeners = 400;
process.setMaxListeners(400);

const { Client, Collection, Intents } = require("discord.js");
const fs = require("fs");
const { QuickDB } = require("quick.db");
const express = require("express");

// Config dosyası (token, prefix, admin listesi vs.)
const config = require("./botConfig.js");
const debugHandler = require("./events/debug");
const items = require("./utils/items.js");

// Yeni client örneği, gerekli intentlerle
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});
client.setMaxListeners(200);

// Global koleksiyonlar
client.commands = new Collection();
client.aliases = new Collection();
client.games = new Map();
// QuickDB veritabanı örneği
const db = new QuickDB();
client.db = db; // Client'a DB ataması yapıldı

// Basit ekonomi yöneticisi
client.eco = {
  async fetchMoney(userId) {
    const value = await db.get(`money_${userId}`);
    return Number(value) || 0;
  },
  async addMoney(userId, amount) {
    const before = await this.fetchMoney(userId);
    const after = before + amount;
    await db.set(`money_${userId}`, after);
    return { before, after };
  },
  async removeMoney(userId, amount) {
    const before = await this.fetchMoney(userId);
    const after = Math.max(before - amount, 0);
    await db.set(`money_${userId}`, after);
    return { before, after };
  },
};

module.exports = { items };

// Config ataması
client.config = config;
global.botName = client.config?.botname || "";

// Eventleri dinamik yükleme
fs.readdir("./events/", (err, files) => {
  if (err) return console.error("Event dosyaları okunamadı:", err);
  files
    .filter((f) => f.endsWith(".js"))
    .forEach((file) => {
      const event = require(`./events/${file}`);
      const eventName = file.split(".")[0];
      client.on(eventName, (...args) => event(client, ...args));
    });
});

// Komutları dinamik yükleme
fs.readdir("./commands/", (err, files) => {
  if (err) return console.error("Komut dosyaları okunamadı:", err);
  files
    .filter((f) => f.endsWith(".js"))
    .forEach((file) => {
      const command = require(`./commands/${file}`);
      client.commands.set(command.help.name, command);
      if (Array.isArray(command.help.aliases)) {
        command.help.aliases.forEach((alias) => {
          client.aliases.set(alias, command.help.name);
        });
      }
    });
});

// Bot hazır olduğunda konsola bilgi ver
client.once("ready", () => {});
client.ws.on("debug", (info) => {
  debugHandler(client, { debug: info, shardId: client.shard?.ids[0] ?? 0 });
});
// Login işlemi
client.login(client.config.token).catch((err) => {
  console.error("Bot giriş yaparken hata oluştu:", err);
});
