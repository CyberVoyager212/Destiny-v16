
# 💫 Destiny v16’e Hoş Geldiniz!

Destiny, **2022 yılında v12 sürümüyle** başlayan yolculuğunda her sürümde yeniliklerle karşınıza çıktı. **v16 sürümü** ile bot **baştan sona yeniden tasarlandı**, kullanıcı deneyimi ve arayüz tamamen yenilendi.

> ⚡ Eğer Destiny’yi ilk kez kullanıyorsanız: Bu bot **açık kaynaklıdır**; inceleyebilir, geliştirebilir ve kendi versiyonunuzu oluşturabilirsiniz. Önceki sürümler ve detaylar için profilimizdeki v15 README’sine göz atabilirsiniz.

---

## ✨ v16 ile Gelen Yenilikler

* **Tüm komut arayüzleri güncellendi**; tespit edilen hatalar düzeltildi.
* **YazıGPT komutu artık multimodal:** Düşünme modu ve web arama seçenekleri ile kullanıcı dostu arayüz.
* **Autotranslate modu:** Kültür ve dil fark etmeksizin kullanıcı deneyimini artırır.
* **Battle komutu eklendi:** Takım kurup dostlarınızla veya botla kapışın; **pool.json** ile 2000’den fazla çeşitlilik.

### 🆕 Yeni Özel Komutlar

1. **otomod** – Sunucu bazlı otomatik moderasyonları tek UI üzerinden yönetin.
2. **advencedengel** – Belirlenen kelimeyi içeren mesajı siler, içeriği koruyarak webhook ile tekrar gönderir.
3. **otocevap** – Belirlenen mesaja otomatik yanıt verir; ayarlamalar yapılabilir.
4. **car** – Snake oyununa benzeyen UI ile araba oyunu; trenlerden ve yukarıdan gelen araçlardan kaçıp puan toplayın.
5. **botban** – Sadece `botConfig.js`’de tanımlı adminler bot üzerinden kullanıcı banlayabilir.

* **Help komutu güncellendi:** Kullanıcılar, yetkileri olmayan komutları göremez veya kullanamaz.
* **AI güncellemesi:** Tüm komutlar artık yeni bir yapay zeka modeli ile çalışıyor (AI21 devri kapandı).

---

## 🔍 Teknik Geliştirmeler

* Kodlarda **botConfig.js** üzerinden `botname` ve `prefix` kullanımı yoğunlaştırıldı.
* `username` yerine **displayname** tercih edildi.
* Help ve botbilgi arayüzleri tamamen yenilendi.
* Uzun komutlar için **utils klasörü** eklendi; games klasörü kaldırıldı.
* Tüm komutların izin gereksinimleri `export.help` kısmında belirtildi.
* Hata yönetimi (error handling) sistemi geliştirildi.
* `messageCreate` eventi baştan yazıldı; karmaşıklık azaltıldı.
* Autotranslate artık **JSON tabanlı**; DB’ye ihtiyaç yok.
* `index.js`’deki item listesi **utils klasörüne taşındı**.
* UI baştan sona yenilenmiş, bazı komutlar yeniden yazıldı.

---

## ⚙️ Kurulum Rehberi

1. Gerekli modülleri kurun:

```bash
npm install
```

2. `emojiler` klasöründeki emojileri kendi sunucunuza yükleyin.
3. `emoji.json` dosyasındaki boş ID’leri sunucunuzdaki emoji ID’leri ile değiştirin.
4. `botConfig.js` dosyasını oluşturun ve örneğe göre doldurun:

```js
module.exports = {
  token: "",          // Discord bot token
  prefix: "!",        // Komut ön eki
  admins: [""],       // Ek yetkili ID’leri
  ownerId: "",        // Bot sahibi ID
  botname: "",        // Bot ismi (AI komutlarında önemli)
  SERPER_API_KEY: "", // Web arama API anahtarı
  OPENROUTER_API_KEY: "", // AI işlemleri için API
  supportServer: "",  // Destek sunucu davet linki
  logChannelId: "",   // Log kanalı ID
  debug: true         // true kalmalı
};
```

> ⚠️ Önemli: `botname` tek kelime olmalı ve boş bırakılmamalı; `debug` değeri **false yapılmamalı**.

---

### 💡 Özel Kurulum Notları

* **Kodları indirip geliştirmek istiyorsanız:**

  * Önce **Node.js v11** kurun ve modülleri yükleyin.
  * Ardından botu çalıştırmak için **Node.js v22** kullanın.
* Eğer uğraşmak istemiyorsanız, projeyi **[codebox.io](https://codebox.io)** gibi platformlara yükleyip çalıştırabilirsiniz.
* Not: **v17 sürümü şu an planlanmamaktadır**, fakat gelirse kurulum detaylarına dikkat edilecektir.

---

## 👨‍💻 Geliştirici & Kaynaklar

* **Yapımcı:** Mustafa Sepet
* **Esinlenilen Proje:** [Zero Discord](https://github.com/ZeroDiscord)
* **Proje Tabanı:** [EconomyBot](https://github.com/ZeroDiscord/EconomyBot)
* **Multimodal AI Tabanı:** [Javis](https://github.com/Javis603/Discord-AIBot)

> Her türlü öneri ve katkı için **pull request veya issue** açabilirsiniz.
> Destiny v16 ile sunucunuzu bir üst seviyeye taşıyın! 🚀
