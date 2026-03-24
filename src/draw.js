"use strict";

function renderCard(card, column, i) {
  const el = document.createElement("img");
  el.classList.add("card");
  el.id = card.id;

  el.dataset.column = column;
  el.dataset.index = i;

  if (card.faceUp) {
    el.src = `res/img/${card.suit + card.rank}.png`
  } else {
    el.src = "res/img/back0.png";
  }
  el.addEventListener("mousedown", startDrag)
  return el;
}

function renderColumn(column, columnIndex) {
  const el = document.createElement("div");
  el.classList.add("column");
  const emptyEl = document.createElement("img");
  emptyEl.classList.add("card");
  emptyEl.src = "res/img/empty.png";

  el.appendChild(emptyEl);

  let offsets = 0;
  column.forEach((card, i) => {
    const cardEl = renderCard(card, columnIndex, i);
    cardEl.style.top = `${offsets}px`;
    el.appendChild(cardEl);

    if (card.faceUp === false) {
      offsets += 7;
    } else {
      offsets += 27.5;
    }
  });

  return el;
}

function renderBoard() {
  const board = document.getElementById("board");
  board.innerHTML = "";

  state.tableau.forEach((column, i) => {
    const el = renderColumn(column, i);
    board.appendChild(el)
  });

  if (state.stock.length > 0) {
    const stock = document.createElement("div");
    for (let i = 0; i < Math.floor(state.stock.length / 10); i++) {
      const back = document.createElement("img");
      back.classList.add("stock");
      back.style.right = 24 + i*9 + "px";
      back.onclick = () => { deal() };
      back.src = `res/img/back0.png`;
      stock.appendChild(back);
    }
    board.appendChild(stock);
  }
  if (state.completed.length > 0) {
    const completed = document.createElement("div");
    for (let i = 0; i < state.completed.length; i++) {
      const king = document.createElement("img");
      king.classList.add("completed");
      king.style.left = 24 + i*12 + "px";
      king.onclick = () => { alert("good job??!?"); }
      king.src = `res/img/${state.completed[i][0].suit}13.png`;
      completed.appendChild(king);
    }
    board.appendChild(completed);
  }

  document.getElementById("score").innerHTML = "Score: " + score;
  document.getElementById("moves").innerHTML = "Moves: " + moves;
}

function startDrag(e) {

  e.preventDefault();
  const column = Number(e.target.dataset.column);
  const index = Number(e.target.dataset.index);
  if (!validPickup(column, index)) return;

  const columnCards = state.tableau[column];

  dragging.active = true;
  dragging.column = column;
  dragging.index = index;
  dragging.cards = columnCards.slice(index);

  dragging.offsetX = e.offsetX;
  dragging.offsetY = e.offsetY;

  // i don't know why this works
  const cards = document.querySelectorAll(`[data-column="${column}"]`);

  for (let i = index; i < cards.length; i++) {
    cards[i].classList.add("dragging");
  }

  // set listeners
  document.addEventListener("mousemove", dragMove);
  document.addEventListener("mouseup", endDrag);

  // call to fix position
  dragMove(e);
}

function dragMove(e) {
  if (!dragging.active) return;

  const cards = document.querySelectorAll(".dragging");
  cards.forEach((card, i) => {
    card.style.left = (e.pageX - dragging.offsetX - 1) + "px";
    card.style.top = (e.pageY - dragging.offsetY - 1) + i * 27.5 + "px";
  })
}

function endDrag(e) {
  console.log("this has to end.")

  if (!dragging.active) return;

  const column = validColumn(e.pageX);

  if (column !== null && validDrop(dragging.column, dragging.index, column)) {
    moveCards(dragging.column, dragging.index, column)
  }

  dragging.active = false;
  document.removeEventListener("mousemove", dragMove);
  document.removeEventListener("mouseup", endDrag);

  const cards = document.querySelectorAll(".dragging");

  cards.forEach(card => {
    card.classList.remove("dragging");
    card.style.left = "";
    card.style.top = "";
  });

  cardLogic();
  renderBoard();
}

renderBoard();