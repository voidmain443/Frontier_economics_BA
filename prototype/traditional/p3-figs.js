// Part 3, flat: the archive drawn as a plan. Four layers of what economics
// studies, six rooms each; every name is a door to the course that teaches it.

import { plot } from './figures.js';

const NS = 'http://www.w3.org/2000/svg';

export const LAYERS = [
  { name: 'Methods', c: 'chalk', rooms: [
    ['Optimization', 'course.html?c=math'], ['Equilibrium', 'course.html?c=micro'], ['Strategy', 'course.html?c=games'],
    ['Measurement', 'course.html?c=metrics'], ['Computation', 'https://quantecon.org/'], ['History', 'course.html?c=history']] },
  { name: 'Institutions', c: 'olive', rooms: [
    ['Property', 'course.html?c=development'], ['Contracts', 'course.html?c=micro'], ['Regulation', 'course.html?c=io'],
    ['Taxes', 'course.html?c=public'], ['Policy rules', 'course.html?c=macro'], ['Networks', 'beyond.html#b1']] },
  { name: 'Markets', c: 'ochre', rooms: [
    ['Goods', 'course.html?c=principles'], ['Labor', 'course.html?c=labor'], ['Money', 'course.html?c=banking'],
    ['Capital', 'course.html?c=finance'], ['Foreign exchange', 'course.html?c=intlfin'], ['Land and air', 'course.html?c=environmental']] },
  { name: 'Agents', c: 'cobalt', rooms: [
    ['Households', 'course.html?c=micro'], ['Firms', 'course.html?c=io'], ['Banks', 'course.html?c=banking'],
    ['Governments', 'course.html?c=public'], ['Central banks', 'course.html?c=macro'], ['Other countries', 'course.html?c=trade']] },
];
export const AGENT_ASSETS = ['household', 'firm', 'bank', 'government', 'central_bank', 'rest_of_world'];

const FILL = { chalk: 'f-hatch', olive: 'f-olive', ochre: 'f-ochre', cobalt: 'f-cobalt' };

export const FIGS = {
  '3.1'(art) {
    const p = plot(art, { w: 940, h: 470, x: [-1.5, 6], y: [0, 4], axes: false, pad: { l: 10, r: 10, t: 14, b: 14 }, alt: 'The archive as a plan: four layers, methods at the bottom and agents at the top, six rooms each; every room links to a course.' });
    LAYERS.forEach((layer, L) => {
      p.line(-1.5, L, 6, L, 'k thin');
      p.label(-1.45, L + 0.5, layer.name, { dy: 6, roman: true, cls: 'step' });
      layer.rooms.forEach(([name, href], i) => {
        p.area([[i + 0.06, L + 0.1], [i + 0.94, L + 0.1], [i + 0.94, L + 0.9], [i + 0.06, L + 0.9]], FILL[layer.c]);
        p.pathPts([[i + 0.06, L + 0.1], [i + 0.94, L + 0.1], [i + 0.94, L + 0.9], [i + 0.06, L + 0.9], [i + 0.06, L + 0.1]], 'k thin');
        const t = p.label(i + 0.5, L + 0.5, name, { anchor: 'middle', dy: 6, roman: true, cls: 'room' });
        const a = document.createElementNS(NS, 'a');
        a.setAttribute('href', href);
        a.setAttribute('class', 'room-door');
        t.parentNode.insertBefore(a, t);
        a.appendChild(t);
      });
    });
    p.line(-1.5, 4, 6, 4, 'k thin');
  },
};
