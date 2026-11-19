// Part 1's sources (the closing section "Sources"): the textbooks each stage
// follows, read from the shelf in books.js that Part 3, section 9 also shows;
// the works the text cites and where each figure was first drawn or stated;
// the data are listed in the page itself.

import { SHELF } from './books.js';
import { COURSES } from './curriculum.js';
import { t, LANG } from './i18n.js';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const course = (id) => t(COURSES.find((c) => c.id === id).name);

// [where in Part 1, its anchor, label, shelf id]
const ROWS = [
  ['1', '#s1', () => t('Principles of economics'), 'principles'],
  ['2–5', '#s2', () => t('Intermediate microeconomics'), 'micro'],
  ['4', '#s4', () => t('Game theory'), 'games'],
  ['6', '#s6', () => t('Intermediate macroeconomics'), 'macro'],
  ['7', '#s7', () => t('Econometrics'), 'metrics'],
  ['1–7', '#s1', () => t('Mathematics for economists'), 'math1'],
  ...['trade', 'intlfin', 'banking', 'finance', 'public', 'environmental', 'labor', 'io', 'behavioral', 'development', 'history']
    .map((id, i) => [`8.${i + 1}`, `#c8-${i + 1}`, () => course(id), id]),
];

// a: authors, y: year, t: title (a book's in italics), w: where it appeared,
// at: the places in Part 1 that draw on it ('5.3' a figure, 's4' a stage,
// 'c8.1' a field course)
const R = (a, y, title, w, at, book = false) => ({ a, y, title, w, at, book });
const REFS = [
  R('Acemoglu, D., S. Johnson and J. A. Robinson', 2001, 'The Colonial Origins of Comparative Development: An Empirical Investigation', 'American Economic Review 91(5): 1369–1401', ['c8.10']),
  R('Akerlof, G. A.', 1970, 'The Market for ‘Lemons’: Quality Uncertainty and the Market Mechanism', 'Quarterly Journal of Economics 84(3): 488–500', ['5.3']),
  R('Barro, R. J. and D. B. Gordon', 1983, 'A Positive Theory of Monetary Policy in a Natural Rate Model', 'Journal of Political Economy 91(4): 589–610', ['6.4']),
  R('Bertrand, J.', 1883, '[Review of Walras, Théorie mathématique de la richesse sociale, and Cournot, Recherches sur les principes mathématiques de la théorie des richesses]', 'Journal des Savants: 499–508', ['s4']),
  R('Card, D. and A. B. Krueger', 1994, 'Minimum Wages and Employment: A Case Study of the Fast-Food Industry in New Jersey and Pennsylvania', 'American Economic Review 84(4): 772–793', ['8.7']),
  R('Clark, G.', 2007, 'A Farewell to Alms: A Brief Economic History of the World', 'Princeton University Press', ['8.11'], true),
  R('Cournot, A.', 1838, 'Recherches sur les principes mathématiques de la théorie des richesses', 'Paris: Hachette', ['4.1'], true),
  R('de Mel, S., D. McKenzie and C. Woodruff', 2008, 'Returns to Capital in Microenterprises: Evidence from a Field Experiment', 'Quarterly Journal of Economics 123(4): 1329–1372', ['8.10']),
  R('Diamond, D. W. and P. H. Dybvig', 1983, 'Bank Runs, Deposit Insurance, and Liquidity', 'Journal of Political Economy 91(3): 401–419', ['8.3']),
  R('Edgeworth, F. Y.', 1881, 'Mathematical Psychics', 'London: C. Kegan Paul', ['5.1'], true),
  R('Fisher, I.', 1930, 'The Theory of Interest', 'New York: Macmillan', ['2.3'], true),
  R('Friedman, J. W.', 1971, 'A Non-cooperative Equilibrium for Supergames', 'Review of Economic Studies 38(1): 1–12', ['8.8']),
  R('Friedman, M.', 1968, 'The Role of Monetary Policy', 'American Economic Review 58(1): 1–17', ['6.3']),
  R('Gode, D. K. and S. Sunder', 1993, 'Allocative Efficiency of Markets with Zero-Intelligence Traders: Market as a Partial Substitute for Individual Rationality', 'Journal of Political Economy 101(1): 119–137', ['s1']),
  R('Harberger, A. C.', 1964, 'The Measurement of Waste', 'American Economic Review 54(3): 58–76', ['8.5']),
  R('Heckscher, E. F.', 1919, 'Utrikeshandelns verkan på inkomstfördelningen', 'Ekonomisk Tidskrift 21: 497–512', ['c8.1']),
  R('Hicks, J. R.', 1937, 'Mr. Keynes and the ‘Classics’; A Suggested Interpretation', 'Econometrica 5(2): 147–159', ['6.2']),
  R('Kahneman, D. and A. Tversky', 1979, 'Prospect Theory: An Analysis of Decision under Risk', 'Econometrica 47(2): 263–291', ['c8.9']),
  R('Krugman, P.', 1979, 'Increasing Returns, Monopolistic Competition, and International Trade', 'Journal of International Economics 9(4): 469–479', ['c8.1']),
  R('Krugman, P.', 1994, 'The Myth of Asia’s Miracle', 'Foreign Affairs 73(6): 62–78', ['6.1']),
  R('Krugman, P., M. Obstfeld and M. J. Melitz', 2022, 'International Economics: Theory and Policy', '12th ed., Pearson', ['8.2'], true),
  R('Kydland, F. E. and E. C. Prescott', 1977, 'Rules Rather than Discretion: The Inconsistency of Optimal Plans', 'Journal of Political Economy 85(3): 473–491', ['6.4']),
  R('Laibson, D.', 1997, 'Golden Eggs and Hyperbolic Discounting', 'Quarterly Journal of Economics 112(2): 443–477', ['8.9']),
  R('Malthus, T. R.', 1798, 'An Essay on the Principle of Population', 'London: J. Johnson', ['8.11'], true),
  R('Markowitz, H.', 1952, 'Portfolio Selection', 'Journal of Finance 7(1): 77–91', ['8.4']),
  R('Marshall, A.', 1890, 'Principles of Economics', 'London: Macmillan', ['1.1', '1.3', '3.2'], true),
  R('Melitz, M. J.', 2003, 'The Impact of Trade on Intra-Industry Reallocations and Aggregate Industry Productivity', 'Econometrica 71(6): 1695–1725', ['c8.1']),
  R('Nash, J. F.', 1950, 'Equilibrium Points in n-Person Games', 'Proceedings of the National Academy of Sciences 36(1): 48–49', ['4.1']),
  R('Ohlin, B.', 1933, 'Interregional and International Trade', 'Cambridge, MA: Harvard University Press', ['c8.1'], true),
  R('Phelps, E. S.', 1967, 'Phillips Curves, Expectations of Inflation and Optimal Unemployment over Time', 'Economica 34(135): 254–281', ['6.3']),
  R('Phillips, A. W.', 1958, 'The Relation between Unemployment and the Rate of Change of Money Wage Rates in the United Kingdom, 1861–1957', 'Economica 25(100): 283–299', ['6.3']),
  R('Robinson, J.', 1933, 'The Economics of Imperfect Competition', 'London: Macmillan', ['8.7'], true),
  R('Samuelson, P. A.', 1947, 'Foundations of Economic Analysis', 'Cambridge, MA: Harvard University Press', ['1.3'], true),
  R('Samuelson, P. A.', 1954, 'The Pure Theory of Public Expenditure', 'Review of Economics and Statistics 36(4): 387–389', ['5.2']),
  R('Selten, R.', 1965, 'Spieltheoretische Behandlung eines Oligopolmodells mit Nachfrageträgheit', 'Zeitschrift für die gesamte Staatswissenschaft 121: 301–324, 667–689', ['4.2']),
  R('Slutsky, E.', 1915, 'Sulla teoria del bilancio del consumatore', 'Giornale degli Economisti 51: 1–26', ['2.2']),
  R('Solow, R. M.', 1956, 'A Contribution to the Theory of Economic Growth', 'Quarterly Journal of Economics 70(1): 65–94', ['6.1']),
  R('Stern, N.', 2007, 'The Economics of Climate Change: The Stern Review', 'Cambridge University Press', ['8.6'], true),
  R('Stolper, W. F. and P. A. Samuelson', 1941, 'Protection and Real Wages', 'Review of Economic Studies 9(1): 58–73', ['8.1']),
  R('Viner, J.', 1931, 'Cost Curves and Supply Curves', 'Zeitschrift für Nationalökonomie 3(1): 23–46', ['3.1']),
  R('Walras, L.', 1874, 'Éléments d’économie politique pure', 'Lausanne: Corbaz', ['5.1'], true),
  R('Working, E. J.', 1927, 'What Do Statistical ‘Demand Curves’ Show?', 'Quarterly Journal of Economics 41(2): 212–235', ['7.2']),
  R('Wright, P. G.', 1928, 'The Tariff on Animal and Vegetable Oils', 'New York: Macmillan', ['7.2'], true),
  R('Young, A.', 1995, 'The Tyranny of Numbers: Confronting the Statistical Realities of the East Asian Growth Experience', 'Quarterly Journal of Economics 110(3): 641–680', ['6.1']),
];

