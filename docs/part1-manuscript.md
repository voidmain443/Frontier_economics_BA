# 1부 원고 (0단계, 검토 반영본, 2026-10-30)

> **검토 안내**
>
> - 본문은 사이트에 실릴 영어 문안이다.
> - 그림마다 다음 항목을 붙였다.
>   - **2D**: 평면 교과서 그림
>   - **숨은 축**: 접힌 상태에서 그 자리에서 솟는 것, 수식 포함
>   - **주체**: Blender 모형을 쓰는 경우만
>   - **깨달음**: 전공자가 "맞아" 해야 할 한 문장
>   - **뒤에서**: 이 그림이 다시 쓰이는 곳
> - 기준 문서는 `docs/redesign.md`다. 3D 모드는 페이지 접힘 하나이고, 그림은 스크롤하면 제자리에서 솟는다. 버튼, 패널, 다이브는 없다.
> - 분량 목표는 약 40분이다.
>   - 1~7단계(핵심)는 단계마다 본문 400~600단어와 그림 2~4개다.
>   - 8단계(3·4학년 각론 11과목)는 과목마다 본문 약 130단어와 그림 1개다.
> - 실제 데이터는 이미 받아 둔 파일만 쓴다.
>   - 6.1: 한국 성장, `korea-growth.json`
>   - 6.3: 미국 필립스, `us-phillips.json`
>   - 8.2: 한국 1997, `korea-1997.json`
>   - 8.3 본문: 한국 금리, `rates-2022.json`
>   - 8.3: 2008 TED 스프레드, `crisis-2008.json`
  - 8.11: 장기 소득, `maddison.json`
> - 맨 끝에 두 검토(경제학 정확성, 전공자 관점)를 반영한 기록이 있다.

---

## Opening: a cross-section

Every figure in an economics textbook is a slice. A demand curve is drawn at one income, one set of other prices, and one moment in time. Everything that is not on the two axes is held still. The diagrams are slices out of necessity: a page has two dimensions, and the economy has many. What they leave out is what makes the subject hard and what makes it powerful.

Every hidden axis in this part is a parameter of a model. A textbook figure is the model solved at one value of that parameter. Comparative statics, which the mathematics course teaches as derivatives, is how the solution moves as the parameter changes. Folding the page makes comparative statics visible.

This part follows the undergraduate sequence as a single story. It starts with the simplest economy a textbook can draw: one market, anonymous buyers on one side, anonymous sellers on the other, and one price. Then, stage by stage, it adds what that picture lacked. It opens up the household and then the firm, lets a few firms watch one another, and joins every market at once. It then adds time, money and government, and learns to measure. Those seven stages are the core every major takes, a few pages and two to four figures each. The eighth stage is the third and fourth years: eleven field courses, each shown by the one thing it adds to the core and one figure.

Read it flat, as a textbook. At any point you can fold the page into space with the control in the corner. In the folded page, as each figure reaches your reading line, the dimension it was drawn without rises out of the paper. The flat figure turns out to be one slice of something larger. Fold it back and you are where you were, on the same page.

---

## Stage 1. One market

**Added:** two anonymous groups (buyers and sellers) and one price.

Principles begins with a market as the simplest thing economics can say anything definite about. There are buyers and sellers, and a price at which they trade. Nobody in the picture has a name, a history or a plan beyond this market. Demand and supply are given to the student as facts about the world, and the equilibrium is where they cross.

Three questions are taught with these figures. Why does the price settle where it does? What happens when something changes, such as income or a tax? And who gains from the trade? The textbook answers all three by moving or shading curves. The answers are right, but each depends on something the figure does not show:
- the shift of a curve is a movement along an axis that is not drawn;
- the surplus triangle is a sum over people who are not drawn;
- elasticity is quoted as one number, though it depends on how long buyers have had to adjust.

This stage takes the textbook at its word, using only what Principles teaches, and lets the figures show what they are slices of.

### Figure 1.1: Supply and demand

- **2D:**
  - Demand D: P = 10 − Q. Supply S: P = 1 + Q. Equilibrium E is at Q = 4.5, P = 5.5.
  - A rise in income shifts demand to D′: P = 12 − Q. The new equilibrium E′ is at Q = 5.5, P = 6.5.
- **Hidden axis: income I.**
  - Demand is really Q = D(P, I) = 10I − P.
  - Stacked by income, from I = 1 to 1.4, the demand curves form a sloping surface above the figure. D is the slice at I = 1 and D′ the slice at I = 1.2. The shift the textbook draws as a sideways move is a move up that axis.
  - Supply does not depend on income, so it stands as a vertical wall through the surface.
  - The equilibrium at each income lies where surface and wall meet, along a line rising from E to E′.
- **Agents:** none here. The agents enter in Figure 1.2.
- **Realization:** "A shift is a move along an axis the figure does not draw. 'Ceteris paribus' means: this slice."
- **Later:**
  - Stage 2 builds the demand surface from household choice.
  - Stage 6 does the same for the whole economy, with the interest rate and the price level as the hidden axes.
  - Figure 7.2 asks what data drawn from this market can show.

### Figure 1.2: Surplus, and the trades a tax stops

- **2D:**
  - Twenty buyers with willingness to pay 19.5, 18.5, …, 0.5, and twenty sellers with costs 0.5, 1.5, …, 19.5, drawn as two staircases.
  - At a price of 10, ten trades happen. Consumer and producer surplus are shaded.
  - A tax of 6 splits the price: buyers pay 13 and sellers keep 7, and seven trades remain.
- **Hidden axis: the people.**
  - Each step becomes a column standing on the figure. A buyer's column rises by the gain wtp − price, and a seller's by price − cost. Without the tax, the columns total 100.
  - When the tax arrives, each of the seven remaining trades gives 6 to the state: 42 in all, drawn as columns of their own. Buyers and sellers keep 49.
  - The three marginal trades sink back into the page. Their gains, 5, 3 and 1 (9 in all), are larger than zero but smaller than the tax. That is the deadweight loss: trades that would have happened and no longer do.
- **Agents:** Blender figures stand on the columns, people for buyers and small workshops for sellers. This is the first time the curve is shown to be made of agents.
- **Realization:** "A curve is a list of people. Surplus is a sum of individual gains. A tax moves some of the gain to the state and destroys the rest, and what it destroys is the trades that no longer happen."
- **Later:**
  - Stage 4: market power destroys trades the same way.
  - Figure 8.5: the cost of a tax as the rate rises.
  - Figure 8.6: a cost borne by someone outside the trade.

### Figure 1.3: Elasticity grows with time

- **2D:**
  - A demand curve through the current point, Q = 5 and P = 5, with its revenue rectangle P·Q = 25.
  - Elasticity is ε = (dQ/dP)(P/Q).
  - Where |ε| > 1, a price rise lowers revenue. Where |ε| < 1, it raises revenue. The turn is at |ε| = 1, because dR/dP = Q(1 + ε).
- **Hidden axis: time to adjust.**
  - Demand curves through the same point are stacked by how long buyers have had to respond: |ε| = 0.2 in the first month, 1.5 after five years.
  - The curves fan out from the point, steep in front and flat behind.
  - A 10 percent price rise first raises revenue to about 27. Then, as buyers find substitutes, it lowers revenue to about 23.4.
- **Realization:** "Elasticity is not one number; it depends on how long you wait. The long run is more elastic because more can adjust. That is the same reason the long-run cost curve of Figure 3.1 lies under every short-run one (Samuelson's Le Chatelier principle)."
- **Later:**
  - Stage 4: the markup.
  - Figure 8.5: tax incidence.
  - Energy: fuel demand barely moves in a month and moves much more over years.

