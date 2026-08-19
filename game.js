/* ------------------------------------
   基本変数
------------------------------------ */
let isGameLocked = false;   // アガリ中は操作停止
const HONOR_LIST = ["east", "south", "west", "north", "white", "green", "red"];
let wall = [];
let hand = [];
let river = [];
let selectedIndex = null;

/* ------------------------------------
   手牌ソート
------------------------------------ */
function sortHand(hand) {
  const order = {
    "m": 1, "p": 2, "s": 3,
    "east": 4, "south": 5, "west": 6, "north": 7,
    "white": 8, "green": 9, "red": 10
  };

  return hand.sort((a, b) => {
    const am = a.match(/^(\d+)([mps])$/);
    const bm = b.match(/^(\d+)([mps])$/);

    if (am && bm) {
      if (am[2] !== bm[2]) return order[am[2]] - order[bm[2]];
      return parseInt(am[1]) - parseInt(bm[1]);
    }
    if (!am && !bm) return order[a] - order[b];
    return am ? -1 : 1;
  });
}

/* ------------------------------------
   山を作る（萬＋ピンズ＋字牌）
------------------------------------ */
function createSmallWall() {
  const tiles = [];

  // 萬子
  for (let num = 1; num <= 9; num++) {
    for (let i = 0; i < 4; i++) tiles.push(`${num}m`);
  }

  // ピンズ
  for (let num = 1; num <= 9; num++) {
    for (let i = 0; i < 4; i++) tiles.push(`${num}p`);
  }

  // 字牌
  for (const honor of HONOR_LIST) {
    for (let i = 0; i < 4; i++) tiles.push(honor);
  }

  // シャッフル
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }

  return tiles;
}

/* ------------------------------------
   初期化（7枚配る）
------------------------------------ */
function initGame() {
  isGameLocked = false;
  wall = createSmallWall();
  hand = [];
  river = [];
  selectedIndex = null;

  for (let i = 0; i < 7; i++) {
    hand.push(wall.pop());
  }

  hand = sortHand(hand);
  render();
}

/* ------------------------------------
   桜吹雪演出
------------------------------------ */
function startConfetti() {
  for (let i = 0; i < 40; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";

    const colors = ["#ffb7c5", "#ffcce0", "#ffe6f2"];
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

    confetti.style.left = Math.random() * 100 + "vw";

    const size = Math.random() * 12 + 8;
    confetti.style.width = size + "px";
    confetti.style.height = size * 0.6 + "px";

    const fallTime = Math.random() * 4 + 5;
    confetti.style.animationDuration = fallTime + "s";

    document.body.appendChild(confetti);

    setTimeout(() => confetti.remove(), fallTime * 1000 + 500);
  }
}

/* ------------------------------------
   画面表示
------------------------------------ */
function render() {
  document.getElementById("wallCount").textContent = wall.length;

  const riverDiv = document.getElementById("river");
  riverDiv.innerHTML = "";

  for (let i = 0; i < river.length; i += 6) {
    const row = document.createElement("div");
    row.className = "river-row";

    river.slice(i, i + 6).forEach(tile => {
      const img = document.createElement("img");
      img.src = `tiles/${tile}.png`;
      img.className = "tile-img";
      row.appendChild(img);
    });

    riverDiv.appendChild(row);
  }

  const handDiv = document.getElementById("hand");
  handDiv.innerHTML = "";

  hand.forEach((tile, index) => {
    const img = document.createElement("img");
    img.src = `tiles/${tile}.png`;
    img.className = "tile-img";

    img.onclick = () => {
      selectedIndex = index;
      handDiv.querySelectorAll("img").forEach(i => i.classList.remove("selected"));
      img.classList.add("selected");
    };

    handDiv.appendChild(img);
  });
}

/* ------------------------------------
   面子判定（刻子・順子）
------------------------------------ */
function isSet(tiles3) {
  if (tiles3.length !== 3) return false;

  // 刻子
  if (tiles3[0] === tiles3[1] && tiles3[1] === tiles3[2]) return true;

  // 順子（数牌のみ）
  const m = tiles3.map(t => t.match(/^(\d+)([mps])$/));
  if (m.includes(null)) return false;

  const nums = m.map(x => parseInt(x[1], 10)).sort((a, b) => a - b);
  const suit = m[0][2];

  if (m.every(x => x[2] === suit)) {
    return nums[0] + 1 === nums[1] && nums[1] + 1 === nums[2];
  }

  return false;
}

