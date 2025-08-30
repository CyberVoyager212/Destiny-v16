const { MessageEmbed } = require("discord.js");
const { items = [], valuableItems = [] } = require("../index.js"); // Eşyaları içe aktarma
const emojis = require("../emoji.json"); // emoji.json içe aktarma

// amount'a göre para emojisi döndüren yardımcı fonksiyon
function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

// Şehir çarpanı için normalize fonksiyonu (örn. "istanbul" -> "İstanbul")
function normalizeCity(city) {
  if (!city) return "";
  return (
    city.charAt(0).toLocaleUpperCase("tr-TR") +
    city.slice(1).toLocaleLowerCase("tr-TR")
  );
}

// Diğer yardımcı fonksiyonlar
const createProgressBar = (current, max, length = 10) => {
  const filledLength = Math.max(
    0,
    Math.min(length, Math.round((current / max) * length))
  );
  const bar = "█".repeat(filledLength) + "░".repeat(length - filledLength);
  return `[${bar}] **${current}/${max}**`;
};

const getMaxItemValue = (qualityLevel) => 500 + (qualityLevel - 1) * 10;
const getCollectableItems = (qualityLevel) =>
  items
    .concat(valuableItems)
    .filter((item) => item.value <= getMaxItemValue(qualityLevel));
const getCollectionTime = (cooldownTimeLevel) =>
  60 * 60 * 1000 + (cooldownTimeLevel - 1) * (0.25 * 60 * 60 * 1000);

