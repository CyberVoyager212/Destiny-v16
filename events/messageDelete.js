module.exports = async (client, message) => {
  if (!message.guild) return;

  // 1) Silinen mesajları kaydet
  if (!message.partial && message.author.id !== client.user.id) {
    const guildKey = `deletedMessages_${message.guild.id}`;
    const deletedMessages = (await client.db.get(guildKey)) || [];
    const timestamp = new Date().toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    deletedMessages.unshift(
      `[${timestamp}] **${message.member.displayName}**: ${message.content}`
    );
    if (deletedMessages.length > 10) deletedMessages.pop();

    await client.db.set(guildKey, deletedMessages);
  }

  // 2) Yapışkan mesaj kontrolü
  const stickyKey = `stickyMessage_${message.channel.id}`;
  const stickyData = await client.db.get(stickyKey);
  if (!stickyData) return;

  // Eğer o yapışkan mesajın kendisi gönderildiyse, hemen tekrar gönder
  if (message.id === stickyData.messageId) {
    try {
      const sentMessage = await message.channel.send(stickyData.content);
      await client.db.set(stickyKey, {
        messageId: sentMessage.id,
        content: stickyData.content,
      });
    } catch (error) {
      console.error("Yapışkan mesaj tekrar gönderilirken hata oluştu:", error);
    }
  }
};
