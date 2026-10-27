# VOIDKITTY Learning Guide

This guide walks through the landing page from the browser's first render to the final result. The source references below refer to the current 1-based line numbers in [`../src/main.ts`](../src/main.ts). Blank lines are only visual separators.

## The whole trip, in one picture

1. The browser loads `index.html`, which mounts a single `#app` element and loads `src/main.ts`.
2. Vite compiles TypeScript and imports the styles from `src/style.css`.
3. `main.ts` constructs the landing page and its pixel sprites.
4. Clicking **TOSS THE COIN** starts the CSS animation and sends `POST /api/flip`.
5. The native C++ server selects one result and replies with JSON, such as `{"result":"tails"}`.
6. TypeScript validates the response, lands the coin on the matching side, changes the accent color, and updates this tab's running history.

The TypeScript code does not choose the result. It asks the C++ endpoint and displays the answer it receives.

## Landing page code, line by line

### Imports, types, and root element — lines 1–7

| Line | What it does |
|---|---|
| 1 | Imports the stylesheet. Vite sees this import and includes the CSS in development and the production bundle. |
| 3 | Defines `Side` as a union type: only the exact strings `"heads"` and `"tails"` are valid sides. |
| 4 | Defines the shape of the backend JSON response. `result` must have the `Side` type. |
| 6 | Finds the page element with id `app` and tells TypeScript it should be a `div` (or `null` if absent). |
| 7 | Fails immediately with a useful error if the HTML shell is missing `#app`; later rendering would otherwise fail less clearly. |

### The little pixel sprites — lines 9–24

The two template strings contain inline SVG. SVG uses a coordinate grid; the paths draw shapes in that grid. `shape-rendering="crispEdges"` keeps the tiny drawing blocky instead of smoothing its pixels.

| Line(s) | What it draws or means |
|---|---|
| 9 | Starts the cat sprite string with a JavaScript template literal. |
| 10 | Opens a 16-by-16 SVG coordinate system and marks it as decorative for screen readers. |
| 11 | Draws the cat's outer silhouette and pointed ears using a filled SVG path. |
| 12 | Adds the dark face/body interior, carving out the pixel-art outline. |
| 13 | Draws the two white eye regions. |
| 14 | Adds the cyan visor glints/pupils. |
| 15 | Draws the small nose and mouth. |
| 16 | Adds the bright side accents/whiskers. |
| 17 | Draws the lower paws/feet in the sprite's current accent color. |
| 18 | Closes the SVG and cat template string. |
| 19 | Starts the separate tail sprite template string. |
| 20 | Opens the same crisp 16-by-16 SVG canvas for the tails face. |
| 21 | Draws the curled pixel-tail silhouette. |
| 22 | Adds the light-colored edge/highlight to the tail. |
| 23 | Adds dark pixel detail to give the tail depth. |
| 24 | Closes the SVG and tail string. |

### Build the landing page markup — lines 26–83

`innerHTML` inserts the template into the already-checked `#app`. This block is HTML markup written inside a TypeScript template string. `${catSprite}` and `${tailSprite}` insert the SVG strings from above.

| Line(s) | What the markup creates |
|---|---|
| 26–27 | Starts the page template and its top-level `.universe` wrapper. |
| 28–29 | Adds decorative starfield and CRT scanline layers. Both are `aria-hidden` because they are visual texture, not content. |
| 30–33 | Builds the top bar: the brand link, pixel diamond, and “online” status indicator. |
| 34 | Opens the overall responsive layout grid. |
| 35–39 | Creates the left “COSMIC ODDS” decoration. It reinforces 50:50 visually but is not the live stats display. |
| 40–44 | Opens the main console, labels it for assistive technology, and adds its terminal header, eyebrow, headline, and subtitle. |
| 45–48 | Creates the coin stage, orbit rings, and decorative stars. `aria-live="polite"` lets assistive technology know this area changes. |
| 49 | Opens the 3D coin element. Its `id` is used by TypeScript; `data-side="heads"` is the initial visual side. |
| 50–52 | Defines the heads face, stamp, injected cat SVG, caption, and closing face element. |
| 53–55 | Defines the reverse/tails face and injects its curled-tail SVG. |
| 56–57 | Closes the coin and coin stage. |
| 58 | Creates the live result label, initially showing the ready message. |
| 59 | Adds the button the user clicks. The text span can change during a flip; the arrow is decorative and hidden from assistive technology. |
| 60–62 | Opens the probability panel and displays **per-flip** 50/50 odds with a fixed, equal-width bar. This is theoretical odds for the next toss—not the past-results ratio. |
| 63–64 | Adds the *observed session split* label and a bar whose heads portion can change as results arrive. |
| 65–69 | Adds the session flip count and the two result counters. The `id` attributes are hooks for TypeScript updates. |
| 70–71 | Adds the recent-history strip and closes the probability panel. |
| 72 | Provides a hint that explains independence and streaks. |
| 73–74 | Closes the console and opens the right-side oracle decoration. |
| 75–79 | Displays another cat sprite, its title, name, and level. |
| 80–83 | Closes the layout, adds the footer, and ends the HTML template. |

