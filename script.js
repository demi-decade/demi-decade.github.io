// Crossword. "." is a black square. Clues are keyed by their number.
const GRID = [
  "I....",
  "LOVE.",
  "YOU..",
  "CODES",
  "HOURS",
];
const CLUES = {
  across: {
    1: "Me, myself and ___",
    2: "What we've been in for 5 lovely years",
    5: "My person",
    6: "What Emeline calls code files",
    9: "What evening puzzles somehow turn into",
  },
  down: {
    1: "\"I love you CutenHiemer,\" for short",
    3: "Aaaaaa counterpart",
    4: "\"Don't know how you do the ___ that you do so well, it's a spell, hell, makes me wanna shoop!\"",
    7: "Where I went promptly after I biked to come see you in the dark",
    8: "Something a small snake should say",
  },
};

const sections = [...document.querySelectorAll(".puzzle")];
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Nothing is saved, so a refresh starts over. The letter (puzzle 1) is already done.
let done = 1;

// Show every puzzle up to and including the first unsolved one.
function render() {
  sections.forEach(s => {
    const n = Number(s.dataset.n);
    s.hidden = n > done + 1;
    s.classList.toggle("solved", n <= done);
  });
}

function solve(n) {
  done = Math.max(done, n);
  render();
}

// Skip button on each puzzle. A puzzle can register how to show itself as finished.
const SKIPS = {};
sections.slice(1).forEach(s => {
  const btn = document.createElement("button");
  btn.className = "skip";
  btn.textContent = "Skip";
  btn.addEventListener("click", () => {
    (SKIPS[s.dataset.n] || (() => {}))();
    solve(Number(s.dataset.n));
  });
  s.appendChild(btn);
});

// Text answers
document.querySelectorAll("form.answer[data-answer]").forEach(form => {
  const input = form.querySelector("input");
  const msg = form.querySelector(".msg");
  const n = Number(form.closest(".puzzle").dataset.n);
  form.addEventListener("submit", e => {
    e.preventDefault();
    const guess = norm(input.value);
    const answer = form.dataset.answer;
    const ok = "contains" in form.dataset ? guess.includes(answer) : guess === answer;
    if (ok) {
      msg.textContent = "That's it.";
      msg.className = "msg good";
      solve(n);
    } else {
      msg.textContent = guess ? "Not quite." : "";
      msg.className = "msg";
    }
  });
});

// Bracket City. One entry per "[", in the order they appear in the text.
// The first answer listed is what gets shown once it's solved; any of them is accepted.
const BRACKETS = [
  ["C.S.", "cs"],              // "To [...] at all is to be vulnerable" -- __ lewis
  ["love"],                    // w[...] comes before fifteen, to some
  ["hat"],                     // yours says "Michigan La[...]e" for some reason
  ["cross"],                   // 🩸 red --> ___ --> fit 💪
  ["so", "sew"],               // 🎵 a [...]le pulling thread 🎵
  ["need"],                    // all you __ is love!
  ["line"],                    // 🪢 [...] ____ up ⬆️
  ["bow"],                     // what you do after one of your orchestra per[...]ances
  ["form"],                    // __ vs. function
  ["cell"],                    // might be Eucaryotic or Procaryotic
  ["BS", "bs"],                // What's a babes without lincoln?
  ["Nuclear"],                 // the a[...]'s family?
  ["tom"],                     // Jerry's arch enemy
  ["Engineering"],             // One of the E s in EECS
];

(function () {
  const el = document.getElementById("brackets");
  const form = document.getElementById("bracket-form");
  const input = form.querySelector("input");
  const msg = form.querySelector(".msg");

  // Parse the text into a tree of strings and bracket nodes.
  const nodes = [];
  const root = { kids: [] };
  const stack = [root];
  for (const ch of el.textContent.trim()) {
    const top = stack[stack.length - 1];
    if (ch === "[") {
      const node = { kids: [], id: nodes.length, solved: false };
      nodes.push(node);
      top.kids.push(node);
      stack.push(node);
    } else if (ch === "]") {
      stack.pop();
    } else if (typeof top.kids[top.kids.length - 1] === "string") {
      top.kids[top.kids.length - 1] += ch;
    } else {
      top.kids.push(ch);
    }
  }


  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const isOpen = n => !n.solved && n.kids.every(k => typeof k === "string" || k.solved);

  function html(node) {
    return node.kids.map(k => {
      if (typeof k === "string") return esc(k);
      if (k.solved) return `<span class="done">${esc(BRACKETS[k.id][0])}</span>`;
      const inner = `[${html(k)}]`;
      return isOpen(k) ? `<span class="live">${inner}</span>` : inner;
    }).join("");
  }

  function draw() { el.innerHTML = html(root); }

  SKIPS[3] = () => {
    nodes.forEach(n => n.solved = true);
    draw();
  };

  form.addEventListener("submit", e => {
    e.preventDefault();
    const guess = norm(input.value);
    if (!guess) return;
    const hit = nodes.find(n => isOpen(n) && BRACKETS[n.id].some(a => norm(a) === guess));
    if (hit) {
      hit.solved = true;
      input.value = "";
      msg.textContent = "";
      draw();
      if (nodes.every(n => n.solved)) solve(3);
    } else {
      msg.textContent = "Not quite.";
      msg.className = "msg";
    }
  });

  draw();
})();

