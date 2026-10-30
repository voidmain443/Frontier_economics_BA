// Part 1: the classical textbook. Figures in p1-figs.js; what each raises when
// the page is folded, in p1-fold.js.

import { FIGS } from './p1-figs.js';
import { CONSTRUCTS } from './p1-fold.js';
import { regressionData } from './figures.js';
import { setupPage } from './page.js';

await setupPage({
  figs: FIGS,
  constructs: CONSTRUCTS,
  files: ['korea-growth', 'us-phillips', 'korea-1997', 'crisis-2008', 'maddison'],
  data: { reg: regressionData().pts },
  // distinct agents on the page by the end of each stage
  agents: { 1: 2, 2: 3, 3: 4, 4: 4, 5: 4, 6: 6, 7: 6, 8: 9 },
  stages: 8,
  part: 'Part 1',
  name: 'The classical textbook',
});
