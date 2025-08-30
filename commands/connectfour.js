const { Client, Message } = require("discord.js");
// Artık old-wio.db'yi require etmiyoruz, bunun yerine bot (client) üzerinde tanımlı db kullanılacak.

const blankEmoji = "⚪";
const playerOneEmoji = "🔴";
const playerTwoEmoji = "🟡";
const nums = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣"];

module.exports.help = {
  name: "connectfour",
  aliases: ["connect4", "c4"],
  description:
    "Bir kullanıcıyla veya bot ile Dört Bağlantı (Connect Four) oyunu oyna.",
  usage: "connectfour [@kullanıcı] [basit/kolay/normal/zor/imkansız]",
  category: "Eğlence",
  cooldown: 5,
};

module.exports.execute = async (bot, message, args) => {
  let opponent = message.mentions.members.first();
  let againstBot = false;
  let difficulty;

  if (!opponent) {
    againstBot = true;

    if (
      !args[0] ||
      !["basit", "kolay", "normal", "zor", "imkansız"].includes(
        args[0].toLowerCase()
      )
    ) {
      return message.channel.send(
        "Lütfen bir zorluk seviyesi seç: **basit, kolay, normal, zor veya imkansız**"
      );
    }

    difficulty = args[0].toLowerCase();
    opponent = bot.user;
  }

  if (!opponent) {
    return message.channel.send(
      "**Lütfen oynayacak bir kullanıcı etiketleyin!**"
    );
  }

  if (opponent.user && opponent.user.bot) {
    return message.channel.send("**Botlara karşı oynayamazsın!**");
  }

  if (opponent.user && opponent.user.id === message.author.id) {
    return message.channel.send("**Kendinle oynayamazsın!**");
  }

  const currentGame = bot.games.get(message.channel.id);
  if (currentGame)
    return message.channel.send(
      `**Bu kanalda zaten devam eden bir oyun var!**`
    );

  bot.games.set(message.channel.id, { name: "connectfour" });

  let board = generateBoard();
  let userTurn = true;
  let winner = null;
  const colLevels = [5, 5, 5, 5, 5, 5, 5];

  while (!winner && board.some((row) => row.includes(null))) {
    const user = userTurn ? message.author : opponent;
    const sign = userTurn ? "user" : "oppo";

    await message.channel.send(`${user}, bir sütun seç:
${displayBoard(board)}
${nums.join(" ")}`);

    let choice;

    if (againstBot && !userTurn) {
      if (difficulty === "basit") {
        choice = getSimpleMove(colLevels);
      } else if (difficulty === "kolay") {
        choice = getRandomMove(colLevels);
      } else if (difficulty === "normal") {
        choice = getSmartMove(board, colLevels);
      } else if (difficulty === "zor") {
        choice = getBestMove(board, colLevels);
      } else {
        choice = getImpossibleMove(board, colLevels);
      }
    } else {
      const filter = (res) =>
        res.author.id === user.id && /^[1-7]$/.test(res.content);
      const turn = await message.channel.awaitMessages({
        filter,
        max: 1,
        time: 60000,
      });

      if (!turn.size) {
        winner = userTurn ? opponent : message.author;
        break;
      }

      choice = parseInt(turn.first().content, 10) - 1;
    }

    board[colLevels[choice]][choice] = sign;
    colLevels[choice] -= 1;

    if (checkWin(board)) winner = user;
    userTurn = !userTurn;
  }

  // Oyun bitince, veritabanı üzerinden her iki kullanıcının oyun sayısını güncelle
  const opponentGames = (bot.db.get(`games_${opponent.id}`) || 0) + 1;
  const authorGames = (bot.db.get(`games_${message.author.id}`) || 0) + 1;
  bot.db.set(`games_${opponent.id}`, opponentGames);
  bot.db.set(`games_${message.author.id}`, authorGames);

  bot.games.delete(message.channel.id);

  return message.channel.send(
    winner ? `**Tebrikler, ${winner}! Kazandın!**` : "**Berabere!**"
  );
};

function getSimpleMove(colLevels) {
  return colLevels.findIndex((level) => level >= 0);
}

function getRandomMove(colLevels) {
  let availableCols = colLevels
    .map((level, index) => (level >= 0 ? index : -1))
    .filter((index) => index !== -1);
  return availableCols[Math.floor(Math.random() * availableCols.length)];
}

function getSmartMove(board, colLevels) {
  return getRandomMove(colLevels);
}

function getBestMove(board, colLevels) {
  for (let i = 0; i < 7; i++) {
    if (colLevels[i] >= 0) {
      let tempBoard = JSON.parse(JSON.stringify(board));
      tempBoard[colLevels[i]][i] = "oppo";
      if (checkWin(tempBoard)) return i;
    }
  }
  return getRandomMove(colLevels);
}

function getImpossibleMove(board, colLevels) {
  for (let i = 0; i < 7; i++) {
    if (colLevels[i] >= 0) {
      let tempBoard = JSON.parse(JSON.stringify(board));
      tempBoard[colLevels[i]][i] = "oppo";
      if (checkWin(tempBoard)) return i;
    }
  }

  for (let i = 0; i < 7; i++) {
    if (colLevels[i] >= 0) {
      let tempBoard = JSON.parse(JSON.stringify(board));
      tempBoard[colLevels[i]][i] = "user";
      if (checkWin(tempBoard)) return i;
    }
  }

  return getRandomMove(colLevels);
}

function generateBoard() {
  return Array(6)
    .fill(null)
    .map(() => Array(7).fill(null));
}

function displayBoard(board) {
  return board
    .map((row) =>
      row
        .map((piece) =>
          piece === "user"
            ? playerOneEmoji
            : piece === "oppo"
            ? playerTwoEmoji
            : blankEmoji
        )
        .join("")
    )
    .join("\n");
}

function checkWin(board) {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      if (
        c + 3 < 7 &&
        checkLine(
          board[r][c],
          board[r][c + 1],
          board[r][c + 2],
          board[r][c + 3]
        )
      )
        return true;
      if (
        r + 3 < 6 &&
        checkLine(
          board[r][c],
          board[r + 1][c],
          board[r + 2][c],
          board[r + 3][c]
        )
      )
        return true;
      if (
        r + 3 < 6 &&
        c + 3 < 7 &&
        checkLine(
          board[r][c],
          board[r + 1][c + 1],
          board[r + 2][c + 2],
          board[r + 3][c + 3]
        )
      )
        return true;
      if (
        r - 3 >= 0 &&
        c + 3 < 7 &&
        checkLine(
          board[r][c],
          board[r - 1][c + 1],
          board[r - 2][c + 2],
          board[r - 3][c + 3]
        )
      )
        return true;
    }
  }
  return false;
}

function checkLine(a, b, c, d) {
  return a !== null && a === b && a === c && a === d;
}
