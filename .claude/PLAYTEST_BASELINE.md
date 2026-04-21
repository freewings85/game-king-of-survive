# Playtest Baseline — R5v (2026-04-21, updated R5w, R5af 2-run gate)

Locked as the reference point per Leo R5u F2 / R5w F1. Any commit that drops
these metrics should be evaluated against the thresholds below. R5af (2026-
04-21) promoted the "2-run 44-game" protocol to the official sign-off gate
(see "R5af — 2-run sign-off gate" section below).

## Reference commit
`8052a5d` — fix(r5v): auto-revert warrior slash + healer skeleton
`94290b3` — R5ad F1 healer稳态 (2-run 44-game verified composite ≈ 7.0)

## Score
- Composite: **7.0 / 10** (stable band, confirmed R5af 2-run = 7.25 / 7.0)
- R5t (652a598) peaked at 7.25; R5v stabilised at 7.0 after auto-revert
- R5ae discovered R5ad single-run "6.5" was noise — true stable band is
  ~7.0, not 7+ as previously assumed. Do not chase "7+ every round" target.

## Kill metrics (22-game matrix from R5w, 4 arena scout + 4 arena warrior + 2 arena assassin + 2 arena healer + 5 lane scout + 5 lane warrior)
- Coverage: ≥ **95%** have-kill target per R5w F1 (strict 100% was noise-sensitive)
- `arena_a / warrior` μ kills: 5.0
- `arena_a / mage`    μ kills: 3.0
- `arena_a / scout`   μ kills: 2.25
- `arena_a / assassin` μ kills: 2.0
- `lane_b / warrior`  μ kills: **2.2** band [1.8–2.6] (R5x F1: original 2.8
  was high-sampling, local reproduce shows 1.8 R5t / 2.6 HEAD)
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
- drop > 50% with **empty code diff** → DO NOT auto-dismiss as noise;
  escalate via the R5x bisect workflow below. R5w lesson: `lane_b/warrior`
  fell 3 rounds straight (2.8 → 2.2 → 1.8). The R5v "sampling noise"
  verdict was wrong — it masked a real trend. Empty-diff-at-latest-commit
  still requires bisect-back to locate the regression origin.

## Hard-fail handling when the triggering commit has no code change
(R5x F3 policy)

When a Testor matrix fires hard-fail (<90% coverage) or a cell μ drops
> 50% but the latest commit is docs/config-only:

1. **Do not revert the docs commit.** Reverting has no gameplay effect.
2. **Bisect backwards on code commits.** List the last N≥3 survivor.html
   commits: `git log -n <N> --oneline -- demo/survivor.html`.
3. **Playwright checkout-reproduce.** For each candidate commit:
   `git checkout <sha> -- demo/survivor.html && node _qa_r5x_reproduce.mjs
   <label>` (5 lane_b/warrior games is a quick probe). Restore with
   `git checkout HEAD -- demo/survivor.html` between runs.
4. **Bisect the reproduction.** Find the latest commit where μ is still
   within reference ±10% and the first commit where it drops > 30%.
   That commit is the regression origin.
5. **Decision.** If the origin is identifiable and the behaviour change
   was unintended → revert or fix that commit. If it's intended
   (e.g., difficulty-tuning by design) → update the baseline reference
   to the new post-change μ.
6. **Record finding.** Append the bisect result (from/to commit + μ
   deltas) to this baseline under a dedicated section, not inline in
   commit messages, so future rounds can audit the trend.

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

## R5x F1 — `lane_b/warrior` checkout-reproduce (supersedes R5w F2)
R5w F2 concluded "empty-diff sampling noise" without proof. Per Leo R5x
direction, reproduced via `git checkout <sha> -- demo/survivor.html` +
`_qa_r5x_reproduce.mjs` (5 lane_b/warrior games, WSL Chromium iPhone 14
viewport headless):

| commit  | μ kills | σ    | have-kill | games dur |
|---------|---------|------|-----------|-----------|
| 652a598 (R5t) | **1.80** | 0.40 | 5/5 | 34.6–37.7s |
| HEAD 8052a5d (R5v) | **2.60** | 0.49 | 5/5 | 36.6–40.9s |

**Verdict.** R5t reproduces at μ=1.80, not Testor's headline 2.8. HEAD
reproduces ~44% HIGHER than R5t on the same harness. The trend Testor
sees on real device (2.8 → 2.2 → 1.8) is Leo's second hypothesis
confirmed: the original R5t 2.8 was a high-sampling red flag, not a
stable metric. This cell has high intrinsic variance (σ 0.40–0.50 on
5-game, wider on small-N matrix samples).

**Corrections to take forward:**
1. Reference μ for `lane_b/warrior` is NOT 2.8. Widen to a band,
   μ ∈ [1.8, 2.6] headless / expect similar real-device spread. Set
   R5x headline to 2.2 (midpoint) until a larger-N run confirms.
2. The "R5s bisect rule = auto-noise" shortcut is retired. Use the
   R5x checkout-reproduce workflow (Hard-fail handling section above)
   whenever a cell drops > 50% — even with an empty git diff.
3. HEAD warrior path is NOT regressed versus R5t on local harness;
   headless env differs from real device but the direction agrees.

## R5w F2 — `lane_b/warrior` μ 2.8 → 1.8 investigation (INVALID — superseded by R5x F1)
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

## R5af — 2-run sign-off gate (official since 2026-04-21)

R5ae Run1 = 7.25 / Run2 = 7.0 / R5ad original = 6.5. Three identical commits,
three different composite scores. The 22-game matrix has intrinsic variance
wide enough that a single run can cross auto-revert thresholds on pure noise.
R5af therefore promotes the following protocol to the sign-off gate:

### Protocol
1. Testor runs **2 independent 22-game matrices** (total 44 games) per sign-off.
2. Each run is scored independently and reported as a pair (Run1, Run2).
3. Decision matrix on any single-cell trigger (e.g. cell μ -50%, FPS < 40%,
   coverage < 90%):

   | Run 1    | Run 2    | Verdict                                    |
   |----------|----------|--------------------------------------------|
   | pass     | pass     | Sign off. Commit is stable.                |
   | pass     | hard-fail| Noise — no revert. Log in baseline trend.  |
   | hard-fail| pass     | Noise — no revert. Log in baseline trend.  |
   | hard-fail| hard-fail| Real regression — auto-revert per policy.  |

4. Composite score reported as `avg(Run1, Run2)`; stable band is 6.5–7.25
   per R5ae evidence. Target is the 2-run average ≥ 7.0, not a single run.

### Rationale (R5ae evidence)
- 22-game cells produce ~0.5 σ on kills μ and ~5 pp on FPS rate.
- The "R5ad 6.5" finding lasted 1 round, then R5ae's Run2 produced 7.0
  on the identical commit. This is the same failure mode as R5s (empty-
  diff drop misread as regression) but at matrix-level — 1-run signal is
  not strong enough for revert/refactor decisions.
- Trade-off accepted: sign-off takes 2× Testor time (~90 min), but each
  green-light is 44-game stable, removing false regressions that burn
  Developer cycles on unnecessary reverts (R5s, R5ad).

### When 1-run auto-revert still applies
Catastrophic single-run failure (coverage < 70%, any cell μ = 0 across 3+
cells, crash / pageerror) remains 1-run actionable — the signal is large
enough that Run2 confirmation is not required.

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
