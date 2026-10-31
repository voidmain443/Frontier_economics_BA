// A market as Gode and Sunder (1993) ran it with "zero-intelligence" traders:
// buyers with values, sellers with costs, and a double auction. A trader quotes
// at random, but never at a loss: a buyer bids below its value, a seller asks
// above its cost. A quote must better the standing one. When the best bid
// reaches the best ask they trade at the earlier of the two quotes, both leave,
// and the book is cleared. Their markets still reached about 99 percent of the
// largest possible surplus: the rules of the market, not the traders' wits,
// found the equilibrium (docs/engine.md).

// a small seeded generator, so that a figure looks the same on every visit
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// values: buyers' values; costs: sellers' costs; top: the highest ask allowed.
// step() makes one quote and returns the trade it closes, or null.
export function doubleAuction({ values, costs, top, seed = 1 }) {
  const rand = rng(seed);
  // the traders still in the market, by index
  const buyers = values.map((_, i) => i);
  const sellers = costs.map((_, j) => j);
  let bid = null;
  let ask = null;
  const trades = [];
  let gains = true;

  // can any buyer still in the market gain from any seller still in it?
  function check() {
    const v = Math.max(...buyers.map((i) => values[i]));
    const c = Math.min(...sellers.map((j) => costs[j]));
    gains = buyers.length > 0 && sellers.length > 0 && v > c;
  }
  check();

  function step() {
    if (!gains) return null;
    const k = Math.floor(rand() * (buyers.length + sellers.length));
    let t = null;
    if (k < buyers.length) {
      const i = buyers[k];
      const p = rand() * values[i];
      if (!bid || p > bid.p) bid = { i, p };
      if (ask && bid.p >= ask.p) t = { i: bid.i, j: ask.j, p: ask.p };
    } else {
      const j = sellers[k - buyers.length];
      const p = costs[j] + rand() * (top - costs[j]);
      if (!ask || p < ask.p) ask = { j, p };
      if (bid && ask.p <= bid.p) t = { i: bid.i, j: ask.j, p: bid.p };
    }
    if (!t) return null;
    buyers.splice(buyers.indexOf(t.i), 1);
    sellers.splice(sellers.indexOf(t.j), 1);
    bid = null;
    ask = null;
    t.k = trades.length;
    trades.push(t);
    check();
    return t;
  }

  // every trade of one trading period, quotes up to limit
  function run(limit = 1e6) {
    for (let n = 0; gains && n < limit; n++) step();
    return trades;
  }

  return { step, run, get open() { return gains; }, trades };
}

// The surplus a set of trades realised, and the most any set could.
export function efficiency(values, costs, trades) {
  const got = trades.reduce((s, t) => s + values[t.i] - costs[t.j], 0);
  const v = [...values].sort((a, b) => b - a);
  const c = [...costs].sort((a, b) => a - b);
  let best = 0;
  for (let n = 0; n < Math.min(v.length, c.length) && v[n] > c[n]; n++) best += v[n] - c[n];
  return best ? got / best : 1;
}
