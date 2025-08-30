const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json"); // emoji.json içe aktar

// amount'a göre para emojisi döndüren yardımcı fonksiyon
function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message, args) => {
  let action = args[0];
  let userId = message.author.id;
  let moneyKey = `money_${userId}`;
  let housesKey = `houses_${userId}`;

  // 1) Kullanıcının parasını kontrol et (await ekledik)
  let userMoney = await client.eco.fetchMoney(userId);
  // 2) Kullanıcının evlerini dizi olarak al (await ekledik)
  let houses = (await client.db.get(housesKey)) || [];

  // Oxy hesabı
  let oxyId = client.config?.ownerId;
  let oxyKey = `money_${oxyId}`;
  let oxyMoney = (await client.db.get(oxyKey)) || 0;

  if (!action) {
    return message.channel.send(
      "❌ Lütfen bir işlem belirtin! (al, kiraya, kiracikabul, kirayareddet, kiratopla, sat, satkabul, satreddet, tablo)"
    );
  }

  // Ev tablosu
  if (action === "tablo") {
    return sendHouseTable(message, houses);
  }

  // Ev satın alma
  if (action === "al") {
    let size = parseFloat(args[1]);
    let city = args[2];
    let age = parseInt(args[3]);

    if (!size || !city || !age) {
      return message.channel.send(
        "❌ Lütfen evin m²'si, şehri ve yaşını belirtin. Örnek: `ev al 100 Istanbul 5`"
      );
    }

    let basePrice = size * 2000;
    let multiplier = getCityMultiplier(city);
    let price = Math.max(5000, basePrice * multiplier - age * 1000);

    if (houses.length > 0) {
      price = Math.floor(price * 1.25);
    }

    if (userMoney < price) {
      let emoji = chooseEmoji(userMoney);
      return message.channel.send(
        `❌ Yeterli paranız yok! Mevcut bakiye: **${userMoney.toLocaleString()}** ${emoji}`
      );
    }

    // Para aktarımı
    userMoney -= price;
    await client.db.set(moneyKey, userMoney);
    oxyMoney += price;
    await client.db.set(oxyKey, oxyMoney);

    // Yeni ev
    let newHouse = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      size,
      city,
      age,
      purchasePrice: price,
      rented: false,
      rentStart: null,
      lastRentCollection: null,
      agreedRent: null,
      rentOffer: null,
      saleOffer: null,
    };
    houses.push(newHouse);
    await client.db.set(housesKey, houses);

    let payEmoji = chooseEmoji(price);
    return message.channel.send(
      `✅ Ev satın alındı! Fiyat: **${price.toLocaleString()}** ${payEmoji} • Kalan bakiye: **${userMoney.toLocaleString()}** ${chooseEmoji(
        userMoney
      )} • Ev ID: **${newHouse.id}**`
    );
  }

  let houseId;
  const rawId = args[1];

  if (
    [
      "kiraya",
      "kiracikabul",
      "kirayareddet",
      "kiratopla",
      "sat",
      "satkabul",
      "satreddet",
    ].includes(action)
  ) {
    if (!rawId) {
      return message.channel.send("❌ Lütfen ev ID'sini belirtin!");
    }
    houseId = parseInt(rawId, 10);
    if (isNaN(houseId)) {
      return message.channel.send("❌ Geçersiz ev ID'si!");
    }
  }

  const houseIndex = houses.findIndex((h) => h.id === houseId);
  if (houseIndex === -1) {
    return message.channel.send("❌ Belirtilen ID'ye sahip ev bulunamadı!");
  }
  const house = houses[houseIndex];

  // Kiraya verme
  if (action === "kiraya") {
    if (house.rented) {
      return message.channel.send("❌ Bu ev zaten kirada!");
    }
    let offer = generateRentOffer(house);
    house.rentOffer = offer;
    houses[houseIndex] = house;
    await client.db.set(housesKey, houses);
    let emoji = chooseEmoji(offer);
    return message.channel.send(
      `🤖 Bot kira teklifi: **${offer.toLocaleString()}** ${emoji}. Kabul: \`ev kiracikabul ${
        house.id
      }\`, Reddet: \`ev kirayareddet ${house.id}\``
    );
  }

  // Kiracıyı kabul et
  if (action === "kiracikabul") {
    if (!house.rentOffer) {
      return message.channel.send("❌ Aktif bir kira teklifi yok!");
    }
    house.rented = true;
    house.agreedRent = house.rentOffer;
    house.rentStart = Date.now();
    house.lastRentCollection = Date.now();
    house.rentOffer = null;
    houses[houseIndex] = house;
    await client.db.set(housesKey, houses);
    let emoji = chooseEmoji(house.agreedRent);
    return message.channel.send(
      `✅ Kira teklifi kabul edildi. Günlük kira: **${house.agreedRent.toLocaleString()}** ${emoji}`
    );
  }

  // Kirayı reddet
  if (action === "kirayareddet") {
    if (!house.rentOffer) {
      return message.channel.send("❌ Aktif bir kira teklifi yok!");
    }
    let newOffer = generateRentOffer(house);
    house.rentOffer = newOffer;
    houses[houseIndex] = house;
    await client.db.set(housesKey, houses);
    let emoji = chooseEmoji(newOffer);
    return message.channel.send(
      `🤖 Yeni kira teklifi: **${newOffer.toLocaleString()}** ${emoji}. Kabul: \`ev kiracikabul ${
        house.id
      }\`, Reddet: \`ev kirayareddet ${house.id}\``
    );
  }

  // Kira toplama
  if (action === "kiratopla") {
    if (!house.rented || !house.agreedRent) {
      return message.channel.send(
        "❌ Bu ev kiraya verilmemiş veya kira başlamadı!"
      );
    }
    let now = Date.now();
    let last = house.lastRentCollection || house.rentStart;
    let daysPassed = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    if (daysPassed < 1) {
      return message.channel.send(
        "❌ Henüz kira toplamak için yeterli zaman geçmedi!"
      );
    }
    let income = daysPassed * house.agreedRent;
    house.lastRentCollection = now;
    houses[houseIndex] = house;
    await client.db.set(housesKey, houses);
    userMoney += income;
    await client.db.set(moneyKey, userMoney);
    let incomeEmj = chooseEmoji(income);
    return message.channel.send(
      `✅ **${income.toLocaleString()}** ${incomeEmj} kira toplandı (${daysPassed} gün).`
    );
  }

  // Ev satma
  if (action === "sat") {
    let offer = generateSaleOffer(house);
    house.saleOffer = offer;
    houses[houseIndex] = house;
    await client.db.set(housesKey, houses);
    let emoji = chooseEmoji(offer);
    return message.channel.send(
      `🤖 Bot satış teklifi: **${offer.toLocaleString()}** ${emoji}. Kabul: \`ev satkabul ${
        house.id
      }\`, Reddet: \`ev satreddet ${house.id}\``
    );
  }

  // Satışı kabul et
  if (action === "satkabul") {
    if (!house.saleOffer) {
      return message.channel.send("❌ Aktif bir satış teklifi yok!");
    }
    let salePrice = house.saleOffer;
    userMoney += salePrice;
    await client.db.set(moneyKey, userMoney);
    houses.splice(houseIndex, 1);
    await client.db.set(housesKey, houses);
    let emoji = chooseEmoji(salePrice);
    return message.channel.send(
      `✅ Ev satıldı! **${salePrice.toLocaleString()}** ${emoji} hesabınıza eklendi.`
    );
  }

  // Satışı reddet
  if (action === "satreddet") {
    if (!house.saleOffer) {
      return message.channel.send("❌ Aktif bir satış teklifi yok!");
    }
    let newOffer = generateSaleOffer(house);
    house.saleOffer = newOffer;
    houses[houseIndex] = house;
    await client.db.set(housesKey, houses);
    let emoji = chooseEmoji(newOffer);
    return message.channel.send(
      `🤖 Yeni satış teklifi: **${newOffer.toLocaleString()}** ${emoji}. Kabul: \`ev satkabul ${
        house.id
      }\`, Reddet: \`ev satreddet ${house.id}\``
    );
  }

  return message.channel.send("❌ Geçersiz işlem!");
};

