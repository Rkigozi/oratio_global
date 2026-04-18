# Oratio Bug Report Template

## Purpose
This template helps you report bugs clearly so our team can understand, reproduce, and fix them quickly.

**Before submitting:** Please try to include as much information as possible. Even partial information is better than none!

---

## 1. Basic Information

### Contact (Optional)
- **Name:** [Your name]
- **Email:** [Your email - only if you want updates]
- **User ID:** [If you're comfortable sharing - helps us track your specific issue]

### Report Type
- [ ] **Critical Bug** - App crashes, data loss, security issue, can't use core feature
- [ ] **Major Bug** - Feature broken but workaround exists
- [ ] **Minor Bug** - Cosmetic issue, small annoyance
- [ ] **Suggestion** - Not a bug, but an improvement idea

### Urgency
- [ ] **Blocking** - I can't use Oratio until this is fixed
- [ ] **High** - Severely impacts my experience
- [ ] **Medium** - Annoying but I can work around it
- [ ] **Low** - Nice to fix when possible

---

## 2. What Happened?

### Short Description
In one sentence, what went wrong?

**Example:** "The 'I Prayed' button doesn't work on prayer cards."

### Detailed Description
Describe what happened in your own words:

**Example:** "I was browsing the prayer feed and found a prayer I wanted to support. I tapped the 'I Prayed' button, but nothing happened. The button didn't change color, the count didn't go up, and I didn't get any error message."

---

## 3. Steps to Reproduce
Help us recreate the bug by listing exact steps:

1. [First step - be specific]
2. [Second step]
3. [Third step]
4. [What should have happened]
5. [What actually happened]

**Example:**
1. Open Oratio app
2. Scroll to third prayer in feed
3. Tap "I Prayed" button
4. **Expected:** Button changes color, prayer count increases by 1
5. **Actual:** Nothing happens, button stays same

---

## 4. Environment Details

### Device & Browser
- **Device:** [e.g., iPhone 13, Samsung Galaxy S22, MacBook Pro]
- **Operating System:** [e.g., iOS 16.5, Android 13, macOS Ventura]
- **Browser/App:** [e.g., Safari, Chrome 118, Oratio PWA]
- **Browser Version:** [If known]

### Oratio Details
- **URL:** [e.g., https://oratio.app, http://localhost:5174]
- **Version:** [If you know - check bottom of page or app settings]
- **Internet Connection:** [e.g., WiFi, 5G, 4G, offline]

---

## 5. Visual Evidence

### Screenshots/Photos
Attach screenshots showing the problem:

**What to capture:**
- The screen where the bug occurs
- Error messages (if any)
- Anything unusual you see

**How to take good screenshots:**
1. Show the whole screen
2. Circle or highlight the problem area
3. Include any error text
4. Show before/after if relevant

### Screen Recording (Optional)
If the bug involves interaction, a short screen recording can be very helpful. Keep it under 30 seconds if possible.

---

## 6. Frequency & Pattern

### How Often Does This Happen?
- [ ] **Always** - Every time I try
- [ ] **Often** - More than 50% of the time
- [ ] **Sometimes** - Less than 50% of the time
- [ ] **Once** - Only happened this one time

### Pattern Noticed
Does the bug happen:
- [ ] On specific prayers or users?
- [ ] At certain times of day?
- [ ] After doing certain actions first?
- [ ] Only with specific data?
- [ ] No pattern noticed

**Example:** "Seems to happen only on prayers with very long messages."

---

## 7. Error Messages

### Exact Error Text
Copy and paste any error messages you see (exactly as shown):

**Example:** "Error: Network request failed. Status: 500"

### Console Errors (For Technical Users)
If you're comfortable with browser developer tools:

1. Open Developer Tools (F12 or Right-click → Inspect)
2. Go to Console tab
3. Copy any red error messages you see
4. Paste here:

```
[Paste console errors here]
```

---

## 8. What You Tried

### Troubleshooting Attempted
- [ ] Refreshed the page/app
- [ ] Logged out and back in
- [ ] Tried a different browser/device
- [ ] Cleared cache/cookies
- [ ] Checked internet connection
- [ ] Waited and tried again later
- [ ] Other: [Describe]

### Workarounds Found
Is there any way to avoid or work around the problem?

**Example:** "If I refresh the page first, then the button works."

---

## 9. Impact & Severity

### Who Is Affected?
- [ ] Just me (as far as I know)
- [ ] My friends/family also see this
- [ ] Probably affects many users
- [ ] Don't know

### Business Impact
How does this affect Oratio's mission?

- [ ] **High** - Prevents prayer submission or "I Prayed" interactions
- [ ] **Medium** - Makes certain features difficult to use
- [ ] **Low** - Cosmetic issue only
- [ ] **Security** - Potential privacy or security concern

### User Impact
How does this affect you personally?

- [ ] **Frustrating** - I'm considering stopping using Oratio
- [ ] **Annoying** - Makes my experience worse
- [ ] **Minor** - Noticeable but not a big deal
- [ ] **Just reporting** - Not really affecting me

---

## 10. Additional Context

### Related Features
Does this bug affect or relate to other features?

**Example:** "Also affects the prayer count display on the map."

### Recent Changes
Did anything change before you noticed the bug?

- [ ] Updated Oratio app
- [ ] Changed device/browser
- [ ] Changed internet connection
- [ ] Started using a new feature
- [ ] Nothing changed that I noticed

### Privacy Considerations
Does this bug expose any personal information?

- [ ] No personal information exposed
- [ ] Might expose my location
- [ ] Might expose my prayers
- [ ] Might expose my profile information
- [ ] Not sure

---

## 11. For Non‑Technical Users

### Don't Worry If...
- ❌ You don't know technical terms
- ❌ You can't provide console errors
- ❌ You're not sure about exact steps
- ❌ You only have a vague description

### What's Most Helpful
- ✅ Clear description in your own words
- ✅ Steps you took (even if not exact)
- ✅ Screenshots showing the problem
- ✅ What you expected to happen
- ✅ How often it happens

### Example of a Good Bug Report (Simple)

**What happened:** "The submit button doesn't work."
**Steps:** "1. I typed a prayer. 2. I tapped submit. 3. Nothing happened."
**Expected:** "The prayer should appear in the feed."
**Device:** "iPhone 14, Safari"
**Screenshot:** [Attached]

---

## 12. Submission & Follow-up

### How We'll Use This Report
1. **Triage:** We'll assess severity and assign priority
2. **Investigation:** Developers will try to reproduce the bug
3. **Fix:** If confirmed, we'll work on a fix
4. **Update:** We may contact you for more information
5. **Resolution:** Fix will be included in a future update

### Communication Preferences
- [ ] **Email me** with updates about this bug
- [ ] **Don't email me** - I'll check status online
- [ ] **Contact me for** more information if needed

### Where to Check Status
- **Public bugs:** GitHub Issues (https://github.com/Rkigozi/oratio_global/issues)
- **General updates:** Oratio changelog (in app or website)
- **Contact:** [Oratio support email if available]

---

## 13. Template Notes

### For Oratio Team Members
When receiving bug reports:

1. **Acknowledge** receipt within 24 hours
2. **Triage** using severity matrix below
3. **Label** with appropriate tags
4. **Assign** to relevant team member
5. **Update** reporter on progress

### Severity Matrix
| Impact | Critical | Major | Minor | Cosmetic |
|--------|----------|-------|-------|----------|
| **Many Users** | P0 | P1 | P2 | P3 |
| **Some Users** | P1 | P2 | P3 | P4 |
| **One User** | P2 | P3 | P4 | P5 |

**P0:** Fix immediately (security, data loss, complete outage)  
**P1:** Fix in next release (core feature broken)  
**P2:** Fix soon (important feature impaired)  
**P3:** Fix when possible (minor issue)  
**P4:** Consider for future (cosmetic)  
**P5:** Won't fix (by design, not a bug)

---

## Thank You!
Thank you for taking the time to report this issue. Your feedback helps make Oratio better for everyone.

*Template Version: 1.0*  
*Based on Oratio user feedback process*