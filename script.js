window.onerror = function(msg) {
  console.log("Error:", msg);
};

const boardElement = document.getElementById("board");

window.addEventListener("DOMContentLoaded", () => {
  drawBoard();
});

if (!boardElement) {
  console.error("Board not found!");
}

// Initial board setup
const board = [
  ["♜","♞","♝","♛","♚","♝","♞","♜"],
  ["♟","♟","♟","♟","♟","♟","♟","♟"],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["♙","♙","♙","♙","♙","♙","♙","♙"],
  ["♖","♘","♗","♕","♔","♗","♘","♖"]
];

let mateMovesMap = {};
let lastSounds = [];
let mateEscapeSquares = [];
let checkmatePieces = [];
let currentTurn = "white";
let gameOver = false;
let highlightedMoves = [];
let showCheckmateMoves = false;
let captureMoves = [];
let lastMove = null;
let gameStates = [];
let redoStates = [];
let moveHistory = [];
let pendingPromotion = null;
let kingMoved = { white: false, black: false };
let rookMoved = {
  white: { left: false, right: false },
  black: { left: false, right: false }
};
let enPassantTarget = null;
let selected = null;
let isFlipped = false;
let positionHistory = [];
let whiteCapturedPieces = [];
let blackCapturedPieces = [];
let halfmoveClock = 0;

function getPositionKey() {
  return JSON.stringify({
    board,
    turn: currentTurn,
    enPassantTarget,
    kingMoved,
    rookMoved
  });
}

// ⭐ NEW
function flipBoard() {
  isFlipped = !isFlipped;
  drawBoard();
}


document.addEventListener("dblclick", function(e) {
  e.preventDefault();
}, { passive: false });

const pieceValues = {
  "♙": 1,
  "♟": 1,

  "♘": 3,
  "♞": 3,

  "♗": 3,
  "♝": 3,

  "♖": 5,
  "♜": 5,

  "♕": 9,
  "♛": 9,

  "♔": 0,
  "♚": 0
};

// ================= DRAW BOARD =================
function drawBoard() {

  if (!isKingInCheck("white") && !isKingInCheck("black")) {
  hideCheckBanner();
  }

  boardElement.innerHTML = "";

  const whiteInCheck = isKingInCheck("white");
  const blackInCheck = isKingInCheck("black");

  const whiteAttackers = whiteInCheck ? getCheckingPieces("white") : [];
  const blackAttackers = blackInCheck ? getCheckingPieces("black") : [];

  const whiteSupporters = isCheckmate("white")
  ? getSupportingPieces("white")
  : [];

  const blackSupporters = isCheckmate("black")
  ? getSupportingPieces("black")
  : [];

  const whiteMatePieces = isCheckmate("white")
  ? getCheckmatePieces("white")
  : [];

  const blackMatePieces = isCheckmate("black")
  ? getCheckmatePieces("black")
  : [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {

      const displayR = isFlipped ? 7 - r : r;
      const displayC = isFlipped ? 7 - c : c;

      const cell = document.createElement("div");
      cell.classList.add("cell");

// ⭐ ATTACKERS
if (whiteAttackers.some(a => a.r === displayR && a.c === displayC)) {
  cell.classList.add("attacker");
}

if (blackAttackers.some(a => a.r === displayR && a.c === displayC)) {
  cell.classList.add("attacker");
}

// ⭐ SUPPORTERS
if (whiteSupporters.some(a => a.r === displayR && a.c === displayC)) {
  cell.classList.add("supporter");
}

if (blackSupporters.some(a => a.r === displayR && a.c === displayC)) {
  cell.classList.add("supporter");
}

// ⭐ CHECKMATE CONNECTIONS
if (whiteMatePieces.some(a => a.r === displayR && a.c === displayC)) {
  cell.classList.add("checkmate-piece");
}

if (blackMatePieces.some(a => a.r === displayR && a.c === displayC)) {
  cell.classList.add("checkmate-piece");
}

// ESCAPE EXPLANATION
const escapeInfo = mateEscapeSquares.find(
  m => m.r === displayR && m.c === displayC
);

if (escapeInfo) {

  const icon = document.createElement("div");

  icon.classList.add("escape-icon");

  if (escapeInfo.reason === "danger") {
    icon.classList.add("danger");
  }

  if (escapeInfo.reason === "block") {
    icon.classList.add("block");
  }

  cell.appendChild(icon);
}


      // ⭐ CHECK HIGHLIGHT
if (whiteInCheck) {
  const k = findKing("white");
  if (k.r === displayR && k.c === displayC) {
    cell.classList.add("king-in-check");
  }
}

if (blackInCheck) {
  const k = findKing("black");
  if (k.r === displayR && k.c === displayC) {
    cell.classList.add("king-in-check");
  }
}

      const files = ["a","b","c","d","e","f","g","h"];

      // coords
      if (c === 0) {
        const rank = document.createElement("div");
        rank.className = "coord coord-rank";
        rank.textContent = isFlipped ? r + 1 : 8 - r;
        cell.appendChild(rank);
      }

      if (r === 7) {
        const file = document.createElement("div");
        file.className = "coord coord-file";
        file.textContent = isFlipped ? files[7 - c] : files[c];
        cell.appendChild(file);
      }

      // last move
      if (
        lastMove &&
        ((lastMove.from.r === displayR && lastMove.from.c === displayC) ||
         (lastMove.to.r === displayR && lastMove.to.c === displayC))
      ) {
        cell.classList.add("last-move");
      }

      const isMove = highlightedMoves.some(m => m.r === displayR && m.c === displayC);
      const isCapture = captureMoves.some(m => m.r === displayR && m.c === displayC);

      if (isMove) {
        const dot = document.createElement("div");
        dot.classList.add("move-dot");
        cell.appendChild(dot);
      }

      if (isCapture) {
        const ring = document.createElement("div");
        ring.classList.add("capture-dot");
        cell.appendChild(ring);
      }

      cell.onclick = () => handleClick(displayR, displayC);

      if ((r + c) % 2 === 0) cell.classList.add("light-square");
else cell.classList.add("dark-square");

      cell.ondragover = (e) => e.preventDefault();

      cell.ondrop = (e) => {
        e.preventDefault();
        if (!selected) return;

        handleClick(displayR, displayC); // use your existing logic

        selected = null;
      };

      const piece = board[displayR][displayC];

      if (piece !== "") {
        const img = document.createElement("img");
        img.src = getPieceImage(piece);
        img.classList.add("piece");

        img.classList.add("piece");

        // correct piece direction for both sides
        let rotation = 0;

        // normal board
        if (!isFlipped) {
          if (isBlack(piece)) rotation = 180;
        }

        // flipped board
        else {
          if (isWhite(piece)) rotation = 180;
        }

        img.style.transform =
        `rotate(${rotation}deg) translateZ(0)`;

        img.draggable = true;

        img.ondragstart = (e) => {

  const isWrongTurn =
    (currentTurn === "white" && "♟♜♞♝♛♚".includes(piece)) ||
    (currentTurn === "black" && "♙♖♘♗♕♔".includes(piece));

  if (isWrongTurn) {
    e.preventDefault();
    return;
  }

  selected = { r: displayR, c: displayC };
};

        cell.appendChild(img);
      }

      boardElement.appendChild(cell);
    }
  }
  updateCheckUI();
  updateTurnBar();
}

