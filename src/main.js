"use strict";

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let deck = [];
let seed = crypto.getRandomValues(new Uint32Array(1))[0];
const random = mulberry32(seed);
let state = {
  tableau: [[], [], [], [], [], [], [], [], [], []], // this is ridiculous
  stock: [],
  completed: [],
};
let history = [];
let moves = 0;
let score = 0;

let dragging = {
  active: false,
  offsetX: 0,
  offsetY: 0,
  column: null,
  index: null,
  cards: [],
};
let hinting = false;

const SUITS = [
  "spades",
  /*"hearts", "diamonds", "spades"*/ "spades",
  "hearts",
  "hearts",
];

class Card {
  constructor(rank, suit) {
    this.rank = rank; // 1 = ace, 11 = jack, 12 = queen, 13 = your mom
    this.suit = suit;
    this.faceUp = false;
    this.id = crypto.randomUUID();
  }
}

function createDeck() {
  let awesomeDeck = [];
  for (let x = 0; x < 2; x++) {
    for (let i = 0; i < SUITS.length; i++) {
      for (let j = 1; j < 14; j++) {
        awesomeDeck.push(new Card(j, SUITS[i]));
      }
    }
  }

  return awesomeDeck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

deck = createDeck();
deck = shuffle(deck);

function initialDeal() {
  for (let i = 0; i < state.tableau.length; i++) {
    let slot = state.tableau[i];
    if (i < 4) {
      for (let j = 0; j < 6; j++) {
        slot.push(deck.pop());
        if (j === 5) {
          slot[j].faceUp = true;
        }
      }
    } else {
      for (let j = 0; j < 5; j++) {
        slot.push(deck.pop());
      }
      slot[slot.length - 1].faceUp = true;
    }
  }
  state.stock = deck;
  deck = [];
}
initialDeal();

function deal() {
  if (state.tableau.some((col) => col.length === 0)) return; // check for empty columns

  for (let i = 0; i < state.tableau.length; i++) {
    let card = state.stock.pop();
    if (!card) return;
    card.faceUp = true;
    state.tableau[i].push(card);
  }
  history.push(snapshot());

  cardLogic();
  renderBoard();
}

function cardLogic() {
  state.tableau.forEach((column) => {
    if (column.length < 1) return;

    if (!column[column.length - 1].faceUp) {
      column[column.length - 1].faceUp = true;
      score += 10;
    }

    if (column.length >= 13) {
      const run = column.slice(-13);

      for (let i = 0; i < 12; i++) {
        const a = run[i];
        const b = run[i + 1];

        if (a.rank !== b.rank + 1) return;
        if (a.suit !== b.suit) return;
      }

      if (run[12].rank !== 1) return; // final check

      column.splice(-13);
      score += 26;
      state.completed.push(run);

      if (column.length > 0) {
        const top = column[column.length - 1];
        if (!top.faceUp) {
          top.faceUp = true;
          score += 10;
        }
      }
    }
  });
  if (state.completed.length === 8) {
    winAnimation();
    document.getElementById("win").style.display = "block";
  }
}

function moveCards(fromCol, fromIndex, toCol) {
  history.push(snapshot());
  moves++;

  const hadFaceDown = state.tableau[fromCol].some((card) => !card.faceUp);
  const moved = state.tableau[fromCol].slice(fromIndex);

  state.tableau[fromCol].splice(fromIndex);
  state.tableau[toCol].push(...moved);

  // this will be a nightmare to debug if it comes to it
  const first = moved[0];
  if (!first.scored) {
    let stackPoints = 0;
    for (let i = 0; i < moved.length - 1; i++) {
      const a = moved[i];
      const b = moved[i + 1];
      if (a.rank === b.rank + 1 && a.suit === b.suit) {
        stackPoints += 2;
      } else {
        break;
      }
    }

    const below =
      state.tableau[toCol][state.tableau[toCol].length - moved.length - 1];
    if (
      below &&
      below.rank === moved[0].rank + 1 &&
      below.suit === moved[0].suit
    ) {
      stackPoints += 2;
    }
    score += stackPoints;
    first.scored = true;
  }

  cardLogic();

  const allNowRevealed = !state.tableau[fromCol].some((card) => !card.faceUp);
  if (hadFaceDown && allNowRevealed && state.tableau[fromCol].length > 0) {
    score += 15;
  }
}
function hint() {
  if (hinting) return;
  let hints = [];

  for (let fromCol = 0; fromCol < state.tableau.length; fromCol++) {
    let col = state.tableau[fromCol];
    for (let i = 0; i < col.length; i++) {
      if (validPickup(fromCol, i)) {
        for (let toCol = 0; toCol < state.tableau.length; toCol++) {
          if (
            validDrop(toCol.length > 0 && fromCol, i, toCol) &&
            col[i].suit === state.tableau[toCol].at(-1).suit
          ) {
            hints.push({ col, pos: i, toCard: state.tableau[toCol].at(-1) });
          }
        }
      }
    }
  }

  if (hints.length === 0) return;
  hinting = true;

  let hint = hints[Math.floor(random() * hints.length)];
  let distance = hint.col.length - hint.pos;

  const toCard = document.getElementById(hint.toCard.id);

  for (let i = 0; i < distance; i++) {
    let el = document.getElementById(hint.col[hint.pos + i].id);
    el.style.filter = "invert(1)";
    setTimeout(() => {
      el.style.filter = "invert(0)";
    }, 500);
  }

  setTimeout(() => {
    toCard.style.filter = "invert(1)";
    setTimeout(() => {
      toCard.style.filter = "invert(0)";
      hinting = false;
    }, 500);
  }, 500);
}

function validPickup(column, index) {
  const cards = state.tableau[column];

  if (!cards[index].faceUp) return false;

  for (let i = index; i < cards.length - 1; i++) {
    const a = cards[i];
    const b = cards[i + 1];
    if (a.rank !== b.rank + 1) return false;
    if (a.suit !== b.suit) return false;
  }

  return true;
}
function validDrop(fromColumn, index, toColumn) {
  const moving = state.tableau[fromColumn][index];
  const targetCol = state.tableau[toColumn];

  if (targetCol.length === 0) return true;

  const target = targetCol[targetCol.length - 1];
  return target.rank === moving.rank + 1;
}

function validColumn(x) {
  const columns = document.querySelectorAll(".column");

  for (let i = 0; i < columns.length; i++) {
    const rect = columns[i].getBoundingClientRect();

    if (x >= rect.left && x <= rect.right) {
      return i;
    }
  }

  return null;
}

function snapshot() {
  return {
    tableau: state.tableau.map((col) =>
      col.map((card) => Object.assign(new Card(), card)),
    ),
    stock: state.stock.map((card) => Object.assign(new Card(), card)),
    completed: state.completed.map((run) =>
      run.map((card) => Object.assign(new Card(), card)),
    ),
    score,
    moves,
  };
}
function undo() {
  if (history.length === 0) return;
  let prev = history.pop();
  state.tableau = prev.tableau;
  state.stock = prev.stock;
  state.completed = prev.completed;
  score = prev.score;
  moves = prev.moves;
  renderBoard();
}
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "z") undo();
});

function winAnimation() {
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;top:0;left:0;pointer-events:none;z-index:1";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const cards = Array.from({ length: 40 }, (_, i) => ({
    x: random() * canvas.width,
    y: -100 - i * 60, // stagger start positions
    vx: (random() - 0.5) * 16,
    vy: random() * 4 + 2,
    img: new Image(),
  }));

  cards.forEach((c) => {
    const rank = Math.floor(random() * 13) + 1;
    const suit = SUITS[Math.floor(random() * SUITS.length)];
    c.img.src = `res/img/${suit}${rank}.png`;
  });

  function animate() {
    for (let i = cards.length - 1; i >= 0; i--) {
      let c = cards[i];
      c.vy += 0.3;
      c.x += c.vx;
      c.y += c.vy;

      if (c.y + 97 > canvas.height) {
        c.y = canvas.height - 97;
        c.vy *= -0.6;
        c.vx += (random() - 0.5) * 2;

        if (Math.abs(c.vy) < 1.5) {
          cards.splice(i, 1);
          continue;
        }
      }
      ctx.drawImage(c.img, Math.round(c.x), Math.round(c.y), 71, 97);
    }

    if (cards.length === 0) return;
    requestAnimationFrame(animate);
  }
  animate();
}
