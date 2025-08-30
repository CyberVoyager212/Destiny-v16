// commands/help.js
const {
  MessageEmbed,
  MessageActionRow,
  MessageButton,
  MessageSelectMenu,
} = require("discord.js");

/**
 * Gelişmiş, estetik help komutu
 * - Tek oturumluk "show hidden" toggle
 * - Kategori seçimi via SelectMenu
 * - Komut kartları (sayfa sayfa)
 * - Arama modu (kanala yazıp arama yapma)
 *
 * Kullanım: help
 */

exports.help = {
  name: "help",
  aliases: ["h", "yardım"],
  usage: "help",
  category: "Bot",
  description:
    "Gelişmiş yardım arayüzü — kategori, arama, toggle (gizli komutları göster).",
};

exports.execute = async (client, message /*, args */) => {
  try {
    const prefix = client.config?.prefix || "";
    const ownerId = client.config?.ownerId || "";
    const admins = client.config?.admins || [];

    const isOwner = message.author.id === ownerId;
    const isAdmin = admins.includes(message.author.id);

    const memberHasAnyPerm = (perms = []) => {
      if (!message.member || !message.member.permissions) return false;
      if (!Array.isArray(perms)) perms = [perms];
      return perms.some((p) => message.member.permissions.has(p));
    };

    // Tüm komutları alın
    const allCmds = Array.from(client.commands.values());

    // Hangi komutların görünür olacağını çözen fonksiyon (showAll ile toggle edilir)
    const resolveVisibleCommands = (showAll = false) =>
      allCmds.filter((cmd) => {
        if (showAll) return true;
        const help = cmd.help || {};
        const cat = help.category || "Diğer";
        if (help.admin && !isOwner && !isAdmin) return false; // admin-only
        if (cat === "Bot" && !isOwner) return false; // Bot kategorisi owner-only
        if (
          help.permissions &&
          Array.isArray(help.permissions) &&
          help.permissions.length
        ) {
          if (!memberHasAnyPerm(help.permissions) && !isOwner) return false;
        }
        return true;
      });

    // Kategorilere ayırma
    const buildCategories = (cmdList) => {
      const cats = {};
      cmdList.forEach((cmd) => {
        const cat = cmd.help?.category || "Diğer";
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push(cmd);
      });
      return cats;
    };

    // Başlangıç durumları
    let showAll = false; // toggle: gizli komutları göster
    let visibleCommands = resolveVisibleCommands(showAll);
    let categories = buildCategories(visibleCommands);
    let categoryNames = Object.keys(categories).sort();

    // Tasarım parametreleri
    const PRIMARY_COLOR = "#0b84ff"; // ana vurgu rengi
    const SECONDARY_COLOR = "#2f3136";
    const CARD_COLOR = "#1f2326";

    // Güzel "hero" embed (üstte büyük görünür alan)
    const makeHeroEmbed = () => {
      const total = allCmds.length;
      const visible = visibleCommands.length;
      const emb = new MessageEmbed()
        .setTitle(`✨ ${client.user.username} — Yardım Merkezi`)
        .setDescription(
          `Aşağıdan bir kategori seç veya 🔎 *Ara* butonunu kullanarak komutlarda arama yap.\n` +
            `**Toggle** ile (oturumluk) izin gerektiren komutları görebilirsin.`
        )
        .addField("Görünen komutlar", `${visible}`, true)
        .addField("Toplam komut", `${total}`, true)
        .setColor(PRIMARY_COLOR)
        .setFooter({
          text: `İsteyen: ${
            message.member
              ? message.member.displayName
              : message.author.username
          }`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      // hero görsel: sunucu icon ya da bot avatar
      const thumb =
        message.guild?.iconURL({ dynamic: true }) ||
        client.user.displayAvatarURL({ dynamic: true });
      emb.setThumbnail(thumb);

      return emb;
    };

    // Category select menu (ilk 25 kategori gösterilir)
    const makeCategorySelect = () => {
      const options = categoryNames.map((cat) => ({
        label: cat,
        value: `help_select_${encodeURIComponent(cat)}`,
        description: `${(categories[cat] || []).length} komut`,
      }));
      const select = new MessageSelectMenu()
        .setCustomId("help_select")
        .setPlaceholder("Kategori seç")
        .addOptions(options.slice(0, 25));
      return new MessageActionRow().addComponents(select);
    };

    // Ana buton bar: Toggle / Search / Home / Close
    const makeMainButtons = () =>
      new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId("help_toggle")
          .setLabel(
            showAll
              ? "🔒 Gizle (izinli komutlar)"
              : "🔓 Göster (izinli komutlar)"
          )
          .setStyle(showAll ? "SECONDARY" : "PRIMARY"),
        new MessageButton()
          .setCustomId("help_search")
          .setLabel("🔎 Ara")
          .setStyle("SECONDARY"),
        new MessageButton()
          .setCustomId("help_home")
          .setLabel("🏠 Ana Sayfa")
          .setStyle("SECONDARY"),
        new MessageButton()
          .setCustomId("help_close")
          .setLabel("❌ Kapat")
          .setStyle("DANGER")
      );

    // Bir kategori için "komut kartları" embed'i ve toplam sayfa sayısı
    const buildCategoryPage = (category, page = 0) => {
      const cmds = categories[category] || [];
      const perPage = 6;
      const totalPages = Math.max(1, Math.ceil(cmds.length / perPage));
      const slice = cmds.slice(page * perPage, page * perPage + perPage);

      const emb = new MessageEmbed()
        .setTitle(`📂 ${category} — ${cmds.length} komut`)
        .setColor(CARD_COLOR)
        .setFooter({
          text: `Sayfa ${page + 1}/${totalPages} • ${
            message.member
              ? message.member.displayName
              : message.author.username
          }`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      // Her komutu "kart" gibi ekle (isim + kısa açıklama + kullanım)
      slice.forEach((c) => {
        const name = `\`${prefix}${c.help.name}\``;
        const desc = c.help?.description || "-";
        const usage = c.help?.usage || "-";
        // Kart içinde küçük bir açıklama
        emb.addField(
          name,
          `${desc}\n**Kullanım:** \`${prefix}${usage}\``,
          false
        );
      });

      return { embed: emb, totalPages };
    };

    // Kategori page nav (geri/ileri/home/toggle/close)
    const makeCategoryNav = (category, page, totalPages) => {
      const row = new MessageActionRow();
      if (page > 0)
        row.addComponents(
          new MessageButton()
            .setCustomId(`help_prev_${encodeURIComponent(category)}_${page}`)
            .setLabel("⬅️ Geri")
            .setStyle("SECONDARY")
        );
      row.addComponents(
        new MessageButton()
          .setCustomId("help_home")
          .setLabel("🏠 Ana Sayfa")
          .setStyle("SECONDARY")
      );
      if (page < totalPages - 1)
        row.addComponents(
          new MessageButton()
            .setCustomId(`help_next_${encodeURIComponent(category)}_${page}`)
            .setLabel("İleri ➡️")
            .setStyle("SECONDARY")
        );
      row.addComponents(
        new MessageButton()
          .setCustomId("help_toggle")
          .setLabel(showAll ? "🔒 Gizle" : "🔓 Göster")
          .setStyle(showAll ? "SECONDARY" : "PRIMARY")
      );
      row.addComponents(
        new MessageButton()
          .setCustomId("help_close")
          .setLabel("❌ Kapat")
          .setStyle("DANGER")
      );
      return row;
    };

    // Başlangıç gönderimi
    const initialRows = [makeCategorySelect(), makeMainButtons()];
    const helpMsg = await message.channel.send({
      embeds: [makeHeroEmbed()],
      components: initialRows,
    });

    // Collector: sadece komutu çağıran kullanıcı kullanabilsin
    const collector = helpMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 150_000, // 2.5 dakika
    });

    // iç durum
    let currentCategory = null;
    let currentPage = 0;

    collector.on("collect", async (interaction) => {
      // herkesin göremediği komutları showAll ile toggle edebiliriz
      await interaction.deferUpdate().catch(() => {});

      const cid = interaction.customId;

      // Toggle
      if (cid === "help_toggle") {
        showAll = !showAll;
        visibleCommands = resolveVisibleCommands(showAll);
        categories = buildCategories(visibleCommands);
        categoryNames = Object.keys(categories).sort();
        // güncelle ana embed + select (yeniden oluştur)
        await interaction.editReply({
          embeds: [makeHeroEmbed()],
          components: [makeCategorySelect(), makeMainButtons()],
        });
        return;
      }

      // Search: kanala yazıp arama
      if (cid === "help_search") {
        // ephemeral uyarı
        await interaction.followUp({
          content:
            "🔎 Arama modu aktif. Lütfen kanala aramak istediğiniz terimi yazın (30s).",
          ephemeral: true,
        });
        const filter = (m) => m.author.id === message.author.id;
        const collected = await message.channel.awaitMessages({
          filter,
          max: 1,
          time: 30_000,
        });
        const term = collected.first()?.content?.trim();
        if (!term) {
          // geri ana sayfa
          return interaction.editReply({
            embeds: [makeHeroEmbed()],
            components: [makeCategorySelect(), makeMainButtons()],
          });
        }
        const termLower = term.toLowerCase();
        // visibleCommands kısmında ara
        const found = visibleCommands.filter((cmd) => {
          const help = cmd.help || {};
          return (
            help.name?.toLowerCase().includes(termLower) ||
            (help.description &&
              help.description.toLowerCase().includes(termLower)) ||
            (help.usage && help.usage.toLowerCase().includes(termLower))
          );
        });

        if (!found.length) {
          return interaction.editReply({
            content: `❌ "${term}" için sonuç bulunamadı.`,
            embeds: [makeHeroEmbed()],
            components: [makeCategorySelect(), makeMainButtons()],
          });
        }

        // embed results (maks 25)
        const resEmb = new MessageEmbed()
          .setTitle(`🔎 Arama sonuçları: ${term}`)
          .setColor("#ffb142")
          .setFooter({
            text: `${found.length} sonuç bulundu • ${
              message.member
                ? message.member.displayName
                : message.author.username
            }`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp();

        found.slice(0, 25).forEach((c) => {
          resEmb.addField(
            `\`${prefix}${c.help.name}\``,
            `${c.help.description || "-"}\nKullanım: \`${prefix}${
              c.help.usage || "-"
            }\``,
            false
          );
        });

        return interaction.editReply({
          content: null,
          embeds: [resEmb],
          components: [makeCategorySelect(), makeMainButtons()],
        });
      }

      // Home
      if (cid === "help_home") {
        currentCategory = null;
        currentPage = 0;
        visibleCommands = resolveVisibleCommands(showAll);
        categories = buildCategories(visibleCommands);
        categoryNames = Object.keys(categories).sort();
        return interaction.editReply({
          embeds: [makeHeroEmbed()],
          components: [makeCategorySelect(), makeMainButtons()],
        });
      }

      // Close
      if (cid === "help_close") {
        helpMsg.delete().catch(() => {});
        collector.stop();
        return;
      }

      // Select menu
      if (cid === "help_select") {
        const raw = interaction.values?.[0];
        if (!raw) return;
        const encoded = raw.replace(/^help_select_/, "");
        const cat = decodeURIComponent(encoded);
        if (!categories[cat]) {
          // rebuild if race condition
          visibleCommands = resolveVisibleCommands(showAll);
          categories = buildCategories(visibleCommands);
          if (!categories[cat])
            return interaction.editReply({
              content: "Bu kategori bulunamadı.",
              embeds: [],
              components: [],
            });
        }
        currentCategory = cat;
        currentPage = 0;
        const { embed, totalPages } = buildCategoryPage(
          currentCategory,
          currentPage
        );
        const nav = makeCategoryNav(currentCategory, currentPage, totalPages);
        return interaction.editReply({ embeds: [embed], components: [nav] });
      }

      // Pagination buttons (prev/next) pattern: help_prev_<cat>_<page> or help_next_<cat>_<page>
      if (cid.startsWith("help_prev_") || cid.startsWith("help_next_")) {
        const parts = cid.split("_"); // [help, prev/next, <encodedCat>, <page>]
        const action = parts[1]; // prev veya next
        const encodedCat = parts[2];
        const pageParam = Number(parts[3]) || 0;
        const cat = decodeURIComponent(encodedCat);

        // rebuild categories if necessary
        if (!categories[cat]) {
          visibleCommands = resolveVisibleCommands(showAll);
          categories = buildCategories(visibleCommands);
          if (!categories[cat])
            return interaction.editReply({
              content: "Kategori bulunamadı.",
              embeds: [],
              components: [],
            });
        }

        const perPage = 6;
        const totalPages = Math.max(
          1,
          Math.ceil((categories[cat] || []).length / perPage)
        );
        currentPage =
          action === "prev"
            ? Math.max(0, pageParam - 1)
            : Math.min(totalPages - 1, pageParam + 1);

        const { embed, totalPages: tp } = buildCategoryPage(cat, currentPage);
        const nav = makeCategoryNav(cat, currentPage, tp);
        return interaction.editReply({ embeds: [embed], components: [nav] });
      }
    });

    collector.on("end", () => {
      // Oturum bittiğinde butonları pasifleştir
      helpMsg.edit({ components: [] }).catch(() => {});
    });
  } catch (err) {
    console.error("Help komutu hata:", err);
    message.channel.send("❌ Yardım menüsü oluşturulurken bir hata oluştu.");
  }
};