function getCheckingPieces(color) {
  const attackers = [];
  const kingPos = findKing(color);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {

      const piece = board[r][c];
      if (piece === "") continue;

      // opponent pieces only
      if (
        (color === "white" && isBlack(piece)) ||
        (color === "black" && isWhite(piece))
      ) {
        if (isValidMove(piece, r, c, kingPos.r, kingPos.c)) {
          attackers.push({ r, c });
        }
      }
    }
  }

  return attackers;
}

function getSupportingPieces(color) {

  const supporters = [];
  const attackers = getCheckingPieces(color);

  for (const attacker of attackers) {

    const attackerPiece = board[attacker.r][attacker.c];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {

        const piece = board[r][c];

        if (piece === "") continue;

        // same side only
        const sameSide =
          (isWhite(attackerPiece) && isWhite(piece)) ||
          (isBlack(attackerPiece) && isBlack(piece));

        if (!sameSide) continue;

        // skip self
        if (r === attacker.r && c === attacker.c) continue;

        // ⭐ TEMPORARILY remove attacker piece
        const temp = board[attacker.r][attacker.c];
        board[attacker.r][attacker.c] = "";

        const protects = canAttack(
          piece,
          r,
          c,
          attacker.r,
          attacker.c
        );

        // restore
        board[attacker.r][attacker.c] = temp;

        if (protects) {

          if (!supporters.some(p => p.r === r && p.c === c)) {
            supporters.push({ r, c });
          }

        }
      }
    }
  }

  return supporters;
}

