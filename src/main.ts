import "./style.css";

type Side = "heads" | "tails";
type FlipResponse = { result: Side };

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root was not found");

const catSprite = `
  <svg class="sprite" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
    <path d="M2 1h3v2h6V1h3v4h1v7h-2v2H3v-2H1V5h1z" fill="currentColor"/>
    <path d="M3 3h2v2h6V3h2v4h1v4h-2v2H4v-2H2V7h1z" fill="#111"/>
    <path d="M4 6h3v2H4zm5 0h3v2H9z" fill="#fff"/>
    <path d="M5 6h1v2H5zm5 0h1v2h-1z" fill="#b9fffb"/>
    <path d="M7 9h2v1H7zm1 1v1H6v1h4v-1H8" fill="#fff"/>
    <path d="M1 7h1v2H1zm13 0h1v2h-1z" fill="#b9fffb"/>
    <path d="M4 13h2v2H4zm6 0h2v2h-2z" fill="currentColor"/>
  </svg>`;
const tailSprite = `
  <svg class="sprite tail-sprite" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
    <path d="M12 2h2v4h-2V4H9V2h3zM7 4h3v2H7V4zM5 6h3v2H5V6zM4 8h3v3h2v2H4v-2H2V9h2V8z" fill="currentColor"/>
    <path d="M12 2h2v2h-2zM7 4h3v2H7zM5 6h3v2H5zM4 8h3v3H4z" fill="#fff"/>
    <path d="M8 5h2v1H8zM6 7h2v1H6zM5 9h2v2H5z" fill="#111"/>
  </svg>`;

app.innerHTML = `
  <main class="universe">
    <div class="starfield" aria-hidden="true"></div>
    <div class="scanlines" aria-hidden="true"></div>
    <header class="topbar">
      <a class="brand" href="/" aria-label="Void Kitty home"><span class="brand-icon">◈</span> VOID<span>KITTY</span></a>
      <div class="signal"><span class="signal-dot"></span> QUANTUM COIN // ONLINE</div>
    </header>
    <div class="layout">
      <aside class="side-note left-note" aria-hidden="true">
        <span class="note-label">COSMIC ODDS</span>
        <span class="note-value">50 : 50</span>
        <span class="note-small">NO LUCK MODIFIERS</span>
      </aside>
      <section class="console" aria-labelledby="title">
        <div class="console-top"><span>FLIP TERMINAL <b>v.01</b></span><span class="live"><i></i> LIVE</span></div>
        <p class="eyebrow">THE VOID IS WAITING</p>
        <h1 id="title">Choose your<br><span>destiny.</span></h1>
        <p class="subtitle">One coin. Two fates. Zero rigging.</p>
        <div class="coin-stage" aria-live="polite">
          <div class="orbit orbit-one"></div>
          <div class="orbit orbit-two"></div>
          <span class="stage-star star-a">✦</span><span class="stage-star star-b">·</span>
          <div class="coin" id="coin" data-side="heads">
            <div class="coin-face coin-heads">
              <span class="coin-stamp">01</span>${catSprite}<small>CAT / HEADS</small>
            </div>
            <div class="coin-face coin-tails">
              <span class="coin-stamp">02</span>${tailSprite}<small>TAIL / TAILS</small>
            </div>
          </div>
        </div>
        <p class="result" id="result" aria-live="polite">READY TO DEFY FATE?</p>
        <button id="flip" type="button"><span class="button-label">TOSS THE COIN</span><span class="button-icon" aria-hidden="true">↗</span></button>
        <section class="probability" aria-label="Flip probability and session results">
          <div class="probability-heading"><span>PER-FLIP PROBABILITY</span><strong>50% <i>/</i> 50%</strong></div>
          <div class="odds-bar" aria-hidden="true"><span class="odds-heads"></span><span class="odds-tails"></span></div>
          <div class="session-heading"><span>ACTUAL SESSION SPLIT</span><span id="session-split">50% / 50%</span></div>
          <div class="session-bar" aria-hidden="true"><span class="session-heads"></span><span class="session-tails"></span></div>
          <div class="session-heading"><span>THIS SESSION <b id="flip-count">0 FLIPS</b></span><span>OBSERVED RESULTS</span></div>
          <div class="session-stats">
            <div class="stat"><span class="stat-label"><i class="cat-pip"></i> CAT / HEADS</span><b id="heads-stat">0 <small>—</small></b></div>
            <div class="stat"><span class="stat-label"><i class="tail-pip"></i> TAIL / TAILS</span><b id="tails-stat">0 <small>—</small></b></div>
          </div>
          <div class="history" id="history" aria-label="Recent flip results"></div>
        </section>
        <p class="hint" id="hint">Each toss is independent. A streak never changes the odds.</p>
      </section>
      <aside class="side-note right-note">
        <div class="pixel-cat" aria-hidden="true">${catSprite}</div>
        <span class="note-label">YOUR ORACLE</span>
        <span class="note-value">M0TH</span>
        <span class="note-small">SPACE CAT / LV. 09</span>
      </aside>
    </div>
    <footer><span>✦</span> A TINY C++ ENGINE IN A VERY LARGE UNIVERSE <span>✦</span></footer>
  </main>
`;