*Transition:* every curve in this stage was given. The next two stages open the two sides of the market and ask where the curves come from.

---

## Stage 2. Opening up the household

**Added:** a decision-maker with preferences and a budget, and time as a second good.

Intermediate microeconomics replaces the demand curve with a person. The household has preferences over bundles of goods, a budget it cannot exceed, and a rule for choosing: take the best bundle it can afford. The rest of the course is about what follows from that rule.

The mathematics arrives here because the question needs it.
- "The best bundle it can afford" is a constrained optimization problem.
- Its solution is a tangency, MRS = p_x/p_y. That is the Lagrange condition ∇u = λ∇(budget) written in economic language.
- Once the household has a rule, demand is no longer a fact. It is what the rule produces when prices change.
- Saving is no longer a habit. It is the same rule applied to consumption now and consumption later, with time entering as a second good.

### Figure 2.1: The best affordable bundle

- **2D:** indifference curves of u = √(xy) and the budget line x + y = 12. The optimum is at (6, 6), where the highest reachable curve touches the line.
- **Hidden axis: utility, as height.**
  - The indifference curves are contour lines of a utility hill rising from the page.
  - The budget line becomes a fence standing on the page. Along the fence, the hill's profile is a single arch, and its top is exactly the tangency point.
  - The constrained optimum is the highest point of the hill that the fence lets you reach.
- **Agents:** one household (Blender), standing at the optimum on the hill.
- **Realization:** "MRS = price ratio means the top of the hill along the fence. That is ∇u = λ∇g, and λ is how much higher you could climb if the fence moved out by one unit."
- **Later:**
  - Stage 3: the firm's cost minimization (an isoquant touching an isocost line) has the same shape.
  - Figure 5.1: two hills in one box.
  - Figure 6.4: the central bank's choice has the same shape.

### Figure 2.2: Demand is a list of choices

- **2D:**
  - The price of x rises from 1 to 2. The budget line turns inward about its intercept on the y axis, and the chosen bundle moves from A (6, 6) to B (3, 6).
  - The compensated budget line is parallel to the new one and tangent to the old curve at C (4.24, 8.49).
  - It splits the move into a substitution effect A → C (−1.76) and an income effect C → B (−1.24).
- **Hidden axis: the price of x.**
  - Price stands as a wall behind the figure. For each price between 1 and 3, the chosen x is carried back to the wall and up to that price.
  - The points trace the demand curve x = 6/p_x on the wall.
  - A second, steeper curve traces the compensated choices through C: the demand curve with the income effect taken out.
- **Realization:** "The demand curve is a list of optima. The substitution effect always works against the price. The income effect works the other way for an inferior good, and only if it outweighs the substitution effect does demand slope up (a Giffen good)."
- **Later:**
  - Stage 1's demand surface is built the same way, as a stack of walls like this one, one per income, added across households. Figure 1.1's straight lines are a simpler stand-in.
  - Labor supply (8.7) uses the same decomposition, with leisure as the good.

### Figure 2.3: Choice over time, and across states

- **2D:**
  - Consumption now (c₁) and later (c₂). The endowment is (6, 4.5) and the interest rate is 25 percent, so the budget line through the endowment has slope −(1 + r).
  - With log utility and no impatience, u = ln c₁ + ln c₂, the household chooses c₁ = 4.8 and c₂ = 6.0, and saves 1.2.
- **Hidden axis: the interest rate.**
  - The interest rate stands as a wall. As r rises from 0 to 0.6, the budget line steepens around the endowment and the chosen c₁ falls.
  - Carried to the wall, the saving at each r traces the household's saving curve.
- **A second reading:** relabel the two axes "if it rains" and "if it does not". The endowment is then an uninsured income, the budget line is a market for insurance, and the same tangency chooses how much to insure. Uncertainty enters micro as a choice across states, just as time entered as a choice across dates.
- **Realization:** "Saving is demand for future consumption, and insurance is demand for consumption in bad states. The tangency u′(c₁) = β(1 + r)u′(c₂) is the Euler equation. It returns in macro, finance and international finance."
- **Later:**
  - Stage 6: saving meets investment.
  - Figure 8.2: the current account.
  - Figure 8.4: the state-by-state price of an asset.
  - Figure 8.9: what happens when the household's impatience is not steady.

*Transition:* the household is now a choosing agent. The seller's side is still a curve. Open it.

---

## Stage 3. Opening up the firm

**Added:** a producer with a technology, costs and a choice of scale; then many producers who can enter.

The supply curve of Stage 1 hides a firm deciding how to produce at least cost and how much to produce at a given price. It also hides an industry: many firms deciding whether to be in the market at all. Microeconomics opens both.

The firm's problem has the same shape as the household's in Figure 2.1: an isoquant touching the lowest isocost line, MRTS = w/r. Time enters again, in a different role. For the household it was a second good; for the firm it is a horizon for adjustment. In the short run the plant is fixed. In the long run the firm chooses its plant, and new firms can enter.

### Figure 3.1: Plants of every size, and their envelope

- **2D:**
  - Short-run average cost curves for five plant sizes, each U-shaped.
  - The long-run average cost LRAC(Q) = 2 + 0.06(Q − 6)² is the lower envelope of the short-run curves of every plant size, five of which are drawn.
  - The minimum of LRAC is at Q = 6, at a cost of 2.
- **Hidden axis: plant size K, as depth.**
  - Each short-run curve stands on its own plane, ordered by plant size into the page.
  - Seen from the front, the planes collapse, and the lowest cost at each output traces the envelope.
  - Seen from the side, each curve touches the envelope at one point only. That point is the curve's own minimum only at the bottom of the envelope.
  - The mathematics course calls this the envelope theorem.
  - In 1931 Jacob Viner asked his draftsman, Y. K. Wong, for a long-run curve that touched every short-run curve at its minimum. Wong objected that no curve can do that. Viner printed the impossible curve and later conceded the error.
- **Agents:** five factories of increasing size (Blender), one behind each plane.
- **Realization:** "The long-run curve is not a curve the firm moves along. It is the best of many short-run curves, and economies of scale are the falling part of the envelope."
- **Later:**
  - Figure 3.2.
  - Industrial organization: natural monopoly (8.8).
  - Figure 1.3: the same logic makes long-run demand more elastic.

### Figure 3.2: Entry, until the price is the minimum of cost

- **2D:**
  - Market demand Q = 60 − 8P.
  - N identical firms, each with the cost of Figure 3.1, C(q) = q·LRAC(q), supplying along its marginal cost 2 + 0.18(q − 6)(q − 2) at prices above 2.
  - With 3 firms the price is about 4.4, well above the minimum of average cost (2), so firms make profits.
- **Hidden axis: the number of firms N.**
  - As N rises from 3 to 7, industry supply moves out and the price falls step by step: 4.4, 3.7, 3.0, 2.5, 2.1.
  - An eighth firm would make a loss, so entry stops.
  - The equilibrium points form a path that descends and flattens near P = 2.
- **Realization:** "Perfect competition is the end of an entry process. Price equals the minimum of average cost, and profits are zero, because that is where entry stops."
- **Later:**
  - Stage 4, where entry is blocked or slow.
  - Labor demand (8.7), which is the firm's marginal product read from the other side.

*Transition:* every firm so far was a price taker, too small to matter. Take most of them away.

---

## Stage 4. A few firms

**Added:** strategy. Each firm's best choice depends on what the others do.

With one seller the market is a monopoly. The seller faces the whole demand curve and climbs its own profit hill to the top. There marginal revenue equals marginal cost, which sets the markup (P − MC)/P = 1/|ε|.

With two or three sellers, each one's profit depends on the others' output, so the top of the hill moves whenever a rival moves. Game theory enters the sequence here, as a tool for this situation. It answers what happens when each player picks the best response to the others and nobody wants to change: a Nash equilibrium.