// Handle clicks
function handleClick(r, c) {

  if (gameOver) return;

  if (pendingPromotion) return;

  if (!selected) {
    const piece = board[r][c];

    if (piece === "") return;

    // block wrong turn
    if (currentTurn === "white" && isBlack(piece)) return;
    if (currentTurn === "black" && isWhite(piece)) return;

    selected = { r, c };

    const result = getPossibleMoves(piece, r, c);

    highlightedMoves = result.moves;
    captureMoves = result.captures;

    drawBoard();

  } else {

    const piece = board[selected.r][selected.c];

    // 👉 if you click another piece of same color → select it instead of moving
const clickedPiece = board[r][c];

if (clickedPiece !== "" &&
   ((currentTurn === "white" && isWhite(clickedPiece)) ||
    (currentTurn === "black" && isBlack(clickedPiece)))
) {
  selected = { r, c };

  const result = getPossibleMoves(clickedPiece, r, c);
  highlightedMoves = result.moves;
  captureMoves = result.captures;

  drawBoard();
  return;
}

    const prevEnPassant = enPassantTarget;

    if (isValidMove(piece, selected.r, selected.c, r, c)) {

        // if rook is captured → disable castling
if (board[r][c] === "♖") {
  if (r === 7 && c === 0) rookMoved.white.left = true;
  if (r === 7 && c === 7) rookMoved.white.right = true;
}

if (board[r][c] === "♜") {
  if (r === 0 && c === 0) rookMoved.black.left = true;
  if (r === 0 && c === 7) rookMoved.black.right = true;
}
      if (!makesMoveUnsafe(piece, selected.r, selected.c, r, c, currentTurn)) {

        // move piece (same as drag)
        // ⭐ detect en passant BEFORE move
let captured = board[r][c];

const isPawn = piece === "♙" || piece === "♟";

const isEnPassant =
  isPawn &&
  prevEnPassant &&
  r === prevEnPassant.r &&
  c === prevEnPassant.c &&
  selected.c !== c;

// ⭐ fix captured piece for en passant
if (isEnPassant) {
  captured = piece === "♙"
    ? board[r + 1][c]   // black pawn
    : board[r - 1][c];  // white pawn
}

gameStates.push({
  board: JSON.parse(JSON.stringify(board)),
  currentTurn,
  lastSounds: [...lastSounds],

  halfmoveClock,

  whiteCapturedPieces: [...whiteCapturedPieces],
  blackCapturedPieces: [...blackCapturedPieces],

  enPassantTarget: enPassantTarget ? { ...enPassantTarget } : null,
  kingMoved: JSON.parse(JSON.stringify(kingMoved)),
  rookMoved: JSON.parse(JSON.stringify(rookMoved)),
  moveHistory: [...moveHistory],
  positionHistory: [...positionHistory],
  lastMove: lastMove
    ? {
        from: { ...lastMove.from },
        to: { ...lastMove.to }
      }
    : null
});
// move
board[r][c] = piece;
board[selected.r][selected.c] = "";

// ⭐ CASTLING ROOK MOVE
if (piece === "♔" && Math.abs(selected.c - c) === 2) {

  // king side
  if (c === 6) {
    board[7][5] = "♖";
    board[7][7] = "";
    rookMoved.white.right = true;
  }

  // queen side
  if (c === 2) {
    board[7][3] = "♖";
    board[7][0] = "";
    rookMoved.white.left = true;
  }
}

if (piece === "♚" && Math.abs(selected.c - c) === 2) {

  // king side
  if (c === 6) {
    board[0][5] = "♜";
    board[0][7] = "";
    rookMoved.black.right = true;
  }

  // queen side
  if (c === 2) {
    board[0][3] = "♜";
    board[0][0] = "";
    rookMoved.black.left = true;
  }
}

// ⭐ ADD THIS HERE (IMPORTANT)
addMoveToHistory(piece, selected.r, selected.c, r, c, captured);

// AFTER MOVE (ONLY THIS)
// AFTER MOVE → promotion check
if (piece === "♙" && r === 0) {
  pendingPromotion = { color: "white", r, c };
}

if (piece === "♟" && r === 7) {
  pendingPromotion = { color: "black", r, c };
}

if (pendingPromotion) {

  selected = null;
  highlightedMoves = [];
  captureMoves = [];

  drawBoard();

  const modal = document.getElementById("promotionModal");

  modal.classList.remove("hidden", "white", "black");

  const isWhite = pendingPromotion.color === "white";

  modal.classList.add(isWhite ? "white" : "black");

  // ⭐ CHANGE IMAGES BASED ON COLOR
  const cards = document.querySelectorAll(".promo-card img");

  const pieces = isWhite
    ? {
        q: "wQueen.svg",
        r: "wRook.svg",
        b: "wBishop.svg",
        n: "wKnight.svg"
      }
    : {
        q: "bQueen.svg",
        r: "bRook.svg",
        b: "bBishop.svg",
        n: "bKnight.svg"
      };

  const order = ["q", "r", "b", "n"];

  cards.forEach((img, i) => {
    img.src = pieces[order[i]];
  });

  return;
}

// clear redo after new move
redoStates = [];

// ⭐ FIX: track king movement
if (piece === "♔") kingMoved.white = true;
if (piece === "♚") kingMoved.black = true;

// ⭐ FIX: track rook movement
if (piece === "♖" && selected.c === 0) rookMoved.white.left = true;
if (piece === "♖" && selected.c === 7) rookMoved.white.right = true;

if (piece === "♜" && selected.c === 0) rookMoved.black.left = true;
if (piece === "♜" && selected.c === 7) rookMoved.black.right = true;
lastMove = {
  from: { r: selected.r, c: selected.c },
  to: { r: r, c: c }
};

// ⭐ remove pawn (en passant)
if (isEnPassant) {
  if (piece === "♙") board[r + 1][c] = "";
  else board[r - 1][c] = "";
}

if (piece === "♙" && selected.r === 6 && r === 4) {
  enPassantTarget = { r: 5, c: c };
}
else if (piece === "♟" && selected.r === 1 && r === 3) {
  enPassantTarget = { r: 2, c: c };
}
else {
  enPassantTarget = null;
  }

                // 🔊 sounds
        lastSounds = [];

        if (captured !== "") {

  if (currentTurn === "white") {
    whiteCapturedPieces.push(captured);
  } else {
    blackCapturedPieces.push(captured);
  }

  updateCapturedUI();
}

          if (captured !== "") {
            lastSounds.push("capture");
            playCaptureSound();
          } else {
            lastSounds.push("move");
            playMoveSound();
          }

// 50 move rule
const isPawnMove =
  piece === "♙" || piece === "♟";

if (captured !== "" || isPawnMove) {
  halfmoveClock = 0;
} else {
  halfmoveClock++;
}

        // switch turn
        currentTurn = currentTurn === "white" ? "black" : "white";

        positionHistory.push(getPositionKey());

        if (isCheckmate(currentTurn)) {

      moveHistory[moveHistory.length - 1] =
        moveHistory[moveHistory.length - 1].replace("+", "");

      moveHistory[moveHistory.length - 1] += "#";

      gameOver = true;
      lastSounds.push("mate");
      playCheckmateSound();

      showCheckmateMoves = true;

      checkmatePieces = getCheckmatePieces(currentTurn);

      mateEscapeSquares =
        getMateEscapeInfo(currentTurn);

      // ⭐ winner
      const winner =
        currentTurn === "white"
          ? "black"
          : "white";

      // ⭐ SHOW MODAL
      setTimeout(() => {
        showCheckmateModal(winner);
      }, 300);
      }
            else if (isThreefoldRepetition()) {

              moveHistory[moveHistory.length - 1] += " = ½-½";

              updateHistoryUI();

            playDrawSound();

            showDrawModal("Threefold Repetition");

            gameOver = true;
          }
          else if (isInsufficientMaterial()) {

            moveHistory[moveHistory.length - 1] += " = ½-½";

            updateHistoryUI();

            playDrawSound();

            showDrawModal("Insufficient Material");

            gameOver = true;
          }

          else if (isFiftyMoveRule()) {

  moveHistory[moveHistory.length - 1] += " = ½-½";

  updateHistoryUI();

  playDrawSound();

  showDrawModal("50 Move Rule");

  gameOver = true;
}

          else if (isStalemate(currentTurn)) {

            moveHistory[moveHistory.length - 1] += " = ½-½";

            updateHistoryUI();

            playDrawSound();

            showDrawModal("Stalemate");

            gameOver = true;
          }
          else if (isKingInCheck(currentTurn) && !isCheckmate(currentTurn)) {
              showCheckBanner();
              moveHistory[moveHistory.length - 1] += "+";
              lastSounds.push("check");
              playCheckSound();
            }
            else {
              hideCheckBanner();
            }
        updateHistoryUI();
      }
    }

    selected = null;
    highlightedMoves = [];
    captureMoves = [];
  }
    drawBoard();

}

// Start game
drawBoard();