// ——— Yardımcı Fonksiyonlar ——— //
function getCityMultiplier(city) {
  const cities = {
    Adana: 1.3,
    Adıyaman: 1.1,
    Afyonkarahisar: 1.1,
    Ağrı: 1.0,
    Aksaray: 1.1,
    Amasya: 1.0,
    Ankara: 1.8,
    Antalya: 1.6,
    Ardahan: 1.0,
    Artvin: 1.0,
    Aydın: 1.3,
    Balıkesir: 1.2,
    Bartın: 1.0,
    Batman: 1.1,
    Bayburt: 1.0,
    Bilecik: 1.1,
    Bingöl: 1.0,
    Bitlis: 1.0,
    Bolu: 1.1,
    Burdur: 1.0,
    Bursa: 1.5,
    Çanakkale: 1.2,
    Çankırı: 1.0,
    Çorum: 1.1,
    Denizli: 1.2,
    Diyarbakır: 1.1,
    Düzce: 1.1,
    Edirne: 1.1,
    Elazığ: 1.1,
    Erzincan: 1.0,
    Erzurum: 1.0,
    Eskişehir: 1.1,
    Gaziantep: 1.3,
    Giresun: 1.0,
    Gümüşhane: 1.0,
    Hakkari: 1.0,
    Hatay: 1.2,
    Iğdır: 1.0,
    Isparta: 1.1,
    İstanbul: 2.0,
    İzmir: 1.7,
    Kahramanmaraş: 1.2,
    Karabük: 1.0,
    Karaman: 1.0,
    Kars: 1.0,
    Kastamonu: 1.0,
    Kayseri: 1.2,
    Kırıkkale: 1.0,
    Kırklareli: 1.1,
    Kırşehir: 1.0,
    Kilis: 1.0,
    Kocaeli: 1.4,
    Konya: 1.2,
    Kütahya: 1.1,
    Malatya: 1.1,
    Manisa: 1.2,
    Mardin: 1.1,
    Mersin: 1.1,
    Muğla: 1.6,
    Muş: 1.0,
    Nevşehir: 1.2,
    Niğde: 1.1,
    Ordu: 1.1,
    Osmaniye: 1.1,
    Rize: 1.1,
    Sakarya: 1.3,
    Samsun: 1.2,
    Siirt: 1.0,
    Sinop: 1.0,
    Sivas: 1.0,
    Şanlıurfa: 1.1,
    Şırnak: 1.0,
    Tekirdağ: 1.3,
    Tokat: 1.1,
    Trabzon: 1.1,
    Tunceli: 1.0,
    Uşak: 1.0,
    Van: 1.1,
    Yalova: 1.2,
    Yozgat: 1.0,
    Zonguldak: 1.1,
  };
  return cities[city.toLowerCase()] || 1.0;
}

