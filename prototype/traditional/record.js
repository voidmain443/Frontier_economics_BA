// The record: five episodes in which the core models met real data.
// Each chart has a cursor tied to the reading line, so the series is drawn
// as far as the reader has come. When the page is unfolded, the same cursor
// drives the machine beside the page, and the chart is copied into the scene.

const NS = 'http://www.w3.org/2000/svg';
const FILES = ['korea-growth', 'us-phillips', 'korea-1997', 'crisis-2008', 'rates-2022'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const tNum = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return y + (m ? (m - 1) / 12 : 0) + (d ? (d - 1) / 365 : 0);
};
const fmtT = (t, monthly) => {
  const y = Math.floor(t + 1e-6);
  if (!monthly) return String(y);
  const m = clamp(Math.round((t - y) * 12), 0, 11);
  return `${MON[m]} ${y}`;
};

function el(tag, attrs = {}, parent = null, text = null) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

// Interpolated value of a series at time t.
function valueAt(pts, t) {
  if (!pts.length) return null;
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][0] >= t) {
      const [t0, v0] = pts[i - 1];
      const [t1, v1] = pts[i];
      return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0 || 1);
    }
  }
  return pts[pts.length - 1][1];
}

// ---------- charts ----------

// Stacked time-series panels sharing one time axis.
function panels(host, ep, t) {
  const W = 680;
  const PH = 132;
  const GAP = 30;
  const L = 62;
  const R = 120;
  const T = 14;
  const H = T + ep.panels.length * (PH + GAP) + 6;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'plot chart', role: 'img', 'aria-label': ep.alt });
  const [t0, t1] = ep.range;
  const X = (u) => L + ((u - t0) / (t1 - t0)) * (W - L - R);
  ep.panels.forEach((pn, i) => {
    const y0 = T + i * (PH + GAP);
    const [lo, hi] = pn.y;
    const Y = (v) => y0 + PH - ((v - lo) / (hi - lo)) * PH;
    const g = el('g', {}, svg);
    // frame and grid
    el('line', { x1: L, y1: y0 + PH, x2: W - R, y2: y0 + PH, class: 'ln axis' }, g);
    el('line', { x1: L, y1: y0, x2: L, y2: y0 + PH, class: 'ln axis' }, g);
    for (const v of pn.ticks) {
      el('line', { x1: L, y1: Y(v), x2: W - R, y2: Y(v), class: 'ln guide' }, g);
      el('text', { x: L - 8, y: Y(v) + 5, 'text-anchor': 'end', class: 'lb rm tick' }, g, pn.fmt ? pn.fmt(v) : String(v));
    }
    el('text', { x: L, y: y0 - 4, class: 'lb rm ptitle' }, g, pn.title);
    for (const s of pn.series) {
      const pts = s.pts.filter(([u]) => u >= t0 - 1e-6 && u <= t1 + 1e-6);
      const past = pts.filter(([u]) => u <= t + 1e-6);
      const d = (arr) => 'M' + arr.map(([u, v]) => `${X(u).toFixed(1)},${Y(clamp(v, lo, hi)).toFixed(1)}`).join('L');
      if (pts.length > 1) el('path', { d: d(pts), class: `ln ${s.c} faint` }, g);
      if (past.length > 1) el('path', { d: d(past), class: `ln ${s.c} thick` }, g);
      const v = valueAt(pts, Math.min(t, pts[pts.length - 1]?.[0] ?? t));
      if (v != null && t >= pts[0][0]) {
        el('circle', { cx: X(Math.min(t, pts[pts.length - 1][0])), cy: Y(clamp(v, lo, hi)), r: 4, class: `dot ${s.c}` }, g);
        const shown = s.show ? s.show(v) : v;
        el('text', { x: W - R + 10, y: Y(clamp(v, lo, hi)) + 5, class: `lb rm val ${s.c}` }, g, `${s.label} ${shown.toFixed(s.dp ?? 1)}`.trim());
      }
    }
    for (const m of pn.marks ?? []) {
      if (m.t < t0 || m.t > t1) continue;
      el('line', { x1: X(m.t), y1: y0, x2: X(m.t), y2: y0 + PH, class: 'ln guide' }, g);
      el('text', { x: X(m.t) + 4, y: y0 + 12, class: 'lb note' }, g, m.text);
    }
  });
  // time axis and cursor
  const yb = T + ep.panels.length * (PH + GAP) - GAP;
  for (const u of ep.years) el('text', { x: X(u), y: yb + 20, 'text-anchor': 'middle', class: 'lb rm tick' }, svg, String(u));
  const xc = X(clamp(t, t0, t1));
  el('line', { x1: xc, y1: T - 6, x2: xc, y2: yb, class: 'ln cursor' }, svg);
  el('text', { x: xc, y: T - 8 + 2, 'text-anchor': 'middle', class: 'lb rm now' }, svg, fmtT(t, ep.monthly));
  host.replaceChildren(svg);
}