The HTML's IDs (`coin`, `result`, `flip`, `heads-stat`, and others) are the connection points between the static structure and interactive TypeScript.

### Connect to the elements and hold session state — lines 85–94

| Line(s) | What they do |
|---|---|
| 85 | Gets the toss button as an `HTMLButtonElement`. The `!` is TypeScript's non-null assertion: the markup above guarantees that ID exists. |
| 86 | Gets the coin element so the handler can add/remove animation classes and set its displayed side. |
| 87–88 | Get the result and helper-text paragraphs. |
| 89–93 | Get the session count, split label, heads/tails counters, and recent-results container. |
| 94 | Starts in-memory state for this browser page: two counters and a list of recent sides. Reloading the page resets this session display. |

### Recompute the session display — lines 96–108

| Line(s) | What they do |
|---|---|
| 96 | Declares the function called after each successful toss. |
| 97 | Adds the two observed counters to get the total number of recorded flips. |
| 98 | Calculates the rounded observed heads percentage; before any flips, the display starts at 50. |
| 99 | Computes tails as the remainder to 100 so the two displayed rounded percentages always add up to 100. |
| 100 | Updates the count and chooses singular `FLIP` only when the total is exactly one. |
| 101–102 | Updates the result counts and their observed percentages. The em dash means there is no sample yet. |
| 103 | Writes the observed split as a readable `heads% / tails%` pair. |
| 104 | Sets a CSS custom property to the unrounded observed heads share; CSS uses it to animate the session bar. |
| 105–107 | Turns each recent result into a colored history dot. The strings are safe here because `Side` was runtime-validated before entering the array. |
| 108 | Closes the stats-update function. |

These are *descriptive statistics*: they summarize the flips already seen. They are not a new estimate of, or adjustment to, the next toss's 50/50 chance.

### The flip button and asynchronous request — lines 110–145

| Line(s) | What they do |
|---|---|
| 110 | Registers an asynchronous callback for button clicks. `async` allows it to wait for the network response. |
| 111 | Disables the button so repeated clicks cannot overlap animations or requests. |
| 112–114 | Changes the button and status copy to show that a toss is in progress and the C++ result is pending. |
| 115 | Removes old landing/toss CSS classes so a new animation can start cleanly. |
| 116 | Sets the page theme state to `tossing`; CSS uses this to animate the colors. |
| 117 | Reads `offsetWidth` and intentionally discards it. Reading layout forces the browser to apply the class reset before the next animation class. |
| 118 | Adds the `tossing` class, which starts the CSS coin animation. |
| 120 | Starts error handling for the network request and response processing. |
| 121 | Sends `POST /api/flip` to the same local C++ server that served the page. No result is calculated in the browser. |
| 122 | Converts a non-2xx HTTP status into an error instead of treating it as a valid flip. |
| 123 | Parses the JSON body and types it as `FlipResponse`. A TypeScript type helps during development but does not validate network data at runtime. |
| 124 | Performs that runtime check: only the strings `heads` and `tails` are accepted from the server. |
| 125 | Waits 1.1 seconds so the coin animation can play before revealing the answer. |
| 126–127 | Removes the toss state and adds the class for the actual side returned by C++. The CSS rotates the coin to that face. |
| 128–129 | Stores the winning side on the coin and page. CSS reads the page's `data-side` to switch accents between the heads and tails palettes. |
| 130–132 | Increments the appropriate observed counter, appends the side to recent history, and limits the strip to the latest 12 tosses. |
| 133 | Refreshes the counters, percentages, session bar, and recent-history dots. |
| 134–135 | Shows a result message and reminds the player that the next independent toss remains 50/50. |
| 136–140 | On any network, HTTP, or response-validation error, stops the spin, restores the previous color, and displays a useful error message. A failed request does not get counted as a result. |
| 141–143 | Always runs after success or failure: re-enables the button and restores its normal label. |
| 144–145 | Closes the click callback and event-listener registration. |