A second idea follows when moves come in order. Some equilibria then rest on threats that would never be carried out, and the game-theory course adds the time axis that removes them.

### Figure 4.1: Two sellers

- **2D:**
  - Cournot duopoly with demand P = 12 − Q and marginal cost 2.
  - Firm 1's best response is q₁ = (10 − q₂)/2, and firm 2's is symmetric.
  - Their crossing, the Nash equilibrium, is at q₁ = q₂ = 3.33, with a price of 5.33.
  - With n identical firms the Cournot price is (12 + 2n)/(n + 1): 7 for a monopoly, 5.33 for two, 4.5 for three, falling toward the marginal cost of 2. Each firm's markup is 1/(n|ε|).
  - If the firms compete in prices instead (Bertrand), two are already enough to reach marginal cost.
- **Hidden axis: profit, as height.**
  - Over the plane of outputs (q₁, q₂), firm 1's profit is a ridge-shaped surface. For each q₂, the highest point along q₁ lies on a line: the ridge. That ridge is firm 1's reaction curve.
  - Firm 2's surface has its own ridge, and the two ridges cross at the Nash equilibrium.
  - At that point, firm 1's contour runs flat and firm 2's runs upright, so they cross rather than touch. Both firms could earn more by producing less.
- **Agents:** two factories (Blender), one at each axis.
- **Realization:** "A best-response curve is the ridge of a profit surface. Nash equilibrium is where the two ridges cross. Because the contours cross there, the firms could both do better together: the cartel of Figure 8.8, and the opposite of the touching contours of Figure 5.1."
- **Later:**
  - Industrial organization (8.8).
  - Trade policy.

### Figure 4.2: A threat that would not be carried out

- **2D:**
  - The entry game as a payoff table. An entrant chooses Out or In, and the incumbent chooses Fight or Accommodate.
  - Payoffs (entrant, incumbent):
    - Out gives (0, 10), whatever the incumbent plans.
    - In and Fight gives (−1, 2).
    - In and Accommodate gives (3, 5).
  - The table has two Nash equilibria: (Out, Fight) and (In, Accommodate).
- **Hidden axis: the order of moves.**
  - The table stands up into a tree along a time axis: the entrant moves first and the incumbent second.
  - At the incumbent's node, after entry, fighting pays 2 and accommodating 5, so the threat to fight would not be carried out.
  - Only (In, Accommodate) survives. It is the subgame-perfect equilibrium.
- **Realization:** "A payoff table is a game with its time axis flattened. Subgame perfection puts the time back and removes the threats nobody would carry out."
- **Later:**
  - Entry deterrence and capacity as commitment (8.8).
  - The credibility of a central bank (Figure 6.4).
  - Trade agreements.

*Transition:* so far, one market at a time, with everything else held still. Now let every market move together.

---

## Stage 5. All markets at once

**Added:** the connection between markets, and the conditions under which their outcome is efficient.

General equilibrium asks whether there is a set of prices at which every market clears together, and whether the result is any good.
- Under convexity and continuity, an equilibrium exists. The course proves this with a fixed-point theorem.
- Walras' law says the values of excess demand across markets always add to zero, so if every market but one clears, the last one does too.
- The first welfare theorem says a competitive equilibrium is Pareto efficient.
- The second says any efficient allocation can be reached with lump-sum transfers.
- With production added, efficiency is the same tangency three times. The rate at which the economy can turn one good into another equals the rate at which households will trade them, and both equal the price ratio: MRT = MRS = p_x/p_y.

Each assumption behind these theorems is a door to a field course, and the end of intermediate micro opens two of them.
- **A public good** is used by everyone at once, so no price can ration it.
- **Hidden information** means one side of a trade knows what the other cannot see, so the price cannot sort good from bad.

The figures of this stage are the theorem and those two doors.

### Figure 5.1: Two consumers make a box

- **2D:**
  - The Edgeworth box for two households, A and B, both with the utility u = √(xy) of Figure 2.1. They share 10 units of each good, and the endowment is ω = (8, 2) in A's coordinates.
  - A's indifference curves start from the lower-left corner and B's from the upper-right. The contract curve runs along the diagonal.
  - A price line through ω turns until both households' choices coincide at E = (5, 5).
- **Hidden axis: two utility hills.**
  - A's hill rises from A's corner and B's from B's corner, facing each other. The contract curve is the line along which their contour lines touch.
  - The price line stands as a fence through ω, and each household climbs to the top of its own hill along the fence.
  - While the two tops are at different places on the fence, there is excess demand, and the fence turns until the tops meet.
  - Both tops always lie on the same fence: that is Walras' law made visible.
- **Agents:** households A and B (Blender) at their corners.
- **Realization:** "Pareto efficiency is the contour lines of two hills touching. A Walrasian equilibrium is a price that brings both choices to one of those points."
- **Later:**
  - Trade (8.1): the same box, with factors of production.
  - Public economics (8.5): the second welfare theorem and its transfers.

### Figure 5.2: A good that everyone uses

- **2D:**
  - A public good G, such as street lighting. Each of n identical households would pay 10 − G for one more unit, and a unit costs 6.
  - Each household's willingness to pay is drawn as its own line. The lines are added vertically, because every household uses the same G.
- **Hidden axis: the number of households n.**
  - Each household's line stands on its own plane, ordered into the page.
  - The efficient amount is where the vertical sum meets cost, n(10 − G) = 6. G* is 4 with one household, 7 with two, 8 with three and 9.5 with twelve.
  - Voluntary giving stops at G = 4, however it is shared, because past that point no single household values one more unit at its cost.
  - The gap between 4 and G* grows with n.
- **Realization:** "For a public good, willingness to pay adds up vertically: Σ MRS = MRT (Samuelson). The more people share a good, the larger the gap between what they would pay together and what anyone pays alone."
- **Later:**
  - Public economics (8.5).
  - The climate as a public good shared by countries (8.6).

### Figure 5.3: The buyer cannot see the hidden axis

- **2D:**
  - A market for 100 used cars. Each car has a quality θ between 0 and 10, spread evenly, and θ is what the car is worth to its seller. Any buyer would pay θ + 3 for it. Buyers see the price, not the quality.
  - The figure is a supply-and-demand diagram with an odd demand curve. At a price p, only sellers with θ < p offer their cars. The average car on offer is then worth p/2 to its seller, so buyers will pay at most p/2 + 3.
- **Hidden axis: quality.**
  - Each car rises as a column of height θ.
  - The market settles at p = 6. The 60 cars below 6 trade, and the 40 best stay home, though each is worth 3 more to a buyer than to its owner.
  - Of the 300 in possible gains, 120 are lost.
- **Realization:** "Every other hidden axis in this part was hidden from the reader. This one is hidden from the buyer, and the best part of the market disappears (Akerlof)."
- **Later:**
  - Adverse selection in insurance (8.5).
  - Screening borrowers (8.3).
  - Signaling in labor markets (8.7).
  - Missing credit markets (8.10).

*Transition:* the economy is now a system of markets, with its theorem and its doors. Macroeconomics asks how the whole moves over time and what money and government do to it. It needs one more step first: adding the households up.

---

## Stage 6. Time, money and government

**Added:** the economy as one object moving through time, and two agents who try to steer it: the government and the central bank.

Macroeconomics changes the object. Instead of a market it studies totals: output, the price level, the interest rate, unemployment. To get there, it must assume that the many households of Stage 2 add up to something that behaves like one. Strictly, that holds only if every household spends an extra unit of income the same way: Gorman's condition.

