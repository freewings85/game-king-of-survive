# Playtest Baseline — R5t (2026-04-21)

Locked as the reference point per Leo R5u F2. Any commit that drops these
metrics by > 10% should be auto-reverted before Testor matrix confirms.

## Reference commit
`652a598` — fix(r5t): warrior lane-3 scan 400→520

## Score
- Composite: **7.25 / 10**
- Peak round to date (tied with R5g, R5q, R5t)

## Kill metrics (20-game matrix, 5 games × 4 cells)
- Coverage: **100% 有杀** (all 20 games produced ≥ 1 player kill)
- `arena_a / warrior` μ kills: 5.0
- `arena_a / mage`    μ kills: 3.0
- `arena_a / scout`   μ kills: 2.25
- `arena_a / assassin` μ kills: 2.0
- `lane_b / warrior`  μ kills: **2.8** (project high, new record this round)
- `lane_b / mage`     μ kills: 1.8
- `lane_b / scout`    μ kills: 1.6
- `lane_b / assassin` N/A (solo-fallback per R5p, not matrix-sampled)

## FPS
- Target pass rate ≥ 30 fps: **45 %** of 20 games
- Per cell (μ fps, iPhone 14 viewport real device):
  - `arena_a / warrior`: 26.9  (σ 1.5 — cold zone, R5u F1 target)
  - `arena_a / mage`:    52.6
  - `arena_a / scout`:   51.2
  - `arena_a / assassin`: 28.8
  - `lane_b / warrior`:  30.9
  - `lane_b / mage`:     48.1
  - `lane_b / scout`:    36.4
- Headless Chromium (this repo's `_qa_perf_hot.mjs`) runs 4-5 fps LOWER
  than real device consistently; use it as a first-pass gate only.

## Regression thresholds (auto-revert triggers)
- 100% 有杀率 → fall below → auto-revert
- FPS pass rate drop > 15 percentage points (45% → < 30%) → auto-revert
- Any single cell kill μ drop > 50% → investigate + revert if code-attributable

## Known systemic characteristics
- `arena_a/warrior` σ is high at real device (15.1 in R5r) due to combat
  density varying with spawn position. Already capped (MAX_PARTICLES 300,
  MAX_FLOATS 60, activeFlashes 6, hitStop non-accumulating). Speculative
  caps produced regressions — do not ship without profile evidence.
- `assassin` kill μ is RNG-sensitive (backstab fires on bot facingAngle,
  which is AI-driven). 50% per-round μ swing is expected noise.
- Bisect rule: if a regression appears but `git diff` between "good" and
  "bad" commits is empty, it's sampling noise (R5s lesson). Don't chase.

## Methodology (R5q+R5t rule)
- Every FPS-touching commit message includes before/after profile numbers.
- Headless 5-sample self-test is a GATE, not a VERIFICATION. Only Testor's
  20-game matrix on real device confirms wins.
- No speculative optimisation — profile first, find specific hot function,
  change it, re-profile, compare. If profile isn't actionable, don't touch.

## Open targets (R5u+)
- `arena_a/warrior` FPS ≥ 30 (closest sub-30 cell)
- Composite 7.5 ceiling (from 7.25)
- Boundary expansion (daily challenge / 5th class / 3rd map) on Leo's
  call; R5u starts daily-challenge skeleton
