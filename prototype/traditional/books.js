// Part 3's textbooks (docs/textbook-plan.md, D113, D114): twenty-two books,
// 301 chapters, read in eight works. A work ends when what it hands in passes
// three tests on a case the books do not contain; nothing here says how long a
// work takes. The chapters each work reads are the plan's table 4.1, and the
// books are its table 4.3; tools/check_works.py checks the order in the plan.

const R = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// waits: the works it waits for. col, row: its place in Figure 3.12's grid
// (row 0 is both rows). adds: the cells of the wheel it sets moving.
export const WORKS = [
  { no: 1, name: 'Read', hands: 'unit cards and conditional paragraphs', waits: [], col: 1, row: 0,
    adds: ['Goods', 'Taxes', 'Households', 'Firms', 'Labor', 'Capital', 'Money', 'Governments', 'Central banks', 'Policy rules', 'Other countries', 'Foreign exchange', 'Land and air'] },
  { no: 2, name: 'Solve', hands: 'a one-page derivation', waits: [1], col: 2, row: 0, adds: ['Optimization', 'Strategy', 'Contracts'] },
  { no: 3, name: 'Prove', hands: 'a one-page proof, and where it fails', waits: [2], col: 3, row: 1, adds: ['Equilibrium'] },
  { no: 4, name: 'Build the economy', hands: 'a reversal review', waits: [3], col: 4, row: 1, adds: ['Banks'] },
  { no: 5, name: 'Measure', hands: 'a refutation plan, and its estimate', waits: [2], col: 3, row: 2, adds: ['Measurement'] },
  { no: 6, name: 'Compute', hands: 'a computation report', waits: [3, 4, 5], col: 5, row: 1, adds: ['Computation', 'Networks'] },
  { no: 7, name: 'Review and answer', hands: 'a referee report and a policy memo, in three fields or more', waits: [4, 5], col: '5 / span 2', row: 2, adds: ['Property', 'Regulation', 'History'] },
  { no: 8, name: 'Question and write', hands: 'a first paper', waits: [6, 7], col: 6, row: 1, adds: [] },
];