// Crossword
(function () {
  const gridEl = document.getElementById("grid");
  const rows = GRID.length, cols = GRID[0].length;
  const open = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols && GRID[r][c] !== ".";
  const cells = [];
  const words = { across: {}, down: {} }; // number -> [[r,c], ...]
  let num = 0;

  for (let r = 0; r < rows; r++) {
    cells.push([]);
    for (let c = 0; c < cols; c++) {
      const box = document.createElement("div");
      box.className = "cellbox";
      gridEl.appendChild(box);
      if (!open(r, c)) { box.classList.add("block"); cells[r].push(null); continue; }

      // Any cell with nothing to its left starts an across word (so 1-Across can be "I").
      const startsAcross = !open(r, c - 1);
      const startsDown = !open(r - 1, c) && open(r + 1, c);
      if (startsAcross || startsDown) {
        num++;
        box.insertAdjacentHTML("beforeend", `<span class="n">${num}</span>`);
        if (startsAcross) {
          const w = [];
          for (let k = c; open(r, k); k++) w.push([r, k]);
          words.across[num] = w;
        }
        if (startsDown) {
          const w = [];
          for (let k = r; open(k, c); k++) w.push([k, c]);
          words.down[num] = w;
        }
      }
      const input = document.createElement("input");
      input.autocapitalize = "characters";
      input.setAttribute("aria-label", `row ${r + 1} column ${c + 1}`);
      box.appendChild(input);
      cells[r].push({ box, input, r, c });
    }
  }

  for (const dir of ["across", "down"]) {
    const ol = document.getElementById(dir);
    for (const n of Object.keys(words[dir])) {
      const li = document.createElement("li");
      li.dataset.key = dir + n;
      li.innerHTML = `<b>${n}</b>${CLUES[dir][n] || ""}`;
      li.addEventListener("click", () => { dirNow = dir; focus(...words[dir][n][0]); });
      ol.appendChild(li);
    }
  }

  let dirNow = "across";
  let cur = null;

  function wordAt(r, c, dir) {
    for (const [n, w] of Object.entries(words[dir]))
      if (w.some(([a, b]) => a === r && b === c)) return [n, w];
    return null;
  }

  function highlight() {
    document.querySelectorAll(".cellbox").forEach(b => b.classList.remove("word", "cur"));
    document.querySelectorAll(".clues li").forEach(li => li.classList.remove("on"));
    if (!cur) return;
    if (!wordAt(cur.r, cur.c, dirNow)) dirNow = dirNow === "across" ? "down" : "across";
    const found = wordAt(cur.r, cur.c, dirNow);
    if (found) {
      found[1].forEach(([r, c]) => cells[r][c].box.classList.add("word"));
      document.querySelector(`[data-key="${dirNow}${found[0]}"]`).classList.add("on");
    }
    cur.box.classList.add("cur");
  }

  function focus(r, c) {
    if (open(r, c)) cells[r][c].input.focus();
  }

  function step(delta) {
    const [dr, dc] = dirNow === "across" ? [0, delta] : [delta, 0];
    focus(cur.r + dr, cur.c + dc);
  }

  function check() {
    let full = true, right = true;
    cells.flat().filter(Boolean).forEach(({ input, r, c }) => {
      const v = input.value.toUpperCase();
      if (!v) full = false;
      if (v && v !== GRID[r][c]) right = false;
    });
    const msg = document.getElementById("xw-msg");
    if (full && right) {
      msg.textContent = "That's it.";
      msg.className = "msg good";
      cells.flat().filter(Boolean).forEach(({ input }) => input.readOnly = true);
      solve(4);
    } else if (full) {
      msg.textContent = "Not quite. Something's off.";
      msg.className = "msg";
    } else {
      msg.textContent = "";
    }
  }

  cells.flat().filter(Boolean).forEach(cell => {
    const { input, r, c } = cell;
    input.addEventListener("focus", () => { cur = cell; highlight(); });
    input.addEventListener("mousedown", () => {
      if (cur === cell) { dirNow = dirNow === "across" ? "down" : "across"; highlight(); }
    });
    input.addEventListener("input", () => {
      input.value = input.value.slice(-1).toUpperCase();
      if (input.value) step(1);
      check();
    });
    input.addEventListener("keydown", e => {
      const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
      if (/^[a-z]$/i.test(e.key) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (input.readOnly) return;
        input.value = e.key.toUpperCase();
        step(1);
        check();
      } else if (moves[e.key]) {
        e.preventDefault();
        const [dr, dc] = moves[e.key];
        dirNow = dr ? "down" : "across";
        if (open(r + dr, c + dc)) focus(r + dr, c + dc); else highlight();
      } else if (e.key === "Backspace" && !input.value) {
        e.preventDefault();
        step(-1);
        if (cur !== cell) { cur.input.value = ""; check(); }
      }
    });
  });

  SKIPS[4] = () => {
    cells.flat().filter(Boolean).forEach(({ input, r, c }) => { input.value = GRID[r][c]; input.readOnly = true; });
  };
})();

// Where Taken: one photo at a time, photos/1.jpg, photos/2.jpg, ... in this order.
// Use an array to accept more than one answer for a photo.
const PLACES = ["california", "wisconsin", "illinois", "space", "indiana", "michigan", "ontario", "utah", ["carolina", "south carolina"]];

(function () {
  const img = document.getElementById("photo");
  const count = document.getElementById("photo-count");
  const form = document.getElementById("photo-form");
  const input = form.querySelector("input");
  const msg = form.querySelector(".msg");

  let i = 0;

  function show() {
    img.src = `photos/${i + 1}.jpg`;
    count.textContent = `${i + 1} of ${PLACES.length}`;
    if (i + 1 < PLACES.length) new Image().src = `photos/${i + 2}.jpg`;
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    const guess = norm(input.value);
    if (!guess) return;
    if (![].concat(PLACES[i]).some(p => norm(p) === guess)) {
      msg.textContent = "Not quite.";
      msg.className = "msg";
      return;
    }
    input.value = "";
    msg.textContent = "";
    if (i + 1 === PLACES.length) return solve(5);
    i++;
    show();
  });

  show();
})();

render();