function getPieceImage(piece) {
  const map = {
    "♔": "Image/wKing.svg",
    "♕": "Image/wQueen.svg",
    "♖": "Image/wRook.svg",
    "♗": "Image/wBishop.svg",
    "♘": "Image/wKnight.svg",
    "♙": "Image/wPawn.svg",

    "♚": "Image/bKing.svg",
    "♛": "Image/bQueen.svg",
    "♜": "Image/bRook.svg",
    "♝": "Image/bBishop.svg",
    "♞": "Image/bKnight.svg",
    "♟": "Image/bPawn.svg"
  };

  return map[piece];
}

function isWhite(piece) {
  return "♙♖♘♗♕♔".includes(piece);
}

function isBlack(piece) {
  return "♟♜♞♝♛♚".includes(piece);
}

function isValidMove(piece, fr, fc, tr, tc) {

  if (fr === tr && fc === tc) return false;

  const target = board[tr][tc];

  if (target !== "") {
    if (
      ("♙♖♘♗♕♔".includes(piece) && "♙♖♘♗♕♔".includes(target)) ||
      ("♟♜♞♝♛♚".includes(piece) && "♟♜♞♝♛♚".includes(target))
    ) return false;
  }

  // KNIGHT
  if (piece === "♘" || piece === "♞") {
    let dr = Math.abs(fr - tr);
    let dc = Math.abs(fc - tc);
    return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
  }

  // ROOK
  if (piece === "♖" || piece === "♜") {
    if (fr !== tr && fc !== tc) return false;
    return pathClear(fr, fc, tr, tc);
  }

  // BISHOP
  if (piece === "♗" || piece === "♝") {
    if (Math.abs(fr - tr) !== Math.abs(fc - tc)) return false;
    return diagonalClear(fr, fc, tr, tc);
  }

  // QUEEN
  if (piece === "♕" || piece === "♛") {
    if (fr === tr || fc === tc) return pathClear(fr, fc, tr, tc);
    if (Math.abs(fr - tr) === Math.abs(fc - tc)) return diagonalClear(fr, fc, tr, tc);
    return false;
  }

  // KING
if (piece === "♔" || piece === "♚") {

  const color = piece === "♔" ? "white" : "black";

  // normal move
  if (Math.abs(fr - tr) <= 1 && Math.abs(fc - tc) <= 1) {
    return true;
  }

  // CASTLING
  if (fr === tr && Math.abs(fc - tc) === 2) {

    // ❌ king already moved
    if (color === "white" && kingMoved.white) return false;
    if (color === "black" && kingMoved.black) return false;

    // ❌ king in check
    if (isKingInCheck(color)) return false;

    // helper
    function squareSafe(col) {
      let temp = board[fr][col];
      board[fr][col] = piece;
      board[fr][fc] = "";

      let safe = !isKingInCheck(color);

      board[fr][fc] = piece;
      board[fr][col] = temp;

      return safe;
    }

    // =========================
    // WHITE
    // =========================
    if (color === "white") {

      // king side
      if (
        tc === 6 &&
        board[7][7] === "♖" &&
        !rookMoved.white.right &&
        board[7][5] === "" &&
        board[7][6] === "" &&
        squareSafe(5) &&
        squareSafe(6)
      ) return true;

      // queen side
      if (
        tc === 2 &&
        board[7][0] === "♖" &&
        !rookMoved.white.left &&
        board[7][1] === "" &&
        board[7][2] === "" &&
        board[7][3] === "" &&
        squareSafe(3) &&
        squareSafe(2)
      ) return true;
    }

    // =========================
    // BLACK
    // =========================
    if (color === "black") {

      // king side
      if (
        tc === 6 &&
        board[0][7] === "♜" &&
        !rookMoved.black.right &&
        board[0][5] === "" &&
        board[0][6] === "" &&
        squareSafe(5) &&
        squareSafe(6)
      ) return true;

      // queen side
      if (
        tc === 2 &&
        board[0][0] === "♜" &&
        !rookMoved.black.left &&
        board[0][1] === "" &&
        board[0][2] === "" &&
        board[0][3] === "" &&
        squareSafe(3) &&
        squareSafe(2)
      ) return true;
    }
  }

  return false;
}

  // PAWN
  if (piece === "♙") {
    if (tr === fr - 1 && fc === tc && board[tr][tc] === "") return true;
    if (
  fr === 6 &&
  tr === 4 &&
  fc === tc &&
  board[5][tc] === "" &&
  board[4][tc] === ""
) return true;
    if (
  tr === fr - 1 &&
  Math.abs(fc - tc) === 1 &&
  board[tr][tc] !== "" &&
  isBlack(board[tr][tc])
) return true;

    if (
      enPassantTarget &&
      tr === enPassantTarget.r &&
      tc === enPassantTarget.c &&
      Math.abs(fc - tc) === 1 &&
      fr === enPassantTarget.r + 1
    ) {
      return true;
    }
  }

  if (piece === "♟") {
    if (tr === fr + 1 && fc === tc && board[tr][tc] === "") return true;
    if (
  fr === 1 &&
  tr === 3 &&
  fc === tc &&
  board[2][tc] === "" &&
  board[3][tc] === ""
) return true;
    if (
  tr === fr + 1 &&
  Math.abs(fc - tc) === 1 &&
  board[tr][tc] !== "" &&
  isWhite(board[tr][tc])
) return true;
  
    if (
      enPassantTarget &&
      tr === enPassantTarget.r &&
      tc === enPassantTarget.c &&
      Math.abs(fc - tc) === 1 &&
      fr === enPassantTarget.r - 1
    ) {
      return true;
    }
  }
  return false;
}

function pathClear(fr, fc, tr, tc) {
  let stepR = tr === fr ? 0 : (tr > fr ? 1 : -1);
  let stepC = tc === fc ? 0 : (tc > fc ? 1 : -1);

  let r = fr + stepR;
  let c = fc + stepC;

  while (r !== tr || c !== tc) {
    if (board[r][c] !== "") return false;
    r += stepR;
    c += stepC;
  }

  return true;
}