exports.execute = async (client, message, args) => {
  try {
    const user = message.author;
    const inventoryKey = `inventory_${user.id}`;
    const maxLevel = 250;

    // Kullanıcı seviyelerini al
    const cooldownTimeLevel =
      (await client.db.get(`cooldownTime_${user.id}`)) || 1;
    const amountUpgradeLevel =
      (await client.db.get(`amountUpgrade_${user.id}`)) || 1;
    const qualityUpgradeLevel =
      (await client.db.get(`qualityUpgrade_${user.id}`)) || 1;
    const costUpgradeLevel = Math.min(
      (await client.db.get(`costUpgrade_${user.id}`)) || 1,
      10
    );

    // Temel hesaplamalar
    const gatheringCostPerMinute = Math.max(
      50 - 5 * (amountUpgradeLevel + costUpgradeLevel),
      10
    );
    const minCost = cooldownTimeLevel * 60 * gatheringCostPerMinute;
    const itemsCollected = 50 * amountUpgradeLevel;
    const collectableItems = getCollectableItems(qualityUpgradeLevel);
    const collectionTime = getCollectionTime(cooldownTimeLevel);
    const hours = Math.floor(collectionTime / (60 * 60 * 1000));
    const minutes = Math.floor(
      (collectionTime % (60 * 60 * 1000)) / (60 * 1000)
    );

    // "eşyalar" argümanı: toplanabilir eşyalar
    if (args[0] === "eşyalar") {
      const list = collectableItems
        .map(
          (item) =>
            `${item.emoji} **${item.name}** - Değer: **${
              item.value
            }** ${chooseEmoji(item.value)}`
        )
        .join("\n");
      const embed = new MessageEmbed()
        .setTitle("📜 Toplanabilir Eşyalar")
        .setColor("BLUE")
        .setDescription(list || "❌ **Toplanabilir eşya bulunmuyor!**")
        .setFooter("🔧 Geliştirmeler için: hb <süre|miktar|kalite|maliyet>")
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    // Para karşılığı botu çalıştırma
    if (args.length > 0 && !isNaN(args[0])) {
      const amountToSpend = parseInt(args[0], 10);
      if (amountToSpend < minCost) {
        return message.reply(
          `⚠️ Minimum **${minCost}** ${chooseEmoji(
            minCost
          )} harcamanız gerekiyor!`
        );
      }

      const userBalance = (await client.eco.fetchMoney(user.id)).amount;
      if (userBalance < amountToSpend) {
        return message.reply(
          `❌ Yetersiz bakiye! Mevcut: **${userBalance}** ${chooseEmoji(
            userBalance
          )}`
        );
      }

      await client.eco.removeMoney(user.id, amountToSpend);
      await message.reply(
        `⏳ **HuntBot ${amountToSpend} ${chooseEmoji(
          amountToSpend
        )}** çalıştırıldı! Toplama süresi: **${hours} saat ${minutes} dakika**...`
      );
      await new Promise((res) => setTimeout(res, collectionTime));

      // Eşya toplama
      const collected = [];
      for (let i = 0; i < itemsCollected; i++) {
        const rand =
          collectableItems[Math.floor(Math.random() * collectableItems.length)];
        collected.push(rand);
      }

      let inventory = (await client.db.get(inventoryKey)) || [];
      inventory = inventory.concat(collected);
      await client.db.set(inventoryKey, inventory);

      const embed = new MessageEmbed()
        .setTitle(`📦 ${user.tag} - Toplanan Eşyalar`)
        .setColor("GREEN")
        .setDescription(
          collected
            .map(
              (it) =>
                `${it.emoji} ${it.name} (**${it.value}** ${chooseEmoji(
                  it.value
                )})`
            )
            .join(", ") || "Hiçbir eşya toplanamadı."
        )
        .setFooter(
          "🔧 Geliştirme: hb <süre|miktar|kalite|maliyet>, eşyalar için: hb eşyalar"
        )
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    // Geliştirme işlemleri
    const upgradeFeature = async (type, amount) => {
      const key = `${type}_${user.id}`;
      let current = (await client.db.get(key)) || 1;
      let totalCost = 0;
      let newLevel = current;
      const balance = (await client.eco.fetchMoney(user.id)).amount;

      for (let i = 0; i < amount; i++) {
        const cost = newLevel * 250;
        if (totalCost + cost <= balance && newLevel < maxLevel) {
          totalCost += cost;
          newLevel++;
        } else break;
      }

      if (newLevel === current) {
        return `❌ Yetersiz bakiye veya maksimum seviyeye ulaşıldı! Mevcut: **${balance}** ${chooseEmoji(
          balance
        )}`;
      }
      await client.eco.removeMoney(user.id, totalCost);
      await client.db.set(key, newLevel);
      return `✅ **${type}** seviyesi artırıldı! Yeni seviye: **${newLevel}** 💰 Harcandı: **${totalCost}** ${chooseEmoji(
        totalCost
      )}`;
    };

    // Upgrade argüman kontrolü
    if (args.length === 2 && isNaN(args[0])) {
      const map = {
        süre: "cooldownTime",
        miktar: "amountUpgrade",
        kalite: "qualityUpgrade",
        maliyet: "costUpgrade",
      };
      const type = map[args[0].toLowerCase()];
      const amt = parseInt(args[1], 10);
      if (!type || isNaN(amt)) {
        return message.reply(
          "⚠️ Geçersiz geliştirme! Türler: süre, miktar, kalite, maliyet"
        );
      }
      const result = await upgradeFeature(type, amt);
      return message.reply(result);
    }

    // Geliştirme durumu tablosu
    const embed = new MessageEmbed()
      .setTitle(`📊 ${user.tag} - Geliştirme Durumu`)
      .setColor("GOLD")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: "⏳ Toplama Süresi",
          value: `${createProgressBar(
            cooldownTimeLevel,
            maxLevel
          )}\nSüre: **${hours} saat ${minutes} dakika**`,
          inline: true,
        },
        {
          name: "📦 Toplama Miktarı",
          value: `${createProgressBar(
            amountUpgradeLevel,
            maxLevel
          )}\nEşyalar: **${itemsCollected}**`,
          inline: true,
        },
        {
          name: "⭐ Eşya Kalitesi",
          value: `${createProgressBar(
            qualityUpgradeLevel,
            maxLevel
          )}\nMaks Değer: **${getMaxItemValue(
            qualityUpgradeLevel
          )}** ${chooseEmoji(getMaxItemValue(qualityUpgradeLevel))}`,
          inline: true,
        },
        {
          name: "💰 Maliyet",
          value: `${createProgressBar(
            costUpgradeLevel,
            10
          )}\nMaliyet: **${gatheringCostPerMinute}** ${chooseEmoji(
            gatheringCostPerMinute
          )}/dk\nMin: **${minCost}** ${chooseEmoji(minCost)}`,
          inline: false,
        }
      )
      .setFooter(
        "🔧 Geliştirme için: hb <süre|miktar|kalite|maliyet> , eşyalar: hb eşyalar"
      )
      .setTimestamp();
    return message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    return message.reply("❌ **Bir hata oluştu, lütfen tekrar deneyin!**");
  }
};

exports.help = {
  name: "huntbot",
  aliases: ["hb"],
  usage: "huntbot [para miktarı] | huntbot <süre|miktar|kalite|maliyet>",
  description:
    "Hedefli bir av sistemini başlatır ve çeşitli parametrelerle kontrol eder.",
  category: "Ekonomi",
  cooldown: 5,
};
