# Focus Group Testing Guide

## Purpose
Validate whether a digital global prayer visualization enhances your church's existing prayer practice (not to test UI polish or secondary features).

**Core question:** Does this app's execution make your existing prayer practice more meaningful, connected, or impactful?

## Pre-session Checklist
- [ ] Deploy prototype to a public URL (e.g., Vercel, Netlify)
- [ ] Test all critical flows on the deployed version
- [ ] Prepare devices (tablets/phones) for participants or share URL for personal devices
- [ ] Ensure stable internet connection
- [ ] Have note‑taker ready to capture observations & quotes

## Session Structure (45–60 minutes)

### 1. Introduction (5 min)
- Explain the goal: “We’re testing whether a digital tool can help us feel more connected when we pray for global issues.”
- Assure participants: “We’re testing the concept, not you. There are no right or wrong answers.”
- Briefly describe the app: “You’ll see a map of prayer requests, can submit your own, and can mark prayers you’ve prayed for.”

### 2. Unmoderated Exploration (10 min)
- Give participants the URL and ask them to:
  - Look at the map and feed.
  - Submit a prayer request (any topic they care about).
  - “Pray for” a few requests (tap the heart).
  - Check their profile to see their activity.
- **Observe:** How intuitively do they navigate? Where do they hesitate?

### 3. Directed Tasks (15 min)
Ask participants to complete these actions one by one (moderator demonstrates if needed):

1. **Find a prayer from a specific region** (e.g., “Can you locate a prayer from Africa?”)
2. **Submit a prayer request** for a current event or personal concern.
3. **Toggle between “Submitted Prayers” and “Prayed For”** in the profile tab.
4. **Delete a prayer they submitted.**
5. **“Un‑pray”** (tap the heart again) for a request they previously prayed for.

**Watch for:**
- Confusion with the pray/un‑pray interaction.
- Understanding of the profile toggle.
- Any friction in the deletion flow.

### 4. Group Discussion (20 min)
Use these questions to spark conversation:

#### Concept Validation
- “Before using the app, how did you normally pray for global issues?”
- “After using it, did you feel more connected to the people/causes you prayed for? Why or why not?”
- “Did seeing prayers on a map change how you think about those requests?”

#### Usability & Clarity
- “What was the most confusing part of the app?”
- “Did you notice the splash screen? Did it set the right tone?”
- “How did you feel about the ‘delete’ and ‘un‑pray’ actions? Were they clear?”

#### Impact & Integration
- “Could you see yourself using this during your personal prayer time?”
- “Would this be helpful for small‑group prayer meetings? How?”
- “What’s one thing you’d change to make it more meaningful for our church?”

### 5. Closing & Next Steps (5 min)
- Thank participants.
- Explain how their feedback will shape the next iteration.
- Invite them to share any additional thoughts later.

## What to Capture
- **Quantitative:** Time to complete tasks, success/failure rates.
- **Qualitative:** Quotes about connection, confusion, suggestions.
- **Behavioral:** Which features they used spontaneously, where they needed help.

## Post‑session Analysis
1. Group feedback into themes:
   - Concept validation (did it enhance prayer?)
   - Usability issues (what blocked them?)
   - Emotional response (did it feel meaningful?)
2. Prioritize fixes for the next iteration.
3. Decide whether to continue developing this direction or pivot.

## Deployment Instructions

### Option 1: Vercel (Recommended - Free & Multi‑User)
1. **Install Vercel CLI** (if not installed):  
   ```bash
   npm install -g vercel
   ```
2. **Log in to Vercel** (one‑time):  
   ```bash
   vercel login
   ```
3. **Deploy from the project root**:  
   ```bash
   vercel --prod --yes
   ```
4. **Share the generated URL** (e.g., `https://oratio-*.vercel.app`) with your focus group.

**Why Vercel?**
- Free tier supports unlimited static hosting
- Each user gets independent localStorage (no data mixing)
- Automatic GitHub integration for future updates
- No backend required for prototype testing

### Option 2: Netlify (Alternative Free Hosting)
1. Push the `focus-group-simplification` branch to GitHub.
2. Visit [netlify.com](https://netlify.com), sign up with GitHub.
3. Select your repository and deploy.
4. Share the Netlify‑generated URL.

### Option 3: GitHub Pages (Static)
Requires adding the `gh-pages` package and modifying `vite.config.ts`.  
See [Vite GitHub Pages guide](https://vitejs.dev/guide/static-deploy.html#github-pages).

## Prototype URL & Notes
- **Deployed URL:** [TODO: add after deployment]
- **Branch:** `focus-group-simplification`
- **Key enhancements tested:**
  - Splash screen (appears every launch)
  - Profile tab toggle (Submitted vs. Prayed For)
  - Delete submitted prayers
  - Gentle pray/un‑pray toggle (heart button)

## Contact & Support
For technical issues during testing, contact: [TODO: add contact]