// read: work → the chapters read in it. course: the course page of the
// course taught now, where there is one. takes: the method at the hub it
// teaches, or the one thing it changes in the core.
export const BOOKS = [
  { no: 1, id: 'reasoning', side: 'core', name: 'Economic reasoning: models, conditions, evidence', short: 'Reasoning', course: null,
    question: 'What logical form does an economic claim have, and when can it be called wrong?',
    takes: 'method: the conditional, holding fixed, refutation, causes, writing', read: { 1: R(1, 12) } },
  { no: 2, id: 'principles', side: 'core', name: 'Principles of economics', short: 'Principles', course: 'principles',
    question: 'From one market to the whole economy, what does economics hold fixed, and what does it solve?',
    takes: 'the start: the core in seed form', read: { 1: R(1, 17) } },
  { no: 3, id: 'math1', side: 'core', name: 'Mathematics for economists I: optimization and comparative statics', short: 'Math I', course: 'math',
    question: 'How is a chooser’s problem solved, and how does the answer move when a held value moves?',
    takes: 'Optimization', read: { 2: R(1, 14) } },
  { no: 4, id: 'math2', side: 'core', name: 'Mathematics for economists II: analysis and topology', short: 'Math II', course: null,
    question: 'When does an equilibrium exist, and when is it unique, continuous and stable?',
    takes: 'Equilibrium: existence, and the grounds of comparative statics', read: { 3: R(1, 16) } },
  { no: 5, id: 'probability', side: 'core', name: 'Probability and statistics', short: 'Prob. & stats', course: null,
    question: 'How are an uncertain world and its data put into numbers?',
    takes: 'the grounds of Measurement', read: { 2: R(1, 6), 5: R(7, 16) } },
  { no: 6, id: 'micro', side: 'core', name: 'Intermediate microeconomics', short: 'Micro', course: 'micro',
    question: 'When households and firms choose, where does the market settle, and does it get there?',
    takes: 'opens households and firms, then all markets at once', read: { 2: [...R(1, 10), 13, 14], 3: [11, 12, 15, 16] } },
  { no: 7, id: 'games', side: 'core', name: 'Game theory', short: 'Games', course: 'games',
    question: 'What does one choose when another’s choice changes one’s own result?',
    takes: 'Strategy; relaxes price-taking (A3)', read: { 2: R(1, 11), 3: R(12, 15) } },
  { no: 8, id: 'macro', side: 'core', name: 'Intermediate macroeconomics', short: 'Macro', course: 'macro',
    question: 'What sets the output, prices and employment of a whole open economy?',
    takes: 'adds time, money, the state, other countries, and the money banks create', read: { 4: R(1, 18) } },
  { no: 9, id: 'metrics', side: 'core', name: 'Econometrics', short: 'Metrics', course: 'metrics',
    question: 'How are relations read from data?',
    takes: 'Measurement; relaxes that data show relationships (A8)', read: { 5: R(1, 15) } },
  { no: 10, id: 'computation', side: 'core', name: 'Computational economics', short: 'Computing', course: null,
    question: 'How is a model solved that cannot be solved on the page?',
    takes: 'Computation: unlike and connected agents, solved by simulation', read: { 6: R(1, 13) } },
  { no: 11, id: 'trade', side: 'field', name: 'International trade', short: 'Trade', course: 'trade',
    question: 'Who gains from trade between countries, and who loses inside each of them?',
    takes: 'adds a second country’s goods and factors', read: { 7: R(1, 11) } },
  { no: 12, id: 'intlfin', side: 'field', name: 'International finance', short: 'Intl finance', course: 'intlfin',
    question: 'What sets exchange rates, current accounts and the room for national policy?',
    takes: 'the exchange rate as an asset price, crises, and the network of capital flows', read: { 7: R(1, 12) } },
  { no: 13, id: 'banking', side: 'field', name: 'Money and banking', short: 'Money & banking', course: 'banking',
    question: 'When do banks fail, how does a crisis spread, and what stops it?',
    takes: 'adds the risks of balance sheets, and their regulation', read: { 7: R(1, 12) } },
  { no: 14, id: 'public', side: 'field', name: 'Public economics', short: 'Public', course: 'public',
    question: 'When should the state tax, spend or insure, and how much does it cost?',
    takes: 'adds the state as one who chooses', read: { 7: R(1, 14) } },
  { no: 15, id: 'labor', side: 'field', name: 'Labor economics', short: 'Labor', course: 'labor',
    question: 'How are wages and employment set, and why do they differ so much between people?',
    takes: 'adds people as what is traded, and the friction of matching', read: { 7: R(1, 13) } },
  { no: 16, id: 'io', side: 'field', name: 'Industrial organization', short: 'IO', course: 'io',
    question: 'How do firms compete when markets are not perfectly competitive?',
    takes: 'adds strategy between firms', read: { 7: R(1, 13) } },
  { no: 17, id: 'development', side: 'field', name: 'Development economics', short: 'Development', course: 'development',
    question: 'Why do some countries stay poor, and what helps the poor in them?',
    takes: 'relaxes complete markets (A5)', read: { 7: R(1, 13) } },
  { no: 18, id: 'environmental', side: 'field', name: 'Environmental economics', short: 'Environment', course: 'environmental',
    question: 'How should a society price damage to the environment, including damage far in the future?',
    takes: 'adds a very long horizon', read: { 7: R(1, 13) } },
  { no: 19, id: 'finance', side: 'field', name: 'Financial economics', short: 'Finance', course: 'finance',
    question: 'What is a risky future payment worth today?',
    takes: 'adds the price of risk', read: { 7: R(1, 12) } },
  { no: 20, id: 'behavioral', side: 'field', name: 'Behavioral economics', short: 'Behavioral', course: 'behavioral',
    question: 'What changes when people are not the agents of the core courses?',
    takes: 'relaxes consistent choice (A6)', read: { 7: R(1, 12) } },
  { no: 21, id: 'history', side: 'field', name: 'Economic history', short: 'Econ history', course: 'history',
    question: 'How did the world economy become what it is?',
    takes: 'History: time outside the model', read: { 7: R(1, 12) } },
  { no: 22, id: 'method', side: 'last', name: 'Methods and philosophy of economics', short: 'Philosophy', course: null,
    question: 'What has economics known, how did it come to know it, and where was it wrong?',
    takes: 'method, read a second time, and the first paper', read: { 8: R(1, 12) } },
];

