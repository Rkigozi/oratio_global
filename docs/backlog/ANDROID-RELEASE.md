# ANDROID: Android Release

Status: Future / post-launch
Jira epic: `SCRUM-79`
Priority: Medium
Labels: `android`, `native`, `platform`, `post-launch`

## Outcome

Release Oratio on Google Play after the Apple App Store launch without turning
Android into an implicit dependency of the iOS V1. Shared Expo and Supabase
architecture remains cross-platform, while Android device behaviour, signing,
testing, and store compliance receive their own release gate.

## Release Decision

- Public iOS and Apple App Store submission come first.
- All Android stories stay in the future sprint until the Apple launch is
  stable.
- Cross-platform fixes should preserve iOS behaviour and remain in shared code
  where the ownership boundary is genuinely shared.
- Android is not "done" merely because the Expo project compiles; a signed Play
  build, representative device QA, closed testing, and store review preparation
  are required.

## Stories

| Key      | Story                                                    |
| -------- | -------------------------------------------------------- |
| SCRUM-90 | Validate Android compatibility and device behaviour      |
| SCRUM-91 | Configure signed EAS Android builds and release pipeline |
| SCRUM-92 | Set up Google Play Console and closed testing            |
| SCRUM-93 | Prepare Play Store assets, data safety, and submission   |

## Android Release Gate

- Core authentication, prayer, map, Circle, profile, and settings journeys pass
  on representative Android hardware and an emulator.
- Android back, keyboard, safe-area, touch, map-provider, and location-permission
  behaviour is verified without regressing iOS.
- A signed EAS Android App Bundle installs and upgrades through a Google Play
  closed-test track.
- Store listing, privacy/data-safety declarations, support links, reviewer notes,
  and account-deletion information match the production app.
- A final Android go/no-go checklist is completed against the release candidate.

## Out of Scope for Apple V1

- Public Google Play submission
- Android-specific visual redesign
- Android store optimization experiments or additional localization