## Probability, step by step

### What “50/50” means

Let `H` mean heads and `T` mean tails. A fair toss has:

- `P(H) = 1/2 = 0.5 = 50%`
- `P(T) = 1/2 = 0.5 = 50%`
- `P(H) + P(T) = 1`

For a sequence of independent tosses, the chance of any specified sequence of `n` sides is `(1/2)^n`. For example, the chance of five heads in a row is `1/32`, about `3.125%`. That streak is unusual, but it does not make tails more likely on the next toss. The next toss is still a new 50/50 choice. Thinking a result is “due” because it has not appeared recently is the gambler's fallacy.

If you count many flips, the *observed* heads fraction tends to be near 50% over time, but it need not be exactly half in a small sample. With `n` independent fair flips, the number of heads has a binomial distribution: expected heads = `n/2`, and standard deviation = `sqrt(n × 1/2 × 1/2) = sqrt(n)/2`. At 100 flips, the expected heads count is 50, with a standard deviation of 5. A result like 54 heads is ordinary; it does not show the engine changed its odds.

### What the C++ random code does

The backend's essential logic is:

```cpp
static int flip_side() {
    static std::random_device entropy;
    static std::seed_seq seed{entropy(), entropy(), entropy(), entropy(),
                              entropy(), entropy(), entropy(), entropy()};
    static std::mt19937_64 engine(seed);
    static std::uniform_int_distribution<int> side(0, 1);
    return side(engine);
}
```

1. `std::random_device entropy` asks the platform's C++ library for seed material. C++ implementations may source this from operating-system entropy, but the exact behavior is platform-dependent.
2. `std::seed_seq` mixes eight values into seed material for the engine. The `static` objects are initialized once and reused; the engine is not restarted for every request.
3. `std::mt19937_64` is a deterministic pseudorandom number generator with a large internal state. Once seeded, it produces a long stream of values that look statistically random. The same seed would reproduce the same stream.
4. `std::uniform_int_distribution<int>(0, 1)` requests an integer in the inclusive range 0 through 1, with equal probability according to the C++ distribution contract. It handles mapping the engine's output range to those two outcomes without a simple biased `% 2` shortcut.
5. `0` maps to heads and `1` maps to tails. Each endpoint call advances the same engine to its next value.

The distribution's target is 50/50 for every call. It does **not** balance the counters, alternate sides, compensate for streaks, or read the interface's history. A pseudorandom generator is deterministic mathematics after seeding, so no finite computer can promise metaphysically “perfect” randomness. This design is suitable for a casual coin toss, not cryptographic keys, gambling certification, or safety-critical decisions.

### Why display two different bars?

- **Per-flip probability** is fixed: each new toss is 50% heads and 50% tails.
- **Actual session split** is an observation: for example, 3 heads and 1 tail is 75% / 25% among the four outcomes already seen.

The second bar can look uneven while the first remains exactly equal. That is expected, not a contradiction.

## Why the app uses C++ and TypeScript

- **C++** compiles to the native program. It owns the HTTP endpoint, serves the built files, and makes the heads/tails choice. The backend is separate from the page, so browser animation and CSS cannot change the random result.
- **TypeScript** runs in the browser after Vite compiles it to JavaScript. It owns interaction and presentation: the click handler, animation state, response validation, counters, history, and messages.
- This split keeps the decision-making in the requested C++ engine while letting the frontend build a rich, responsive interface with familiar web tools.

## Other landing-page files

- [`../src/style.css`](../src/style.css) defines the grayscale space-terminal palette, outcome-specific accents, starfield, scanlines, coin faces, pixel borders, responsive layout, and reduced-motion behavior.
- [`../index.html`](../index.html) is the small document shell that provides `#app` and loads the TypeScript entry point.
- [`../cpp/flip.cpp`](../cpp/flip.cpp) contains the local HTTP server and the C++ outcome selection.
- [`../scripts/build-cpp.mjs`](../scripts/build-cpp.mjs) compiles the C++ program. On Windows it can locate Visual Studio Build Tools and initialize the MSVC environment.