function diagonalClear(fr, fc, tr, tc) {
  let rStep = tr > fr ? 1 : -1;
  let cStep = tc > fc ? 1 : -1;

  let r = fr + rStep;
  let c = fc + cStep;

  while (r !== tr) {
    if (board[r][c] !== "") return false;
    r += rStep;
    c += cStep;
  }

  return true;
}

function findKing(color) {
  const king = color === "white" ? "♔" : "♚";

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === king) {
        return { r, c };
      }
    }
  }
}

function isKingInCheck(color) {

  const kingPos = findKing(color);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {

      const piece = board[r][c];
      if (piece === "") continue;

      // check opponent pieces
      if (
        (color === "white" && "♟♜♞♝♛♚".includes(piece)) ||
        (color === "black" && "♙♖♘♗♕♔".includes(piece))
      ) {
        if (isValidMove(piece, r, c, kingPos.r, kingPos.c)) {
          return true;
        }
      }
    }
  }

  return false;
}

function isCheckmate(color) {

  // if not in check → not checkmate
  if (!isKingInCheck(color)) return false;

  // try all moves
  for (let r1 = 0; r1 < 8; r1++) {
    for (let c1 = 0; c1 < 8; c1++) {

      const piece = board[r1][c1];
      if (piece === "") continue;

      // only check current player's pieces
      if (
        (color === "white" && "♙♖♘♗♕♔".includes(piece)) ||
        (color === "black" && "♟♜♞♝♛♚".includes(piece))
      ) {

        for (let r2 = 0; r2 < 8; r2++) {
          for (let c2 = 0; c2 < 8; c2++) {

            if (isValidMove(piece, r1, c1, r2, c2)) {

              // simulate move
              let temp = board[r2][c2];
              board[r2][c2] = piece;
              board[r1][c1] = "";

              let safe = !isKingInCheck(color);

              // undo move
              board[r1][c1] = piece;
              board[r2][c2] = temp;

              if (safe) return false;
            }
          }
        }
      }
    }
  }

  return true;
}

function makesMoveUnsafe(piece, fr, fc, tr, tc, color) {

  let temp = board[tr][tc];

  // ⭐ handle en passant simulation
  let isPawn = piece === "♙" || piece === "♟";
  let isEnPassant =
    isPawn &&
    enPassantTarget &&
    tr === enPassantTarget.r &&
    tc === enPassantTarget.c &&
    fc !== tc;

  let capturedPawn = null;

  if (isEnPassant) {
    if (piece === "♙") {
      capturedPawn = board[tr + 1][tc];
      board[tr + 1][tc] = "";
    } else {
      capturedPawn = board[tr - 1][tc];
      board[tr - 1][tc] = "";
    }
  }

  // move
  board[tr][tc] = piece;
  board[fr][fc] = "";

  let inCheck = isKingInCheck(color);

  // undo
  board[fr][fc] = piece;
  board[tr][tc] = temp;

  if (isEnPassant) {
    if (piece === "♙") {
      board[tr + 1][tc] = capturedPawn;
    } else {
      board[tr - 1][tc] = capturedPawn;
    }
  }

  return inCheck;
}

function choosePromotion(type) {

  const modal = document.getElementById("promotionModal");

  let piece = "";

  // white pawn
  if (pendingPromotion.color === "white") {
    if (type === "q") piece = "♕";
    if (type === "r") piece = "♖";
    if (type === "b") piece = "♗";
    if (type === "n") piece = "♘";

    modal.classList.remove("black");
    modal.classList.add("white");
  }

  // black pawn
  else {
    if (type === "q") piece = "♛";
    if (type === "r") piece = "♜";
    if (type === "b") piece = "♝";
    if (type === "n") piece = "♞";

    modal.classList.remove("white");
    modal.classList.add("black");
  }

  // place piece
  board[pendingPromotion.r][pendingPromotion.c] = piece;

  pendingPromotion = null;

  modal.classList.add("hidden");

  currentTurn = currentTurn === "white" ? "black" : "white";

  const promoMap = { q: "Q", r: "R", b: "B", n: "N" };
  moveHistory[moveHistory.length - 1] += "=" + promoMap[type];

  if (isCheckmate(currentTurn)) {

      moveHistory[moveHistory.length - 1] =
        moveHistory[moveHistory.length - 1].replace("+", "");

      moveHistory[moveHistory.length - 1] += "#";

      const winner =
          currentTurn === "white"
            ? "black"
            : "white";

        setTimeout(() => {
          showCheckmateModal(winner);
        }, 300);

        gameOver = true;
            }
    else if (isKingInCheck(currentTurn) && !isCheckmate(currentTurn)) {
      moveHistory[moveHistory.length - 1] += "+";
    }

  updateHistoryUI();
  refreshUI();
}

function addMoveToHistory(piece, fr, fc, tr, tc, capturedPiece) {

  const files = ["a","b","c","d","e","f","g","h"];

  const target = capturedPiece;

  let move = "";

  // ⭐ CASTLING
  if ((piece === "♔" || piece === "♚") && Math.abs(fc - tc) === 2) {
    if (tc === 6) move = "O-O";
    else move = "O-O-O";
  }

  else {

    // piece letter
    const map = {
  "♙": "", "♟": "",
  "♘": "♘", "♞": "♞",
  "♗": "♗", "♝": "♝",
  "♖": "♖", "♜": "♜",
  "♕": "♕", "♛": "♛",
  "♔": "♔", "♚": "♚"
};

    move += map[piece];

    // ⭐ PAWN CAPTURE needs file letter
    const isPawn = piece === "♙" || piece === "♟";

const isCapture = capturedPiece !== "";

// ⭐ ONLY for pawn capture → add file
if (isPawn && isCapture) {
  move += files[fc];
}

// ⭐ ONLY if capture → add "x"
if (isCapture) {
  move += "x";
}

// square (always)
move += files[tc] + (8 - tr);

  }

  moveHistory.push(move);

  updateHistoryUI();
}

