# Documentation Standard

Audience: engineers, QA contributors and release maintainers working on Oratio.
Applies to the repository README, design documents, guides and operational records.

## Voice And Structure

- Write for a contributor who has not read previous discussions. State purpose,
  scope, prerequisites and relevant source references without conversational context.
- Use present tense for implemented behaviour, future or conditional language for
  planned work, and dated past tense for verification and deployment records.
- Use concise, direct instructions in procedures. Prefer descriptive headings such
  as Development Acceptance and Distribution Prerequisites over Now and Later.
- Record technical prerequisites and their status. For example, state that active
  Apple Developer Program membership is required for distribution. Exclude
  personal circumstances that do not affect the technical procedure.
- Keep plans, contracts and evidence separate. The [documentation index](../README.md)
  identifies the authoritative document for each concern; link instead of copying timelines.

## Roles And Terminology

Use **maintainer** for repository/change authority, **release approval** for
distribution decisions, and **product approval** for scope decisions. These are
responsibilities. Record accountable people in the issue, release or access-controlled
operational record; identify unassigned responsibilities explicitly.

Use **user**, **author**, **owner** and **moderator** where they describe product
actors or access rules. A prayer owner is not the same concept as a release approver.
QA account aliases identify test fixtures, not staff roles or production operators.

## Evidence And Status

- Distinguish automated results, provider observations, reported manual checks,
  deployed changes and signed-build acceptance. Preserve dates, revision/build IDs,
  tested conditions, limitations and open defects.
- Label a maintainer's manual report as **maintainer-reported**. It is not an
  independently reproduced QA result. Editorial revisions do not upgrade evidence.
- Preserve acceptance targets and checklist states during wording changes.
  Requirements, risk acceptance and release gates change only through explicit review.
- Qualify status by date and environment. A historical passing run does not prove
  the current candidate passed, and a reviewed change is not necessarily deployed.
- Keep credentials, personal correspondence and real private prayer/report content
  out of documentation. Temporary local artifacts are not durable release evidence.

## Review Checklist

- [ ] A new contributor can understand the scope without prior conversations
- [ ] Commands, paths, relative links and heading anchors are correct
- [ ] Current behaviour, planned work and historical evidence are distinguishable
- [ ] Terminology matches the requirements and domain design
- [ ] Evidence provenance and outstanding acceptance remain explicit
- [ ] No unreviewed scope, access, deployment or acceptance change is implied
