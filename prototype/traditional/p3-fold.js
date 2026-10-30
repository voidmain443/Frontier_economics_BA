// Part 3, folded: the plan of the archive rises into a building. Each layer
// stands on the one below it: methods are the foundation, then institutions,
// markets, and the agents on top. Every room's name is a door to its course.

import { LAYERS, AGENT_ASSETS } from './p3-figs.js';

const blank = () => ({ surfaces: [], quads: [], meshes: [], segs: [], lines: [], points: [], tags: [], eqs: [], agents: [] });
const FLOOR = [0.06, 0.17, 0.28, 0.39];

export const CONSTRUCTS = {
  '3.1': {
    dom: { x: [-1.5, 6], y: [0, 4] },
    build() {
      const X = blank();
      LAYERS.forEach((layer, L) => {
        const h = FLOOR[L];
        const quads = [];
        const segs = [];
        layer.rooms.forEach(([name, href], i) => {
          const x0 = i + 0.06;
          const x1 = i + 0.94;
          const y0 = L + 0.1;
          const y1 = L + 0.9;
          quads.push([[x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h]]);
          quads.push([[x0, y0, 0], [x1, y0, 0], [x1, y0, h], [x0, y0, h]]);
          quads.push([[x1, y0, 0], [x1, y1, 0], [x1, y1, h], [x1, y0, h]]);
          segs.push([[x0, y0, 0], [x0, y0, h]], [[x1, y0, 0], [x1, y0, h]], [[x1, y1, 0], [x1, y1, h]], [[x0, y0, h], [x1, y0, h]], [[x1, y0, h], [x1, y1, h]], [[x0, y1, h], [x1, y1, h]], [[x0, y0, h], [x0, y1, h]]);
          X.tags.push({ text: name, at: [i + 0.12, L + 0.14, h], href });
          if (L === 3) X.agents.push({ asset: AGENT_ASSETS[i], at: [i + 0.5, L + 0.62, h], scale: 0.05 });
        });
        X.meshes.push({ quads, c: layer.c, alpha: 0.32 });
        X.segs.push({ segs, c: layer.c, w: 1.1, o: 0.9 });
        X.tags.push({ text: L === 0 ? 'Methods: the foundation' : layer.name, at: [-1.4, L + 0.5, h] });
      });
      return X;
    },
  },
};