function updateHistoryUI() {
  const historyDiv = document.getElementById("history");
  historyDiv.innerHTML = "";

  for (let i = 0; i < moveHistory.length; i += 2) {
    const whiteMove = moveHistory[i] || "";
    const blackMove = moveHistory[i + 1] || "";

    const line = document.createElement("div");
    line.textContent = `${(i / 2) + 1}. ${whiteMove} ${blackMove}`;

    historyDiv.appendChild(line);
  }
    // auto scroll to latest move
  historyDiv.scrollLeft = historyDiv.scrollWidth;
}

function undoMove() {
  if (gameStates.length === 0) return;

  const last = gameStates.pop();

  // 🔥 push current state into redo stack
  redoStates.push({
  board: JSON.parse(JSON.stringify(board)),
  currentTurn,
  lastSounds: [...lastSounds],

  halfmoveClock,

  whiteCapturedPieces: [...whiteCapturedPieces],
  blackCapturedPieces: [...blackCapturedPieces],

  enPassantTarget,
  kingMoved: JSON.parse(JSON.stringify(kingMoved)),
  rookMoved: JSON.parse(JSON.stringify(rookMoved)),
  moveHistory: [...moveHistory],
  positionHistory: [...positionHistory],
  lastMove: lastMove
    ? {
        from: { ...lastMove.from },
        to: { ...lastMove.to }
      }
    : null
  });

  // restore everything
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      board[r][c] = last.board[r][c];
    }
  }

  currentTurn = last.currentTurn;

  halfmoveClock = last.halfmoveClock;

  lastSounds = [...last.lastSounds];


  whiteCapturedPieces = [...last.whiteCapturedPieces];
  blackCapturedPieces = [...last.blackCapturedPieces];

  enPassantTarget = last.enPassantTarget
  ? { ...last.enPassantTarget }
  : null;

  kingMoved = JSON.parse(JSON.stringify(last.kingMoved));
  rookMoved = JSON.parse(JSON.stringify(last.rookMoved));
  moveHistory = last.moveHistory;
  positionHistory = [...last.positionHistory];
  lastMove = last.lastMove;

  selected = null;
  highlightedMoves = [];
  captureMoves = [];
  gameOver = false;
  pendingPromotion = null;

  mateEscapeSquares = [];
  checkmatePieces = [];

  refreshCheckmateState();

  updateHistoryUI();
  updateCapturedUI();
  refreshUI();
}

function getPossibleMoves(piece, fr, fc) {
  let moves = [];
  let captures = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {

      if (isValidMove(piece, fr, fc, r, c)) {

        if (!makesMoveUnsafe(piece, fr, fc, r, c, currentTurn)) {

          if (board[r][c] === "") {
          moves.push({ r, c });
          } else {
            captures.push({ r, c });
          }

        }

      }
    }
  }

  return { moves, captures };
}

function redoMove() {
  if (redoStates.length === 0) return;

  const next = redoStates.pop();

  // save current into undo stack
  gameStates.push({
  board: JSON.parse(JSON.stringify(board)),
  currentTurn,
  lastSounds: [...lastSounds],

  whiteCapturedPieces: [...whiteCapturedPieces],
  blackCapturedPieces: [...blackCapturedPieces],
  enPassantTarget: enPassantTarget
    ? { ...enPassantTarget }
    : null,

  kingMoved: JSON.parse(JSON.stringify(kingMoved)),
  rookMoved: JSON.parse(JSON.stringify(rookMoved)),

  moveHistory: [...moveHistory],
  positionHistory: [...positionHistory],

  lastMove: lastMove
    ? {
        from: { ...lastMove.from },
        to: { ...lastMove.to }
      }
    : null
  });   

  // restore redo state
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      board[r][c] = next.board[r][c];
    }
  }

  currentTurn = next.currentTurn;

  halfmoveClock = next.halfmoveClock;

  enPassantTarget = next.enPassantTarget
  ? { ...next.enPassantTarget }
  : null;

  kingMoved = JSON.parse(JSON.stringify(next.kingMoved));
  rookMoved = JSON.parse(JSON.stringify(next.rookMoved));
  moveHistory = next.moveHistory;
  positionHistory = [...next.positionHistory];
  lastMove = next.lastMove;
  lastSounds = [...next.lastSounds];

  whiteCapturedPieces = [...next.whiteCapturedPieces];
  blackCapturedPieces = [...next.blackCapturedPieces];

  selected = null;
  highlightedMoves = [];
  captureMoves = [];
  gameOver = false;
  pendingPromotion = null;
  
  mateEscapeSquares = [];
  checkmatePieces = [];

  refreshCheckmateState();

  for (const sound of lastSounds) {

  if (sound === "move") {
    playMoveSound();
  }

  if (sound === "capture") {
    playCaptureSound();
  }

  if (sound === "check") {
    playCheckSound();
  }

  if (sound === "mate") {
    playCheckmateSound();
  }
  }

  updateHistoryUI();
  updateCapturedUI();
  refreshUI();
}

function resetGame() {

  mateEscapeSquares = [];
  gameOver = false;
  whiteCapturedPieces = [];
  blackCapturedPieces = [];

  // reset board
  const initialBoard = [
    ["♜","♞","♝","♛","♚","♝","♞","♜"],
    ["♟","♟","♟","♟","♟","♟","♟","♟"],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["♙","♙","♙","♙","♙","♙","♙","♙"],
    ["♖","♘","♗","♕","♔","♗","♘","♖"]
  ];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      board[r][c] = initialBoard[r][c];
    }
  }

  // reset game state
  currentTurn = "white";
  highlightedMoves = [];
  captureMoves = [];
  lastMove = null;
  selected = null;

  gameStates = [];
  redoStates = [];
  moveHistory = [];

  kingMoved = { white: false, black: false };
  rookMoved = {
    white: { left: false, right: false },
    black: { left: false, right: false }
  };

enPassantTarget = null;
halfmoveClock = 0;

  positionHistory = [getPositionKey()];
  updateHistoryUI();
  updateCapturedUI();
  refreshUI();
}
const history = document.getElementById("history");

let isDown = false;
let startX;
let scrollLeft;