// Beside each book, the textbooks it answers to (docs/next-series.md 4):
// std, the standard texts; open, texts free online or reworking the field;
// ko, Korean texts. Editions were checked on 2026-11-16 against publishers',
// authors' and 알라딘's pages (research_notes/). u: where a text is free.
const T = (t, u = null) => ({ t, u });
export const SHELF = {
  reasoning: {
    std: [T('McCloskey, Economical Writing, 3rd ed., University of Chicago Press 2019'), T('Thomson, A Guide for the Young Economist, 2nd ed., MIT Press 2011'), T('Boumans and Davis, Economic Methodology: Understanding Economics as a Science, 2nd ed., Palgrave 2016'), T('Reiss, Philosophy of Economics: A Contemporary Introduction, Routledge 2013')],
    open: [T('Rubinstein, Economic Fables, Open Book Publishers 2012', 'https://books.openedition.org/obp/310'), T('Osborne and Rubinstein, Models in Microeconomic Theory, 2nd ed., Open Book Publishers 2023', 'https://www.economics.utoronto.ca/osborne/mmt/'), T('Huntington-Klein, The Effect, Chapman & Hall/CRC (1st ed. free online; 2nd ed. 2025 in print)', 'https://theeffectbook.net/')],
    ko: [],
  },
  principles: {
    std: [T('Mankiw, Principles of Economics, 11th ed., Cengage 2026'), T('Krugman and Wells, Economics, 7th ed., Macmillan 2024'), T('Acemoglu, Laibson and List, Economics, 3rd ed., Pearson 2024'), T('Stevenson and Wolfers, Principles of Economics, 3rd ed., Macmillan 2026')],
    open: [T('CORE, The Economy 2.0: Microeconomics, Macroeconomics', 'https://books.core-econ.org/the-economy/'), T('OpenStax, Principles of Economics, 3rd ed. (CC BY)', 'https://openstax.org/books/principles-economics-3e/pages/preface')],
    ko: [T('이준구·이창용, 『경제학원론』 7판, 문우사 2025'), T('김대식·노영기·안국신·이종철·박성용, 『현대 경제학원론』 8판, 박영사 2025'), T('조순·정운찬·전성인·김영식, 『경제학원론』 12판, 율곡출판사 2024')],
  },
  math1: {
    std: [T('Sydsæter, Hammond, Strøm and Carvajal, Essential Mathematics for Economic Analysis, 6th ed., Pearson 2021'), T('Chiang and Wainwright, Fundamental Methods of Mathematical Economics, 4th ed., McGraw-Hill 2005'), T('Hoy, Livernois, McKenna, Rees and Stengos, Mathematics for Economics, 4th ed., MIT Press 2022')],
    open: [T('Boyd and Vandenberghe, Convex Optimization, Cambridge University Press 2004', 'https://web.stanford.edu/~boyd/cvxbook/'), T('QuantEcon, A First Course in Quantitative Economics with Python', 'https://intro.quantecon.org/')],
    ko: [T('김성현, 『경제수학 강의』, 한빛아카데미 2023'), T('강창민, 『경제수학』, 박영사 2024'), T('김완진, 『경제수학』 2판, 홍문사 2019')],
  },
  math2: {
    std: [T('Sundaram, A First Course in Optimization Theory, Cambridge University Press 1996'), T('Ok, Real Analysis with Economic Applications, Princeton University Press 2007'), T('Border, Fixed Point Theorems with Applications to Economics and Game Theory, Cambridge University Press 1985'), T('Mas-Colell, Whinston and Green, Microeconomic Theory, Oxford University Press 1995, ch. 17')],
    open: [T('Sargent and Stachurski, Dynamic Programming, vol. I, Cambridge University Press 2025', 'https://dp.quantecon.org/'), T('Sargent and Stachurski, Economic Networks, Cambridge University Press', 'https://networks.quantecon.org/'), T('Stachurski, Economic Dynamics: Theory and Computation, 2nd ed.', 'https://johnstachurski.net/edtc')],
    ko: [],
  },
  probability: {
    std: [T('Hansen, Probability and Statistics for Economists, Princeton University Press 2022 (data and code free)'), T('DeGroot and Schervish, Probability and Statistics, 4th ed., Addison-Wesley'), T('Casella and Berger, Statistical Inference, 2nd ed., Duxbury 2002')],
    open: [T('Seeing Theory, Brown University', 'https://seeing-theory.brown.edu/'), T('James, Witten, Hastie and Tibshirani, An Introduction to Statistical Learning (R 2021, Python 2023)', 'https://www.statlearning.com/')],
    ko: [T('류근관, 『통계학』 3판, 법문사 2013')],
  },
  micro: {
    std: [T('Varian and Melitz, Intermediate Microeconomics, 10th ed., Norton 2024'), T('Nicholson and Snyder, Microeconomic Theory, 13th ed., Cengage'), T('Goolsbee, Levitt and Syverson, Microeconomics, 4th ed., Macmillan 2024'), T('Kreps, Microeconomic Foundations I and II, Princeton University Press 2013, 2023'), T('Mas-Colell, Whinston and Green, Microeconomic Theory, Oxford University Press 1995')],
    open: [T('Osborne and Rubinstein, Models in Microeconomic Theory, 2nd ed., Open Book Publishers 2023', 'https://www.economics.utoronto.ca/osborne/mmt/'), T('Bowles and Halliday, Microeconomics: Competition, Conflict, and Coordination, Oxford University Press 2022', 'http://simondhalliday.com/microeconomics/bowleshalliday_final_2022.pdf'), T('Bowles and Chen, Allocation, Distribution and Policy, Open Book Publishers', 'https://books.openbookpublishers.com/10.11647/obp.0466.pdf')],
    ko: [T('이준구·최승주, 『미시경제학』 8판, 문우사 2024'), T('김영산·왕규호, 『미시경제학』 3판, 박영사 2020 (배포 중단)')],
  },
  games: {
    std: [T('Osborne, An Introduction to Game Theory, Oxford University Press 2004'), T('Maschler, Solan and Zamir, Game Theory, 2nd ed., Cambridge University Press 2020'), T('Tadelis, Game Theory: An Introduction, Princeton University Press 2013')],
    open: [T('Osborne and Rubinstein, A Course in Game Theory, MIT Press 1994', 'https://www.economics.utoronto.ca/osborne/cgt/'), T('Sargent and Stachurski, Economic Networks, Cambridge University Press', 'https://networks.quantecon.org/')],
    ko: [T('김광호, 『게임이론』 3판, 교문사 2025'), T('왕규호, 『게임이론』, 박영사 2005')],
  },
  macro: {
    std: [T('Blanchard, Macroeconomics, 9th ed., Pearson 2024'), T('Mankiw, Macroeconomics, 12th ed., Worth 2025'), T('Jones, Macroeconomics, 6th ed., Norton 2024'), T('Romer, Advanced Macroeconomics, 5th ed., McGraw-Hill 2019')],
    open: [T('Carlin and Soskice, Macroeconomics: Institutions, Instability, and Inequality, 2nd ed., Oxford University Press 2024', 'https://sites.google.com/site/wendycarlinucl/new-book'), T('CORE, The Economy 2.0: Macroeconomics', 'https://books.core-econ.org/the-economy/'), T('Garín, Lester and Sims, Intermediate Macroeconomics', 'https://sites.nd.edu/esims/textbook/'), T('Campante, Sturzenegger and Velasco, Advanced Macroeconomics: An Easy Guide, LSE Press 2021', 'https://eprints.lse.ac.uk/112475/')],
    ko: [T('이종화·신관호, 『거시경제학』 4판, 박영사 2024'), T('김경수·박대근, 『거시경제학』 7판, 박영사 2025'), T('정운찬·김영식·이재원, 『거시경제론』 13판, 율곡출판사 2022'), T('이종화·김진일, 『동태적 거시경제학: 성장과 변동』 2판, 박영사 2026'), T('블랑샤르, 『거시경제학』 9판, 한빛아카데미 2026')],
  },
  metrics: {
    std: [T('Wooldridge, Introductory Econometrics, 8th ed., Cengage 2025'), T('Stock and Watson, Introduction to Econometrics, 4th ed., Pearson 2019'), T('Hansen, Econometrics, Princeton University Press 2022'), T('Angrist and Pischke, Mostly Harmless Econometrics, Princeton University Press 2009')],
    open: [T('Huntington-Klein, The Effect, Chapman & Hall/CRC (1st ed. free online; 2nd ed. 2025 in print)', 'https://theeffectbook.net/'), T('Cunningham, Causal Inference: The Mixtape (2nd ed., The Remix, Yale University Press 2026)', 'https://mixtape.scunning.com/'), T('Chernozhukov, Hansen, Kallus, Spindler and Syrgkanis, Applied Causal Inference Powered by ML and AI', 'https://causalml-book.org/'), T('Hyndman and Athanasopoulos, Forecasting: Principles and Practice, 3rd ed.', 'https://otexts.com/fpp3/')],
    ko: [T('한치록, 『계량경제학 강의』 5판, 박영사 2024'), T('한치록, 『패널데이터강의』 4판, 박영사 2024'), T('울드리지, 『계량경제학 1』 8판, 박상수·한치록 옮김, 박영사 2026')],
  },
  computation: {
    std: [T('Judd, Numerical Methods in Economics, MIT Press 1998'), T('Miranda and Fackler, Applied Computational Economics and Finance, MIT Press 2002')],
    open: [T('QuantEcon lectures (Python, JAX, Julia)', 'https://quantecon.org/lectures/'), T('Sargent and Stachurski, Dynamic Programming, vol. I, Cambridge University Press 2025', 'https://dp.quantecon.org/'), T('Axtell and Farmer, “Agent-Based Modeling in Economics and Finance”, Journal of Economic Literature 63(1), 2025', 'https://www.aeaweb.org/doi/10.1257/jel.20221319')],
    ko: [],
  },
  trade: {
    std: [T('Krugman, Obstfeld and Melitz, International Economics: Theory and Policy, 12th ed., Pearson 2022'), T('Feenstra and Taylor, International Trade, 6th ed., Macmillan Learning 2027'), T('Feenstra, Advanced International Trade: Theory and Evidence, 2nd ed., Princeton University Press 2016')],
    open: [T('Suranovic, International Trade: Theory and Policy, Saylor Foundation 2010 (CC BY-NC-SA)', 'https://open.umn.edu/opentextbooks/textbooks/international-trade-theory-and-policy'), T('Costinot and Donaldson, International Economics I, MIT OpenCourseWare 14.581, 2013', 'https://ocw.mit.edu/courses/14-581-international-economics-i-spring-2013/pages/syllabus/')],
    ko: [T('크루그먼·옵스펠드·멜리츠, 『국제경제학: 이론과 정책』 12판, 김승년·이연호·최혜린·허정 옮김, 한빛아카데미 2022'), T('김신행·김태기, 『국제경제론』 8판, 법문사 2024'), T('권철우·이재민·황석준·황욱, 『국제무역론』, 박영사 2023'), T('표학길·김영한, 『국제무역과 통상』, 청람 2024'), T('살바토레, 『살바토레의 국제무역론』 13판, 최낙일 옮김, 시그마프레스 2021')],
  },
  intlfin: {
    std: [T('Krugman, Obstfeld and Melitz, International Economics: Theory and Policy, 12th ed., Pearson 2022, Parts 3–4'), T('Feenstra and Taylor, International Macroeconomics, 6th ed., Macmillan Learning 2027'), T('Uribe and Schmitt-Grohé, Open Economy Macroeconomics, Princeton University Press 2017'), T('Obstfeld and Rogoff, Foundations of International Macroeconomics, MIT Press 1996')],
    open: [T('Schmitt-Grohé, Uribe and Woodford, International Macroeconomics: A Modern Approach, Princeton University Press 2022'), T('Brunnermeier and Reis, A Crash Course on Crises, Princeton University Press 2023'), T('Caballero, Economic Crises, MIT OpenCourseWare 14.454, 2026', 'https://ocw.mit.edu/courses/14-454-economic-crises-spring-2026/pages/syllabus/'), T('Suranovic, International Finance: Theory and Policy, Saylor Foundation 2010 (CC BY-NC-SA)', 'https://open.umn.edu/opentextbooks/textbooks/international-finance-theory-and-policy')],
    ko: [T('김인준·이영섭, 『국제금융론』 4판, 율곡출판사 2019'), T('안홍식·최문정, 『국제금융론』 8판, 삼영사 2024'), T('박준서·이순호·최동현, 『국제금융론: 이론과 위기 및 대응』, 자유아카데미 2024'), T('국제금융연구회, 『글로벌 시대의 국제금융론』 6판, 시대가치 2022'), T('한국은행, 『한국의 외환시장과 외환제도』, 한국은행 2023')],
  },
  banking: {
    std: [T('Mishkin, The Economics of Money, Banking, and Financial Markets, 13th ed., Pearson 2022'), T('Freixas and Rochet, Microeconomics of Banking, 2nd ed., MIT Press 2008')],
    open: [T('CORE, The Economy 2.0: Macroeconomics, §6.8 “Money creation in a modern economy”, 2025 (CC BY-NC-ND)', 'https://books.core-econ.org/the-economy/macroeconomics/06-financial-sector-08-money-creation-in-modern-economy.html'), T('McLeay, Radia and Thomas, “Money creation in the modern economy”, Bank of England Quarterly Bulletin 2014 Q1', 'https://www.bankofengland.co.uk/quarterly-bulletin/2014/q1/money-creation-in-the-modern-economy'), T('Gorton and Tallman, Fighting Financial Crises: Learning from the Past, University of Chicago Press 2018'), T('Mehrling, Economics of Money and Banking, Columbia University on Coursera', 'https://www.coursera.org/learn/money-banking')],
    ko: [T('정운찬·김홍범·김진일, 『화폐와 금융시장』 6판, 율곡출판사 2022'), T('미쉬킨, 『미쉬킨의 화폐와 금융』 12판, 2021'), T('박기영, 『금융경제학: 파이썬을 활용한 금융시장과 통화정책의 이해』, 시그마프레스 2026'), T('윤택, 『거시금융경제학』 2판, 박영사 2025'), T('노상채·김창범, 『화폐금융론』 6판, 박영사 2019')],
  },
  public: {
    std: [T('Gruber, Public Finance and Public Policy, 8th ed., Macmillan Learning 2026'), T('Stiglitz and Rosengard, Economics of the Public Sector, 4th ed., Norton 2015'), T('Hindriks and Myles, Intermediate Public Economics, 2nd ed., MIT Press 2013'), T('Atkinson and Stiglitz, Lectures on Public Economics, updated ed., Princeton University Press 2015'), T('Salanié, The Economics of Taxation, 2nd ed., MIT Press 2011')],
    open: [T('Saez, Econ 131 Undergraduate Public Economics, UC Berkeley 2025 (slides with LaTeX source)', 'https://eml.berkeley.edu/~saez/course131/course131.html'), T('Saez and Shapiro, Econ 230A Graduate Public Economics, UC Berkeley 2026', 'https://eml.berkeley.edu/~saez/course/course.html'), T('Chetty and Bruich, Using Big Data to Solve Economic and Social Problems, Harvard 2019', 'https://opportunityinsights.org/course/')],
    ko: [T('이준구·조명환, 『재정학』 7판, 문우사 2026'), T('나성린·전영섭·홍성훈·허은정, 『공공경제학』 5판, 박영사 2022'), T('임봉욱, 『공공경제학』 6판, 율곡출판사 2022'), T('Rosen·Gayer·Civan, 『Rosen의 재정학』 10판, 이영·전영준·이철인·김진영 옮김, 한국맥그로힐 2020')],
  },
  labor: {
    std: [T('Borjas, Labor Economics, 9th ed., McGraw Hill 2024'), T('Ehrenberg, Smith and Hallock, Modern Labor Economics: Theory and Public Policy, 15th ed., Routledge 2025'), T('Cahuc, Carcillo and Zylberberg, Labor Economics, 2nd ed., MIT Press 2014'), T('Pissarides, Equilibrium Unemployment Theory, 2nd ed., MIT Press 2000'), T('Manning, Monopsony in Motion, Princeton University Press 2003')],
    open: [T('Sargent and Stachurski, “Job Search I: The McCall Search Model”, QuantEcon', 'https://python.quantecon.org/mccall_model.html'), T('Manning, “Monopsony in Labor Markets: A Review”, ILR Review 74(1), 2021 (accepted version)', 'https://researchonline.lse.ac.uk/id/eprint/103482/1/MonopsonyILR_Revision.pdf'), T('Card and Krueger, Myth and Measurement, 20th anniversary ed., Princeton University Press 2016')],
    ko: [T('Borjas, 『노동경제학』 9판, 강창희·박철성·송헌재 옮김, 시그마프레스 2025'), T('송민정·반가운·손정순, 『노동경제학』, 한국방송통신대학교출판문화원 2025'), T('남성일, 『쉬운 노동경제학』, 박영사 2017')],
  },
  io: {
    std: [T('Pepall, Richards and Norman, Industrial Organization: Contemporary Theory and Empirical Applications, 5th ed., Wiley 2014'), T('Cabral, Introduction to Industrial Organization, 2nd ed., MIT Press 2017'), T('Belleflamme and Peitz, Industrial Organization: Markets and Strategies, 2nd ed., Cambridge University Press 2015'), T('Tirole, The Theory of Industrial Organization, MIT Press 1988'), T('Motta, Competition Policy: Theory and Practice, Cambridge University Press 2004')],
    open: [T('Hortaçsu and Joo, Structural Econometric Modeling in Industrial Organization and Quantitative Marketing, Princeton University Press 2023'), T('Belleflamme and Peitz, The Economics of Platforms: Concepts and Strategy, Cambridge University Press 2021'), T('Conlon and Gortmaker, PyBLP: documentation and tutorials (Python)', 'https://pyblp.readthedocs.io/en/stable/'), T('Aguirregabiria, Collard-Wexler and Ryan, “Dynamic Games in Empirical Industrial Organization”, Handbook of Industrial Organization vol. 4, 2021 (arXiv)', 'https://arxiv.org/abs/2109.01725')],
    ko: [T('정갑영·김동훈·최윤정, 『산업조직론』 7판, 박영사 2025'), T('박종국, 『산업조직론』 4판, 법문사 2023'), T('김광두·공명재, 『산업조직론』 2판, 율곡출판사 2021'), T('Pepall·Richards·Norman, 『산업조직론』 5판, 김대욱 옮김, 텍스트북스 2024'), T('티롤, 『티롤의 산업조직론』, 추기능 옮김, 추경 2024')],
  },
  development: {
    std: [T('Todaro and Smith, Economic Development, 13th ed., Pearson 2020'), T('Ashraf and Weil, Economic Growth, 4th ed., Routledge 2025'), T('Jones and Vollrath, Introduction to Economic Growth, 4th ed., Norton 2023'), T('Ray, Development Economics, Princeton University Press 1998'), T('Bardhan and Udry, Development Microeconomics, Oxford University Press 1999')],
    open: [T('de Janvry and Sadoulet, Development Economics: Theory and Practice, 2nd ed., Routledge 2021'), T('Banerjee and Duflo, The Challenge of World Poverty, MIT OpenCourseWare 14.73, 2011', 'https://ocw.mit.edu/courses/14-73-the-challenge-of-world-poverty-spring-2011/'), T('Duflo and Olken, Development Economics, MIT OpenCourseWare 14.771, 2021', 'https://ocw.mit.edu/courses/14-771-development-economics-fall-2021/pages/syllabus'), T('Vollrath, Growth4ed: Python code for every figure in Jones and Vollrath, 4th ed.', 'https://github.com/dvollrath/Growth4ed')],
    ko: [T('강성진, 『경제발전론』 3판, 박영사 2026'), T('김적교, 『한국의 경제발전』 2판, 박영사 2016'), T('김인철, 『경제발전론』 2판, 박영사 2013')],
  },
  environmental: {
    std: [T('Kolstad and Netusil, Environmental Economics, 3rd ed., Oxford University Press 2026'), T('Tietenberg and Lewis, Environmental and Natural Resource Economics, 12th ed., Routledge 2024'), T('Keohane and Olmstead, Markets and the Environment, 2nd ed., Island Press 2016'), T('Phaneuf and Requate, A Course in Environmental Economics, Cambridge University Press 2017'), T('Gollier, Pricing the Planet\'s Future, Princeton University Press 2012')],
    open: [T('Barrage and Nordhaus, “Policies, projections, and the social cost of carbon: Results from the DICE-2023 model”, PNAS 121(13), 2024', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10990119'), T('DICEModel.jl, a Julia port of DICE-2023 (MIT licence)', 'https://sylvaticus.github.io/DICEModel.jl/dev'), T('Reed College, readings for Kolstad and Netusil, 3rd ed.: JEP and REEP articles by chapter', 'https://www.reed.edu/economics/resources/environmental-economics-3rd-ed.html')],
    ko: [T('권오상, 『환경경제학』 5판, 박영사 2025'), T('이충기·박상수, 『환경경제학』, 한국방송통신대학교출판문화원 2023'), T('이정전, 『환경경제학 이해』 개정판, 박영사 2011')],
  },
  finance: {
    std: [T('Bodie, Kane and Marcus, Essentials of Investments, 13th ed. (2024 Release), McGraw Hill 2024'), T('Bodie, Kane, Marcus and Racculia, Investments, 2026 Release, McGraw Hill 2026'), T('Campbell, Financial Decisions and Markets, Princeton University Press 2018'), T('Cochrane, Asset Pricing, revised ed., Princeton University Press 2005'), T('Back, Asset Pricing and Portfolio Choice Theory, 2nd ed., Oxford University Press 2017')],
    open: [T('Hansen, Sargent and Borovička, Risk, Uncertainty, and Value, QuantMFR (online, with Python notebooks)', 'https://lphansen.github.io/QuantMFR/intro.html'), T('Cochrane, Asset Pricing: free online class, notes and lecture videos', 'https://www.johnhcochrane.com/asset-pricing'), T('Nagel, Machine Learning in Asset Pricing, Princeton University Press 2021'), T('Pedersen, Efficiently Inefficient, Princeton University Press 2015')],
    ko: [T('Bodie·Kane·Marcus, 『Bodie의 기본투자론』 12판, 남상구·최승두 옮김, 지필미디어 2022'), T('이재하·한덕희, 『투자론』 3판, 박영사 2026'), T('박기영, 『금융경제학: 파이썬을 활용한 금융시장과 통화정책의 이해』, 시그마프레스 2026'), T('황수성·신진호, 『재무경제학』 2판, 정독 2023'), T('변진호·위정범, 『투자론』 2판, 청람 2022')],
  },
  behavioral: {
    std: [T('Angner, A Course in Behavioral Economics, 3rd ed., Red Globe Press 2021'), T('Wilkinson and Klaes, An Introduction to Behavioral Economics, 3rd ed., Palgrave 2017'), T('Cartwright, Behavioral Economics, 4th ed., Routledge 2023'), T('Dhami, The Foundations of Behavioral Economic Analysis, Oxford University Press 2016'), T('Bernheim, DellaVigna and Laibson (eds.), Handbook of Behavioral Economics: Foundations and Applications, vols. 1–2, Elsevier 2018, 2019')],
    open: [T('Schilbach, Psychology and Economics, MIT OpenCourseWare 14.13, 2020', 'https://ocw.mit.edu/courses/14-13-psychology-and-economics-spring-2020/pages/syllabus/'), T('Congdon, Kling and Mullainathan, Policy and Choice: Public Finance Through the Lens of Behavioral Economics, 2011')],
    ko: [T('Angner, 『행동경제학 강의 노트』 3판, 이기홍 옮김, 에이콘출판 2022'), T('홍훈, 『홍훈 교수의 행동경제학 강의』, 서해문집 2016'), T('도모노 노리오, 『행동 경제학』 개정판, 이명희 옮김, 지형 2019')],
  },
  history: {
    std: [T('Allen, Global Economic History: A Very Short Introduction, Oxford University Press 2011'), T('Persson, Sharp and Lampe, An Economic History of Europe: Knowledge, Institutions and Welfare, Prehistory to the Present, 3rd ed., Cambridge University Press 2025'), T('Koyama and Rubin, How the World Became Rich, Polity 2022'), T('Broadberry and Fukao (eds.), The Cambridge Economic History of the Modern World, vols. I–II, Cambridge University Press 2021'), T('Feinstein and Thomas, Making History Count, 2002')],
    open: [T('Cunningham, Causal Inference: The Mixtape, Yale University Press 2021 (online 2nd ed., The Remix, in progress)', 'https://mixtape.scunning.com/'), T('EH.Net Encyclopedia, Economic History Association', 'https://eh.net/encyclopedia/'), T('Maddison Project Database, 2023 release, GGDC', 'https://www.rug.nl/ggdc/historicaldevelopment/maddison/')],
    ko: [T('이헌창, 『한국경제통사』 9판, 해남 2021'), T('송병건, 『경제사: 세계화와 세계 경제의 역사』 3판, 해남 2019'), T('김낙년·박기주·박이택·차명수, 『한국의 장기통계』 1·2, 해남 2018'), T('차명수, 『기아와 기적의 기원: 한국경제사, 1700~2010』, 해남 2014'), T('이영훈, 『한국경제사』 I·II, 일조각 2016'), T('앨런, 『세계경제사』 개정판, 이강국 옮김, 교유서가 2025')],
  },
  method: {
    std: [T('Boumans and Davis, Economic Methodology: Understanding Economics as a Science, 2nd ed., Palgrave 2016'), T('Reiss, Philosophy of Economics: A Contemporary Introduction, Routledge 2013'), T('Hausman (ed.), The Philosophy of Economics: An Anthology, 3rd ed., Cambridge University Press 2008'), T('Heilmann and Reiss (eds.), The Routledge Handbook of Philosophy of Economics, Routledge 2021'), T('Morgan, The World in the Model: How Economists Work and Think, Cambridge University Press 2012')],
    open: [T('Huntington-Klein, The Effect: An Introduction to Research Design and Causality, Chapman & Hall/CRC 2021 (free web edition of the 1st ed.; 2nd ed. 2025 in print)', 'https://theeffectbook.net/'), T('Head, “The Introduction Formula”', 'https://blogs.ubc.ca/khead/research/research-advice/formula'), T('AEA, Data and Code Availability Policy, 2026', 'https://www.aeaweb.org/journals/data/data-code-policy'), T('Cochrane, “Writing Tips for PhD Students”, 2005', 'https://www.johnhcochrane.com/research-all/writing-tips-for-phd-studentsnbsp')],
    ko: [T('홍태희, 『경제철학과 경제학방법론』, 박영사 2024'), T('로드릭, 『그래도 경제학이다』, 이강국 옮김, 생각의힘 2016'), T('조준현, 『철학으로서의 경제학』, 피앤씨미디어 2020')],
  },
};

export const chaptersOf = (b) => Object.values(b.read).flat().sort((x, y) => x - y);

// "1–10, 13, 14": a list of chapters as runs (in Korean, "1~10, 13, 14")
export function runs(chs, dash = '–') {
  const out = [];
  for (const c of chs) {
    const last = out.at(-1);
    if (last && c === last[1] + 1) last[1] = c;
    else out.push([c, c]);
  }
  return out.map(([a, b]) => (a === b ? `${a}` : b === a + 1 ? `${a}, ${b}` : `${a}${dash}${b}`)).join(', ');
}
