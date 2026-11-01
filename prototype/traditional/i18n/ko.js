// Korean strings for what the scripts draw (i18n.js, docs/i18n.md). Keys are
// the English strings with their numbers as {0}, {1}, …; each part is
// translated from tools/i18n_extract.py's lists (strings-*.json).

import p1 from './ko-p1.js';
import p23 from './ko-p23.js';
import curriculum from './ko-curriculum.js';
import extra from './ko-extra.js';

export default { ...curriculum, ...p1, ...p23, ...extra };
