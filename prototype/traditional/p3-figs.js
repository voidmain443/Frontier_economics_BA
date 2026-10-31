// Part 3, flat: the archive drawn as a plan. Four layers of what economics
// studies, six rooms each; every name is a door to the course that teaches it.

import { plot } from './figures.js';

const NS = 'http://www.w3.org/2000/svg';

// The order of rooms on each layer is the wheel's plan (wheel.js,
// docs/engine.md): a layer is a ring and its rooms are the ring's cells, so a
// figure that spans two cells is read where they meet, next to each other on a
// ring or one outside the other.
export const LAYERS = [
  { name: 'Methods', c: 'chalk', rooms: [
    ['Optimization', 'course.html?c=math'], ['Equilibrium', 'course.html?c=micro'], ['Strategy', 'course.html?c=games'],
    ['Measurement', 'course.html?c=metrics'], ['Computation', 'https://quantecon.org/'], ['History', 'course.html?c=history']] },
  { name: 'Institutions', c: 'olive', rooms: [
    ['Property', 'course.html?c=development'], ['Taxes', 'course.html?c=public'], ['Contracts', 'course.html?c=micro'],
    ['Regulation', 'course.html?c=io'], ['Policy rules', 'course.html?c=macro'], ['Networks', 'beyond.html#b1']] },
  { name: 'Markets', c: 'ochre', rooms: [
    ['Capital', 'course.html?c=finance'], ['Goods', 'course.html?c=principles'], ['Money', 'course.html?c=banking'],
    ['Labor', 'course.html?c=labor'], ['Foreign exchange', 'course.html?c=intlfin'], ['Land and air', 'course.html?c=environmental']] },
  // agents carry the maquette that stands in their room
  { name: 'Agents', c: 'cobalt', rooms: [
    ['Firms', 'course.html?c=io', 'firm'], ['Households', 'course.html?c=micro', 'household'], ['Banks', 'course.html?c=banking', 'bank'],
    ['Central banks', 'course.html?c=macro', 'central_bank'], ['Other countries', 'course.html?c=trade', 'rest_of_world'], ['Governments', 'course.html?c=public', 'government']] },
];

const FILL = { chalk: 'f-hatch', olive: 'f-olive', ochre: 'f-ochre', cobalt: 'f-cobalt' };

export const FIGS = {
  '3.1'(art) {
    const p = plot(art, { w: 940, h: 470, x: [-1.5, 6], y: [0, 4], axes: false, pad: { l: 10, r: 10, t: 14, b: 14 }, alt: 'The archive as a plan: four layers, methods at the bottom and agents at the top, six cells each, the wheel laid flat; every cell links to a course.' });
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
