# 💫 Destiny v16'e Hoş Geldiniz!

Destiny, **2022 yılında v12 sürümüyle** başlayan yolculuğunda, her sürümde yeni özellikler ve geliştirmelerle kullanıcıların hizmetinde oldu. v16 sürümü ile bot **baştan sona yeniden geliştirildi** ve kullanıcı deneyimi daha da ileri taşındı.

> Eğer botu ilk kez kullanıyorsanız: Bu bot açık kaynaklıdır, inceleyebilir, geliştirebilir ve hatta kendi versiyonunuzu çıkarabilirsiniz. Daha önceki sürümler ve detaylar için profilimizden v15 README’yi inceleyebilirsiniz.
---

## ✨ v16 Yenilikleri

* **Tüm komut arayüzleri güncellendi** ve tespit edilen hatalar düzeltildi.
* **YazıGPT komutu artık multimodal**: Düşünme modu ve web arama modları ile kullanıcı dostu arayüz sunuyor.
* **Autotranslate modu**: Tüm mesajlara etki etmese de farklı kültür ve ülkelerden kullanıcılar botu rahatlıkla kullanabilir.
* **Battle komutu eklendi**: Kullanıcılar takım kurabilir dostlarıyla veya botla kapışabilir; pool.json ile çeşitlilik artırıldı (2000 satır).

### 🆕 Yeni Komutlar

1. **otomod** – Sunucu bazlı otomatik moderasyon sistemlerini tek bir UI’den kontrol edebilirsiniz.
2. **advencedengel** – Belirlenen kelimeyi içeren mesajı siler, mesaj içeriğini koruyarak webhook ile tekrar atar.
3. **otocevap** – Belirlenen mesaja otomatik cevap verir, ayarlamalar yapılabilir.
4. **car** – Snake oyununa benzer UI ile araba oyunu; trenlerden ve yukardan gelen arabalardan kaçıp puan toplanır.
5. **botban** – Sadece botConfig.js’de yer alan admin ID’leri kullanabilir; bottan kullanıcı banlar.

* **Help komutu güncellendi**: Kullanıcılar artık yetkileri olmayan komutları göremez veya kullanamaz.
* **Yapay zeka güncellendi**: Tüm komutlarda artık yeni bir AI modeli kullanılıyor (AI21 devri kapandı).

---

## 🔍 Detaylı Geliştirmeler

* Kodlarda **botConfig.js** üzerinden alınan `botname` ve `prefix` kullanımı sıklaştırıldı.
* `username` yerine **displayname** kullanımı artırıldı.
* Help komutu ve botbilgi UI’leri tamamen yenilendi.
* Uzun komutlar için **utils klasörü** eklendi; games klasörü kaldırıldı.
* Tüm komutların `export.help` kısmına gerektirdiği izinler yazıldı.
* v15’te atlanan küçük detaylar düzenlendi.
* Bazı modüllerin sürümleri güncellendi.
* Hata yönetimi (error handling) sistemi geliştirildi.
* `messageCreate` eventi baştan yazıldı, karmaşıklık azaltıldı.
* `debug.js` içerisindeki çalışmayan kısımlar temizlendi.
* Autotranslate artık **JSON tabanlı**, DB kullanılmıyor.
* `index.js`’deki item listesi **utils klasörüne taşındı**.
* Bazı komutlar silinip yeniden yazıldı; UI baştan sona yenilendi.


## ⚙️ Kurulum Rehberi

1. Gerekli modülleri kurun:

```bash
npm install
```

2. `emojiler` klasöründeki emojileri kendi sunucunuza yükleyin.
3. `emoji.json` dosyasındaki boş ID’leri kendi sunucunuzdaki emoji ID’leriyle değiştirin.
4. `botConfig.js` dosyasını oluşturun ve aşağıdaki örneğe göre doldurun:

```js
module.exports = {
  token: "",          // Discord bot token
  prefix: "!",        // Komut ön eki
  admins: [""],       // Ek yetkili ID’leri
  ownerId: "",        // Bot sahibi ID
  botname: "",        // Bot ismi (AI komutlarında önemli)
  SERPER_API_KEY: "", // Web arama için
  OPENROUTER_API_KEY: "", // AI işlemleri için
  supportServer: "" // discord sunucu davet linki
  logChannelId: "",   // Log kanalı ID
  debug: true         // true kalmalı
};
```

> ⚠️ Önemli: `botname` tek kelime ve boş bırakılmamalı, `debug` değeri false yapılmamalı.

---

### 💡 Özel Kurulum Notu

> **Bot kodlarını indirip geliştirmek isterseniz:**
>
> * İlk olarak **Node.js v11** kurun ve modülleri yükleyin.
> * Ardından botu çalıştırmak için **Node.js v22** kullanın.
> * Bu işlemlerle uğraşmak istemiyorsanız, projenizi **[codebox.io](https://codebox.io)** gibi platformlara yükleyip çalıştırabilirsiniz.
> * Not: **v17 sürümünü şu an planlamıyoruz**, ama gelirse bu kurulum sorunlarına dikkat edilecek.

---

## 👨‍💻 Geliştirici

* **Yapımcı:** Mustafa Sepet
* **Esinlenilen Yayıncı:** [Zero Discord](https://github.com/ZeroDiscord)
* **Proje Tabanı:** [ZeroDiscord/EconomyBot](https://github.com/ZeroDiscord/EconomyBot)

> Her türlü öneri ve katkı için pull request veya issue açabilirsiniz.
> Destiny v16 ile sunucularınızı bir üst seviyeye taşıyın! 🚀

Bunu yapmamı ister misin?