Macroeconomics then keeps the long run of general equilibrium, with flexible prices and every market clearing. It adds what the long run cannot explain: capital accumulating, money, prices that adjust slowly, and expectations. Time changes role a third time. It is no longer a good or a horizon but a state that accumulates: capital, prices and expectations carry each year into the next.

### Figure 6.1: Capital accumulates (Solow)

- **2D:**
  - Output per worker f(k) = k^0.35, saving s·f(k) with s = 0.3, and break-even investment (n + δ)k with n + δ = 0.08.
  - The steady state is at k* ≈ 7.6. The flat figure is the model's phase diagram: it shows which way k is heading at every level.
- **Hidden axis: time, the axis a phase diagram leaves out.**
  - Starting from four different levels of capital, the paths of k rise out of the page over time, and every one bends toward k*. With these numbers, half the gap closes in about 13 years.
  - Raise the saving rate to 0.4, and the paths lean toward a new, higher steady state at 11.9, then flatten again.
- **Data beside the figure:** Korea, from Bank of Korea national accounts.
  - Real GDP per person rose about 36-fold from 1960 to 2025.
  - Fixed investment rose from 11 percent of GDP in 1960 to 38 percent in 1991.
  - Did that growth come mostly from piling up capital and labor, a climb along one Solow path that must slow, or from rising productivity? That is the growth-accounting debate of the 1990s (Young; Krugman).
- **Realization:** "The steady state is where every path goes. A higher saving rate raises the level, not the long-run growth rate; only technology does that."
- **Later:**
  - Development (8.10).
  - Economic history (8.11).

### Figure 6.2: AD is a list of IS–LM equilibria

- **2D:**
  - IS, r = 9 − 0.75Y, and LM, r = 0.9Y − 6/P, drawn for P = 1, with equilibrium Y = 9.09.
  - IS is itself a list of equilibria. Planned spending C + I(r) + G, with C = 0.8 + 0.6Y, I = 2.5 − 0.533r and G = 1.5, meets output at a different Y for each r (the Keynesian cross, multiplier 2.5).
  - LM is the money market: real money demand 0.9Y − r equals real balances M/P, with M = 6.
  - The government places IS through G, and the central bank places LM through M.
- **Hidden axis: the price level.**
  - IS–LM is redrawn for P = 1, 1.5 and 2, each on its own plane.
  - A higher P shrinks real balances and lifts LM, so output falls.
  - The equilibrium outputs at each P, dropped onto a floor of (Y, P), trace aggregate demand, Y(P) = (9 + 6/P)/1.65.
- **Realization:** "Aggregate demand is not a demand curve in the sense of Stage 1. It is a list of equilibria of a list of equilibria. Keynesian crosses stacked by the interest rate make IS; IS–LM pairs stacked by the price level make AD."
  - C stands for Stage 2's households, simplified so that spending depends only on this year's income, and I stands for Stage 3's firms.
- **Later:**
  - AD–AS and its history.
  - The modern IS equation, which is the Euler equation of Figure 2.3.
  - International finance (8.2).

### Figure 6.3: The Phillips curve moves with expectations

- **2D:** short-run Phillips curves π = π^e − 1.2(u − 5), for expected inflation π^e from 2 to 14 percent, and the vertical long-run curve at the natural rate u = 5.
- **Hidden axis: expected inflation.**
  - The short-run curves are stacked by π^e into a sloping surface. When actual inflation runs above expectations, expectations rise and the economy climbs to the next slice.
  - Over that surface, the path of the United States from 1960 to 1986 is drawn from FRED data, with each year's expected inflation taken as the previous year's inflation.
  - The points sit near the slices rather than on them, because of the oil shocks and a natural rate above 5 in those years.
  - The path runs up and to the left along one slice in the 1960s, onto ever higher slices in the 1970s, and back down after the disinflation of 1980–82.
- **Realization:** "The trade-off between inflation and unemployment holds only along one slice. Friedman and Phelps added the axis, and the 1970s moved along it."
- **Later:**
  - Figure 6.4.
  - Rational expectations and the Lucas critique.
  - Labor's flows into and out of unemployment (8.7).

### Figure 6.4: The central bank chooses on a Phillips curve

- **2D:**
  - The slice of Figure 6.3 at π^e = 5: π = 5 − 1.2(u − 5).
  - The central bank's loss is (π − 2)² + (u − 5)², so its indifference curves are circles around its target of 2 percent inflation at the natural rate.
  - The bank picks the point on the Phillips curve closest to the target: u ≈ 6.5, π ≈ 3.2.
