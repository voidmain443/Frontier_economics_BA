// The plaster maquettes of the agents (modelled in tools/blender), loaded once
// when the page first folds. A missing file falls back to a plain massing model.

import { cylinder, box, loadGLB } from './geo3d.js';

const ASSETS = ['household', 'firm', 'bank', 'government', 'central_bank', 'rest_of_world', 'person', 'person_crowd', 'firm_crowd'];

export async function loadAssets() {
  const out = {};
  await Promise.all(ASSETS.map(async (name) => {
    try {
      out[name] = await loadGLB(`assets/agents/${name}.glb`);
    } catch {
      out[name] = [{ node: name, material: 'plaster', geometry: name.startsWith('person') ? cylinder(0.12, 1, 12) : box(1, 0.55, 0.7), fallback: true }];
    }
  }));
  return out;
}
