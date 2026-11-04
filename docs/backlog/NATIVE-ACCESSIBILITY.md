# Native Accessibility

Owner: [SCRUM-96](https://oratio.atlassian.net/browse/SCRUM-96), **In Progress**.
Acceptance targets and release gate remain in
[NFR-04](../NFR-CHECKLIST.md#acceptance-register). This record owns scoped
implementation and dated development evidence, not release sign-off.

## Implemented Follow-Up (2026-11-04)

- Settings retains loaded preferences after a failed read and offers read retry.
  The retry target has a minimum 44 pt height and read/save failures have alert
  semantics. The related fault checks are recorded in
  [native resilience](./NATIVE-RESILIENCE.md#device-acceptance).
- Appearance choices stack vertically above font scale 1.5 and retain their
  accessible names and selected state. Every choice has a minimum 44 pt height.
- Readable secondary text and placeholders use stronger light/dark colour
  pairings. Primary button labels retain contrast during pressed states. The
  Pray button uses the same stronger fill as other primary actions.
- The ORATIO wordmark retains its designed size as a logotype; functional
  headings, Beta status, captions and body text continue to scale. Contextual
  headings wrap rather than shrinking/truncating, and expose a heading role.
- Prayer actions, editing and reporting sheets scroll their headers and content
  within a bounded height. Prayer-sheet heading copy reserves space for Close.
  Edit validation has an alert role; Save changes retains its accessible name
  and exposes busy/disabled state while saving.

## Measured Source-Colour Checks

The tests use sRGB relative luminance and the
[W3C text contrast method](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
Ratios below are rounded for display; assertions use unrounded values. These
examples describe defined foreground/background colours, not measured native
pixels, all opacity states or a complete contrast audit.

| Defined pairing                         | Before | After |
| --------------------------------------- | -----: | ----: |
| Light `textDim` / page background       |  2.905 | 5.485 |
| Light `textFaint` / page background     |  2.123 | 5.323 |
| Dark `textDim` / page background        |  2.350 | 5.672 |
| Dark `textFaint` / page background      |  1.801 | 5.672 |
| Dark white primary label / primary fill |  4.488 | 5.119 |
| Dark Pray label / its fill              |  2.905 | 5.119 |

Six palette regression cases cover both themes: normal-size text roles on five
core surfaces and composited accent tints, white primary labels, and white labels
in the pressed primary state. This does not close non-text contrast, map imagery,
every control state or the full target-size matrix.

## Device Checkpoint (2026-11-04)

Environment: **agent-operated** physical iPhone through iPhone Mirroring,
Expo Go, iOS `26.6.1`; working tree based on `b544e4a` plus these fixes, now
committed as source checkpoint `0ea824f` (including Settings commit `49550ba`). The
largest accessibility text setting was selected in iPhone Settings and the app
reported font scale **3.571**. Exact iPhone model was not captured.

Observed before the fixes:

- The Public wordmark wrapped mid-word and consumed much of the header.
- Prayer-actions heading copy pushed the Close control partly off-screen.
- Settings appearance labels crowded/overlapped within the horizontal control.

Observed after the relevant fixes and Expo reloads:

- The Public wordmark stayed intact while functional/body text enlarged.
- Profile and Settings remained reachable using the bottom navigation/header.
- System, Light and Dark appeared as separate readable rows at scale 3.571.
  The Settings layout was inspected in dark and light appearance.
- System appearance was restored through the app; a separate read-only backend
  query confirmed the QA account's original System preference.

The final prayer-sheet Close/scroll changes need a matching maximum-text
reinspection. Normal-text dark editor open/cancel was observed earlier in the
[read-recovery follow-up](./NATIVE-RESILIENCE.md#device-acceptance), not counted as
maximum-text or software-keyboard acceptance. Spoken VoiceOver labels, actual
focus order/return focus and error announcements require the separate manual
walkthrough below. At the end, the maintainer reported restoring the original
phone text size: Larger Accessibility Sizes off and the fourth of seven slider
positions. That restoration is maintainer-reported; the System theme was
independently verified as described above.

### VoiceOver Navigation Check (2026-11-04)

The maintainer reported that VoiceOver announced the bottom-tab/control names
clearly and completed **Me → Settings → Back** using selection and activation
gestures. On another user's Public prayer, the maintainer then reported reaching
and understanding the reporting reasons, additional-details input and Close
control, and returning to the prayer without submitting a report.

These are scoped Expo Go navigation/report-control checks on the same source
checkpoint, not independently captured audio or whole-journey accessibility
acceptance. The exact focus-return target, systematic modal confinement and error
announcements were not separately established.

## Automated Verification

Local final run on 2026-11-04: **401 native tests / 37 suites**, mobile type-check,
changed-file formatting and whitespace checks passed. New coverage includes
contrast pairings, screen-reader heading discovery, pending-save accessible name
and lock, Settings retry and large-text appearance selection. Screen-render
tests do not measure native layout or spoken VoiceOver output. Settings/theme
regressions were also rerun after review tightened their retry/contrast assertions.

## Remaining Acceptance

- Reinspect the final sheets with maximum text, software keyboard and validation/
  uncertain-write messages, in both themes; verify every action remains reachable.
- Use VoiceOver to complete navigation, reading/composition, Circle, reporting/
  blocking and profile/settings; verify modal entry, focus confinement, return
  focus and error announcements. Reuse the
  [Apple gesture guide](https://support.apple.com/en-gb/guide/iphone/iph3e2e2281/27/ios/27).
- Measure remaining text/non-text contrast and the full 44 by 44 pt target matrix;
  check Reduce Motion and authentication/permission journeys.
- Record the signed-build/device matrix and complete NFR-04 before public launch.
  Expo Go preflight evidence does not close the signed-build gate.
