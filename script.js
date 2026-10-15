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
    2: "What we've been in for five years",
    5: "My person",
    6: "Secret messages, like the one that got you here",
    9: "What evening puzzles somehow turn into",
  },
  down: {
    1: "Tolstoy's Ivan ___",
    3: "Sounds from a crowd at a fireworks show",
    4: "Streaming service once owned by Walmart",
    7: "TV drama set in a Chicago hospital",
    8: "Ship's prefix",
  },
};

const KEY = "five-for-five";
const sections = [...document.querySelectorAll(".puzzle")];
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function load() {
  try { return Number(localStorage.getItem(KEY)) || 1; } catch { return 1; }
}
function save(n) {
  try { localStorage.setItem(KEY, n); } catch {}
}

// Show every puzzle up to and including the first unsolved one.
function render() {
  const done = load();
  sections.forEach(s => {
    const n = Number(s.dataset.n);
    s.hidden = n > done + 1;
    s.classList.toggle("solved", n <= done);
  });
  document.getElementById("finale").hidden = done < sections.length;
}

function solve(n) {
  if (n > load()) save(n);
  render();
}

// Text answers
document.querySelectorAll("form.answer").forEach(form => {
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

// Bracket City: wrap each [...] in a span shaded by depth, *...* in italics.
(function () {
  const el = document.getElementById("brackets");
  const text = el.textContent;
  let html = "", depth = 0;
  let em = false;
  for (const ch of text) {
    if (ch === "[") {
      depth++;
      html += `<span class="b d${Math.min(depth, 4)}"><span class="br">[</span>`;
    } else if (ch === "]") {
      depth--;
      html += `<span class="br">]</span></span>`;
    } else if (ch === "*") {
      html += em ? "</em>" : "<em>";
      em = !em;
    } else {
      html += ch.replace("&", "&amp;").replace("<", "&lt;");
    }
  }
  el.innerHTML = html;
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

  // If it was already solved on this device, fill it in.
  if (load() >= 4) {
    cells.flat().filter(Boolean).forEach(({ input, r, c }) => { input.value = GRID[r][c]; input.readOnly = true; });
  }
})();

// Hide photo slots that haven't been filled in yet.
document.querySelectorAll(".photos img").forEach(img => {
  img.addEventListener("error", () => img.remove());
});

render();