history.addEventListener("mousedown", (e) => {
  isDown = true;
  history.classList.add("dragging");

  startX = e.pageX - history.offsetLeft;
  scrollLeft = history.scrollLeft;
});

history.addEventListener("mouseleave", () => {
  isDown = false;
});

history.addEventListener("mouseup", () => {
  isDown = false;
});

history.addEventListener("mousemove", (e) => {
  if (!isDown) return;

  e.preventDefault();

  const x = e.pageX - history.offsetLeft;
  const walk = (x - startX) * 2;

  history.scrollLeft = scrollLeft - walk;
});


// =========================
// TOUCH SUPPORT
// =========================

history.addEventListener("touchstart", (e) => {
  isDown = true;

  startX = e.touches[0].pageX - history.offsetLeft;
  scrollLeft = history.scrollLeft;
});

history.addEventListener("touchend", () => {
  isDown = false;
});

history.addEventListener("touchmove", (e) => {
  if (!isDown) return;

  const x = e.touches[0].pageX - history.offsetLeft;
  const walk = (x - startX) * 2;

  history.scrollLeft = scrollLeft - walk;
});

function drawCoordinates() {
  const container = document.getElementById("board-container");

  // remove old labels
  document.querySelectorAll(".file-label, .rank-label")
    .forEach(el => el.remove());

  const files = ["a","b","c","d","e","f","g","h"];

  // FILES (a-h)
  for (let c = 0; c < 8; c++) {
    const label = document.createElement("div");
    label.className = "file-label";
    label.textContent = files[c];

    label.style.left = (c * 70 + 30) + "px";

    container.appendChild(label);
  }

  // RANKS (8-1)
  for (let r = 0; r < 8; r++) {
    const label = document.createElement("div");
    label.className = "rank-label";
    label.textContent = 8 - r;

    label.style.top = (r * 70 + 25) + "px";

    container.appendChild(label);
  }
}

function isStalemate(color) {

  // if king is in check → NOT stalemate
  if (isKingInCheck(color)) return false;

  // check if any legal move exists
  for (let r1 = 0; r1 < 8; r1++) {
    for (let c1 = 0; c1 < 8; c1++) {

      const piece = board[r1][c1];
      if (piece === "") continue;

      if (
        (color === "white" && isWhite(piece)) ||
        (color === "black" && isBlack(piece))
      ) {

        for (let r2 = 0; r2 < 8; r2++) {
          for (let c2 = 0; c2 < 8; c2++) {

            if (isValidMove(piece, r1, c1, r2, c2)) {

              if (!makesMoveUnsafe(piece, r1, c1, r2, c2, color)) {
                return false; // found a legal move
              }

            }
          }
        }
      }
    }
  }

  return true; // no legal moves
}
function isInsufficientMaterial() {
  let pieces = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p !== "") pieces.push(p);
    }
  }

  // remove kings
  pieces = pieces.filter(p => p !== "♔" && p !== "♚");

  // only kings
  if (pieces.length === 0) return true;

  // king + bishop OR knight vs king
  if (pieces.length === 1) {
    return ["♗","♝","♘","♞"].includes(pieces[0]);
  }

  return false;
}
function isThreefoldRepetition() {
  let count = {};

  for (let pos of positionHistory) {
    count[pos] = (count[pos] || 0) + 1;
    if (count[pos] >= 3) return true;
  }

  return false;
}

function askReset() {

  // if game already finished → no popup
  if (gameOver) {
    resetGame();
    return;
  }

  // otherwise show warning
  document.getElementById("resetModal").classList.remove("hidden");
}

function closeReset() {
  document.getElementById("resetModal").classList.add("hidden");
}

function confirmReset() {
  document.getElementById("resetModal").classList.add("hidden");
  resetGame();
}

function getCheckmatePieces(color) {

  if (!isCheckmate(color)) return [];

  let connected = [];

  // 1️⃣ checking pieces
  const attackers = getCheckingPieces(color);

  attackers.forEach(p => {
    connected.push({ r: p.r, c: p.c });
  });

  // 2️⃣ supporters of attackers
  const supporters = getSupportingPieces(color);

  supporters.forEach(p => {

    if (!connected.some(x => x.r === p.r && x.c === p.c)) {
      connected.push({ r: p.r, c: p.c });
    }

  });

  // 3️⃣ pieces controlling escape squares
  const mateNet = getMateNetPieces(color);

  mateNet.forEach(p => {

    if (!connected.some(x => x.r === p.r && x.c === p.c)) {
      connected.push({ r: p.r, c: p.c });
    }

  });

  return connected;
}

function getMateNetPieces(color) {

  const king = findKing(color);

  const pieces = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {

      const piece = board[r][c];

      if (piece === "") continue;

      // enemy pieces only
      const enemy =
        (color === "white" && isBlack(piece)) ||
        (color === "black" && isWhite(piece));

      if (!enemy) continue;

      // skip checking piece
      const checking = getCheckingPieces(color);

      // test if piece controls ANY king escape square
let controlsMateNet = false;

for (let dr = -1; dr <= 1; dr++) {
  for (let dc = -1; dc <= 1; dc++) {

    if (dr === 0 && dc === 0) continue;

    const nr = king.r + dr;
    const nc = king.c + dc;

    if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;

    // ⭐ TEMP remove piece on escape square
    const temp = board[nr][nc];
    board[nr][nc] = "";

    const controls = isValidMove(piece, r, c, nr, nc);

    // restore
    board[nr][nc] = temp;

    if (controls) {
      controlsMateNet = true;
    }
  }
}

      // ALSO include protected checking pieces
      for (const atk of checking) {

        if (
          !(atk.r === r && atk.c === c) &&
          isValidMove(piece, r, c, atk.r, atk.c)
        ) {
          controlsMateNet = true;
        }
      }

      if (controlsMateNet) {

        if (!pieces.some(p => p.r === r && p.c === c)) {
          pieces.push({ r, c });
        }

      }
    }
  }

  return pieces;
}