const button = document.querySelector<HTMLButtonElement>("#flip")!;
const coin = document.querySelector<HTMLDivElement>("#coin")!;
const result = document.querySelector<HTMLParagraphElement>("#result")!;
const hint = document.querySelector<HTMLParagraphElement>("#hint")!;
const flipCount = document.querySelector<HTMLElement>("#flip-count")!;
const sessionSplit = document.querySelector<HTMLElement>("#session-split")!;
const headsStat = document.querySelector<HTMLElement>("#heads-stat")!;
const tailsStat = document.querySelector<HTMLElement>("#tails-stat")!;
const history = document.querySelector<HTMLDivElement>("#history")!;
const session = { heads: 0, tails: 0, recent: [] as Side[] };

function updateStats() {
  const total = session.heads + session.tails;
  const headsPercent = total ? Math.round((session.heads / total) * 100) : 50;
  const tailsPercent = 100 - headsPercent;
  flipCount.textContent = `${total} ${total === 1 ? "FLIP" : "FLIPS"}`;
  headsStat.innerHTML = `${session.heads} <small>${total ? headsPercent + "%" : "—"}</small>`;
  tailsStat.innerHTML = `${session.tails} <small>${total ? tailsPercent + "%" : "—"}</small>`;
  sessionSplit.textContent = `${headsPercent}% / ${tailsPercent}%`;
  document.documentElement.style.setProperty("--session-heads", `${total ? (session.heads / total) * 100 : 50}%`);
  history.innerHTML = session.recent.map((side) =>
    `<span class="history-dot ${side}" aria-label="${side}"></span>`
  ).join("");
}

button.addEventListener("click", async () => {
  button.disabled = true;
  button.querySelector(".button-label")!.textContent = "IN THE VOID…";
  result.textContent = "COIN IN FLIGHT";
  hint.textContent = "The outcome is being chosen by the C++ engine.";
  coin.classList.remove("show-heads", "show-tails", "tossing");
  document.documentElement.dataset.side = "tossing";
  void coin.offsetWidth;
  coin.classList.add("tossing");

  try {
    const response = await fetch("/api/flip", { method: "POST" });
    if (!response.ok) throw new Error(`Flip failed (${response.status})`);
    const data: FlipResponse = await response.json();
    if (data.result !== "heads" && data.result !== "tails") throw new Error("The C++ engine returned an invalid result.");
    await new Promise((resolve) => window.setTimeout(resolve, 1100));
    coin.classList.remove("tossing");
    coin.classList.add(`show-${data.result}`);
    coin.dataset.side = data.result;
    document.documentElement.dataset.side = data.result;
    session[data.result] += 1;
    session.recent.push(data.result);
    if (session.recent.length > 12) session.recent.shift();
    updateStats();
    result.textContent = data.result === "heads" ? "THE CAT HAS SPOKEN" : "TAILS FROM THE VOID";
    hint.textContent = "Next toss is still an independent 50 / 50.";
  } catch (error) {
    coin.classList.remove("tossing");
    document.documentElement.dataset.side = coin.dataset.side;
    result.textContent = "SIGNAL LOST";
    hint.textContent = error instanceof Error ? error.message : "The C++ engine could not flip. Try again.";
  } finally {
    button.disabled = false;
    button.querySelector(".button-label")!.textContent = "TOSS AGAIN";
  }
});
