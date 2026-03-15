
let deck = [];
const state = {
  tableau: [ [], [], [], [], [], [], [], [], [], [] ], // this is ridiculous
  stock: [],
  completed: []
}

let dragging = {
  active: false,
  offsetX: 0,
  offsetY: 0,
  column: null,
  index: null,
  cards: [],
}

const SUITS = ["spades", /*"hearts", "diamonds", "spades"*/ "spades", "hearts", "hearts"]

class Card {
  constructor(rank, suit) {
    this.rank = rank; // 1 = ace, 11 = jack, 12 = queen, 13 = your mom
    this.suit = suit;
    this.faceUp = false;
    this.id = crypto.randomUUID();
  }
}

function createDeck() {
  let deck = [];
  for (let x = 0; x < 2; x++) {
    for (let i = 0; i < SUITS.length; i++) {
      for (let j = 1; j < 14; j++) {
        deck.push(new Card(j, SUITS[i]));
      }
    }
  }

  return deck;
}
function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
}
initialDeal();

function cardLogic() {
  state.tableau.forEach(column => {
    if (column.length < 1) return;
    column[column.length - 1].faceUp = true;

    if (column.length >= 13) {
      const run = column.slice(-13); // what is even this

      for (let i = 0; i < 12; i++) {
        const a = run[i];
        const b = run[i + 1];

        if (a.rank !== b.rank + 1) return;
        if (a.suit !== b.suit) return;
      }

      if (run[12].rank !== 1) return; // final check

      column.splice(-13);
      state.completed.push(run);
      column[column.length - 1].faceUp = true;
    }
  });
}

function moveCards(fromCol, fromIndex, toCol) {
  const moved = state.tableau[fromCol].splice(fromIndex);
  state.tableau[toCol].push(...moved);
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