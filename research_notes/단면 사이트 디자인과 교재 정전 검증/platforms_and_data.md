# Economics-education reform platforms and Korean open economic data for chapter evidence

Research date: 2026-11-16. Method note: the session's web-search budget ran out partway through. Everything after that point was checked by fetching official pages directly (WebFetch or curl, plus a live call to the ECOS API). Some items rest on a search-engine summary, not on a page I opened, and they are marked "(via search summary)". Items I could not check are listed under Gaps and are never stated as fact.

---

## Q1. CORE Econ: how The Economy 2.0, Doing Economics and ESPP are structured and presented, and whether the Gemini claims hold

### Takeaway
Most of the Gemini claims about CORE are CONFIRMED, but four need correcting. The "building blocks" are specific sections, not whole units. The Macroeconomics volume came out in three stages (2024 to Nov 2025), not as one 2025 release. Hackett is only the North American print distributor. CORE now has a partial Korean edition (⟪경제 2.0⟫, Micro units 1–2 online), which is directly relevant to a Korean series.

### Cited Findings
**Structure**
- The Economy 2.0 has two volumes, *Microeconomics: Actors, Institutions, and Outcomes* and *Macroeconomics: Employment, Growth, and Fluctuations*. Each has a preface and 10 units. The site calls it "An open-access textbook for any first course in economics, whether principles, micro, or macro". — [CORE books site](https://books.core-econ.org/the-economy/)
- The 10 Micro units are: 1 Prosperity, inequality, and planetary limits; 2 Technology and incentives; 3 Doing the best you can (scarcity, wellbeing, working hours); 4 Strategic interactions and social dilemmas; 5 The rules of the game (who gets what and why); 6 The firm and its employees; 7 The firm and its customers; 8 Supply and demand (markets with many buyers and sellers); 9 Lenders and borrowers and differences in wealth; 10 Market successes and failures. — [CORE books site](https://books.core-econ.org/the-economy/)
- The 10 Macro units are: 1 Supply side: unemployment and real wages; 2 Unemployment, wages, inequality; 3 Aggregate demand and the multiplier; 4 Inflation and unemployment; 5 Macro policy; 6 The financial sector; 7 Policy in the global economy; 8 Economic dynamics: financial and environmental crises; 9 Uneven development; 10 Government as economic actor. — [CORE books site](https://books.core-econ.org/the-economy/)

**Unit dependencies (CONFIRMED)**
- The Micro note to instructors says "it is not necessary to teach the units in order". The only hard prerequisites are: "Unit 1 is required for Unit 2, and Unit 7 is required for Unit 8." — [Micro note to instructors](https://books.core-econ.org/the-economy/microeconomics/0-5-note-to-instructors.html)

**"Building blocks" (CONFIRMED with nuance)**
- The building blocks are named sections, not units. Constrained choice is Sections 3.2–3.5 (3.6 extended) and is used in Units 4, 5, 6, 7 and 9. Game theory and Nash equilibrium is Sections 4.2–4.3 (4.4 extended) and is used in Units 6, 7 and 8.
- The note also suggests course paths, such as a one-semester course covering all 10 units or a course that skips the more specialized Units 6 and 9. — [Micro note to instructors](https://books.core-econ.org/the-economy/microeconomics/0-5-note-to-instructors.html)

**Math in optional Extensions (CONFIRMED)**
- Micro Extensions "contain calculus" and replace the "Leibniz" boxes of The Economy 1.0. Each extension states its mathematical prerequisites at the start.
- Macro extensions mostly derive formulas (for example NPV and returns on investment). The main text keeps the intuition and numerical examples. — [Micro note to instructors](https://books.core-econ.org/the-economy/microeconomics/0-5-note-to-instructors.html)

**Release timing**
- Micro is cited as "The CORE Econ Team (2023). The Economy 2.0: Microeconomics". The site gives the version as 2.0.0. — [Micro note to instructors](https://books.core-econ.org/the-economy/microeconomics/0-5-note-to-instructors.html)
- Macro came out in three stages:
  - Units 1–5 in May 2024 and Units 6–8 in January 2025. — CORE annual accounts to 2025-09-30 (via search summary): [opencharities record](https://opencharities.uk/ew/1175143/files/2025-09-30-accounts.md)
  - Units 9–10 in November 2025, completing the volume (CORE post dated 18 Nov 2025). — (via search summary) [CORE Econ Bluesky mirror](https://www.bushdrum.com/bsky/coreecon.bsky.social)
  - So the Gemini claim "Macroeconomics 2025?" is PARTLY CORRECT: the volume was finished in 2025 but started appearing in 2024.

**Print edition (CONFIRMED with correction)**
- Hackett Publishing handles North American print sales and Gazelle Book Services handles the UK and Europe. There are two print volumes. The Gazelle links carry 9781647921606 (Micro) and 9781647922481 (Macro). North American instructors can get an inspection copy for USD 10. — [CORE print page](https://www.core-econ.org/how-to-get-the-economy-2-0-print-book/)
- One retailer lists the Macro print edition for 29 June 2026. — (via search summary) [Better Read listing](https://www.betterread.com.au/book/the-economy-20-macroeconomics.do)

**Ebook features and licence**
- Ebook features: interactive questions, interactive charts, step-by-step figures, videos with transcripts, pop-up definitions, bookmarks and a concept index.
- Formats: offline apps (Android, Windows, Mac) and epub, which is not Kindle-compatible.
- Licence: CC BY-NC-ND 4.0. Production: Electric Book Works. — [CORE books site](https://books.core-econ.org/the-economy/)
- Datasets behind all textbook charts are available in instructor resources. Units link to Doing Economics (data projects) and Experiencing Economics (classroom games). — [Micro note to instructors](https://books.core-econ.org/the-economy/microeconomics/0-5-note-to-instructors.html)

**Doing Economics (CONFIRMED)**
- Written by Eileen Tipoe and Ralf Becker. It has 12 numbered projects plus 2 "Extra" projects (for example climate change measurement, a sugar tax, inequality, banking, willingness to pay for climate mitigation).
- Each project has parallel "Working in" versions for Excel, R, Google Sheets and Python. Extra 1 has no Python version.
- Each project follows the same sequence: Learning objectives, Introduction, parts, Solutions. Licence CC BY-NC-ND, version 1.4.0. — [Doing Economics](https://books.core-econ.org/doing-economics/)

**Economy, Society, and Public Policy (CONFIRMED)**
- ESPP exists, alongside Experiencing Economics and CORE Insights. These are listed as ebooks only, with no print edition mentioned. — [CORE print page](https://www.core-econ.org/how-to-get-the-economy-2-0-print-book/)

**Reach**
- CORE describes a community of instructors at "more than 500 universities throughout the world", and offers more than 30 instructor case studies. — [Micro note to instructors](https://books.core-econ.org/the-economy/microeconomics/0-5-note-to-instructors.html)

**Korean edition (new finding, not in the Gemini report)**
- The language selector offers 한국어 alongside English, 中文 and Español.
- The Korean landing page, "⟪경제 2.0⟫ 세상을 바꾸는 경제학", says the Korean epub is "준비 중" (in preparation).
- On 2026-11-16 the Korean Micro contents page listed only Unit 1 (번영, 불평등, 그리고 전 지구적 한계들) and Unit 2 (기술과 인센티브). — [CORE Korean landing](https://books.core-econ.org/the-economy/ko/); [Korean Micro contents](https://books.core-econ.org/the-economy/microeconomics/ko/0-3-contents.html)
- Other translations (via search summary): a Spanish Micro edition appeared in 2025, and the Chinese Macro edition was expected in spring 2026. — [opencharities record](https://opencharities.uk/ew/1175143/files/2025-09-30-accounts.md)

### Inferences
- The micro "dependency graph" is very sparse: two hard edges plus two reusable building-block sections. This is a good model for the 22-book series. Declare a few hard prerequisites per book, and mark a small number of tool chapters (for example "constrained optimization", "identification") as shared building blocks that other books cite.
- CORE's split of "main text = intuition + numbers" and "Extension = calculus, with prerequisites stated at the top" maps directly onto the series' need to serve both undergraduate and PhD-bound readers within one book.
- The Korean CORE translation is only two units deep. A Korean-first series with Korean data would fill a real gap, not duplicate CORE.

### Gaps
- I did not open the Macroeconomics note to instructors in full, so I cannot say whether the Macro volume publishes its own hard-prerequisite list.
- I could not confirm the exact print publication dates or the translator credits for the Korean edition. The Korean contributors page lists the original authors but no translator line.

---

## Q2. Published critiques of CORE: the claimed 2023 "symposium" with Cortinhas and Michell

### Takeaway
CONFIRMED in substance. Cortinhas, Michell, and Crosby & Orsmond all published assessments of CORE in *Advances in Economics Education* (Edward Elgar), vol. 2, issue 2, December 2023. Whether the issue was formally labelled a "symposium" is UNVERIFIABLE, because the publisher's issue page returned 403.

Michell's central critique is methodological individualism: the assumption that all economic problems reduce to individual optimisation. The word "microfoundations" does not appear in the abstract. An older and harsher critique comes from Mearman, Guizzo & Berger (2018).

### Cited Findings
- **Cortinhas, C. (2023)**, "Rethinking the economics curriculum: strengths and weaknesses of the CORE Econ project," *Advances in Economics Education* 2(2): 114–126, December. The paper traces CORE's origin ("a group of academics led by Sam Bowles and Wendy Carlin initiated the CORE Econ project in 2013"), weighs strengths against likely criticisms, and concludes CORE has had a lasting effect on economics education and publishing. — [IDEAS/RePEc](https://ideas.repec.org/a/elg/aeejrn/v2y2023i2p114-126.html)
  - A secondary blog adds that Cortinhas thinks the reforms may fall short for advocates of feminist or ecological economics, and that the remaining shortcomings are problems of the discipline more than of pedagogy. — [Real Progress in English blog, Apr 2024](https://realprogressinenglish.blogspot.com/2024/04) (secondary; not checked against the full text)
- **Michell, J. (2023)**, "CORE Econ: a Neoclassical Synthesis for the twenty-first century?" *Advances in Economics Education* 2(2): 145–162. — [IDEAS/RePEc](https://ideas.repec.org/a/elg/aeejrn/v2y2023i2p145-162.html); [UWE repository record](https://uwe-repository.worktribe.com/output/10980806/core-econ-a-neoclassical-synthesis-for-the-twenty-first-century)
  - **Where he agrees:** textbooks need reworking, and CORE rightly counters the free-market bias of intro courses. He welcomes the "demotion of Marshallian supply and demand".
  - **Entry point:** the replacement framework is "not yet fully formed", and starting from game theory and market imperfections is "not easy to traverse".
  - **Integration claim:** the claim of a "new Neoclassical Synthesis" that coherently integrates micro and macro is overstated.
  - **Equity:** students without tutoring support, or in large cohorts, may struggle, so the text may favour stronger students and elite institutions.
  - **Deepest objection:** the premise that all economic problems can be explained by individual optimisation is "highly controversial". He concludes that undergraduate teaching needs a deeper rethink. — [IDEAS/RePEc](https://ideas.repec.org/a/elg/aeejrn/v2y2023i2p145-162.html)
- **Crosby, P. & Orsmond, D. (2023)**, "Choosing an economics principles textbook: a perspective on the CORE project," *Advances in Economics Education* 2(2): 163–178. They propose three criteria for first-year textbooks. CORE's strengths are its historical narrative and topical relevance; its weakness is that it is hard to use with large, diverse classes, especially for students taking only one economics course. They still conclude CORE has largely achieved its aim. — [IDEAS/RePEc](https://ideas.repec.org/a/elg/aeejrn/v2y2023i2p163-178.html)
- **Mearman, A., Guizzo, D. & Berger, S. (2018)**, "Whither Political Economy? Evaluating the CORE Project as a Response to Calls for Change in Economics Teaching," *Review of Political Economy* 30(2): 241–259, DOI 10.1080/09538259.2018.1426682. They judge CORE against four criteria drawn from student-movement demands. Their verdict: the reforms are "minor and superficial", with limited pluralism, power and politics ignored, and educational goals neglected. — [IDEAS/RePEc](https://ideas.repec.org/a/taf/revpoe/v30y2018i2p241-259.html); [White Rose eprint](https://eprints.whiterose.ac.uk/id/eprint/131495/)

**Verdict on the Gemini wording**
- The year and journal are CONFIRMED: *Advances in Economics Education*, 2023, vol. 2 issue 2.
- The pages are spread across 114–178, which is consistent with a themed cluster.
- "Symposium" as a formal label is UNVERIFIABLE.

### Inferences
- These critiques give the series two concrete design constraints:
  - **The Michell/equity point:** a book that drops students into game theory first needs scaffolding, or it favours already-strong students.
  - **The Mearman et al. point:** "real-world examples" are not the same as pluralism. If the series claims to be pluralist, it needs explicit rival-framework chapters, not only new data.

### Gaps
- Full texts are behind the Elgar paywall, and the issue table of contents (elgaronline.com) returned 403. I could not see any editorial introduction that frames these papers as a symposium.

---

## Q3. Opportunity Insights: "Using Big Data to Solve Economic and Social Problems" (Chetty and Bruich)

### Takeaway
Most of the Gemini claims are CONFIRMED: Spring 2019 enrollment of 375, 49% women, and free online materials. Two need correcting:
- "Ec 1152" was the course's number. The course now runs as Economics 50 (with a lab version, Econ 50a).
- "Econ 10 materials free online" is a conflation. Economics 10 is Harvard's traditional year-long intro course, which the Big Data course was benchmarked against. What is free online are the Big Data course's own materials.

### Cited Findings
**Course and number**
- The course was listed as "ECON 1152: Using Big Data to Solve Economic and Social Problems". — [Wenzel, Econlib, 3 Feb 2020](https://www.econlib.org/library/Columns/y2020/WenzelChetty.html)
- The current Harvard listing is ECON 50 / 50a. A Spring 2026 listing says Econ 50a will be taught by Gregory Bruich, in a modified version of Economics 50. — (via search summary) [Harvard QRD listing](https://qrd.college.harvard.edu/directory/econ-50a). The Opportunity Insights syllabus filename also references "Econ50". — [Opportunity Insights course page](https://opportunityinsights.org/course/)

**Enrollment and audience**
- The course had "375 students in Spring 2019 and 400 students in Spring 2020". 74% of students were undeclared first-years or students majoring in another field.
- The traditional intro courses (Economics 10) had 42% women (macro) and 44% women (micro).
- This was "the first class in Harvard's Department of Economics that did not require … Economics 10 as a prerequisite". — [Bayer, Bruich, Chetty & Housiaux, NBER WP 26961 (Apr 2020)](https://www.nber.org/papers/w26961)
- 49% of the course's students were women, "higher than in any other undergraduate Economics course taught at Harvard" the previous academic year (classes of at least 20). The course was first taught in short form at Stanford in 2017. — [Opportunity Insights course page](https://opportunityinsights.org/course/)

**Materials and structure**
- "Teaching materials … including a syllabus, lecture slides, videos, and empirical projects – are freely available at opportunityinsights.org/course". Students "work with the raw data using Stata or R, guided by teaching fellows in their labs". — [NBER WP 26961](https://www.nber.org/system/files/working_papers/w26961/w26961.pdf)
- There are 18 lectures (slides, notes and YouTube video), starting with "The Geography of Upward Mobility in America" and including "The Causal Effect of Colleges".
- There are four empirical projects:
  1. "Stories from the Atlas", using maps, regressions and correlations on Opportunity Atlas data.
  2. "Do Smaller Classes Improve Test Scores?", a regression discontinuity design.
  3. "The Creating Moves to Opportunity (CMTO) Experiment".
  4. "Using Google DataCommons to Predict Social Mobility".
- The course is "intended to complement traditional Principles of Economics (Econ 101) courses" and "does not require any prior background in economics or statistics". — [Opportunity Insights course page](https://opportunityinsights.org/course/)

**What the authors credit for its success**
- Connecting the material to students' own experiences, teaching skills with social and career value, and engaging students in scientific investigation of real problems. — [NBER WP 26961](https://www.nber.org/papers/w26961)

**Published critique**
- Nikolai Wenzel (Econlib, 2020) argues that:
  - the course is "basically an applied statistics class" that omits scarcity and the price mechanism;
  - "Statistics are no substitute for economic thinking", drawing on Hayek and the socialist calculation debate;
  - it neglects regulation and occupational licensing as causes of poverty;
  - it carries unexamined assumptions about top-1% shares and growth;
  - it risks producing "hubristic economic engineers". — [Econlib](https://www.econlib.org/library/Columns/y2020/WenzelChetty.html)

### Inferences
- This is the strongest evidence that a data-first, question-first entry point broadens who chooses economics. The series' "work 5: measure" and its Korean-data-first rule follow the same logic.
- The Wenzel critique is the mirror image of the CORE critiques. A data-first book should explicitly pair each empirical design with the price-theoretic or general-equilibrium mechanism it cannot capture.

### Gaps
- I did not fetch the Opportunity Atlas site (opportunityatlas.org) itself this session. Its role is confirmed only through the course's Project 1.
- The current Econ 50 enrollment and its gender share are not verified.

---

## Q4. QuantEcon: how the lecture sites are split, the "First Course", and whether it is too hard for undergraduates

### Takeaway
The split is CONFIRMED, but it is now eight sites rather than the five Gemini lists, and datascience.quantecon.org is by a different author team (Coleman, Lyon and Perla at UBC), not Sargent and Stachurski. The criticism that QuantEcon is too hard for undergraduates is UNVERIFIABLE this session (search budget exhausted).

### Cited Findings
**The eight sites on quantecon.org/lectures**
1. Python Programming for Economics and Finance ("the first text in the series", programming): python-programming.quantecon.org
2. A First Course in Quantitative Economics with Python: intro.quantecon.org
3. Intermediate Quantitative Economics with Python ("the second text … introductory material"): python.quantecon.org
4. Advanced Quantitative Economics with Python ("third text … advanced topics"): python-advanced.quantecon.org
5. Quantitative Economics with JAX (GPU computing): jax.quantecon.org
6. Continuous Time Markov Chains: continuous-time-mcs.quantecon.org
7. Quantitative Economics with Julia: julia.quantecon.org
8. Introduction to Economic Modeling and Data Science: datascience.quantecon.org

The index page makes no statement that the Julia lectures are archived. — [QuantEcon lectures index](https://quantecon.org/lectures/)

**A First Course**
- Authors: Thomas J. Sargent and John Stachurski.
- 56 lectures in 14 parts: Introduction, Economic Data, Probability & Distributions, Estimation, Foundations, Linear Dynamics (finite and infinite horizons), Nonlinear Dynamics, Money/Inflation/Fiscal Policy, Stochastic Dynamics, Optimization, Modeling in Higher Dimensions, Markets & Competitive Equilibrium, and Other.
- Licence: CC BY-SA 4.0. A "Notebook Launcher" opens each lecture in Google Colab. The page states no audience or prerequisites. — [intro.quantecon.org](https://intro.quantecon.org/intro.html)

**datascience.quantecon.org**
- Authors: Chase Coleman, Spencer Lyon and Jesse Perla, with support from CIDER at UBC's Vancouver School of Economics.
- Sections: Introduction, Python Fundamentals, Scientific Computing, Working With Data (pandas), Data Science Tools (plotting, mapping, regression, classification), and Applications (machine learning, networks, text, heterogeneous effects).
- CC BY-SA 4.0, built with Jupyter Book, launchable in Colab. — [datascience.quantecon.org](https://datascience.quantecon.org/)

### Inferences
- QuantEcon's gradient (programming → first course → intermediate → advanced → JAX) is a model for "work 6: compute". The site can link each book's computational artifact to the matching QuantEcon tier rather than reproduce it.
- The Jupyter Book + Colab launcher pattern is a cheap, proven way to make code runnable from a static site.

### Gaps
- I found no source for the claim that QuantEcon is "hard for undergraduates". Treat it as unverified opinion.
- QuantEcon's own reach metrics (users, adopting courses) were not checked.

---

## Q5. Pluralist curriculum platforms: Economy Studies, Exploring Economics and Rethinking Economics

### Takeaway
Economy Studies is CONFIRMED as an open-access Amsterdam University Press book (CC BY) built around ten flexible "building blocks". Catalogues list both 2021 and 2022, because the website copyright is 2021 and the OAPEN record year differs. Exploring Economics is CONFIRMED as the pluralist e-learning platform of Netzwerk Plurale Ökonomik, with ten schools of thought and level-tagged material.

### Cited Findings
**Economy Studies**
- *Economy Studies: A Guide to Rethinking Economics Education* by Sam de Muijnck and Joris Tieleman, Amsterdam University Press, open access, CC BY. DOI 10.5117/9789463726047; ISBN 978-94-6372-604-7 (print) and 978-90-485-5280-1 (e-book). — [OAPEN PDF](https://library.oapen.org/bitstream/id/67284f04-448a-4fb0-b9f3-24b23a912afd/9789048552801.pdf); [OAPEN record](https://library.oapen.org/handle/20.500.12657/51541?show=full)
- The ten building blocks: introducing the economy; knowing your own economy; economic history; history of economic thought; organisations and mechanisms; political-economic systems; research methods; economic theories; problems and proposals; economics for a better world. They sit alongside a foundations section (pluralism, real-world focus, values, decolonising economics, didactics) and a tools section (adapting courses, curriculum review, example courses and curricula). — [catalogue TOC](https://seal.matrade.gov.my/neuaxis-e/Record/EBC6808949/TOC)
- The website is run by the Centre for Economy Studies, a member of the New Economics Education Network. Its menus are The Book, Teaching Packs, Tools for Educators/Students and Workshops for Educators/Students. Endorsements quoted include Wendy Carlin (CORE) and Claudio Borio (BIS). — [economystudies.com](https://www.economystudies.com/)

**Exploring Economics**
- Run by Netzwerk Plurale Ökonomik e.V. Top menus are Orientation (with Compare and Explore views), Discover and Participate.
- The ten perspectives: Austrian, Behavioral, Complexity, Ecological, Evolutionary, Feminist, Institutionalist, Marxian Political Economy, Neoclassical and Post-Keynesian.
- Material is tagged by level (beginner/advanced/expert), year, author and source. The interface is in five languages (DE, EN, ES, FR, PL). — [exploring-economics.org](https://www.exploring-economics.org/en/)
- The network reports 28 student groups in DE/CH/AT and belongs to ISIPE. A team member reported about 40,000 visitors a month. An INET review says the site is not an exhaustive catalogue of schools of thought. — (via search summary; INET blog date not checked) [INET blog](https://ineteconomics.org/perspectives/blog/a-new-tool-for-teaching-pluralist-economics)
- Exploring Economics also catalogues the Chetty/Bruich Big Data course. — (via search summary) [Exploring Economics course entry](https://www.exploring-economics.org/fr/etude/cours/using-big-data-solve-economic-and-social-problems/)

**Rethinking Economics**
- rethinkeconomics.org returned HTTP 401 to an automated fetch on 2026-11-16, so its current structure is not verified. — [rethinkeconomics.org](https://rethinkeconomics.org/)

### Inferences
- Exploring Economics' "Compare" view across ten perspectives is a ready model for a per-chapter "rival framework" box in the series.
- Its beginner/advanced/expert tags parallel the series' need to tag chapters by reader track.

### Gaps
- Economy Studies' download numbers, adoption counts and the contents of its Teaching Packs were not retrieved.
- Rethinking Economics' current site and materials are unverified (401).

---

## Q6. Interactive-exercise platforms and other open resources (MRU, EconGraphs, Seeing Theory, UCL "Explore Econ", inequality OER, Khan, MIT OCW)

### Takeaway
MRU's practice site is CONFIRMED, but practice.mru.org now redirects to learn.mru.org/interactives (36 exercises). The Gemini report misdescribes UCL "Explore Econ": it is an annual undergraduate research conference, not a teaching platform. I found no OER titled exactly "The Economics of Inequality". The closest is Maximilian Kasy's open textbook.

### Cited Findings
**Marginal Revolution University (MRU)**
- practice.mru.org redirects (HTTP 200) to https://learn.mru.org/interactives. — curl check 2026-11-16 (redirect target: [learn.mru.org/interactives](https://learn.mru.org/interactives))
- The page lists 36 interactive exercises, including Graphing a Demand Curve, Graphing a Supply Curve, Shifts in Both Supply and Demand, Consumer and Producer Surplus, Graphing Elasticity, Graphing Negative/Positive Externalities, Price Ceilings/Floors, Tax Incidence, Trade Tariffs and Fiscal Policy Slot Machine. It describes them as letting you "Shift supply and demand curves, run simulations, choose your own adventure, and work through drag-and-drops." — [learn.mru.org/interactives](https://learn.mru.org/interactives)
- MRU's teacher pages describe a demand-curve exercise in which students label the axes and plot a demand schedule. — (via search summary) [MRU teacher resource](https://mruniversity.com/teacher-resources/active-learning/graph-demand-curve-interactive-practice)

**EconGraphs**
- econgraphs.org (via www.) presents "Interactive graphs and explanations", organized into Graphs & Explanations, Textbooks and Courses. — [econgraphs.org](https://www.econgraphs.org/)

**Seeing Theory**
- Created by Daniel Kunin as a Brown undergraduate, with Jingru Guo, Tyler Dae Devlin and Daniel Xiang.
- Six chapters: Basic Probability, Compound Probability, Probability Distributions, Frequentist Inference, Bayesian Inference and Regression Analysis. Built with D3.js and available in English, Chinese and Spanish.
- The site is now archived for reference, and a draft companion textbook PDF is linked. — [seeing-theory.brown.edu](https://seeing-theory.brown.edu/)

**UCL Explore Econ (CORRECTION)**
- It is "the annual undergraduate student research conference, organised by the Centre for Teaching and Learning Economics (CTaLE)", with student posters and presentations. 2020 was its sixth edition, and a 2026 edition is tied to UCL Economics' bicentenary. — [UCL What is Explore Econ?](https://www.ucl.ac.uk/social-historical-sciences/economics/events/explore-econ-2026-celebrating-200-years-ucl-economics/what-explore-econ); [Explore Econ 2020](https://www.ucl.ac.uk/economics/explore-econ-2020-0)

**Inequality OER**
- Maximilian Kasy's open online textbook on inequality research began as a Harvard class and was later taught at IHS Wien and Zurich. — [maxkasy.github.io/inequalityresearch](https://maxkasy.github.io/inequalityresearch)
- Piketty's and Rycroft's books titled *The Economics of Inequality* are commercial, not OER. — (via search summary) [Perlego listing](https://www.perlego.com/book/4351909/the-economics-of-inequality-pdf)
- The Open University offers a free course, "Understanding economic inequality". — [OpenLearn](https://www.open.edu/openlearn/society-politics-law/understanding-economic-inequality/content-section-1)

**Our World in Data**
- OWID charts are embedded in CORE Econ textbooks. — [OWID FAQ](https://ourworldindata.org/faqs)

### Inferences
- MRU's drag-the-curve exercises are the right model for a "work 2: solve" checkpoint. For a static site, a small set of SVG/D3 drag exercises (in the style of Seeing Theory and EconGraphs) is feasible without a backend.
- The Explore Econ conference is a better model for "work 8: question and write a first paper" than for site design. It suggests the series' final artifact could feed an annual student showcase.

### Gaps
- Khan Academy economics and MIT OpenCourseWare economics were not fetched this session. Their structure and reach are not documented here.
- I could not verify EconGraphs' authorship or MRU's teacher-dashboard features.

---

## Q7. Korean counterparts: KOCW, K-MOOC, Bank of Korea and KDI economic-education portals

### Takeaway
The Korean landscape has portals, but no counterpart to CORE or Opportunity Insights. Economics content is spread across:
- K-MOOC and KOCW courses: lecture videos with quizzes.
- 한국은행 경제교육 (Bank of Korea).
- KDI 경제교육·정보센터 (learning and classroom materials, PBL, a "big data" indicators section).
- The government portal 경제배움.

None of them is a modular, data-project-driven undergraduate curriculum, and CORE's own Korean edition covers only two units so far.

### Cited Findings
- **K-MOOC** (kmooc.kr) hosts Korean-economy courses run by SNU's 한국경제와K학술확산연구센터. These include a course on Korea's industrialization, which issues a certificate at ≥60% on quizzes and the final, and runs 2026-09-08 to 2026-12-29. — (via search summary) [K-MOOC course 16623](https://www.kmooc.kr/view/course/detail/16623); [K-MOOC 18387](https://www.kmooc.kr/view/course/detail/18387)
- **KOCW** (kocw.net) hosts university lecture materials, for example an 경제원론 syllabus for business majors (2019-2). — (via search summary) [KOCW syllabus PDF](https://www.kocw.net:444/home/common/contents/syllabus/1362520_202007071704898.pdf)
- **한국은행 경제교육** submain is at https://www.bok.or.kr/portal/submain/submain/ecEdu.do?menuNo=201254. Related multimedia lists include 경제교육 (menuNo=201300 and 201303) and 경제교육웹툰 (menuNo=201036). — curl of [BOK portal](https://www.bok.or.kr/portal/submain/submain/ecEdu.do?menuNo=201254) on 2026-11-16
- **KDI 경제교육·정보센터** (eiec.kdi.re.kr):
  - 경제교육 menu: 학습자료 (경제로 세상 읽기, 시사용어사전, 경제개념, 경제백문백답), 수업자료 (PBL 경제교육, 교육과정별 경제교육, 생애주기별 경제교육) and 교육프로그램.
  - 데이터 분석 menu: 빅데이터 분석 (월간 경제 이슈, 소셜 빅데이터, 정책 텍스트 분석, 경제지표, 경제불확실성지수) and 여론분석.
  - Publications: 나라경제 and Economic Bulletin.
  - Related site: 경제배움 (https://www.econedu.go.kr/index).
  - No OpenAPI or data download is mentioned. — [eiec.kdi.re.kr](https://eiec.kdi.re.kr/)
- **CORE Korean edition:** ⟪경제 2.0⟫, Micro units 1–2 only (see Q1). — [CORE Korean Micro contents](https://books.core-econ.org/the-economy/microeconomics/ko/0-3-contents.html)

### Inferences
- The Korean gap is a curriculum of linked books that use Korean data with research designs, not lecture video. The site can position the series against K-MOOC/KOCW (video) and BOK/KDI (general-public literacy), rather than against CORE.
- KDI's 경제불확실성지수 and 경제지표 pages could serve as quick "evidence entry points" in early books.

### Gaps
- No systematic count of economics courses on K-MOOC or KOCW was possible (search budget exhausted).
- BOK's 경제교육 page content (programs, textbooks, camps) did not render in plain text, so its structure is not documented.

---

## Q8. What the 22-book series and its site should borrow and what to avoid

### Takeaway
Borrow five patterns with documented precedents:
1. Sparse declared prerequisites plus named building-block sections (CORE).
2. Math in optional "Extensions" that state their prerequisites (CORE).
3. One data project in several software tracks (Doing Economics; QuantEcon's Colab launchers).
4. A question-first, data-first entry point with no prerequisite (Chetty/Bruich).
5. Drag-to-answer graph exercises (MRU).

Avoid three failure modes:
- Overclaiming integration or pluralism (Michell; Mearman et al.).
- Material that only strong students can traverse (Michell; Crosby & Orsmond).
- Data-first work with no mechanism (Wenzel).

### Cited Findings
- Sparse hard prerequisites (two edges in Micro) plus reusable building-block sections. — [CORE note to instructors](https://books.core-econ.org/the-economy/microeconomics/0-5-note-to-instructors.html)
- Calculus in Extensions that state their prerequisites. — [CORE note to instructors](https://books.core-econ.org/the-economy/microeconomics/0-5-note-to-instructors.html)
- The same project offered in Excel, R, Google Sheets and Python. — [Doing Economics](https://books.core-econ.org/doing-economics/)
- A no-prerequisite, data-first entry reached 49% women versus 42–44% in the standard intro course, and 74% of students were new to economics. — [NBER WP 26961](https://www.nber.org/papers/w26961); [OI course page](https://opportunityinsights.org/course/)
- Graded progression of computational texts (programming → first course → intermediate → advanced). — [QuantEcon lectures](https://quantecon.org/lectures/)
- Interactive drag-and-drop graph practice. — [MRU interactives](https://learn.mru.org/interactives)
- Ten-perspective compare view and level tags. — [Exploring Economics](https://www.exploring-economics.org/en/)
- Things to avoid:
  - an overstated "new Neoclassical Synthesis" claim, and material that favours strong students. — [Michell 2023](https://ideas.repec.org/a/elg/aeejrn/v2y2023i2p145-162.html)
  - a book that is hard to use with large, diverse cohorts. — [Crosby & Orsmond 2023](https://ideas.repec.org/a/elg/aeejrn/v2y2023i2p163-178.html)
  - pluralism claims that turn out superficial. — [Mearman et al. 2018](https://ideas.repec.org/a/taf/revpoe/v30y2018i2p241-259.html)
  - an "applied statistics" course with no price theory. — [Wenzel 2020](https://www.econlib.org/library/Columns/y2020/WenzelChetty.html)
- Licensing caution:
  - CORE content is CC BY-NC-ND, so it cannot be adapted or translated into derivative chapters without permission. — [CORE](https://books.core-econ.org/the-economy/)
  - QuantEcon is CC BY-SA, so derivatives must use the same licence. — [intro.quantecon.org](https://intro.quantecon.org/intro.html)
  - OWID charts and data it produces are CC BY, but the Grapher source code is now under a custom licence that requires written permission for reuse. Earlier versions were MIT. — [OWID FAQ](https://ourworldindata.org/faqs)

### Inferences
- **Map onto the eight works:**
  - works 1–2 (read, solve): MRU-style interactive graph checks.
  - work 3 (prove): CORE-style Extensions holding the proofs.
  - work 5 (measure): a Doing Economics-style project per book, on Korean data.
  - work 6 (compute): parallel R/Python/Excel tracks, plus a Colab launcher.
  - works 7–8 (referee, write): an Explore Econ-style showcase.
- **Track separation:** use CORE-style Extensions, not separate books, for PhD-bound readers within each book. The QuantEcon tiers can be the external "advanced track".
- **Dependency display:** publish a small declared prerequisite graph per book (hard edges only) and a list of "building-block" chapters that other books cite. CORE shows that two or three hard edges per volume is enough.
- **Licensing:** prefer linking or embedding (OWID iframes, CORE pages) over copying. The CORE (ND) and QuantEcon (SA) licences constrain derivative use.

### Gaps
- I found no quantitative learning-outcome evidence (beyond enrollment and diversity) for CORE or MRU in this session.

---

## Q9. Korean data sources for chapter evidence: URL, coverage, access, terms, field

### Takeaway
All major Korean sources are reachable. The most important recent change is that Statistics Korea (통계청) became **국가데이터처** on 1 Oct 2025, and its domains moved:
- kostat.go.kr → mods.go.kr
- mdis.kostat.go.kr → mdis.mods.go.kr
- KOSIS stays at kosis.kr.

KOSIS OpenAPI became HTTPS-only with rate limits in 2026, the latest being 200 calls per minute from 15 Jul 2026. The ECOS API is live and was tested with the public sample key. For Korean input-output analysis, the BOK published the 2020 benchmark table (Apr 2024), the 2023 extended table (Sep 2025) and the 2010-2015-2020 linked tables (Jun 2026).

### Cited Findings

**한국은행 ECOS (경제통계시스템)**
- Portal: https://ecos.bok.or.kr/. The API base is https://ecos.bok.or.kr/api/.
- The endpoint pattern was tested live on 2026-11-16: `https://ecos.bok.or.kr/api/StatisticSearch/{KEY}/json/kr/{start}/{end}/{STAT_CODE}/{CYCLE}/{from}/{to}/{ITEM_CODE}`. With KEY=`sample`, STAT_CODE=`200Y101` (주요지표 연간) and ITEM_CODE `10101`, it returned nominal GDP for 2020 = 2,058,466.5 (unit 십억원).
- `StatisticTableList` reports list_total_count 844 tables.
- The `sample` key is limited to 10 rows per call. The error message reads: "sample은 최대 10건 이내에서 호출이 가능합니다". — live API responses, [ECOS API](https://ecos.bok.or.kr/api/)
- Fields served: macro, money and banking, national accounts.

**산업연관표 (input-output tables, Bank of Korea)**
- The 2020 benchmark (기준년) table was released 2024-04-29. It pre-applies the 11th KSIC revision and splits out new products such as electric passenger cars. — [Aju News, 2024-04-29](https://www.ajunews.com/view/20240429112833567)
- The 2023 extended table (연장표) was released 2025-09-24. It is estimated indirectly from the 2020 benchmark, at current prices. Employment-inducement figures: 8.2 jobs per ₩1bn of output in 2023, versus 8.1 in 2022. — [Newsis, 2025-09-24](https://mobile.newsis.com/view/NISX20250924_0003341925)
- The 2010-2015-2020 linked tables (접속산업연관표), harmonized to the 2020 classification, were released 2026-06-30 and are available in ECOS. — [Financial News, 2026-06-30](https://www.fnnews.com/news/202606300810130773)
- BOK input-output page. — [BOK IO page](https://www.bok.or.kr/portal/main/contents.do?menuNo=200672)
- So the Gemini wording "2020 benchmark / 2024 extended?" is PARTLY WRONG. The 2020 benchmark was *published* in 2024. The latest extended table found is the 2023 table (published Sep 2025). A 2024 extended table was not found; check ECOS.
- Fields served: industrial organization, trade and global value chains, environmental IO.

**국가데이터처 (formerly 통계청) reorganization**
- Statistics Korea was elevated to 국가데이터처 on 1 Oct 2025 under an amended Government Organization Act. It moved from the Ministry of Economy and Finance to the Prime Minister's Office. The first head is 안형준. A new 국가데이터관리본부 was created. — [Newsis, 2025-09-30](https://mobile.newsis.com/view/NISX20250930_0003350240); [Daum/News1](https://v.daum.net/v/PmyZ7XdzuK)
- Domain redirects observed 2026-11-16: kostat.go.kr → https://mods.go.kr/ and mdis.kostat.go.kr → https://mdis.mods.go.kr/. — curl redirect check ([mods.go.kr](https://mods.go.kr/), [mdis.mods.go.kr](https://mdis.mods.go.kr/))

**KOSIS OpenAPI (국가통계포털 공유서비스)**
- URL: https://kosis.kr/openapi/.
- Services: 통계목록, 통계자료, 대용량통계자료, 통계설명, 통계표설명, KOSIS통합검색 and 통계주요지표.
- Access: sign up, apply for an "OPEN API 인증키", register your application. Terms are under "통계정보활용약관".
- The open inventory (as of 2023-06-08) lists 291,062 statistical tables and 1,530 survey descriptions. — [KOSIS OpenAPI](https://kosis.kr/openapi/)
- **2026 changes:**
  - From 2026-03-05 the API is HTTPS-only, with a cap of 1,000 calls per minute (notice dated 2026-02-05).
  - From 2026-07-15 the cap drops to **200 calls per minute**, and the 통계자료 and 대용량통계자료 APIs were modified to return 통계부호 (statistical symbols) (notice dated 2026-07-09).
  - The 통계설명 fields were expanded (notice dated 2026-08-06). — [KOSIS OpenAPI notices](https://kosis.kr/openapi/) (notice detail retrieved via the site's community_01Detail form)
- Fields served: all fields, including labor, prices, population and regional data.

**MDIS (마이크로데이터 통합서비스)**
- URL: https://mdis.mods.go.kr/. Two service types:
  - 공공용: users download public-use microdata to their own PC.
  - 인가용: more detailed data through 원격접근 (remote access) or 센터 서비스 (research data centre).
- A notice dated 2026-11-16 says 2024 소득이동통계 (income-mobility statistics) microdata became available as 인가용 (SDC). Use is fee-based ("유료") and approved after review of the research plan and expected output tables, via MDIS or the 통계데이터센터 (data.kostat.go.kr). — [MDIS main page](https://mdis.mods.go.kr/index.do)
- Earlier MDIS training material describes the 2015 split into 공공용 and 인가용 (RDC and RAS). Approval criteria are public interest and respondent confidentiality, and exported results need administrator approval. Membership now goes through 국가데이터처 통합회원가입. — (via search summary) [MDIS introduction PDF](https://mdis.kostat.go.kr/data/MDIS_introduction.pdf); [MDIS user manual](https://mdis.mods.go.kr/data/usrManual_permission.pdf)
- Fields served: labor (경제활동인구조사), household income and consumption (가계동향조사), wealth (가계금융복지조사), mobility.

**OpenDART (금융감독원 전자공시)**
- URL: https://opendart.fss.or.kr/.
- Six API groups: 공시정보, 정기보고서 주요정보, 정기보고서 재무정보, 지분공시 종합정보, 주요사항보고서 주요정보, 증권신고서 주요정보. Original filings download as XML.
- Open to "누구든지(개인, 기업, 기관 등)". — [OpenDART intro](https://opendart.fss.or.kr/intro/main.do)
- Terms: usage is subject to call quotas posted on the homepage. Copyright in the API service belongs to 금융감독원 (FSS). Anything the terms do not cover falls under 저작권법 and 공공데이터법. Excessive access can lead to restriction. — [OpenDART terms](https://opendart.fss.or.kr/intro/terms.do)
- Daily limit: third-party documentation repeatedly gives **20,000 calls per key per day**, with error code 020 on excess. I did not see this on an official page. — (via search summary) [wikidocs](https://wikidocs.net/269624)
- Notices from 2024–2026 are maintenance announcements only, with no rule changes. — [OpenDART notices](https://opendart.fss.or.kr/cop/bbs/selectArticleList.do?bbsId=B0000000000000000001)
- Fields served: corporate finance, IO and firm-level analysis, accounting.

**한국노동패널 KLIPS (한국노동연구원)**
- URL: https://www.kli.re.kr/klips. The site shows three samples: 98표본, 09통합표본 and 18통합표본.
- The data guide covers "1~27차년도". Downloads go through 회원가입 and the 데이터다운로드 menu (자료추출 시스템, 공개용 자료, 무응답대체, KLIPS-CNEF).
- An English page exists at /klips_eng. — [KLIPS](https://www.kli.re.kr/klips)
- A 2025 KLI paper used waves 1–26 and the extraction tool smart_klips (smartklips.kli.re.kr). — (via search summary) [KLI repository](https://repository.kli.re.kr/bitstream/2021.oak/11854/2/%eb%85%b8%eb%8f%99%ec%a0%95%ec%b1%85%ec%97%b0%ea%b5%ac_%ec%a0%9c25%ea%b6%8c_%ec%a0%9c3%ed%98%b8_6.pdf)
- Fields served: labor, income dynamics, education returns.

**고령화연구패널 KLoSA (한국고용정보원)**
- Hosted at https://survey.keis.or.kr/klosa/index.jsp with downloads at /klosa/klosadownload/List.jsp. The same site hosts 청년패널 YP, GOMS and 고령화고용패널 KLoEE.
- A notice dated 2026-07-28 announces the 2026 11th-wave (제11차) baseline fieldwork. An English entry point is at /eng/index.jsp. — [KEIS survey portal](https://survey.keis.or.kr/)
- Fields served: aging, retirement, health, pensions.

**재정패널조사 NaSTaB (한국조세재정연구원 KIPF)**
- URL: https://www.kipf.re.kr/panel/. Running since 2008, it tracks household tax burdens and benefits received, plus income, assets and consumption.
- Waves 1–17 are released (17th announced 2025-12-05). The 18th wave is scheduled for release on 4 December (2026), per a notice dated 2026-10-20.
- English data for waves 1–17 was announced 2026-10-15, in Stata, CSV, SPSS and SAS. Data list: https://www.kipf.re.kr/panel/data/AllList/paData/list.do. — [KIPF panel](https://www.kipf.re.kr/panel/)
- Fields served: public finance, tax incidence, redistribution.

**국세통계 (국세청)**
- TASIS 국세통계포털 is at https://tasis.nts.go.kr/ (reachable 2026-11-16). Its contents did not render. — [TASIS](https://tasis.nts.go.kr/)
- Fields served: public finance, top incomes.

**관세청 수출입무역통계 and K-stat (한국무역협회)**
- 관세청 수출입무역통계 is at https://tradedata.go.kr/cts/index.do (menus include 수출입 총괄 and 한눈에 보는 무역통계). — [tradedata.go.kr](https://tradedata.go.kr/cts/index.do)
- KITA K-stat is at https://stat.kita.net/ (menus: K-stat 란?, 무역통계 분류, 해외무역통계). — [K-stat](https://stat.kita.net/)
- Fields served: international trade.

**한국거래소 KRX**
- 정보데이터시스템 is at https://data.krx.co.kr/ (reachable). — [KRX data](https://data.krx.co.kr/)
- KRX Data Marketplace OPEN API is at https://openapi.krx.co.kr/. Service categories: 지수, 주식, 증권상품, 채권, 파생상품, 일반상품, ESG. Access is by "API 인증키 신청". — [KRX OpenAPI](https://openapi.krx.co.kr/contents/OPP/MAIN/main/index.cmd)
- Terms: KRX holds copyright, and violations can lead to revocation of approval. — (via search summary) [KRX OpenAPI terms page](https://openapi.krx.co.kr/contents/OPP/INFO/OPPINFO005.jsp)
- Separately, data.go.kr carries a 금융위원회 "KRX상장종목정보" API. — [data.go.kr 15094775](https://www.data.go.kr/data/15094775/openapi.do)
- Fields served: finance, asset pricing, event studies.

**공공데이터포털**
- https://www.data.go.kr/ (reachable). It runs a 공공데이터 분쟁조정 (dispute mediation) procedure for refused data requests. — [data.go.kr use guide](https://www.data.go.kr/ugs/selectPublicDataUseGuideView.do)

**온실가스종합정보센터 GIR and K-ETS**
- https://www.gir.go.kr/ has menus "명세서 배출량 통계" (facility-reported emissions statistics) and "국가온실가스인벤토리총괄관리". — [GIR](https://www.gir.go.kr/home/index.do?menuId=36)
- The ETS registry (배출권 등록부) is at https://etrs.gir.go.kr/ (reachable). — [ETRS](https://etrs.gir.go.kr/)
- Fields served: environmental economics, carbon pricing.

**KDI**
- The KDI 경제교육·정보센터 data area offers 경제지표 and 경제불확실성지수 pages. No OpenAPI or download service is listed. — [eiec.kdi.re.kr](https://eiec.kdi.re.kr/)

### Inferences
- **Evidence chapters by field (Korean first):**
  - labor: KLIPS, 경활 (MDIS)
  - public finance: NaSTaB, 국세통계
  - macro: ECOS, 자금순환, 국제수지
  - industrial organization and trade: 산업연관표, OpenDART, 관세청, K-stat
  - finance: KRX, OpenDART
  - aging: KLoSA
  - environment: GIR, K-ETS
  - inequality and history: 낙성대 long-run series (unverified this session)
- **Code examples:**
  - Rate limits must be built in: KOSIS 200/min and ECOS sample 10 rows.
  - All URLs must use https and the new mods.go.kr domains.
  - Keys must never be committed. Readers register their own ECOS, KOSIS, OpenDART and KRX keys.
- **Replication:** MDIS 인가용 data (fee-based, review-based, remote or centre access) cannot back a public replication package. Chapters that need public replicability should use 공공용 MDIS files, KLIPS, KLoSA, NaSTaB, or aggregate ECOS/KOSIS series.

### Gaps
- **ECOS:** the official key-registration rules, daily call limits and terms of use did not render (JavaScript SPA). 자금순환 and 국제수지 table codes in ECOS were not individually verified, because the sample key caps listing at 10 rows.
- **MDIS:** I did not confirm the current 공공용/인가용 availability and fees for 가계동향조사, 경제활동인구조사 and 가계금융복지조사.
- **KOWEPS 한국복지패널** (koweps.re.kr) returned HTTP 421 to every fetch attempt. Its latest wave, access rules and terms are unverified.
- **국세통계센터:** the NTS researcher microdata service (remote analysis) could not be checked once the search budget ran out.
- **낙성대경제연구소 / 김낙년 『한국의 장기통계』:** naksung.re.kr returned 403. The edition, year and data-download availability are unverified.
- **KDI and KIPF datasets beyond NaSTaB:** not catalogued.
- **K-ETS:** allocation and verified-emissions tables, and KRX emission-allowance market data, were not opened.
- **Licences:** 공공누리 type assignments for data.go.kr and KOSIS reuse were not confirmed this session.
- **OpenDART:** the 20,000/day limit is from third-party sources only.

---

## Q10. International complements: coverage, access, licence and recent changes

### Takeaway
- **New versions:** PWT 11.0 (Oct 2025; 185 countries, 1950–2023; CC BY 4.0) and Maddison Project 2023 (169 countries, up to 2022; CC BY 4.0) are the current long-run cross-country sources. BACI is at version 202601 (to 2024; Etalab 2.0).
- **Platform changes:** the IMF moved to a new data portal in 2025, and **IFS was discontinued as a single dataset**. FRED now has an API v2 for bulk release downloads. The World Bank API needs no key.
- **Stale sources:** WIOD is still frozen at its 2016 release (2000–2014).

### Cited Findings
- **Penn World Table 11.0**
  - Released 7 Oct 2025 by GGDC. Covers 185 countries, 1950–2023, and incorporates the ICP 2021 PPPs (with 2017 revisions).
  - China now uses the official series instead of the Maddison/Wu adjusted series.
  - Dataverse DOI 10.34894/FABVLR. Authors Feenstra, Inklaar and Timmer. CC BY 4.0. — [GGDC PWT 11.0 blog](https://www.rug.nl/ggdc/blog/penn-world-table-version-11-0-is-published); [PWT 11.0 release](https://www.rug.nl/ggdc/productivity/pwt/pwt-releases/pwt110)
- **Maddison Project Database 2023**
  - Covers "169 countries and the period up to 2022". Cite Bolt & van Zanden (2024), *Journal of Economic Surveys*, DOI 10.1111/joes.12618. CC BY 4.0.
  - Original papers must be cited when a subset of fewer than 12 countries is used.
  - No newer release had been announced (page last modified 18 Sep 2024). — [MPD 2023 release](https://www.rug.nl/ggdc/historicaldevelopment/maddison/releases/maddison-project-database-2023); [Maddison home](https://www.rug.nl/ggdc/historicaldevelopment/maddison/)
- **WIOD 2016**
  - The November 2016 release covers 28 EU plus 15 other major countries (Korea included per the standard WIOD list; country list not re-checked), 2000–2014, plus a Rest of World model. No newer release is listed. — [WIOD 2016](https://www.rug.nl/ggdc/valuechain/wiod/wiod-2016-release)
- **CEPII BACI**
  - Version 202601 (updated 30 Jan 2026). About 200 countries and about 5,000 HS6 products. HS92 covers 1995–2024, and later HS vintages start in their own year (HS22: 2022–2024).
  - Etalab 2.0 open licence. Cite Gaulier & Zignago (2010), CEPII WP 2010-23. — [CEPII BACI](https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37)
- **IMF data**
  - The new IMF Data Portal at data.imf.org replaced the legacy system.
  - "International Financial Statistics was discontinued as a single Dataset". Its indicators now sit in topical datasets such as BOP and International Liquidity, and can be filtered with an IFS flag.
  - Sources give conflicting legacy-portal retirement dates (May–Nov 2025). — [IMF IFS page](https://data.imf.org/ifs); [IMF legacy portal retired](https://extauth.imf.org/maintenance/LegacyDataPortalRetired.html)
  - DOTS/IMTS status was not determined.
- **World Bank Indicators API**
  - https://api.worldbank.org/v2. "API keys and other authentication methods are no longer necessary". V1 was discontinued on 19 June 2020. — [World Bank API docs](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation)
- **FRED**
  - The API docs now describe an "API Version 2" aimed at bulk retrieval of all series on a release. Keys come from https://fred.stlouisfed.org/docs/api/api_key.html, and the terms are at https://fred.stlouisfed.org/legal/#api. — [FRED API docs](https://fred.stlouisfed.org/docs/api/fred/)
- **Our World in Data**
  - Charts and OWID-produced data are CC BY. Third-party data keep their own licences.
  - A Chart Data API gives CSV and JSON access, and charts can be embedded (live or archived).
  - The Grapher code is now under a custom licence (previously MIT). — [OWID FAQ](https://ourworldindata.org/faqs)
- **OECD and BIS**
  - The OECD Data Explorer (https://data-explorer.oecd.org/) and the BIS data portal (https://data.bis.org/) were both reachable on 2026-11-16. — curl checks ([OECD Data Explorer](https://data-explorer.oecd.org/), [BIS data](https://data.bis.org/))

### Inferences
- For "work 4: model the whole economy" and the growth chapters, PWT 11.0 plus Maddison 2023 give Korea's long-run path with CC BY reuse. Note the PWT 11 China series change when comparing with older textbooks.
- Any code that calls IMF IFS endpoints, or any `legacydata.imf.org` URL, must be rewritten for the new portal.

### Gaps
- **OECD ICIO:** the latest edition and coverage are unverified (oecd.org returned 403).
- **PSID and NLSY:** access terms were not retrieved (fetches returned no content).
- **WDI:** the licence (CC BY 4.0 is commonly stated) and the World Bank "Data360" transition were not verified this session.
- **BIS and OECD:** licences and API specifics were not verified.