function getMateEscapeInfo(color) {

  if (!isCheckmate(color)) return [];

  const king = findKing(color);

  let info = [];

  // all king surrounding squares
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {

      if (dr === 0 && dc === 0) continue;

      const nr = king.r + dr;
      const nc = king.c + dc;

      // outside board
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;

      // friendly piece blocking
      const target = board[nr][nc];

      if (
        (color === "white" && isWhite(target)) ||
        (color === "black" && isBlack(target))
      ) {

        info.push({
          r: nr,
          c: nc,
          reason: "block"
        });

        continue;
      }

      // simulate king move
      const kingPiece = color === "white" ? "♔" : "♚";

      const tempFrom = board[king.r][king.c];
      const tempTo = board[nr][nc];

      board[nr][nc] = kingPiece;
      board[king.r][king.c] = "";

      const unsafe = isKingInCheck(color);

      // restore
      board[king.r][king.c] = tempFrom;
      board[nr][nc] = tempTo;

      if (unsafe) {

        info.push({
          r: nr,
          c: nc,
          reason: "danger"
        });

      }
    }
  }

  return info;
}

function refreshCheckmateState() {
  checkmatePieces = [];
  mateEscapeSquares = [];
  showCheckmateMoves = false;

  if (isCheckmate(currentTurn)) {
    showCheckmateMoves = true;
    checkmatePieces = getCheckmatePieces(currentTurn);
    mateEscapeSquares = getMateEscapeInfo(currentTurn);
  }
}

function showCheckmateModal(winner) {

  const modal = document.getElementById("checkmateModal");

  const winnerText =
    winner === "white"
      ? "White Wins!"
      : "Black Wins!";

  const kingImg = winner === "white"
  ? "Image/wKing.svg"
  : "Image/bKing.svg";

  document.getElementById("mateWinner").innerHTML = `
  <img src="${kingImg}" style="width:60px;height:60px;vertical-align:middle;margin-right:8px;">
  ${winner === "white" ? "White Wins!" : "Black Wins!"}
`;

  modal.classList.remove("hidden");
}

function closeMateModal() {
  document
    .getElementById("checkmateModal")
    .classList.add("hidden");
}

function canAttack(piece, fr, fc, tr, tc) {

  // pawn attack rules only
  if (piece === "♙") {
    return (tr === fr - 1 && Math.abs(fc - tc) === 1);
  }

  if (piece === "♟") {
    return (tr === fr + 1 && Math.abs(fc - tc) === 1);
  }

  // for other pieces → reuse movement logic
  return isValidMove(piece, fr, fc, tr, tc);
}

function showCheckBanner() {
  document.getElementById("checkBanner").classList.remove("hidden");
}

function hideCheckBanner() {
  document.getElementById("checkBanner").classList.add("hidden");
}

function updateCheckUI() {

  const inCheck = isKingInCheck(currentTurn);
  const inCheckmate = isCheckmate(currentTurn);

  // ❌ never show banner in checkmate
  if (inCheck && !inCheckmate) {
    showCheckBanner();
  } else {
    hideCheckBanner();
  }
}

function refreshUI() {
  drawBoard();
  updateCheckUI();
  updateCapturedUI();
}


// Sound Section Start
const moveSound = new Audio("sounds/move.mp3");
const captureSound = new Audio("sounds/capture.mp3");
const checkSound = new Audio("sounds/check.mp3");
const mateSound = new Audio("sounds/checkmate.mp3");
const drawSound = new Audio("sounds/draw.mp3");

function safePlay(audio) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
function playMoveSound() {
  safePlay(moveSound);
}
function playCaptureSound() {
  safePlay(captureSound);
}
function playCheckSound() {
  safePlay(checkSound);
}
function playCheckmateSound() {
  safePlay(mateSound);
}
function playDrawSound() {
  safePlay(drawSound);
}
// Sound Section End

function updateTurnBar() {

  const whiteBar = document.getElementById("whiteTurn");
  const blackBar = document.getElementById("blackTurn");

  whiteBar.classList.remove("active");
  blackBar.classList.remove("active");

  if (currentTurn === "white") {
    whiteBar.classList.add("active");
  } else {
    blackBar.classList.add("active");
  }
}

function showDrawModal(reason) {

  const modal =
    document.getElementById("drawModal");

  document.getElementById("drawReason")
    .textContent = reason;

  modal.classList.remove("hidden");
}

function closeDrawModal() {

  document
    .getElementById("drawModal")
    .classList.add("hidden");
}

function updateCapturedUI() {

  const whiteBox =
    document.getElementById("whiteCaptured");

  const blackBox =
    document.getElementById("blackCaptured");

  whiteBox.innerHTML = "";
  blackBox.innerHTML = "";

  // white captured
  whiteCapturedPieces.forEach(piece => {

    const img = document.createElement("img");

    img.src = getPieceImage(piece);

    img.className = "captured-piece";

    whiteBox.appendChild(img);
  });

  // black captured
  blackCapturedPieces.forEach(piece => {

    const img = document.createElement("img");

    img.src = getPieceImage(piece);

    img.className = "captured-piece";

    blackBox.appendChild(img);
  });

  updatePoints();
}

function updatePoints() {

  let whiteScore = 0;
  let blackScore = 0;

  whiteCapturedPieces.forEach(p => {
    whiteScore += pieceValues[p];
  });

  blackCapturedPieces.forEach(p => {
    blackScore += pieceValues[p];
  });

  const whiteLead = whiteScore - blackScore;
  const blackLead = blackScore - whiteScore;

  document.getElementById("whitePoints")
    .textContent =
      whiteLead > 0 ? "+" + whiteLead : "+0";

  document.getElementById("blackPoints")
    .textContent =
      blackLead > 0 ? "+" + blackLead : "+0";
}

function isFiftyMoveRule() {
  return halfmoveClock >= 100;
}

const landscapeBtn = document.getElementById("landscapeBtn");

landscapeBtn.addEventListener("click", () => {
  document.body.classList.toggle("board-landscape");

  if (document.body.classList.contains("board-landscape")) {
    landscapeBtn.textContent = "Portrait";
  } else {
    landscapeBtn.textContent = "Landscape";
  }
});
