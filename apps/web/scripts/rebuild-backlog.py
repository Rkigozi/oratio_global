import base64, json, os, sys, urllib.request, urllib.error

URL = "https://oratio.atlassian.net"
EMAIL = "oratiotest36@gmail.com"
TOKEN = os.environ["JIRA_TOKEN"]
B64 = base64.b64encode(f"{EMAIL}:{TOKEN}".encode()).decode()

def call(method, path, payload=None):
    req = urllib.request.Request(
        URL + path,
        data=json.dumps(payload).encode() if payload else None,
        method=method,
        headers={
            "Authorization": f"Basic {B64}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode()[:400]}")
        sys.exit(1)

def h(level, text):
    return {"type": "heading", "attrs": {"level": level}, "content": [{"type": "text", "text": text}]}

def p(text):
    return {"type": "paragraph", "content": [{"type": "text", "text": text}]}

def bullets(items):
    return {"type": "bulletList", "content": [
        {"type": "listItem", "content": [p(item)]} for item in items
    ]}

def doc(*blocks):
    return {"type": "doc", "version": 1, "content": list(blocks)}

# ─── 1. Wipe existing backlog issues (stories then epics) ───────────────
for key in [f"SCRUM-{n}" for n in range(10, 31)]:
    call("DELETE", f"/rest/api/3/issue/{key}?deleteSubtasks=true")
print("deleted stories SCRUM-10..30")
for key in [f"SCRUM-{n}" for n in range(5, 10)]:
    call("DELETE", f"/rest/api/3/issue/{key}?deleteSubtasks=true")
print("deleted epics SCRUM-5..9")

# ─── 2. Versions ────────────────────────────────────────────────────────
project = call("GET", "/rest/api/3/project/SCRUM")
project_id = project["id"]
versions = {}
for name in ["V1 Launch", "Post-Launch", "Backlog"]:
    v = call("POST", "/rest/api/3/version", {"name": name, "projectId": project_id})
    versions[name] = v["id"]
    print(f"version {name} = {v['id']}")

# ─── 3. Epics ───────────────────────────────────────────────────────────
EPICS = [
    ("LAUNCH: Launch Readiness", "V1 Launch",
     "Outcome: By the end of launch week, anyone can reach Oratio on the new domain over HTTPS, "
     "account recovery works from email links, and a blank screen is impossible.",
     ["QA checklist passes 100% on a real phone", "0 auth-link failures after the domain change",
      "0 blank-screen reports"]),
    ("TEST: Testing & Observability Maturity", "V1 Launch",
     "Outcome: Every push proves itself — authenticated E2E runs in CI, coverage is visible as an "
     "artifact, alerts and performance budgets are configured.",
     ["Authenticated journeys execute in CI", "Coverage report downloadable from every push",
      "Sentry alerting and Lighthouse budget in place"]),
    ("HARD: Post-Launch Hardening", "Post-Launch",
     "Outcome: The codebase and schema are as small and honest as the product needs.",
     ["Migration 037 applied", "First-load JS budget recorded", "RLS review signed off",
      "Large files split"]),
    ("COMM: Community & Retention", "Post-Launch",
     "Outcome: Product decisions are backed by usage data and the community feels cared for.",
     ["Written Prayer Circle keep/cut decision", "Launch email sent to waitlist",
      "Crisis resources verified current"]),
    ("OPS: Platform & Operations", "Post-Launch",
     "Outcome: The platform runs unattended, is backed up, and stays within budget.",
     ["Daily production smoke green", "Backup/export verified restorable",
      "Monthly cost review under budget"]),
]

epic_keys = {}
for summary, fixver, outcome, metrics in EPICS:
    r = call("POST", "/rest/api/3/issue", {"fields": {
        "project": {"key": "SCRUM"},
        "issuetype": {"id": "10001"},
        "summary": summary,
        "fixVersions": [{"id": versions[fixver]}],
        "labels": ["backlog"],
        "description": doc(h(3, "Outcome"), p(outcome), h(3, "Success metrics"), bullets(metrics)),
    }})
    epic_keys[summary.split(":")[0]] = r["key"]
    print(f"Epic {r['key']} {summary}")

# ─── 4. Stories ─────────────────────────────────────────────────────────
STORIES = {
    "LAUNCH": [
        ("Move the app to a custom domain", "Highest", ["v1-launch", "platform"], "V1 Launch",
         "As a new visitor, I want to reach Oratio on a trusted domain, so that the site loads reliably on my phone.",
         ["GIVEN the DNS for the new domain WHEN I open the site THEN the landing page loads over HTTPS",
          "GIVEN the app is deployed WHEN I open oratiotest.netlify.app THEN I am redirected to the new domain",
          "GIVEN the PWA is installed WHEN I open the app THEN it opens from the new domain without errors"],
         "e2e remote suite against the new URL",
         "Email/SMS marketing, i18n, native apps"),
        ("Update Supabase auth URLs and email templates for the custom domain", "Highest", ["v1-launch", "platform"], "V1 Launch",
         "As a member, I want password-reset and confirmation links to point at the new domain, so that account recovery keeps working after the domain change.",
         ["GIVEN I request a password reset WHEN I click the email link THEN I land on /update-password on the new domain and can set a password",
          "GIVEN a new signup requires confirmation WHEN the confirmation link is clicked THEN the account activates and signs in"],
         "Manual reset walkthrough + update-password.test.tsx",
         "Social sign-in (disabled for initial release)"),
        ("Never-blank hardening: static loader, noscript message, early JS error card", "Highest", ["v1-launch", "dev-experience"], "V1 Launch",
         "As a visitor on any device, I want to see either the app or a clear error message, so that I never stare at a blank screen.",
         ["GIVEN JavaScript fails to load WHEN I open the site THEN a visible diagnostic card renders instead of a blank page",
          "GIVEN JavaScript is disabled WHEN I open the site THEN a noscript message explains the requirement",
          "GIVEN normal operation WHEN the app boots THEN a static loader shows until the first screen paints"],
         "e2e landing smoke + manual JS-off check",
         "Offline full-app caching (already deferred)"),
        ("Update OG/Twitter meta and e2e remote URLs to the new domain", "High", ["v1-launch", "product"], "V1 Launch",
         "As someone sharing Oratio, I want links to render a branded preview card, so that shared prayers look trustworthy.",
         ["GIVEN a link is shared on X/WhatsApp/LinkedIn WHEN the preview renders THEN title, description, and image come from the new domain",
          "GIVEN the repo WHEN I grep for the old domain THEN no production URL remains outside the redirect rule"],
         "Grep for old domain + remote e2e",
         "Custom OG image design"),
        ("Pre-launch QA pass against the live site", "Highest", ["v1-launch", "product"], "V1 Launch",
         "As the owner, I want every QA checklist item verified on a real phone, so that launch is not a blind deploy.",
         ["GIVEN the live site WHEN I run docs/QA-CHECKLIST.md on a real phone THEN every row passes",
          "GIVEN the installed PWA WHEN updated to the latest deploy THEN it shows the current version"],
         "QA checklist + Playwright suite",
         "Automated visual regression"),
    ],
    "TEST": [
        ("Run authenticated Playwright journeys in CI with test credentials", "High", ["v1-launch", "dev-experience"], "V1 Launch",
         "As a maintainer, I want authenticated journeys in CI, so that regressions in core flows are caught automatically.",
         ["GIVEN E2E_TEST_EMAIL and E2E_TEST_PASSWORD secrets in CI WHEN a build runs THEN app-journeys.spec.ts executes instead of skipping"],
         "e2e/app-journeys.spec.ts",
         "Full mobile-device farm"),
        ("Publish coverage report as CI artifact and add TESTING_OVERVIEW doc", "High", ["v1-launch", "dev-experience"], "V1 Launch",
         "As a maintainer, I want coverage reports from every push, so that I can see what is untested at a glance.",
         ["GIVEN a CI run WHEN it completes THEN the coverage HTML is downloadable as an artifact",
          "GIVEN the repo WHEN I open docs/TESTING_OVERVIEW.md THEN each feature maps to its test files and commands"],
         "vitest coverage + ci.yml artifact",
         "Coverage gate enforcement"),
        ("Sentry alert rules for release health", "Medium", ["post-launch", "platform"], "Post-Launch",
         "As the owner, I want to be alerted about new errors, so that production issues do not go unnoticed.",
         ["GIVEN a new Sentry issue or an error-rate spike WHEN it occurs THEN I receive an email within minutes"],
         "Sentry dashboard configuration",
         "On-call rotation (no team yet)"),
        ("Lighthouse baseline for landing and map route with a tracked budget", "Medium", ["post-launch", "platform"], "Post-Launch",
         "As a maintainer, I want a performance baseline, so that performance does not regress silently.",
         ["GIVEN a scheduled or CI run WHEN Lighthouse executes THEN scores are recorded and compared to the budget"],
         "Lighthouse script + scheduled run",
         "CrUX field-data monitoring"),
    ],
    "HARD": [
        ("Drop unused tables (follows, push_subscriptions) via migration 037", "Medium", ["post-launch", "dev-experience"], "Post-Launch",
         "As a maintainer, I want unused tables removed, so that the schema stays honest.",
         ["GIVEN migration 037 applied WHEN the app runs THEN all tests pass and the waitlist form still works"],
         "Full suite + build",
         "Dropping waitlist (it backs the landing form)"),
        ("Bundle analysis: shrink or re-strategise the HEIC converter chunk", "Medium", ["post-launch", "dev-experience"], "Post-Launch",
         "As a mobile visitor, I want a smaller first load, so that the app opens faster on 4G.",
         ["GIVEN a bundle analysis WHEN the HEIC chunk is reviewed THEN a documented strategy exists to shrink or defer it"],
         "Bundle visualiser + size audit",
         "Removing iPhone photo support"),
        ("RLS security review of every Supabase table and policy", "Medium", ["post-launch", "platform"], "Post-Launch",
         "As the owner, I want every table's RLS reviewed, so that no data leaks through a missed policy.",
         ["GIVEN a review of every table and policy WHEN gaps are found THEN tightening migrations are applied"],
         "Manual review against supabase/migrations/",
         "Third-party penetration test"),
        ("Split remaining large files (feed render layer, prayer-detail)", "Low", ["post-launch", "dev-experience"], "Post-Launch",
         "As a maintainer, I want the big files split, so that future changes stay safe and fast.",
         ["GIVEN the split refactor WHEN the suite runs THEN all tests pass with behavior unchanged",
          "GIVEN the files WHEN measured THEN each is below ~500 lines"],
         "Existing suite stays green throughout",
         "Moving to a monorepo"),
    ],
    "COMM": [
        ("Prayer Circle usage review: keep, feature-flag, or cut based on PostHog data", "Medium", ["post-launch", "product"], "Post-Launch",
         "As the owner, I want a data-backed decision on Prayer Circle, so that we invest in what users actually use.",
         ["GIVEN PostHog usage data WHEN reviewed THEN a written keep/feature-flag/cut decision is recorded"],
         "PostHog dashboards",
         "New social features before the review"),
        ("Waitlist -> beta engagement email at launch", "Medium", ["post-launch", "product"], "Post-Launch",
         "As a beta subscriber, I want a launch email, so that I know the product I joined is live.",
         ["GIVEN launch WHEN the email is sent THEN waitlist signups receive it exactly once"],
         "Manual send review",
         "Email drip campaign"),
        ("Social share polish: OG image pass and share-sheet copy", "Low", ["post-launch", "product"], "Post-Launch",
         "As someone sharing Oratio, I want a branded preview, so that invitations look polished.",
         ["GIVEN a shared link WHEN previewed on X/WhatsApp/LinkedIn THEN a branded card renders"],
         "Manual platform previews",
         "Dynamic per-prayer OG images"),
        ("Crisis resources content review", "High", ["post-launch", "product"], "Post-Launch",
         "As a user in crisis, I want current, appropriate resources, so that I can find help quickly.",
         ["GIVEN the resources list WHEN reviewed THEN all links are current and appropriate for a prayer app"],
         "crisis-resources.test.tsx + manual",
         "In-app counselling features"),
    ],
    "OPS": [
        ("Scheduled daily production smoke check (cron GitHub Action -> remote e2e)", "High", ["post-launch", "platform"], "Post-Launch",
         "As the owner, I want a daily production check, so that outages are noticed before users complain.",
         ["GIVEN a scheduled daily run WHEN the remote e2e executes THEN pass/fail is reported and failures notify"],
         "e2e remote suite via cron",
         "Synthetic monitoring service"),
        ("Supabase backup/export strategy", "High", ["post-launch", "platform"], "Post-Launch",
         "As the owner, I want a Supabase export strategy, so that data is never at risk.",
         ["GIVEN a periodic export WHEN run THEN the export is documented and verified restorable"],
         "Manual verification of a restored export",
         "Cross-region replication"),
        ("Cost review across Supabase, Netlify, PostHog, Sentry", "Medium", ["post-launch", "platform"], "Post-Launch",
         "As the owner, I want a monthly cost check, so that the platform stays within budget.",
         ["GIVEN each month WHEN the review runs THEN costs are under the agreed budget"],
         "Provider dashboards",
         "FinOps tooling"),
        ("Living backlog workflow: jira-cli and docs/backlog kept in sync", "Low", ["post-launch", "dev-experience"], "Post-Launch",
         "As a maintainer, I want the repo backlog and JIRA in sync, so that there is one source of truth.",
         ["GIVEN work changes WHEN captured THEN it lands in both docs/backlog and JIRA"],
         "docs/backlog/README.md workflow",
         "Automated two-way sync"),
    ],
}

for epic, stories in STORIES.items():
    for summary, priority, labels, fixver, story, acs, tests, out in stories:
        r = call("POST", "/rest/api/3/issue", {"fields": {
            "project": {"key": "SCRUM"},
            "issuetype": {"id": "10004"},
            "parent": {"key": epic_keys[epic]},
            "priority": {"name": priority},
            "labels": labels,
            "fixVersions": [{"id": versions[fixver]}],
            "summary": summary,
            "description": doc(
                h(3, "User Story"), p(story),
                h(3, "Acceptance Criteria"), bullets(acs),
                h(3, "Tests"), p(tests),
                h(3, "Out of scope"), p(out),
            ),
        }})
        print(f"  Story {r['key']} [{priority}] {summary}")

# ─── 5. Subtasks for the most complex stories ───────────────────────────
SUBTASKS = {
    "Move the app to a custom domain": [
        "Configure Netlify DNS and HTTPS for the new domain",
        "Add redirect from oratiotest.netlify.app to the new domain",
        "Verify PWA install and update flow from the new domain",
    ],
    "Update Supabase auth URLs and email templates for the custom domain": [
        "Update Site URL and Redirect URLs in the Supabase dashboard",
        "Verify password reset and email confirmation end-to-end",
    ],
}
story_keys = {}
for epic, stories in STORIES.items():
    for summary, *_ in stories:
        story_keys[summary] = None  # placeholder; we re-query below

# Re-query created story keys by summary
q = call("GET", "/rest/api/3/search?jql=project=SCRUM+AND+issuetype=Story+ORDER+BY+created+DESC&maxResults=50")
for issue in q["issues"]:
    story_keys[issue["fields"]["summary"]] = issue["key"]

for story, tasks in SUBTASKS.items():
    parent = story_keys[story]
    for task in tasks:
        r = call("POST", "/rest/api/3/issue", {"fields": {
            "project": {"key": "SCRUM"},
            "issuetype": {"id": "10002"},
            "parent": {"key": parent},
            "summary": task,
        }})
        print(f"    Subtask {r['key']} under {parent}: {task}")

print("DONE")