// A path through (unemployment, inflation), year by year.
function phillips(host, ep, t) {
  const W = 680;
  const H = 470;
  const L = 62;
  const B = 50;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'plot chart', role: 'img', 'aria-label': ep.alt });
  const X = (u) => L + ((u - 3) / (10.5 - 3)) * (W - L - 40);
  const Y = (p) => H - B - ((p - 0) / 14.5) * (H - B - 20);
  el('line', { x1: L, y1: H - B, x2: W - 30, y2: H - B, class: 'ln axis' }, svg);
  el('line', { x1: L, y1: H - B, x2: L, y2: 14, class: 'ln axis' }, svg);
  for (const u of [4, 5, 6, 7, 8, 9, 10]) el('text', { x: X(u), y: H - B + 22, 'text-anchor': 'middle', class: 'lb rm tick' }, svg, `${u}%`);
  for (const p of [0, 2, 4, 6, 8, 10, 12, 14]) {
    el('line', { x1: L, y1: Y(p), x2: W - 30, y2: Y(p), class: 'ln guide' }, svg);
    el('text', { x: L - 8, y: Y(p) + 5, 'text-anchor': 'end', class: 'lb rm tick' }, svg, `${p}%`);
  }
  el('text', { x: W - 30, y: H - 12, 'text-anchor': 'end', class: 'lb it' }, svg, 'unemployment rate');
  el('text', { x: L + 6, y: 26, class: 'lb it' }, svg, 'inflation (CPI)');
  const pts = ep.path;
  const d = (arr) => 'M' + arr.map((q) => `${X(q.u).toFixed(1)},${Y(q.p).toFixed(1)}`).join('L');
  el('path', { d: d(pts), class: 'ln cb faint' }, svg);
  const past = pts.filter((q) => q.t <= t + 1e-6);
  if (past.length > 1) el('path', { d: d(past), class: 'ln cb thick' }, svg);
  for (const q of past) el('circle', { cx: X(q.u), cy: Y(q.p), r: 2.6, class: 'dot cb' }, svg);
  for (const q of past) if (ep.tagYears.includes(q.t)) el('text', { x: X(q.u) + 7, y: Y(q.p) - 6, class: 'lb rm yr' }, svg, String(q.t));
  const cur = past[past.length - 1];
  if (cur) {
    el('circle', { cx: X(cur.u), cy: Y(cur.p), r: 6, class: 'ring oc' }, svg);
    if (cur.e != null) {
      el('line', { x1: L, y1: Y(cur.e), x2: W - 30, y2: Y(cur.e), class: 'ln md dash' }, svg);
      el('text', { x: W - 34, y: Y(cur.e) - 6, 'text-anchor': 'end', class: 'lb note md' }, svg, `expected inflation ${cur.e.toFixed(1)}%${cur.eSrc ? ` (${cur.eSrc})` : ''}`);
    }
    el('text', { x: W - 34, y: 30, 'text-anchor': 'end', class: 'lb rm now big' }, svg, String(cur.t));
  }
  host.replaceChildren(svg);
}

// ---------- the module ----------