/* ------------------------------------
   ツモ（引く）
------------------------------------ */
function drawTile() {
  const messageDiv = document.getElementById("message");
  messageDiv.textContent = "";

  if (wall.length === 0) {
    messageDiv.textContent = "山が尽きました。再読み込み！";
    return;
  }
  if (hand.length !== 7) {
    messageDiv.textContent = "手牌が7枚のときだけ引けます。";
    return;
  }

  hand.push(wall.pop());
  hand = sortHand(hand);

  render();

  /* 和了判定 */
  if (isWin(hand)) {
    isGameLocked = true;
    messageDiv.textContent = "アガリ！ 2面子＋1雀頭成立！おめでとう！";
    messageDiv.classList.add("win-message");

    const handDiv = document.getElementById("hand");
    handDiv.querySelectorAll("img").forEach(img => img.classList.add("tile-win"));

    // 光エフェクト
    const effect = document.createElement("div");
    effect.className = "win-effect";
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 1200);

    // 桜吹雪
    startConfetti();

    // 竜エフェクト
    const dragon = document.createElement("div");
    dragon.className = "dragon-effect";
    document.body.appendChild(dragon);
    setTimeout(() => dragon.remove(), 5000);// ★5秒に変更

    // 枠付け（雀頭＝赤、面子1＝青、面子2＝緑）
    const winStruct = getWinningStructure(hand);
    if (winStruct) {
      const imgs = handDiv.querySelectorAll("img");

      imgs.forEach(img => {
        const tileName = img.src.split("/").pop().replace(".png", "");

        if (winStruct.pair.includes(tileName)) {
          img.classList.add("pair-highlight");
        }
        if (winStruct.set1.includes(tileName)) {
          img.classList.add("set1-highlight");
        }
        if (winStruct.set2.includes(tileName)) {
          img.classList.add("set2-highlight");
        }
      });
    }

    setTimeout(() => {
      messageDiv.textContent = "";
      messageDiv.classList.remove("win-message");
      initGame();
    }, 10000);

    return;
  }

  messageDiv.textContent = "アガリではありません。捨て牌を選んでください。";
}

/* ------------------------------------
   捨てる
------------------------------------ */
function discardSelected() {
  const messageDiv = document.getElementById("message");

  if (selectedIndex === null) {
    messageDiv.textContent = "捨てる牌を選んでください。";
    return;
  }

  river.push(hand.splice(selectedIndex, 1)[0]);
  selectedIndex = null;

  hand = sortHand(hand);
  messageDiv.textContent = "";

  render();
}

/* ------------------------------------
   和了判定（2面子＋1雀頭）
------------------------------------ */
function isWin(tiles) {
  if (tiles.length !== 8) return false;

  const sorted = sortHand([...tiles]);

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {

      if (sorted[i] !== sorted[j]) continue;

      const pair = [sorted[i], sorted[j]];
      const remaining = sorted.filter((_, idx) => idx !== i && idx !== j);

      if (isTwoSets(remaining)) return true;
    }
  }
  return false;
}

function isTwoSets(tiles6) {
  if (tiles6.length !== 6) return false;

  for (let a = 0; a < tiles6.length; a++) {
    for (let b = a + 1; b < tiles6.length; b++) {
      for (let c = b + 1; c < tiles6.length; c++) {

        const set1 = [tiles6[a], tiles6[b], tiles6[c]];
        if (!isSet(set1)) continue;

        const remaining = tiles6.filter((_, idx) => idx !== a && idx !== b && idx !== c);

        if (isSet(remaining)) return true;
      }
    }
  }
  return false;
}

/* ------------------------------------
   アガリ形の構造
------------------------------------ */
function getWinningStructure(tiles) {
  const sorted = sortHand([...tiles]);

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {

      if (sorted[i] !== sorted[j]) continue;

      const pair = [sorted[i], sorted[j]];
      const remaining = sorted.filter((_, idx) => idx !== i && idx !== j);

      const sets = getTwoSets(remaining);
      if (sets) {
        return { pair: pair, set1: sets[0], set2: sets[1] };
      }
    }
  }
  return null;
}

function getTwoSets(tiles6) {
  for (let a = 0; a < tiles6.length; a++) {
    for (let b = a + 1; b < tiles6.length; b++) {
      for (let c = b + 1; c < tiles6.length; c++) {

        const set1 = [tiles6[a], tiles6[b], tiles6[c]];
        if (!isSet(set1)) continue;

        const remaining = tiles6.filter((_, idx) => idx !== a && idx !== b && idx !== c);

        if (isSet(remaining)) return [set1, remaining];
      }
    }
  }
  return null;
}

/* ------------------------------------
   ボタン動作
------------------------------------ */
/* ------------------------------------
   スマホ縦持ち禁止処理
------------------------------------ */
function checkOrientation() {
  const warning = document.getElementById("rotateWarning");
  const game = document.querySelector(".game-container");

  if (window.innerHeight > window.innerWidth) {
    // 縦向き → ゲーム停止
    warning.style.display = "flex";
    game.style.display = "none";
    isGameLocked = true;
  } else {
    // 横向き → ゲーム再開
    warning.style.display = "none";
    game.style.display = "block";
    isGameLocked = false;
  }
}

window.addEventListener("orientationchange", checkOrientation);
window.addEventListener("resize", checkOrientation);

window.onload = () => {
   checkOrientation();  
   initGame();
  document.getElementById("drawButton").onclick = () => {

    if (isGameLocked) return;

    if (hand.length === 7) {
      drawTile();
    } 
    else if (hand.length === 8) {
      discardSelected();
    }
  };
};
