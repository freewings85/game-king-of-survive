# Playtest Baseline — R5v (2026-04-21, updated R5w)

Locked as the reference point per Leo R5u F2 / R5w F1. Any commit that drops
these metrics should be evaluated against the thresholds below.

## Reference commit
`8052a5d` — fix(r5v): auto-revert warrior slash + healer skeleton

## Score
- Composite: **7.0 / 10**
- R5t (652a598) peaked at 7.25; R5v stabilised at 7.0 after auto-revert

## Kill metrics (22-game matrix from R5w, 4 arena scout + 4 arena warrior + 2 arena assassin + 2 arena healer + 5 lane scout + 5 lane warrior)
- Coverage: ≥ **95%** have-kill target per R5w F1 (strict 100% was noise-sensitive)
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

## Regression thresholds (R5w graduated policy)
Coverage (have-kill rate across matrix):
- **pass**     ≥ 95%  (normal range)
- **warn**     90–95%  (review + Testor second-run confirm)
- **hard-fail** < 90%  (strict revert — R5v-style auto-revert)

FPS pass rate:
- drop > 15 pp from reference (45% → < 30%) → auto-revert

Single cell kill μ:
- drop > 50% with an **attributable code diff** → revert
- drop > 50% with **empty code diff** (R5s bisect rule) → sampling noise,
  do not revert (see "Known systemic" below)

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
- Composite 7.5 ceiling (from 7.25)
- Boundary expansion (daily challenge / 5th class / 3rd map) on Leo's
  call; R5u started daily-challenge skeleton, R5v adds healer class

## R5w F2 — `lane_b/warrior` μ 2.8 → 1.8 investigation
Testor reported a fresh drop on the `lane_b/warrior` cell. Bisect between
R5t (`652a598`) and R5v (`8052a5d`) examined every touched code path:
- CLASS_DEFS: `healer` key added only; trailing `,` on assassin entry
- Daily-challenge skeleton: dormant unless `isDailyMode` is true
- Rival pick `_rvRandFn = _dailyRngActive() ? _dailyRand : Math.random`
  — identity-equivalent to `Math.random` in non-daily matches
- Lane-3 solo fallback generalised from `=== 'assassin'` to
  `CLASS_DEFS[selectedClass].soloOnly`; warrior has no flag, branch
  evaluates identically to R5t (`gameMode = 'team'`)
- Healer heal-aura gated on `player.playerClass === 'healer'`
- Slash fx: comment-only change; crescent draw code byte-identical
- Char-select UI: pitch 68→56, card 60→50 — menu only, no combat path
- Palette + sprite map: new `healer` entries only

**No code path reaching warrior lane_b combat was modified.** This is the
R5s bisect rule in action (regression with empty attributable diff =
sampling noise). Per the graduated policy above, cell μ drops without
attributable code do not trigger a revert. Recommend Testor second-run
confirmation; if persistent, root-cause lives in bot AI density / spawn
RNG variance, not the R5v commit.

## Known unsolved (stop trying, per Leo R5v F2)
- `arena_a/warrior` FPS 26.9 cold-zone — 3 rounds (R5l / R5r / R5u)
  attempted targeted fixes, all regressed or neutral:
  - R5l: added lane-3 CD buff — did not touch FPS
  - R5r: assassin muzzle branch — unrelated regression on scout
  - R5u: slash simplification (removed outer glow + cyan halo) — auto-
    reverted after 3 cells dropped > 50%.
  Concluded: hardware/browser ceiling for warrior's 3.7 atk/s rate on
  iPhone 14 viewport, not a code cold-zone. All caps already in place
  (MAX_PARTICLES 300 / MAX_FLOATS 60 / activeFlashes 6 / hitStop non-
  accumulating). Do not attempt another speculative optimisation.