export async function createRecord(sheet) {
  const sections = [...sheet.querySelectorAll('[data-episode]')];
  if (!sections.length) return null;
  const D = {};
  await Promise.all(FILES.map(async (f) => {
    D[f] = await (await fetch(`data/${f}.json`)).json();
  }));
  const S = (f, key) => (D[f].series.find((s) => s.key === key)?.points ?? []).map(([k, v]) => [tNum(k), v]);

  // Korea: the capital tank, run with each year's investment share and population growth
  const gf = S('korea-growth', 'gfcf_share');
  const pg = S('korea-growth', 'popgrowth');
  const kPath = [];
  {
    const s0 = gf[0][1] / 100;
    const nd0 = (pg[0][1] + 5) / 100;
    let k = Math.pow(s0 / nd0, 1 / 0.65);
    for (const [t, v] of gf) {
      kPath.push([t, k]);
      const nd = ((valueAt(pg, t) ?? 1) + 5) / 100;
      k += (v / 100) * Math.pow(k, 0.35) - nd * k;
    }
  }
  const unr = S('us-phillips', 'unrate');
  const cpi = S('us-phillips', 'cpi_infl');
  const mich = S('us-phillips', 'mich');
  const pPath = [];
  for (let y = 1960; y <= 1986; y++) {
    const m = mich.find(([t]) => t === y);
    const prev = [y - 1, y - 2].map((z) => cpi.find(([t]) => t === z)?.[1]).filter((v) => v != null);
    pPath.push({
      t: y, u: unr.find(([t]) => t === y)[1], p: cpi.find(([t]) => t === y)[1],
      e: m ? m[1] : prev.reduce((a, b) => a + b, 0) / prev.length, eSrc: m ? 'Michigan survey' : 'average of the past two years',
    });
  }

  const EP = {
    'korea-growth': {
      kind: 'panels', range: [1960, 2025], monthly: false, years: [1960, 1970, 1980, 1990, 2000, 2010, 2020],
      alt: 'Korea: real GDP per person and the investment share of GDP, 1960 to 2025',
      panels: [
        {
          title: 'Real GDP per person, million won at 2020 prices (log scale)', y: [Math.log(1), Math.log(60)], ticks: [1, 3, 10, 30].map(Math.log), fmt: (v) => Math.round(Math.exp(v)),
          series: [{ pts: S('korea-growth', 'rgdppc').map(([t, v]) => [t, Math.log(v)]), c: 'cb', label: '', dp: 2, show: (v) => Math.exp(v) }],
        },
        {
          title: 'Gross fixed capital formation, % of GDP: the faucet', y: [0, 45], ticks: [0, 10, 20, 30, 40],
          series: [{ pts: gf, c: 'md', label: 's =', dp: 1 }],
          marks: [{ t: 1991, text: 'peak 38.4%' }],
        },
      ],
      drive: (t) => ({ s: valueAt(gf, t) / 100, nd: ((valueAt(pg, t) ?? 0) + 5) / 100, k: valueAt(kPath, t), label: fmtT(t, false), show: ['capital'] }),
    },
    'us-phillips': {
      kind: 'phillips', range: [1960, 1986], monthly: false, path: pPath, tagYears: [1960, 1965, 1969, 1970, 1974, 1975, 1979, 1980, 1982, 1983, 1986],
      alt: 'United States: unemployment and inflation, 1960 to 1986, connected year by year',
      drive: (t) => {
        const q = pPath.filter((x) => x.t <= t).pop() ?? pPath[0];
        return { pi: q.p, pie: q.e, Y: 9.09 - 0.8 * (q.u - 5.5), label: String(q.t), show: ['pi', 'income'] };
      },
    },
    'korea-1997': {
      kind: 'panels', range: [1996, 2000], monthly: true, years: [1996, 1997, 1998, 1999, 2000],
      alt: 'Korea 1996 to 1999: won per dollar, foreign reserves, and the call rate',
      panels: [
        { title: 'Won per US dollar, monthly average', y: [700, 1800], ticks: [800, 1000, 1200, 1400, 1600], series: [{ pts: S('korea-1997', 'krwusd'), c: 'md', label: '₩', dp: 0 }], marks: [{ t: tNum('1997-11'), text: 'IMF request' }] },
        { title: 'Foreign exchange reserves, US$ billion (gross)', y: [0, 80], ticks: [0, 20, 40, 60, 80], series: [{ pts: S('korea-1997', 'reserves'), c: 'oc', label: '$', dp: 1 }] },
        { title: 'Overnight call rate, %', y: [0, 30], ticks: [0, 10, 20, 30], series: [{ pts: S('korea-1997', 'callrate'), c: 'cb', label: '', dp: 1 }] },
      ],
      drive: (t) => ({
        er: 1 + (valueAt(S('korea-1997', 'krwusd'), t) - 800) / 500,
        reserves: valueAt(S('korea-1997', 'reserves'), t) / 80,
        m: 0.9 * 9.09 - valueAt(S('korea-1997', 'callrate'), t) / 3.5,
        label: fmtT(t, true), show: ['trade', 'central'],
      }),
    },
    'crisis-2008': {
      kind: 'panels', range: [2007, 2010], monthly: true, years: [2007, 2008, 2009, 2010],
      alt: 'The TED spread, policy rates in the US and Korea, and the won, 2007 to 2009',
      panels: [
        { title: 'TED spread (3-month interbank minus Treasury bill), percentage points, weekly', y: [0, 4.5], ticks: [0, 1, 2, 3, 4], series: [{ pts: S('crisis-2008', 'ted_w'), c: 'md', label: '', dp: 2 }], marks: [{ t: tNum('2008-09-15'), text: 'Lehman' }] },
        { title: 'Policy rates, %', y: [0, 6], ticks: [0, 2, 4, 6], series: [{ pts: S('crisis-2008', 'fedfunds'), c: 'cb', label: 'Fed', dp: 2 }, { pts: S('crisis-2008', 'bok_rate'), c: 'ol', label: 'BOK', dp: 2 }] },
        { title: 'Won per US dollar', y: [800, 1600], ticks: [900, 1100, 1300, 1500], series: [{ pts: S('crisis-2008', 'krwusd'), c: 'oc', label: '₩', dp: 0 }] },
      ],
      drive: (t) => ({
        run: clamp((valueAt(S('crisis-2008', 'ted_w'), t) - 0.8) / 1.6, 0, 1),
        m: 0.9 * 9.09 - valueAt(S('crisis-2008', 'fedfunds'), t) / 1.6,
        er: 1 + (valueAt(S('crisis-2008', 'krwusd'), t) - 950) / 500,
        label: fmtT(t, true), show: ['bank', 'central'],
      }),
    },
    'rates-2022': {
      kind: 'panels', range: [2020, 2026.75], monthly: true, years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
      alt: 'Korea 2020 to 2026: the base rate, new household loan rates, inflation, and Seoul apartment prices',
      panels: [
        { title: 'Bank of Korea base rate and the rate on new household loans, %', y: [0, 7], ticks: [0, 2, 4, 6], series: [{ pts: S('rates-2022', 'bok_rate'), c: 'cb', label: 'base', dp: 2 }, { pts: S('rates-2022', 'hh_loan_rate'), c: 'ol', label: 'loans', dp: 2 }] },
        { title: 'Consumer price inflation, % over a year earlier', y: [-1, 10], ticks: [0, 3, 6, 9], series: [{ pts: S('rates-2022', 'kr_cpi'), c: 'md', label: 'Korea', dp: 1 }, { pts: S('rates-2022', 'us_cpi'), c: 'oc', label: 'US', dp: 1 }] },
        { title: 'Seoul apartment prices (KB index, Jan 2026 = 100)', y: [60, 115], ticks: [70, 80, 90, 100, 110], series: [{ pts: S('rates-2022', 'house_price_seoul_apt'), c: 'cb', label: '', dp: 1 }] },
      ],
      drive: (t) => ({
        m: 0.9 * 9.09 - valueAt(S('rates-2022', 'bok_rate'), t) * 1.2,
        pi: valueAt(S('rates-2022', 'kr_cpi'), t), pie: 2,
        label: fmtT(t, true), show: ['central', 'pi', 'valves'],
      }),
    },
  };

  const eps = sections.map((sec) => {
    const id = sec.dataset.episode;
    const ep = EP[id];
    const host = sec.querySelector('.chart-art');
    return { id, ep, sec, host, t: null, live: null };
  });
  const draw = (host, ep, t) => (ep.kind === 'phillips' ? phillips(host, ep, t) : panels(host, ep, t));
  const rectOf = (e) => {
    const r = e.sec.getBoundingClientRect();
    return [r.top + scrollY, r.bottom + scrollY];
  };
  // reading line → time: the series runs while the episode crosses the line
  const timeAt = (e, focus) => {
    const [a, b] = rectOf(e);
    const u = clamp((focus - (a + 120)) / Math.max(200, b - a - 360), 0, 1);
    const [t0, t1] = e.ep.range;
    const t = t0 + u * (t1 - t0);
    return e.ep.monthly ? Math.round(t * 12) / 12 : Math.round(t);
  };

  function sync(focus) {
    for (const e of eps) {
      const [a, b] = rectOf(e);
      if (focus < a - innerHeight * 1.2 || focus > b + innerHeight * 1.2) {
        if (e.t == null) {
          e.t = e.ep.range[0];
          draw(e.host, e.ep, e.t);
        }
        continue;
      }
      const t = timeAt(e, focus);
      if (t !== e.t) {
        e.t = t;
        draw(e.host, e.ep, t);
        if (e.live) e.live.dirty = true;
      }
    }
  }
  sync(scrollY + innerHeight * 0.5);
  addEventListener('scroll', () => sync(scrollY + innerHeight * 0.5), { passive: true });

  return {
    // the unfolded scene: the machine is driven, and the charts become plates
    attach(plates) {
      const sr = sheet.getBoundingClientRect();
      for (const e of eps) {
        const r = e.host.getBoundingClientRect();
        e.live = {
          rect: [r.left + scrollX, r.top + scrollY, r.right + scrollX, r.bottom + scrollY],
          host: plates.host(r.width, r.height, r.left - sr.left, r.top - sr.top),
          plate: null, dirty: true,
        };
      }
      return {
        drive(focus) {
          sync(focus);
          for (const e of eps) {
            const [a, b] = rectOf(e);
            if (focus >= a && focus <= b) return e.ep.drive(e.t);
          }
          return null;
        },
        plates(focus) {
          const out = [];
          for (const e of eps) {
            const [a, b] = rectOf(e);
            if (focus < a - 2200 || focus > b + 2200) continue;
            if (e.live.dirty) {
              e.live.dirty = false;
              draw(e.live.host, e.ep, e.t ?? e.ep.range[0]);
              plates.mark(e.live);
            }
            if (e.live.plate) out.push(e.live.plate);
          }
          return out;
        },
      };
    },
  };
}