// a place in Part 1, as a link: a figure, a stage, or a field course
function place(p) {
  if (p.startsWith('s')) return `<a href="#${p}">${esc(t(`Stage ${p.slice(1)}`))}</a>`;
  if (p.startsWith('c')) return `<a href="#c${p.slice(1).replace('.', '-')}">${p.slice(1)}</a>`;
  return `<a href="#f${p.replace('.', '-')}">${esc(t(`Figure ${p}`))}</a>`;
}

export function partOneSources() {
  const texts = document.querySelector('#p1-texts');
  if (texts) {
    const item = (x) => (x.u ? `<li><a href="${x.u}" rel="noopener">${esc(x.t)}</a></li>` : `<li>${esc(x.t)}</li>`);
    const cell = (xs) => (xs.length ? `<ul>${xs.map(item).join('')}</ul>` : `<p class="none">${esc(t('none checked yet'))}</p>`);
    const rows = ROWS.map(([no, href, label, id]) => `<tr><td><a href="${href}"><span class="bno">${LANG === 'ko' ? no.replace('–', '~') : no}</span>${esc(label())}</a></td><td>${cell(SHELF[id].std)}</td><td>${cell(SHELF[id].ko)}</td></tr>`).join('');
    texts.innerHTML = `<div class="partslist shelf-table p1-texts"><table><thead><tr><th>${esc(t('In Part 1'))}</th><th>${esc(t('Standard texts'))}</th><th>${esc(t('In Korean'))}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  const refs = document.querySelector('#p1-refs');
  if (refs) {
    refs.innerHTML = REFS.map((r) => {
      // a book's title in italics, an article's in quotes, a description in brackets as it is
      const end = /[?!]$/.test(r.title) ? '' : '.';
      const title = r.book ? `<i>${esc(r.title)}</i>${end}` : r.title.startsWith('[') ? `${esc(r.title)}.` : `“${esc(r.title)}${end}”`;
      return `<li>${esc(r.a)} (${r.y}). ${title} ${esc(r.w)}. <span class="at">${r.at.map(place).join(', ')}</span></li>`;
    }).join('');
  }
}