function generateRentOffer(house) {
  let baseRent = house.size * 10;
  let ageFactor = Math.max(0.5, 1 - house.age * 0.01);
  let offer = baseRent * ageFactor;
  offer *= 1 + (Math.random() - 0.5) * 0.1;
  return Math.round(offer);
}

function generateSaleOffer(house) {
  let variation = 1 + (Math.random() - 0.5) * 0.2;
  return Math.round(house.purchasePrice * variation);
}

function sendHouseTable(message, houses) {
  let embed = new MessageEmbed().setTitle("🏠 Ev Durumu").setColor("GREEN");
  if (!houses || houses.length === 0) {
    embed.setDescription("Ev bulunmuyor.");
  } else {
    houses.forEach((house) => {
      let status = house.rented ? "Kirada" : "Boş";
      let rentInfo =
        house.rented && house.agreedRent
          ? `Kira: ${house.agreedRent.toLocaleString()} ${chooseEmoji(
              house.agreedRent
            )} /gün`
          : "";
      embed.addField(
        `Ev ID: ${house.id}`,
        `Şehir: ${house.city}\nBüyüklük: ${house.size} m²\nYaş: ${
          house.age
        }\nSatın Alma: ${house.purchasePrice.toLocaleString()} ${chooseEmoji(
          house.purchasePrice
        )} \nDurum: ${status}\n${rentInfo}`,
        false
      );
    });
  }
  return message.channel.send({ embeds: [embed] });
}

exports.help = {
  name: "ev",
  description:
    "Ev al, kiraya ver, kira topla veya sat. Birden fazla ev desteği sunar.",
  usage:
    "ev <al|kiraya|kiracikabul|kirayareddet|kiratopla|sat|satkabul|satreddet|tablo> [parametreler]",
  example: "ev al 100 Istanbul 5",
  category: "Ekonomi",
  cooldown: 5,
};