- **Hidden axis: the loss, as the depth of a bowl.**
  - The bowl's lowest point is the target. The Phillips curve stands as a fence across it, and the bank goes to the lowest point of the bowl along the fence.
  - Across the slices of Figure 6.3, those chosen points trace a line, π − 2 = 0.83(u − 5). This is the monetary rule (Carlin and Soskice's MR curve).
- **Agents:** the central bank (Blender).
- **Realization:** "The central bank is Figure 2.1's household, with a bowl for a hill and the Phillips curve for a budget. A promise of low inflation is believed only if keeping it will be the bank's best move when the time comes. That is the same test as Figure 4.2's threat (Kydland and Prescott)."
- **Later:**
  - Inflation targeting and interest-rate rules.
  - Money and banking (8.3).
  - Policy in an open economy (8.2).

*Transition:* every figure so far has been a claim about how the economy works. The next stage asks how anyone could check.

---

## Stage 7. Measurement

**Added:** data, and the question of what the data can identify.

Econometrics turns the curves into numbers. Its first tool, least squares, fits a line by minimizing squared vertical distances. Its fitted values are the projection of the outcome vector onto the space the regressors span.

Its first worry is that the line can be wrong in a systematic way. When a variable that matters is left out and moves with the one that is in, the slope picks up both. When the data are crossings of two moving curves, the line may describe neither.

The rest of the course is a catalogue of designs that recover a causal effect anyway: instruments, panel data, differences-in-differences, discontinuities and experiments.

### Figure 7.1: The scatter is a shadow

- **2D:** a scatter of y against x₁, with the least-squares line. Its slope is about 1.0, while the true effect of x₁ is 0.5.
- **Hidden axis: the omitted variable x₂.**
  - Each point rises to its value of x₂. The points then lie close to a tilted plane, y = 1 + 0.5x₁ + 0.8x₂, whose slope along x₁ is 0.5.
  - The flat scatter is what you see looking straight down the x₂ axis.
  - Because x₂ rises with x₁ (δ = 0.625 per unit, the slope of x₂ regressed on x₁), the line fitted to that shadow tilts by β₂δ = 0.5. Its slope is β₁ + β₂δ = 1.0.
- **Realization:** "A flat scatter is the shadow of a cloud with more dimensions. Omitted-variable bias is the tilt that a hidden dimension adds to the shadow's line, the same idea as every other figure in this part."
- **Later:**
  - Instruments: a variable that moves x₁, is unrelated to x₂, and affects y only through x₁.
  - Every empirical field course.
  - The return to schooling (8.7).

### Figure 7.2: A cloud of prices is not a demand curve

- **2D:**
  - Twelve months of prices and quantities from the market of Figure 1.1.
  - Demand, P = 10I − Q, moves with income I, between 1.0 and 1.2. Supply, P = 1 + Q + v, moves with the weather v, between −1 and 1.
  - The months are chosen so that income and weather are unrelated and shift the curves by the same amount.
  - The least-squares line through the twelve points is flat, with slope about 0, though demand slopes down at −1 and supply up at +1.
- **Hidden axis: the month.**
  - Each point rises to its own plane, carrying that month's demand and supply curves; the point is where they cross.
  - Months that differ only in weather slide along one demand curve.
  - Using weather as an instrument recovers the demand slope of −1.
- **Realization:** "Data are crossings of moving curves. To see one curve, you need something that moves only the other. That is where instrumental variables began (Working 1927; Wright 1928)."
- **Later:**
  - Every field course's identification problem.
  - Natural experiments in labor (8.7) and history (8.11).

*Transition:* the core is complete. Each field course now adds one agent, one market, one friction or a longer horizon to it.

---

## Stage 8. The field courses: each adds one thing

**Added:** in turn, a second economy, money and risk, the state, wage and price setters, a different household, and the long run of history.

The third and fourth years look like eleven separate subjects. They are not. Each field course keeps the core of Stages 1–7 and changes one thing: it adds an agent, a market, a friction or a longer horizon. That is why the field courses can be taken in almost any order once the core is done.

This stage goes through them one at a time. For each, it says what the course adds and which parts of the core it stands on, and it shows the one figure where the addition is easiest to see. Each course also has its own page with its weeks, its sources and its reading.

### A second economy

#### 8.1 International trade adds a second country

Trade theory starts from comparative advantage. Two countries gain from trade whenever their costs differ in proportion, even if one is better at everything.

The course then asks what Principles skipped. The gains from trade are a country's gains; inside the country, some people lose. With two factors of production, opening to trade moves factor prices, and the Heckscher–Ohlin model says which way: toward the factor the country has in abundance.

Later models explain:
- why similar countries trade similar goods (increasing returns and love of variety, Krugman);
- why only the most productive firms export (Melitz);
- why trade policy becomes a game between governments.

*Builds on:* comparative advantage, the efficiency conditions and the box (Figure 5.1), games (Stage 4).

**Figure 8.1: Who inside the country gains**

- **2D:**
  - Home makes two goods with labor and capital. Textiles use mostly labor (labor's share of cost is 0.8); machines use mostly capital (0.2).
  - Each good's price must equal its unit cost. In the plane of the wage w and the rental rate r, each good's break-even condition is a curve.
  - Today's factor prices are where the two curves cross.
- **Hidden axis: the price of textiles relative to machines.**
  - Opening to trade raises this price for a country with plenty of labor. Stacked by that price, the crossing moves.
  - A 10 percent rise in the price of textiles raises the wage by 13.6 percent and lowers the return to capital by 3.1 percent. (In log changes, 13.3 and −3.3; the page uses the exact values.)
  - The wage outruns both prices, and capital loses against both.
- **Realization:** "Trade raises the country's income and redistributes inside it, by more than the prices move (Stolper–Samuelson). Comparative advantage explains the gains; factor prices explain the politics."
- **Later:**
  - Labor (trade and wage inequality).
  - Trade policy and trade agreements.

#### 8.2 International finance adds the exchange rate and capital flows

A second economy brings a second currency and the chance to borrow abroad.
- A current account deficit is Figure 2.3 for a country: borrowing from the future, CA = S − I.
- An exchange rate is an asset price. When money moves freely, the returns on deposits in each currency are linked by uncovered interest parity: i = i* + expected depreciation.
- Purchasing power parity holds roughly in the long run and poorly in the short.
- Mundell–Fleming adds the open economy to IS–LM and leads to the trilemma. No country can have a fixed exchange rate, free capital movement and its own monetary policy at once.

*Builds on:* choice over time (Figure 2.3), IS–LM (Figure 6.2), expectations (Figure 6.3).

**Figure 8.2: The exchange rate today depends on tomorrow**

- **2D:** the foreign-exchange market as Krugman, Obstfeld and Melitz draw it.
  - The vertical axis is the price of a dollar in won, E, as an index.
  - The return on won deposits is a vertical line at i = 5 percent.
  - The expected return on dollar deposits, measured in won, is i* + (E^e − E)/E with i* = 3 percent. It falls as E rises.
  - With an expected future rate E^e = 1.05, today's rate is E = E^e/(1 + i − i*) = 1.03.
- **Hidden axis: the expected future rate E^e.**
  - The dollar-return curves are stacked by E^e, from 1 to 2.5, into a surface.
  - A rise in E^e from 1.05 to 1.10 moves today's rate to 1.08 at once, with no change in trade or output.
  - Raising the domestic interest rate pushes back, but only through the interest differential.
- **Data over the surface:** Korea from June 1997 to April 1998, from Bank of Korea data.
  - The won fell from 889 per dollar in June to 1,707 in January (monthly averages).
  - The call rate stayed between 11 and 14 percent until November and reached 25 percent only in January, under the IMF program. Expectations moved across slices before the interest-rate defense began.
  - The won recovered to 1,392 by April, with the call rate still above 20 percent. How much of that recovery the high rates bought is still debated.
  - Korea's gross official reserves fell from 33 to 20 billion dollars between June and December 1997.
- **Realization:** "An exchange rate is an asset price. It jumps when expectations of the future move, and an interest-rate defense works only if it moves expectations too."
- **Later:**
  - Capital controls and currency unions.
  - Monetary policy in a small open economy.

### Money and risk

#### 8.3 Money and banking adds the balance sheet

Macro's LM curve treats money as a quantity the central bank sets. Money and banking opens up the institutions that create it.

A bank holds long, illiquid loans against short, liquid deposits and a thin layer of capital. That is useful, because savers stay liquid while long projects are funded, and it is fragile for the same reason.

The course follows the policy rate through the term structure to the rates households pay. In Korea's 2021–23 cycle, the base rate rose from 0.5 percent in July 2021 to 3.5 percent in January 2023. The average rate on new mortgages went from 2.8 percent to a peak of 4.8 percent in October 2022.

The course then turns to failure: runs, contagion, and the rules written after each crisis.

*Builds on:* LM (Figure 6.2), Nash equilibrium (Stage 4), hidden information (Figure 5.3).

**Figure 8.3: A run is an equilibrium**

- **2D:** the Diamond–Dybvig bank.
  - Each of 100 depositors deposits 1. The bank invests in a project that pays 1.5 at the end and only 1 if it is liquidated early. It promises 1.1 to anyone who withdraws early.
  - A quarter of depositors need their money early.
  - The figure plots a patient depositor's two payoffs against the share f of depositors who withdraw early:
    - waiting pays 1.5(1 − 1.1f)/(1 − f), which falls to zero at f = 0.91;
    - withdrawing pays 1.1 while the bank can pay, and a pro-rata share 1/f after that.
- **Two equilibria on the flat page:**
  - If only the impatient quarter withdraws, waiting pays 1.45, more than 1.1, so patient depositors wait.
  - If more than 73 percent are expected to withdraw, waiting pays less than 1.1, and everyone runs.
- **Hidden axis: the deposit guarantee g.**
  - The payoff curves are stacked by the amount the state guarantees each depositor who waits, from 0 to 1.1. A floor rises under the waiting curve.
  - Below g = 1 it changes nothing, because in a full run each depositor still gets 1, more than the floor.
  - Between 1 and 1.1, the full run disappears, but a partial run survives at f = 1/g.
  - At g = 1.1, the amount promised, waiting is never worse than running. No run equilibrium is left, and in the good equilibrium the guarantee is never paid.
- **Agents:** the bank (Blender), with its depositors in line.
- **Realization:** "A run need not be irrational: each depositor is right to run if the others do. Deposit insurance and a lender of last resort work by removing that equilibrium. When they work, they cost nothing on the equilibrium path; their real cost is the risk-taking they invite."
- **Later:**
  - 2008, when the run was on wholesale funding. The TED spread is the premium banks charged one another over Treasury bills. It rose from about 0.5 percentage points in 2006 to 4.1 in the week ending 17 October 2008 (FRED).
  - Macroprudential regulation.

#### 8.4 Financial economics adds prices of risk

Finance asks what an uncertain future payment is worth today.
- Present value is Figure 2.3's budget line read as a price.
- Risk has a price, but not all risk. Risk that can be diversified away earns nothing, because nobody has to bear it.
- What remains, the part that moves with the market as a whole, is what expected returns pay for. That is the CAPM: E[R_i] − r_f = β_i(E[R_m] − r_f).
- The course ends where the household began. The price of any asset is p = E[m·x], with m = βu′(c₂)/u′(c₁): the tangency of Figure 2.3, taken one state of the world at a time. An asset is valuable when it pays in the states where consumption is scarce.

*Builds on:* choice over time and across states (Figure 2.3), regression (Figure 7.1: a beta is a slope).

**Figure 8.4: Diversification is correlation**

- **2D:**
  - Two assets. A has an expected return of 4 percent and a standard deviation of 10; B has 10 and 20.
  - The figure plots every mix of the two in the plane of standard deviation and expected return.
- **Hidden axis: the correlation ρ between the two.**
  - At ρ = 1, the mixes lie on a straight line, and mixing removes no risk.
  - As ρ falls, the line bends to the left.
  - At ρ = 0, the least risky mix, 20 percent in B, has a standard deviation of 8.9, below either asset alone.
  - At ρ = −1, a third in B removes risk entirely and earns 6 percent.
  - Stacked by ρ, the curves form a surface whose left edge is the gain from diversification.
- **Realization:** "Diversification lives on the correlation axis: combining assets that do not move together removes risk without giving up return."
- **Later:**
  - The stochastic discount factor.
  - International finance.
  - 2008, when correlations rose together.

### Missing markets and the state

#### 8.5 Public economics adds the state as a choosing agent

The welfare theorems of Stage 5 say when markets need no help, and its last two figures showed where they fail. Public economics studies the state as the agent that steps in, and the cost of stepping in.
- The state must raise money with taxes that change behavior, and its choices are made by voters and interest groups.
- Tax incidence shows that who bears a tax depends on elasticities, not on who writes the check.
- Optimal taxation weighs the revenue a tax raises against the trades it stops, and equity against the cost of discouraging work (Ramsey; Mirrlees).
- Social insurance meets the hidden information of Figure 5.3 as adverse selection and moral hazard.

*Builds on:* the tax wedge (Figure 1.2), elasticity (Figure 1.3), the welfare theorems and their doors (Stage 5).

**Figure 8.5: The cost of a tax grows with its square**

- **2D:**
  - The market of Figure 1.1, demand P = 10 − Q and supply P = 1 + Q, with a tax of t per unit.
  - Buyers' and sellers' prices separate by t, and quantity falls to (9 − t)/2. The revenue rectangle and the deadweight-loss triangle are shaded.
  - With these slopes, buyers and sellers each bear half the tax, whoever pays it.
- **Hidden axis: the tax rate t.**
  - Stacked by t from 0 to 9, revenue t(9 − t)/2 rises as an arch that peaks at t = 4.5. The deadweight loss t²/4 rises as a parabola.
  - From t = 2 to t = 4, revenue goes from 7 to 10 and the loss from 1 to 4.
  - The extra loss for one more unit of revenue is 0.4 at t = 2 and 4 at t = 4.
- **Realization:** "A small tax is nearly free and a large one is not, because the loss grows with the square of the rate. That is why broad bases with low rates win, and it is where optimal taxation starts."
- **Later:**
  - Social insurance.
  - Environmental taxes (8.6).
  - Public debt.

#### 8.6 Environmental economics adds the very long horizon

Pollution is an externality, a cost borne by someone outside the trade. The course starts with the remedies:
- a Pigouvian tax;
- tradable permits;
- the choice between a price and a quantity when costs are uncertain (Weitzman).

Climate change then adds what no other course has: costs that fall decades or centuries later, on people not yet born. How much those costs count today depends on the discount rate. The Ramsey rule, r = ρ + ηg, splits it into three parts:
- how impatient we are (ρ);
- how much a richer future lowers the value of an extra unit (η);
- how fast consumption grows (g).

Since every country shares the climate, an agreement is the public-goods problem of Figure 5.2, played between countries.

*Builds on:* the tax wedge (Figure 1.2), discounting (Figure 2.3), public goods (Figure 5.2), strategy (Stage 4).

**Figure 8.6: A cost that arrives a century later**

- **2D:**
  - Demand P = 10 − Q and private marginal cost 1 + Q, so the market produces 4.5 units.
  - Each unit also does 10 of damage, but the damage arrives 100 years later.
- **Hidden axis: time to the damage.**
  - The damage stands at the far end of a time axis running into the page. It casts its present value back onto the figure, as an external-cost layer on top of private cost. The discount rate sets how thick that layer is.
  - At r = 1.4 percent, the layer is 2.49 thick (annual discounting). That rate combines pure time preference ρ = 0.1 percent and η = 1, the Stern Review's choices, with consumption growing at g = 1.3 percent. The efficient output is then 3.25, and the corrective tax is 2.49.
  - At r = 4.5 percent, the layer is 0.12 thick, and the market is almost efficient as it is.
- **Realization:** "An externality is a missing market. Climate change is a missing market with people not yet born, and the discount rate decides how much of their cost we see."
- **Later:**
  - The social cost of carbon.
  - International agreements.

### Who sets the price

#### 8.7 Labor economics adds people as the commodity

In a labor market, the thing sold is a person's time, and the seller comes with it.
- Labor supply is Figure 2.2 with leisure as the good, so a higher wage can raise or lower hours.
- Labor demand is Stage 3's firm read from the other side: hire until the value of the marginal product equals the wage.
- Schooling is an investment with a return. Estimating that return is the problem of Figure 7.1, because ability is the omitted x₂.
- Unemployment, one number in macro, becomes flows. Each month some workers lose jobs and some of the unemployed find them, and the rate settles where the flows balance: u* = s/(s + f).
- Labor is also where economics learned to measure with natural experiments: the Vietnam draft lottery, the Mariel boatlift, and the minimum wage.

*Builds on:* the two effects of a price change (Figure 2.2), the firm (Stage 3), identification (Stage 7).

**Figure 8.7: What a minimum wage does depends on who sets the wage**

- **2D:**
  - A labor market with supply w = 2 + L and the value of the marginal product w = 14 − L.
  - If employers take the wage as given, 6 workers are employed at a wage of 8.
  - If a single employer sets the wage (monopsony), it hires where the marginal cost of labor, 2 + 2L, equals the marginal product: 4 workers at a wage of 6.
- **Hidden axis: the minimum wage m.**
  - For each m, employment rises as height above the figure.
  - In the monopsony market, the height is 4 up to m = 6, rises to 6 at m = 8, then falls to zero at m = 14: a tent.
  - In the competitive market, there is no rising side. Employment only falls once m passes 8.
- **Realization:** "Theory alone cannot say whether a minimum wage costs jobs; it depends on whether employers set wages. That is why the question moved to natural experiments, such as Card and Krueger's comparison of New Jersey and Pennsylvania (1994)."
- **Later:**
  - Inequality.
  - Search models.

#### 8.8 Industrial organization adds strategy among firms, in detail

Stage 4 showed that market power is a matter of degree. Industrial organization measures it and studies what firms do with it.
- The Lerner index, (P − MC)/P, is Stage 4's markup.
- Firms with power do not charge one price. They discriminate, bundle and use two-part tariffs.
- Products differ (Hotelling), and prices compete (Bertrand).
- Incumbents use capacity as a commitment to keep entrants out: Figure 4.2 with an investment added.
- Auctions and platforms are markets designed by the firms that run them.
- The course ends with antitrust: mergers, monopolization, and natural monopoly, where Figure 3.1's envelope is still falling where demand cuts it.

*Builds on:* the envelope (Figure 3.1), Cournot and the entry game (Stage 4).

**Figure 8.8: The future holds a cartel together**

- **2D:** the duopoly of Figure 4.1.
  - If the two firms split the monopoly output, each earns 12.5 a period. In the Cournot equilibrium, each earns 11.1.
  - A firm that cheats on the cartel produces 3.75 against its partner's 2.5. It earns 14.1 once, then Cournot profits for ever after, once the partner retaliates.
  - The figure plots the two streams of profit over time: a steady 12.5, or 14.1 followed by 11.1.
- **Hidden axis: the discount factor δ.**
  - Each later period's bar shrinks by a factor δ, so what each stream is worth depends on δ.
  - Plotted against δ, the two totals are two curves that cross at δ* = (14.06 − 12.5)/(14.06 − 11.11) = 9/17, about 0.53. Above it collusion pays, and below it cheating does.
  - Figure 4.1 is the δ = 0 slice, where only today counts.
- **Realization:** "A cartel is held together by the future. Anything that makes cheating quicker to detect or punishment more certain helps collusion. Leniency programs break cartels by rewarding the first to confess."
- **Later:**
  - Antitrust practice.
  - Trade agreements, which are the same repeated game between governments.

### A different household

#### 8.9 Behavioral economics adds psychology to the household

Every model of choice in the core rests on a household whose preferences are complete, consistent and stable, and who uses all the information it has. Behavioral economics keeps the method and changes the agent, one documented departure at a time:
- **present bias:** the near future is discounted far more than the distant one, so plans change as dates approach;
- **prospect theory:** outcomes are judged as gains and losses from a reference point, and losses weigh roughly twice as much as gains;
- **social preferences:** people pay to punish unfairness;
- **limited attention:** not every price is seen.

Each departure is established in experiments or field data. Each leads to policy, because a default can change behavior where a price would not.

*Builds on:* every model of choice (Stage 2), especially choice over time (Figure 2.3), games (Stage 4), experiments (Stage 7).

**Figure 8.9: The plan changes as the day approaches**

- **2D:**
  - A choice between 100 on day 10 and 110 on day 11. Bars show each option's value as seen from one day.
  - With quasi-hyperbolic discounting (β = 0.7, and δ = 1 for simplicity), every future payment is multiplied by β, and only the present escapes.
- **Hidden axis: the day on which you decide.**
  - Each day's view stands on its own plane.
  - On day 0, both payments are in the future: 70 against 77, so you plan to wait for 110.
  - On day 10, the first payment is now: 100 against 77, so you take 100.
  - The bars swap order between the planes. An exponential discounter (β = 1) ranks them the same way on every plane.
- **Realization:** "Present bias makes the household of Figure 2.3 disagree with itself. Commitment devices, pension defaults and 'save more tomorrow' plans are designed around that disagreement."
- **Later:**
  - Public economics: pensions and taxes on harmful goods.
  - Development: commitment savings.

### Why growth happened, and where it did not

#### 8.10 Development economics adds institutions and missing markets

The Solow model of Figure 6.1 predicts that poor countries with the same saving and technology catch up. Many have not. Development economics asks why, and what helps the poor in the meantime.
- **Institutions:** property rights and limits on rulers decide whether investment pays at all, and many were set under colonial rule (Acemoglu, Johnson and Robinson).
- **Missing markets:** these decide who can invest. Without credit or insurance, a poor household cannot borrow against a good project, or get through a bad harvest without selling its tools.

Whether whole economies can be caught in a poverty trap is still argued. That individual firms and households are held back by missing markets is well measured. Development is also where randomized experiments became a standard method.

*Builds on:* Solow (Figure 6.1), the firm (Stage 3), hidden information (Figure 5.3), experiments (Stage 7).

**Figure 8.10: Capital goes to those who have it**

- **2D:**
  - A small firm of Stage 3, with output f(k) = √k and a market interest rate of 10 percent.
  - If owners could borrow, every firm would invest until the marginal product equals 10 percent: k = 25.
- **Hidden axis: the owner's wealth w.**
  - Without credit, each firm invests only what its owner has, so it sits at k = w on the marginal-product curve.
  - Stacked by wealth, the poorest firms have the highest returns: 50 percent at w = 1, 25 percent at w = 4, and 10 percent only at w = 25.
  - Capital is not where it earns the most; it is where wealth already is.
- **Data beside the figure:** randomized cash grants to small firms in Sri Lanka earned about 5 percent a month (de Mel, McKenzie and Woodruff, 2008).
- **Realization:** "A missing credit market makes the poorest firms the most productive at the margin and the least able to grow. High returns at small scale are the fingerprint of a missing market."
- **Later:**
  - Microfinance.
  - Economic history (8.11).

#### 8.11 Economic history adds time beyond the model

The core courses describe economies that grow. For almost all of history, economies did not, at least not per person, and economic history starts there.

In a Malthusian economy, a gain in technology or land raises income per person only for a while. Better-fed families raise more surviving children, the population grows, and income returns to the level at which births equal deaths.

Around 1800, north-western Europe escaped, and the course asks why there and then: wages, energy, institutions, the accumulation of knowledge. It follows the world economy through:
- the Great Depression, the macroeconomics of Stage 6 under the gold standard and banking panics;
- two waves of globalization.

It also uses the past as a laboratory. Accidents of history, such as where a border was drawn, supply the natural experiments Stage 7 looks for.

*Builds on:* Solow (Figure 6.1), AD and money (Figure 6.2), runs (Figure 8.3), institutions (8.10), identification (Stage 7).

**Figure 8.11: Before 1800, progress made more people**

- **2D:** Malthus in two linked panels, as Gregory Clark draws them.
  - Birth and death rates against income per person, crossing at subsistence income y*.
  - For a given technology, income per person falling as population grows: y = A·f(L)/L.
- **Hidden axis: centuries.**
  - Technology A rises in steps. Each step lifts income above y*, births exceed deaths, and the population grows until income is back at y*.
  - Stacked over centuries, income per person traces a flat ridge while population climbs beside it.
  - After 1800, technology grows faster than population can respond, and income leaves the floor.
- **Data beside the figure:** income per person since 1250 in England, the Netherlands, China and India (Maddison Project Database 2023, 2011 dollars, log scale).
  - The record bends the story without breaking it. England's income per person rose from about 1,230 dollars in 1348 to 1,720 by 1400, after the Black Death had killed a large share of its people: fewer people, richer people.
  - It stayed near 1,700 until 1600, then climbed, to 3,300 by 1800 and 7,600 by 1900.
  - China's was about 1,200 in 1500 and 1,000 in 1900.
- **Realization:** "The Solow model takes growth per person for granted. For most of history, technical progress produced more people, not richer ones."
- **Later:**
  - Development.
  - Growth theory.
  - The Great Divergence.

---

## Closing: what the sequence leaves out

The staircase works. Each stage added one agent, one market or one dimension, and each field course added one more. Two stages quietly set something aside along the way: general equilibrium returned to price-taking, and macroeconomics added the households up.

Each figure is still a slice, and the slices share an assumption that the folding does not remove: every agent of a type is alike, and nobody is connected to anybody in particular. Part 2 shows what that assumption hides.

---

## 그림 목록 요약

| 그림 | 숨은 축 | Blender 주체 | 실제 데이터 |
|---|---|---|---|
| 1.1 수요공급 | 소득 | | |
| 1.2 잉여와 세금 | 사람(이득 기둥) | 사람, 작은 공방 | |
| 1.3 탄력성 | 조정 기간 | | |
| 2.1 최적 선택 | 효용 언덕과 예산 울타리 | 가계 | |
| 2.2 수요 도출 | 가격 벽(보통 수요와 보상 수요) | | |
| 2.3 기간 간·상태 간 선택 | 이자율 벽 → 저축 곡선 | | |
| 3.1 포락선 | 공장 규모 K | 공장 5개 | |
| 3.2 진입 | 기업 수 N | | |
| 4.1 쿠르노 | 이윤 곡면, 반응곡선 = 능선 | 공장 2개 | |
| 4.2 진입 게임 | 수의 순서(표 → 나무) | | |
| 5.1 에지워스 상자 | 두 효용 언덕, 가격 울타리 | 가계 A, B | |
| 5.2 공공재 | 가계 수 n | | |
| 5.3 레몬 시장 | 품질(구매자에게 숨은 축) | | |
| 6.1 솔로 | 시간(위상도가 빼놓은 축) | | 한국 1960–2025 (ECOS) |
| 6.2 IS–LM → AD | 물가 수준 | | |
| 6.3 필립스 | 기대 인플레이션 | | 미국 1960–86 (FRED) |
| 6.4 중앙은행의 선택 | 손실(그릇) | 중앙은행 | |
| 7.1 누락변수 | x₂ | | |
| 7.2 동시성 | 달(month) | | |
| 8.1 국제무역 | 직물의 상대가격 | | |
| 8.2 국제금융 | 기대 환율 E^e | | 한국 1997–98 (ECOS) |
| 8.3 화폐금융 | 예금 보장 g | 은행과 예금자 줄 | 2008 TED (FRED), 본문에 한국 금리 (ECOS) |
| 8.4 재무경제 | 상관계수 ρ | | |
| 8.5 공공경제 | 세율 t | | |
| 8.6 환경경제 | 피해까지의 시간 | | |
| 8.7 노동경제 | 최저임금 m | | |
| 8.8 산업조직 | 할인인자 δ | | |
| 8.9 행동경제 | 결정하는 날 | | |
| 8.10 개발경제 | 소유주의 부 w | | 스리랑카 실험(문헌 수치) |
| 8.11 경제사 | 세기 | | 영국·네덜란드·중국·인도 1250–2022 (Maddison) |

- 그림은 30개이고, Blender는 7개 그림에서만 쓴다. 각각 핵심 주체가 처음 등장하는 곳이다: 사람·공방, 가계, 기업, 경쟁 기업, 거래하는 두 가계, 중앙은행, 은행.
- 영어 본문은 그림 사양을 포함해 약 10,200단어다. 핵심 1~7단계가 약 5,900단어, 각론이 약 4,000단어다. 그림 사양의 상당 부분은 그림 자체와 캡션이 되므로, 읽는 시간은 40~45분이다.

## 검토 반영 기록 (2026-10-30)

검토는 두 갈래로 따로 했다.
- **정확성 검토:** 모든 수치를 다시 계산하고, 문헌 귀속과 데이터 파일을 대조했다.
- **전공자 관점 검토:** 서사, 숨은 축의 타당성, 빠진 내용을 보았다.

**구조 변경**
- **빠진 핵심 보충:** 정보와 위험이 핵심 단계에 없는데도 각론 네 과목이 그 위에 서 있었다.
  - 5.3 레몬 시장을 넣었다.
  - 2.3에 '상태 간 선택(보험)' 읽기를 더했다.
  - 공공재를 5.2로 옮겼다. 이제 5단계는 '후생정리와 두 개의 문'이다.
- **같은 3D 동작이 반복되던 네 곳을 교체:**
  - 4.2: 기업 수 → 진입 게임과 부분게임 완전균형
  - 5.2: 경제 전체의 언덕 → 공공재
  - 6.2와 6.3 통합: 케인즈 교차는 IS의 내용으로 들어갔다.
  - 8.10: 빈곤 함정 → 신용 제약 기업. 한국 성장 데이터는 6.1로 옮겼다.
- **새 그림:**
  - 6.4 중앙은행의 선택: 처음으로 정책 주체가 선택한다.
  - 7.2 동시성: 식별 문제의 원점이다.
- **약한 숨은 축 교체:**
  - 1.3: 수입 → 조정 기간(르 샤틀리에 원리)
  - 8.1: 두 번째 판 → 헥셔–올린 요소가격(스톨퍼–새뮤얼슨)
  - 8.5: 가계 수 → 세율(사중손실은 세율의 제곱)
- **수학 과목:** 여는 글에 "숨은 축 = 모형의 매개변수, 접힘 = 비교정학"을 명시했다. 3.1에 포락선 정리를, 6.1에 위상도를 이름으로 넣었다.
- **'시간'의 역할을 단계마다 구분:** 2단계 '두 번째 재화' → 3단계 '조정의 지평' → 6단계 '쌓이는 상태'
- **8단계:**
  - 묶음을 여섯 개로 다시 나눴다.
  - 과목 문단에서 주차별 강의계획서 나열을 덜어 냈다. 그 내용은 과목 페이지로 간다.
- **Blender:** 15개 그림에서 7개로 줄였다(재설계의 '가끔' 원칙).

**바로잡은 오류**
- 8.3: 보장이 1.1 미만이면 교차점은 움직이지 않는다. 바로잡은 내용은 다음과 같다.
  - g ≤ 1: 효과 없음
  - 1 < g < 1.1: 부분 인출 f = 1/g
  - g = 1.1: 뱅크런 균형 소멸
- 8.2: 콜금리는 11월까지 11~14%였고 1월에야 25%가 됐다. 방어보다 기대가 먼저 움직였다. 기간을 1998년 4월까지 늘렸고(1,392원), 곡면 범위를 E^e 2.5까지 넓혔다.
- 6.3(옛 6.4): 기대 인플레이션이 데이터에 없는 기간은 전년 인플레이션으로 두었다. 점은 단면 '위'가 아니라 '근처'에 놓인다는 단서를 달았고, 단면은 14%까지 그린다.
- 6.1의 한국 데이터: 영(Young)과 크루그먼의 논쟁은 '자본 축적 대 생산성'이다. 함정 탈출론(로드릭)과 섞지 않았다.
- 3.2: 기업 비용 C(q) = q·LRAC(q)를 명시했다. '단기' 공급이라는 이름표는 틀렸다.
  - 지금 프로토타입 `parts.js`의 `longrun`은 MC = 2 + (q − 6)/2를 쓰므로 수치가 다르다. 1단계에서 원고 기준으로 다시 짓는다.
- 그 밖의 정정:
  - 2.2: 기펜재 조건(열등재이면서 소득효과가 더 클 때)
  - 2.3: β = 1을 명시
  - 5.1: 두 가계의 효용함수를 명시
  - 7.1: δ = 0.625를 명시하고, 도구변수 조건을 완전하게 적음
  - 8.3 본문: 한국 금리 사이클의 정점을 2023년 1월 3.5%로
  - 8.6: 단위(퍼센트)를 적고, g는 스턴의 '선택'이 아니라 입력값임을 구분
  - 8.7: 자연실험의 시작(징병 추첨, 마리엘 보트리프트)
  - 1.2: 세수 42, 사중손실 9(5 + 3 + 1)
  - 3.1: 바이너와 웡 일화의 표현
  - 맺음말: "모든 단계가 앞의 것을 유지했다"는 사실이 아니어서 고쳤다.

**남은 확인 사항**
- 8.11: 클라크의 맬서스 두 패널이 『A Farewell to Alms』 그림 2.1에서 어떻게 배치되는지 원서로 확인이 필요하다. 지금 문안은 배치를 특정하지 않는다.
- 8.11의 장기 데이터는 사용자 허락을 받아 Maddison Project Database 2023에서 받았다(`tools/fetch_data.py maddison` → `data/maddison.json`).
