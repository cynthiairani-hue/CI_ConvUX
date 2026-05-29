import type { StoredChatSession } from "@/lib/storage";

/**
 * Seed chat sessions for the returning-user demo.
 * Each session has realistic messages so clicking into one shows a real conversation.
 * Sessions are grouped by category (like Claude Code projects).
 */

const NOW = Date.now();
const HOUR = 3_600_000;
const DAY = 86_400_000;

function ts(offset: number): string {
  return new Date(NOW - offset).toISOString();
}

export const SEED_CHAT_SESSIONS: StoredChatSession[] = [
  // ── Campaigns ──
  {
    id: "seed-camp-1",
    name: "CTV awareness campaign for Summer 25",
    status: "active",
    group: "campaigns",
    createdAt: ts(2 * DAY),
    lastMessageAt: ts(4 * HOUR),
    messageCount: 22,
    messages: [
      { role: "user", content: "I want to run a CTV campaign for the Summer 25 collection launch" },
      { role: "assistant", content: "Got it. Building a CTV awareness plan for Ffern’s Summer 25 launch.\n\nCTV is the right channel here — unskippable full-screen ads on streaming platforms give highest brand recall. Typical CPMs $25-45 for luxury/fragrance.\n\nA few things I need to scope this:\n- What’s the budget range? $5K–10K is typical for a first CTV flight.\n- Timeline: are we targeting a specific launch date?" },
      { role: "user", content: "Budget is around $8K, launching mid-June" },
      { role: "assistant", content: "Perfect. Here’s the plan:\n\n**Ffern Summer 25 — CTV Awareness**\n- Budget: $8,000 over 4 weeks\n- Platforms: Hulu, Roku, Samsung TV+ (programmatic via The Trade Desk)\n- CPM target: $32 — estimated 250K impressions\n- Creative: 15s and 30s spots featuring the Pink Sky at Night film\n- Geo: US + UK, skewing 25-44, luxury/fragrance interest segments\n\nI’ve drafted the full strategy card. Review the placements and audience targeting — everything is editable." },
      { role: "user", content: "Can we add DOOH in London for the first two weeks?" },
      { role: "assistant", content: "Done. Added a DOOH flight:\n\n**DOOH extension — London**\n- Budget: $1,200 (reallocated from CTV underspend buffer)\n- Screens: Tube station digital panels + Westfield retail displays\n- Duration: First 2 weeks only (launch burst)\n- CPM: ~$8 — estimated 150K impressions\n\nTotal campaign now $8K CTV + $1.2K DOOH. The strategy card is updated with both channels." },
      { role: "user", content: "What about frequency capping? I don’t want to annoy people." },
      { role: "assistant", content: "Good instinct. Here’s the frequency strategy:\n\n**CTV frequency caps:**\n- 3 exposures per household per week (industry standard for awareness)\n- 8 total across the 4-week flight\n- De-duplication across Hulu + Roku + Samsung (handled by The Trade Desk’s identity graph)\n\n**DOOH:**\n- No per-person frequency cap (impossible with DOOH), but placement rotation limits each screen to 4 plays/hour\n\nAt 3x/week frequency, you’re in the sweet spot — enough for recall without fatigue. Research shows luxury brand recall peaks at 4-5 exposures, so 8 total across the flight is ideal." },
      { role: "user", content: "How do we measure success for CTV? It’s not like we get clicks." },
      { role: "assistant", content: "Right — CTV measurement is different from performance channels. Here’s the framework:\n\n**Primary metrics:**\n- Video completion rate (VCR) — target 90%+ for 15s, 80%+ for 30s\n- Reach & frequency — unique households reached vs. target\n- Brand lift study — pre/post survey measuring awareness and consideration\n\n**Secondary signals (cross-channel impact):**\n- Branded search volume — did Google searches for \"Ffern\" increase during the flight?\n- Direct traffic to ffern.co — uplift vs. pre-campaign baseline\n- Social mentions & follower growth — organic halo effect\n\n**What I’ll set up:**\n1. A holdout group (10% of target geo excluded from CTV) for clean incrementality measurement\n2. Weekly brand search volume tracking from Google Trends\n3. Automated UTM-free attribution window: site visits within 48 hours of CTV exposure\n\nYou won’t see ROAS on CTV the way you see it on Meta. The value shows up in cheaper CPAs on your other channels 2-4 weeks into the flight." },
      { role: "user", content: "Makes sense. Can we target specific streaming shows or genres?" },
      { role: "assistant", content: "Yes, but with caveats:\n\n**What you CAN target on CTV:**\n- Content genres: Drama, Documentary, Lifestyle/Home (best for luxury fragrance)\n- Time of day: Prime-time 7-11pm (highest co-viewing, best recall)\n- Device: Smart TVs only (skip mobile/tablet CTV inventory — worse experience)\n- Publisher: Specific apps like Hulu, Peacock, Paramount+ (via private marketplace deals)\n\n**What you CANNOT target:**\n- Specific shows (mostly — some publishers offer show-level targeting at 3-5x CPM premium)\n- Skip button behavior (CTV is non-skippable by default)\n\n**My recommendation for Ffern:**\n- Genre: Documentary + Drama + Lifestyle (aligns with your brand)\n- Exclude: Kids content, Sports, News (wrong context for luxury fragrance)\n- Time: 70% prime-time, 30% all-day (prime-time is premium but worth it)\n\nI’ve updated the strategy card with these targeting parameters." },
      { role: "user", content: "What does the creative need to look like? We have the full 3:33 Pink Sky film." },
      { role: "assistant", content: "Your film is beautiful, but CTV ads need to work differently than a brand film. Here’s the creative spec:\n\n**30-second hero cut:**\n- Open with the strongest visual (coastal sunset scene, 0:42-0:47 in the film)\n- Show the product by second 8 — don’t wait\n- Scent story in the middle (ingredients, botanicals, the making)\n- End card with logo + \"Summer 25 — ffern.co\" for 4 seconds\n- No voiceover needed — the film’s ambient sound + music works\n\n**15-second teaser:**\n- Faster pace — 3 hero shots from the film\n- Product appears by second 3\n- End card for 3 seconds\n- This is your frequency builder — short, memorable, brand-imprint\n\n**Technical specs:**\n- 1920x1080 (16:9) — standard CTV format\n- Audio: stereo, -24 LUFS (streaming standard)\n- File: MP4, H.264, under 1GB\n\n**What NOT to do:**\n- Don’t add text overlays (CTV is lean-back viewing, nobody reads)\n- Don’t use a direct response CTA (\"Shop now\" feels wrong on TV)\n- Don’t compress the full 3:33 — it needs to be a purpose-built cut\n\nWant me to provide the exact timecodes from the Pink Sky film for the editor?" },
      { role: "user", content: "Yes, give me the timecodes" },
      { role: "assistant", content: "Here are the recommended timecodes from Pink Sky at Night (3:33 total):\n\n**30-second hero cut:**\n- 0:42–0:47 — Coastal cliff sunset (opener — strongest visual)\n- 0:18–0:23 — Bill Nighy walking through wildflowers\n- 1:12–1:18 — Close-up of botanicals being gathered\n- 1:45–1:50 — Perfume bottle on sun-warmed rocks\n- 2:30–2:35 — Ocean vista wide shot (emotional peak)\n- 3:28–3:33 — Ffern logo reveal (use as end card)\n\n**15-second teaser:**\n- 0:42–0:45 — Cliff sunset (opener)\n- 1:45–1:48 — Bottle on rocks (product moment)\n- 2:30–2:34 — Ocean wide shot\n- 3:29–3:33 — Logo end card\n\n**Audio:** Keep the original ambient soundtrack throughout. The waves + wind + subtle score is perfect for lean-back viewing. No narration needed.\n\nI’d share these timecodes with your editor. The cuts should feel unhurried — let each shot breathe for 3-5 seconds. Luxury fragrance ads that cut too fast lose their premium feel." },
      { role: "user", content: "Looks good, let’s save this as a draft" },
      { role: "assistant", content: "Saved as draft. You can find it in Campaigns any time.\n\nHere’s where we stand:\n\n**Ffern Summer 25 — CTV + DOOH**\n- Total budget: $9,200 ($8K CTV + $1.2K DOOH)\n- Duration: 4 weeks starting mid-June\n- Creative: 15s + 30s cuts from Pink Sky at Night\n- Targeting: Drama/Doc/Lifestyle, prime-time, US + UK\n- Measurement: Holdout group + brand search tracking\n\nNext steps when you’re ready:\n1. Share the timecodes with your editor for the 15s + 30s cuts\n2. Upload final creative assets here\n3. Send for approval if needed\n4. Activate to push to The Trade Desk\n\nI’ll send you a reminder 2 weeks before the launch date to make sure creative is ready." },
    ],
  },
  {
    id: "seed-camp-2",
    name: "Retargeting cart abandoners on Meta",
    status: "active",
    group: "campaigns",
    createdAt: ts(5 * DAY),
    lastMessageAt: ts(1 * DAY),
    messageCount: 4,
    messages: [
      { role: "user", content: "Help me set up retargeting for people who added to cart but didn't buy" },
      { role: "assistant", content: "Setting up a cart abandonment retargeting campaign for Ffern.\n\nBased on your Shopify data, you’re seeing ~340 cart abandonments/week with a 68% abandonment rate. That’s a solid retargeting pool.\n\nRecommended setup:\n- Platform: Meta (Instagram Stories + Feed)\n- Audience: Cart abandoners, 1-14 day window\n- Budget: $1,500/mo\n- Expected ROAS: 5-7x based on your AOV of $145" },
      { role: "user", content: "What about adding Google Display to this?" },
      { role: "assistant", content: "Good instinct. Adding Google Display for cross-platform coverage:\n\n**Meta (primary):** $1,000/mo — Instagram Stories + Feed, dynamic product ads\n**Google Display (secondary):** $500/mo — remarketing lists synced from GA4\n\nThe Meta leg will do the heavy lifting (higher engagement for luxury), while Display catches users browsing other sites. Combined reach should cover ~85% of your abandoners within 48 hours." },
      { role: "user", content: "Let's go with that split" },
      { role: "assistant", content: "Strategy card created with the dual-platform approach. Audience is set to cart abandoners with a 14-day lookback.\n\nOne thing to watch: your Shopify pixel is firing correctly on the cart page but I’m not seeing the purchase confirmation event on 12% of orders. Worth checking the checkout integration — it could be under-reporting conversions." },
    ],
  },
  {
    id: "seed-camp-3",
    name: "Holiday prospecting campaign",
    status: "active",
    group: "campaigns",
    createdAt: ts(8 * DAY),
    lastMessageAt: ts(3 * DAY),
    messageCount: 7,
    messages: [
      { role: "user", content: "Start planning our holiday prospecting campaign. We usually see a big spike in November." },
      { role: "assistant", content: "Planning for Ffern’s holiday prospecting. Based on last year’s seasonality, your revenue peaks in the Nov 15–Dec 10 window.\n\nKey considerations:\n- CPMs rise 40-60% in Q4 across all channels\n- Your best-performing prospecting audience last year was lookalike based on 2x+ purchasers\n- CTV could be a strong addition this year for brand awareness before the conversion push\n\nWhat’s the total Q4 budget you’re working with?" },
      { role: "user", content: "We’re thinking $25K for the full holiday push" },
      { role: "assistant", content: "Good budget for the scale. Here’s an initial allocation:\n\n| Channel | Budget | Role |\n|---------|--------|------|\n| Meta (prospecting) | $10K | Core acquisition — lookalike + interest targeting |\n| Google Shopping | $6K | High-intent capture |\n| CTV | $4K | Awareness — 2-week pre-holiday burst |\n| TikTok | $3K | Younger demo + viral potential |\n| Google Search (brand) | $2K | Defend brand terms during peak |\n\nI’ll build this into a full strategy card. Want to refine any of the channel splits?" },
      { role: "user", content: "Should we start the CTV burst earlier? Like October?" },
      { role: "assistant", content: "Yes — starting CTV in late October is the right move. Here’s why:\n\n**The awareness lag:** CTV drives brand recall, not immediate clicks. Studies show it takes 2-3 exposures before a viewer searches your brand. Starting in October means they’re primed by the time holiday buying intent peaks in mid-November.\n\n**Revised timeline:**\n- Oct 15–Nov 1: CTV teaser phase ($1.5K) — 15s spots, \"A new season approaches\"\n- Nov 1–Nov 15: CTV full push ($2.5K) — 30s hero film, Winter 25 collection\n- Nov 15–Dec 10: All channels at max — the core conversion window\n\nThis also lets you test CTV creative and optimize before the expensive holiday CPMs kick in. October CPMs are 20-30% lower than November.\n\nUpdated strategy card with the phased timeline?" },
      { role: "user", content: "Love that. Also, should we hold back some budget for retargeting in December?" },
      { role: "assistant", content: "Absolutely. The post-Black Friday window (Dec 1-15) is underrated for luxury brands.\n\n**Why retargeting in December works for Ffern:**\n- Gift buyers who browsed during Black Friday but didn’t purchase\n- People who bought for themselves but might gift to others\n- Your AOV actually goes UP in December — gift purchases tend to be full-price\n\n**Recommended retarget reserve:**\n- Set aside $2,500 from the $25K total\n- Deploy Dec 1-15 on Meta + Google Display\n- Audience: site visitors Nov 15-30 who didn’t convert\n- Creative: \"The perfect gift\" angle with gift wrapping imagery\n\nRevised total breakdown:\n- Oct-Nov channels: $22,500\n- Dec retargeting reserve: $2,500\n\nThis is a smarter structure than spending everything in the Nov burst. Last year’s data shows 18% of Ffern’s holiday revenue came in the first two weeks of December." },
    ],
  },

  // ── Performance ──
  {
    id: "seed-perf-1",
    name: "May performance breakdown",
    status: "active",
    group: "performance",
    createdAt: ts(3 * DAY),
    lastMessageAt: ts(6 * HOUR),
    messageCount: 18,
    messages: [
      { role: "user", content: "Give me a breakdown of May performance across all channels" },
      { role: "assistant", content: "Here’s Ffern’s May performance summary:\n\n**Overall:** $24.8K revenue, 4.8x ROAS, $5.2K spend\n\n**By channel:**\n- Google Shopping: $11.2K revenue, 6.9x ROAS (your strongest)\n- Meta: $8.4K revenue, 3.8x ROAS (solid but declining vs April)\n- TikTok: $3.1K revenue, 4.2x ROAS (up 22% MoM)\n- Google Search: $2.1K revenue, 5.3x ROAS\n\n**Key signals:**\n1. Meta CTR dropped 12% — creative fatigue on top ad set (18 days, frequency 3.2)\n2. TikTok is outperforming expectations — worth increasing allocation\n3. Shopping ROAS continues to climb — consider shifting 15% from Meta" },
      { role: "user", content: "Why is Meta declining?" },
      { role: "assistant", content: "Two factors driving Meta’s decline:\n\n**1. Creative fatigue (primary)**\nYour top-performing ad set has been running for 18 days. Frequency hit 3.2 (ideal is under 2.5 for prospecting). CTR dropped from 2.1% to 1.8% over the past week.\n\n**2. Audience saturation**\nYour core lookalike audience (1% of purchasers) has been running since March without refreshing the seed list. The model is getting stale.\n\n**Recommended fixes:**\n- Refresh creative: swap the hero image, test a video format\n- Update seed list: rebuild the lookalike with the last 90 days of purchasers\n- Test a broader audience: 2-3% lookalike alongside the 1%\n\nWant me to draft a creative refresh plan?" },
      { role: "user", content: "Yes, let’s do the creative refresh" },
      { role: "assistant", content: "Drafted a creative refresh plan for Meta:\n\n**Phase 1 (this week):** Swap hero creative on the top ad set. Use the Tuscan Summer video (highest organic engagement) as a 15s Reels/Stories ad.\n\n**Phase 2 (next week):** Launch 3 new static variations with updated copy. A/B test lifestyle vs. product-focused imagery.\n\n**Phase 3 (week 3):** Rebuild the lookalike audience from 90-day purchaser seed. Pause the current 1% LAL and launch the fresh version.\n\nEstimated impact: CTR recovery to 2.0%+, ROAS back above 4.0x within 2 weeks. Confidence: high — this pattern is consistent with luxury DTC brands at similar scale." },
      { role: "user", content: "Let’s dig into Google Shopping. Why is it so strong?" },
      { role: "assistant", content: "Google Shopping is your best channel for three structural reasons:\n\n**1. High purchase intent**\nPeople searching \"niche perfume subscription\" or \"seasonal fragrance UK\" are already in buying mode. Your Shopping ads appear exactly when intent peaks. This is fundamentally different from Meta where you’re interrupting people.\n\n**2. Low competition in your niche**\nThe luxury/artisan fragrance space has fewer Shopping advertisers than mass-market beauty. Your CPCs average $0.85 vs. $1.40 for the beauty category overall. Less competition = cheaper clicks = higher ROAS.\n\n**3. Your product feed is well-optimized**\nYour titles include the collection name + scent profile + \"organic eau de parfum\" — exactly what people search for. Your product images are high-quality lifestyle shots that stand out from competitors’ white-background product photos.\n\n**Where there’s still upside:**\n- You’re not running Performance Max alongside standard Shopping. PMax would give you access to YouTube, Display, and Discover inventory using your Shopping feed.\n- Your Shopping ads only run in US + UK. Testing Canada and Australia could expand your 6.9x ROAS pool." },
      { role: "user", content: "Should we try Performance Max?" },
      { role: "assistant", content: "Yes, but carefully. PMax is powerful but it’s a black box — you lose visibility into which placements are driving results.\n\n**Recommended PMax test:**\n- Budget: $800/mo (separate from your $1,600 standard Shopping budget)\n- Asset groups: Use your existing product feed + hero images + video cuts\n- Run for 4 weeks alongside standard Shopping (not replacing it)\n- Track: incremental conversions, cannibalization of standard Shopping\n\n**What PMax will do:**\n- Automatically distribute your ads across Shopping, YouTube, Display, Gmail, and Discover\n- Use Google’s AI to find converters across all surfaces\n- Show your Ffern product ads to people watching fragrance reviews on YouTube\n\n**Risks:**\n- It may cannibalize your existing Shopping campaigns (Google admits this happens)\n- You can’t see which placements are working (limited reporting)\n- Brand search terms can leak into PMax (eating your organic traffic)\n\n**Safeguard:** Add \"ffern\" and \"ffern perfume\" as negative keywords in PMax so it doesn’t bid on your branded terms. That keeps brand traffic on your standard campaigns where you control it.\n\nWant me to set up the PMax test campaign?" },
      { role: "user", content: "Yes, set it up. Also, walk me through the TikTok growth — 22% MoM is interesting" },
      { role: "assistant", content: "TikTok growth breakdown:\n\n**April → May comparison:**\n- Spend: $620 → $740 (+19%)\n- Revenue: $2,540 → $3,100 (+22%)\n- CPA: $47 → $41 (-13%)\n- Conversions: 13 → 18 (+38%)\n\n**What’s driving it:**\n1. **Algorithm maturation** — Your TikTok pixel has been collecting data since February. At ~60 conversions total, the algorithm is just now exiting learning mode and starting to optimize effectively.\n\n2. **One viral ad** — The \"Somerset ingredient tour\" creative got 8.7K organic views AND performed well as a paid ad. TikTok’s algorithm rewards ads that get organic engagement, lowering your CPM.\n\n3. **Seasonal timing** — Fragrance interest peaks in late spring as people refresh their scent. Search volume for \"summer perfume\" is up 35% month-over-month.\n\n**The 22% growth happened on only 19% more spend** — meaning efficiency is improving, not just scale. That’s the strongest signal that TikTok is working.\n\nProjection: If you doubled TikTok spend to $1,500/mo, I’d expect $5.2-5.8K revenue at 3.5-3.9x ROAS. Still very efficient." },
      { role: "user", content: "What about our email channel? That’s not in the report." },
      { role: "assistant", content: "You’re right to call that out. Email isn’t in the paid media report because it’s an owned channel, but it’s critical context:\n\n**Ffern email performance (May, from Klaviyo):**\n- List size: 12,400 active subscribers\n- Open rate: 52% (luxury benchmark: 25-30% — you’re exceptional)\n- Click rate: 8.2% (benchmark: 3-4%)\n- Revenue attributed: ~$6,200 (not in the $24.8K paid media total)\n\n**Why this matters for paid media:**\n- Email converts your warmest audience for free. Every email subscriber you acquire through paid media has high LTV.\n- Your 52% open rate means your audience is deeply engaged — this is a signal that your brand messaging is working.\n- The waitlist model drives email signups naturally, reducing your effective CAC.\n\n**Total picture with email:**\n- Paid: $24.8K revenue on $5.2K spend (4.8x ROAS)\n- Email: $6.2K revenue on ~$0 spend (infinite ROAS)\n- Combined: $31K revenue, true blended ROAS = 6.0x\n\nI should include email in future reports as a separate section. Want me to do that going forward?" },
      { role: "user", content: "Yes, always include email. Can you draft a summary I can send to our CFO?" },
      { role: "assistant", content: "Here’s a CFO-ready summary for May:\n\n---\n\n**Ffern — May 2026 Marketing Performance**\n\n**Executive Summary:** Marketing generated $31K in attributed revenue on $5.2K in paid media spend, delivering 6.0x blended ROAS (including email). This is our most efficient month to date.\n\n**Paid Channels ($5.2K spend → $24.8K revenue):**\n- Google Shopping continues as our highest-efficiency channel at 6.9x ROAS\n- Meta is showing signs of creative fatigue — a refresh plan is in motion\n- TikTok grew 22% MoM on modest spend — scaling opportunity identified\n\n**Owned Channels ($6.2K revenue):**\n- Email list grew to 12,400 active subscribers\n- 52% open rate — 2x industry benchmark\n- Waitlist model continues to drive organic subscriber growth\n\n**Key Actions for June:**\n1. Refresh Meta creative (expected to recover 4.0x ROAS)\n2. Scale TikTok spend from $740 to $1,500/mo\n3. Test Google Performance Max alongside standard Shopping\n4. Launch CTV awareness campaign for Summer 25 collection ($8K)\n\n**Outlook:** If creative refresh lands and TikTok scaling holds, we project $28-32K in paid revenue for June with $6.5K in spend. Targeting 4.5x blended paid ROAS.\n\n---\n\nWant me to save this as a narrative report? I can format it with charts and make it exportable as a PDF." },
    ],
  },
  {
    id: "seed-perf-2",
    name: "TikTok vs Meta efficiency comparison",
    status: "active",
    group: "performance",
    createdAt: ts(6 * DAY),
    lastMessageAt: ts(2 * DAY),
    messageCount: 7,
    messages: [
      { role: "user", content: "Compare TikTok and Meta performance for Ffern. Which one should I invest more in?" },
      { role: "assistant", content: "Head-to-head for the last 30 days:\n\n| Metric | Meta | TikTok |\n|--------|------|--------|\n| Spend | $2,800 | $740 |\n| Revenue | $8,400 | $3,100 |\n| ROAS | 3.0x | 4.2x |\n| CPA | $56 | $41 |\n| CTR | 1.8% | 2.4% |\n| Conv Rate | 2.1% | 1.6% |\n\nTikTok is more efficient on a per-dollar basis, but Meta drives 2.7x more total revenue. The question isn’t either/or — it’s how much more you can push TikTok before diminishing returns." },
      { role: "user", content: "How much more can we put into TikTok?" },
      { role: "assistant", content: "Based on Ffern’s audience size on TikTok and current frequency:\n\n**Safe to scale:** Up to $1,500/mo (double current spend) without significant efficiency loss. TikTok’s algorithm is still in learning mode for your account — more spend will actually help it optimize.\n\n**Risk zone:** Above $2,000/mo, you’ll likely see CPA rise 15-20% as you exhaust the core interest audience.\n\n**My recommendation:** Increase TikTok to $1,500/mo, funded by shifting $760 from Meta’s underperforming ad sets. Net impact: ~$800 more revenue/mo at lower blended CPA.\n\nConfidence: medium-high. Based on 30 days of data and comparable luxury DTC benchmarks. I’d revisit after 2 weeks at the new spend level." },
      { role: "user", content: "What creative works best on TikTok for us?" },
      { role: "assistant", content: "Looking at your top 5 TikTok ads by ROAS:\n\n1. **Unboxing / first reaction** (7.1x ROAS) — raw, authentic, someone opening the seasonal box\n2. **\"What I smell like\" GRWM** (5.8x ROAS) — lifestyle format, trending audio\n3. **Behind the scenes from Somerset** (4.9x ROAS) — the ingredient sourcing angle\n4. **Product carousel with scent notes** (3.2x ROAS) — informational, lower engagement\n5. **Cinematic film clips** (2.1x ROAS) — beautiful but feel like traditional ads\n\nThe pattern is clear: native-feeling content outperforms polished brand content by 2-3x on TikTok. Your cinematic films are strong assets for CTV and YouTube — but on TikTok, authenticity wins.\n\nRecommendation: commission 3-4 UGC-style videos from creators who genuinely use Ffern. Cost is $200-400 per video. Expected lift: 30-40% improvement in blended TikTok ROAS." },
      { role: "user", content: "Makes sense. Can you find creators for us?" },
      { role: "assistant", content: "I can’t source creators directly, but I can give you a brief to share with your team or a UGC platform like Billo or Insense:\n\n**Ffern UGC Creator Brief:**\n- Style: authentic, not scripted — reactions, routines, storytelling\n- Setting: natural light, home or outdoor (no studio)\n- Length: 15-30s for Reels/TikTok, 30-60s for feed\n- Must include: product in hand, genuine reaction to scent\n- Tone: calm, considered, sensory — not hype\n\n**Ideal creator profile:**\n- 5K-50K followers (micro-influencer range)\n- Content in fragrance, lifestyle, or slow living niche\n- Aesthetic that matches Ffern’s visual identity\n\nBudget: $1,200-1,600 for 4 videos. At your current TikTok CPA of $41, these should pay for themselves within the first week of running." },
    ],
  },

  // ── Budgets ──
  {
    id: "seed-budget-1",
    name: "Q3 budget allocation plan",
    status: "active",
    group: "budgets",
    createdAt: ts(4 * DAY),
    lastMessageAt: ts(12 * HOUR),
    messageCount: 16,
    messages: [
      { role: "user", content: "Help me plan the Q3 budget. We have $18K/month to work with." },
      { role: "assistant", content: "Planning Ffern’s Q3 allocation at $18K/month.\n\nBased on your current performance data and seasonal patterns:\n\n**Recommended monthly split:**\n- Google Shopping: $5,400 (30%) — your highest ROAS channel\n- Meta Ads: $4,500 (25%) — reduced from current, pending creative refresh\n- CTV: $3,600 (20%) — new channel, awareness for Autumn 25 collection\n- TikTok: $2,700 (15%) — scaling based on strong Q2 results\n- Google Search: $1,800 (10%) — brand + non-brand\n\nThis shifts more budget toward your efficient channels while testing CTV at scale. Want to adjust any of these?" },
      { role: "user", content: "I want to allocate more to CTV. Can we do 25%?" },
      { role: "assistant", content: "Adjusted to 25% CTV:\n\n- Google Shopping: $5,040 (28%)\n- CTV: $4,500 (25%) — increased\n- Meta Ads: $3,960 (22%) — reduced\n- TikTok: $2,700 (15%)\n- Google Search: $1,800 (10%)\n\nThis works. The $900 shift from Meta to CTV makes sense given the creative fatigue issue. CTV at $4,500/mo gives you ~140K impressions/month at $32 CPM — enough for consistent brand presence.\n\nOne consideration: CTV is harder to measure direct ROAS. I’ll set up a lift study framework so we can track incremental impact after 6 weeks." },
      { role: "user", content: "Good. What about the holiday bump in November?" },
      { role: "assistant", content: "For November, I’d recommend a 40% budget increase to $25.2K:\n\n**Holiday allocation (Nov):**\n- Google Shopping: $7,560 (30%) — capture high-intent holiday shoppers\n- Meta: $5,040 (20%) — prospecting with fresh holiday creative\n- CTV: $5,040 (20%) — pre-holiday awareness burst\n- TikTok: $3,780 (15%) — gift guide content\n- Google Search: $2,520 (10%) — defend brand terms + gift keywords\n- DOOH: $1,260 (5%) — London retail locations for 2-week burst\n\nThe extra $7.2K should come from retained earnings on Q3 efficiency gains. Your current blended ROAS of 4.8x on $18K means you’re generating enough margin to fund the holiday push.\n\nWant me to build this into a formal budget plan?" },
      { role: "user", content: "Yes. Also, how should we pace the spend throughout each month? Front-loaded or even?" },
      { role: "assistant", content: "Depends on the channel:\n\n**Even pacing (recommended for most):**\n- Google Shopping — consistent daily budget, no reason to front-load\n- Google Search — even pacing, but increase brand bid modifiers during sale events\n- TikTok — even pacing while the algorithm is still learning\n\n**Front-loaded (strategic):**\n- Meta — front-load new creative launches. Spend 40% in week 1 to get through the learning phase fast, then scale back to steady-state.\n- CTV — front-load collection launch periods. Burst for awareness, then reduce to maintenance frequency.\n\n**Back-loaded (avoid):**\n- Never back-load spend. Dumping unspent budget in the last week of the month leads to inflated CPMs and poor-quality placements. If you’re under-pacing, redistribute to your best channel rather than rushing to spend.\n\n**Monthly rhythm I’d suggest:**\n- Week 1: Launch any new creative, 30% of monthly budget\n- Week 2: Optimize based on week 1 data, 25%\n- Week 3: Scale winners, pause losers, 25%\n- Week 4: Maintenance + prep next month’s creative, 20%\n\nI’ll build this pacing schedule into the budget plan." },
      { role: "user", content: "What if we underspend one month? Roll it over or lose it?" },
      { role: "assistant", content: "Roll it over — always. You’re a DTC brand, not a media agency with use-it-or-lose-it client budgets.\n\n**Smart underspend strategy:**\n\nIf you underspend by $1-2K in a month, here’s the priority stack for the surplus:\n\n1. **Roll into next month’s best performer** — if Shopping is at 6.9x ROAS, give it the extra budget first\n2. **Fund a creative test** — $500-1K on a new format or channel you’ve been wanting to try\n3. **Build a holiday reserve** — accumulate underspend into a Q4 war chest\n4. **Never force-spend** — spending poorly to hit a budget target is worse than underspending\n\n**Tracking this:**\nI’ll add a \"Budget Variance\" section to your monthly report. If you’re pacing under by more than 10% by mid-month, I’ll flag it with a reallocation suggestion.\n\nFor Q3 specifically: any underspend should go into the holiday reserve fund. At your efficiency, $1 saved in July becomes $4-5 in Q4 revenue." },
      { role: "user", content: "How do we justify the budget increase to the CFO? They’ll ask for projections." },
      { role: "assistant", content: "Here’s the business case framework:\n\n**Current state (Q2 average):**\n- Monthly spend: $5.2K\n- Monthly revenue: $24.8K\n- ROAS: 4.8x\n- Monthly contribution margin (at 70%): $17.4K\n- Net after ad spend: $12.2K/mo profit from paid media\n\n**Proposed state (Q3 at $18K/mo):**\n- Monthly spend: $18K\n- Conservative projected revenue: $63K (at 3.5x ROAS — assuming efficiency drops with scale)\n- Monthly contribution margin: $44.1K\n- Net after ad spend: $26.1K/mo profit\n\n**The pitch:** We’re projecting $26K/mo profit vs. $12K/mo today — a $14K/mo increase in bottom-line contribution. Even if ROAS drops from 4.8x to 3.5x (a 27% efficiency decline), the absolute profit more than doubles.\n\n**Downside protection:** If ROAS drops below 3.0x in any month, we pull back to $12K/mo and redistribute. There’s a built-in kill switch.\n\n**Key chart for the CFO:**\nPlot: spend on X-axis, profit on Y-axis. Show the curve from $5K → $18K → $25K. The marginal return is still positive until roughly $30K/mo based on your audience sizes. You’re nowhere near saturation.\n\nWant me to generate this as a formal budget proposal with charts?" },
    ],
  },

  // ── Accounts ──
  {
    id: "seed-accounts-1",
    name: "Connect TikTok Ads account",
    status: "active",
    group: "accounts",
    createdAt: ts(10 * DAY),
    lastMessageAt: ts(7 * DAY),
    messageCount: 7,
    messages: [
      { role: "user", content: "Help me connect my TikTok Ads account" },
      { role: "assistant", content: "I can walk you through connecting TikTok Ads. You’ll need:\n1. Your TikTok for Business account credentials\n2. Admin or Analyst access to the ad account\n\nThe connection will sync: campaigns, ad groups, audiences, and conversion events.\n\nReady to start the OAuth flow?" },
      { role: "user", content: "Yes, let's do it" },
      { role: "assistant", content: "TikTok Ads is now connected.\n\n**Account synced:** Ffern EDP — TikTok for Business\n**Data imported:** 3 campaigns, 8 ad groups, 2 custom audiences, 4 conversion events\n**First sync:** Complete — last 90 days of data imported\n\nI can already see some interesting patterns. Your in-feed video ads are getting 2.4% CTR — well above the 1.5% benchmark for luxury brands on TikTok. Want me to pull a full performance report?" },
      { role: "user", content: "Yes, show me what's working" },
      { role: "assistant", content: "Here's your TikTok performance snapshot (last 90 days):\n\n**Top performers:**\n- \"Unboxing Autumn 24\" — 2.8% CTR, $31 CPA, 12K views\n- \"Somerset ingredient tour\" — 2.5% CTR, $38 CPA, 8.7K views\n- \"GRWM with Wild Ice\" — 2.2% CTR, $44 CPA, 6.3K views\n\n**Underperformers:**\n- \"Brand film 30s cut\" — 0.9% CTR, $89 CPA — too polished for TikTok\n- \"Product carousel\" — 1.1% CTR, $72 CPA — not engaging enough\n\n**Key insight:** Native, authentic content is crushing cinematic repurposed content by 2-3x. Your best-performing ads don't look like ads.\n\nAlso noticed: your conversion pixel is set up correctly but you're not tracking add-to-cart events. Adding that would give TikTok's algorithm a much richer signal to optimize against. Should I walk you through the setup?" },
      { role: "user", content: "Definitely, walk me through the pixel setup" },
      { role: "assistant", content: "Here's how to add the add-to-cart event to your TikTok pixel:\n\n**If you're on Shopify (which you are):**\n1. Go to your Shopify admin → Settings → Customer events\n2. Find the TikTok Pixel integration — it should already be there from the account connection\n3. Check that these events are enabled:\n   - Page View ✓ (already firing)\n   - Add to Cart ← **this is missing**\n   - Initiate Checkout ✓ (already firing)\n   - Complete Payment ✓ (already firing)\n\n4. Toggle \"Add to Cart\" on. Shopify handles the rest.\n\n**Expected impact:** TikTok's algorithm currently only sees checkout + purchase events. Adding add-to-cart gives it ~340 more weekly signals to learn from. This typically reduces CPA by 15-25% within 2 weeks as the algorithm gets a fuller picture of who's interested.\n\nI'll monitor the event firing after you enable it and confirm data is flowing correctly." },
    ],
  },

  // ── Creative ──
  {
    id: "seed-creative-1",
    name: "Summer 25 ad creative variations",
    status: "active",
    group: "creative",
    createdAt: ts(3 * DAY),
    lastMessageAt: ts(8 * HOUR),
    messageCount: 4,
    messages: [
      { role: "user", content: "I need ad creative for the Summer 25 collection. We have the Pink Sky at Night video — what formats should we cut it into?" },
      { role: "assistant", content: "Great starting asset. The Pink Sky at Night film is 3:33 — here's how to maximize it across channels:\n\n**Recommended cuts:**\n- 30s hero cut — CTV and YouTube pre-roll (the coastal sunset sequence)\n- 15s teaser — Instagram/TikTok Reels, Stories\n- 6s bumper — YouTube bumper ads, non-skippable\n- Static key frames — 3 stills from the film for display and feed ads\n\n**Copy direction for each:**\n- CTV: No text overlay needed, let the cinematography breathe\n- Social: \"A new season. A new scent.\" — minimal, on-brand\n- Display: Product shot + \"Summer 25 — Available Now\" CTA\n\nWant me to generate the display static variations from your film frames?" },
      { role: "user", content: "Yes, and also make variations for A Dance on Wild Ice for the winter retargeting" },
      { role: "assistant", content: "I'll create variations for both films.\n\n**Summer 25 (Pink Sky at Night):**\n- 3 static display ads: 300x250, 728x90, 160x600\n- Key frames: sunset cliff, Bill Nighy close-up, product bottle on rocks\n\n**Winter 25 (A Dance on Wild Ice):**\n- 3 static display ads: same sizes\n- Key frames: frozen lake wide shot, ice skating duo, mountain reflection\n- Copy: \"Winter 25 — The Waitlist is Open\"\n\nEstimated generation time: ~15 minutes per set. The CTV cuts will need manual editing in your video tool — I can provide the timecodes for the best segments." },
      { role: "user", content: "Perfect. What about TikTok-specific creative?" },
      { role: "assistant", content: "For TikTok, the cinematic films won't perform as well as native-feeling content. Here's what works for luxury fragrance on TikTok:\n\n**Format 1: Unboxing / first impression** (best performer)\n- Film someone opening the Ffern box, smelling for the first time\n- Raw, handheld, authentic — not polished\n- 15-30s, vertical, text overlay with scent notes\n\n**Format 2: \"A day with\" lifestyle**\n- Someone applying Ffern as part of their routine\n- Aspirational but relatable setting\n- 20-45s, trending audio underneath\n\n**Format 3: Behind the scenes**\n- Snippets from the film shoots (Somerset, Tuscany)\n- \"How we make our seasonal films\" angle\n- This bridges your brand equity with TikTok's authenticity preference\n\nYour existing films are great for repurposing BTS content. Do you have any raw footage from the Pink Sky shoot?" },
    ],
  },

  // ── Audiences ──
  {
    id: "seed-audience-1",
    name: "Build a high-value lookalike audience",
    status: "active",
    group: "audiences",
    createdAt: ts(7 * DAY),
    lastMessageAt: ts(2 * DAY),
    messageCount: 7,
    messages: [
      { role: "user", content: "Help me build a better lookalike audience for prospecting. The current one feels stale." },
      { role: "assistant", content: "Your current 1% lookalike is based on all purchasers from the last 180 days. That's too broad and too old. Here's a better approach:\n\n**Recommended seed audience:**\n- Filter: 2x+ purchasers in the last 90 days (your most valuable customers)\n- Size: ~1,200 records (sufficient for a strong signal)\n- Exclude: anyone who purchased in the last 7 days (they're already converted)\n\n**Lookalike tiers to test:**\n- 1% LAL — closest match, smallest reach (~2.1M in US)\n- 2% LAL — slightly broader, good for scaling (~4.2M)\n- Test both simultaneously with identical creative to compare\n\nYour current seed list has 3,400 records but includes one-time buyers from 6 months ago — that dilutes the signal. The tighter 90-day, 2x+ filter will give Meta a much clearer picture of your best customer." },
      { role: "user", content: "What about using the waitlist as a seed?" },
      { role: "assistant", content: "Smart idea. Your waitlist is actually a stronger signal than purchasers in some ways — these are people who specifically chose Ffern and are willing to wait.\n\n**Waitlist-based LAL:**\n- Seed: Active waitlist members (~4,800 records)\n- Signal quality: Very high — self-selected, engaged, brand-aware\n- Best for: Prospecting campaigns targeting \"brand-fit\" over purchase intent\n\n**Recommendation: Run both in parallel**\n1. 2x purchaser LAL → optimize for purchases (bottom-funnel)\n2. Waitlist LAL → optimize for add-to-cart (mid-funnel)\n\nThe waitlist LAL will find people who match Ffern's brand affinity profile. The purchaser LAL will find people ready to buy. Different audiences, complementary roles.\n\nWant me to set these up as audience segments?" },
      { role: "user", content: "Yes, set them up. Also, should I exclude existing customers from prospecting?" },
      { role: "assistant", content: "Always. Here's the exclusion stack I'll apply to both LAL audiences:\n\n**Exclude from prospecting:**\n1. All purchasers (any time) — they're customers, not prospects\n2. Active retargeting audiences — avoid overlap and bid competition\n3. Waitlist members (for the purchaser LAL only) — they're already in the funnel\n\n**Why this matters:**\nWithout exclusions, 15-20% of your prospecting spend goes to people who've already bought. At $2,800/mo on Meta prospecting, that's ~$420-560/mo wasted on showing ads to existing customers.\n\nI've created both segments:\n- **Ffern — High-Value Lookalike (2x Buyers, 90d)** — Ready, 2.1M estimated reach\n- **Ffern — Waitlist Lookalike** — Ready, 3.8M estimated reach\n\nBoth have the exclusion stack applied. You can find them in the Audiences page." },
      { role: "user", content: "The waitlist LAL reach seems really large. Is 3.8M too broad?" },
      { role: "assistant", content: "Good instinct. 3.8M is a 1% lookalike — for prospecting that's actually a reasonable starting point, but you're right to question it.\n\n**Options to tighten:**\n1. **Narrow by interest overlay** — add fragrance, luxury beauty, or artisan/craft interests. Reduces to ~1.2M.\n2. **Use 0.5% LAL** instead of 1% — tighter match, ~1.9M reach\n3. **Geo-restrict** — US + UK only instead of all English-speaking. Reduces to ~2.4M.\n\n**My recommendation:** Start with the 1% but add a fragrance + luxury interest overlay. This gives you ~1.2M reach — large enough to find meaningful scale, tight enough that Meta's algorithm can optimize efficiently.\n\nI'll update the segment. The narrower audience typically sees 20-30% better CPA in the first 2 weeks compared to the unrestricted LAL." },
    ],
  },

  // ── General ──
  {
    id: "seed-general-1",
    name: "What channels should Ffern be on?",
    status: "active",
    group: "general",
    createdAt: ts(12 * DAY),
    lastMessageAt: ts(5 * DAY),
    messageCount: 3,
    messages: [
      { role: "user", content: "What marketing channels should a brand like Ffern prioritize?" },
      { role: "assistant", content: "For a luxury DTC fragrance brand like Ffern, here’s the channel priority stack:\n\n**Tier 1 (must-have):**\n- Google Shopping — captures high-intent buyers searching for niche fragrance\n- Meta (Instagram) — visual storytelling, your core audience lives here\n- Email/SMS — your owned channel, critical for the membership/waitlist model\n\n**Tier 2 (high-value):**\n- TikTok — younger luxury consumers discovering through content\n- CTV — cinematic brand storytelling (your films are perfect for this)\n- Google Search — defend brand terms + capture non-brand fragrance queries\n\n**Tier 3 (test & learn):**\n- DOOH — London/NYC retail proximity targeting\n- Pinterest — aspirational lifestyle, high purchase intent\n- YouTube pre-roll — your existing film content repurposed\n\nYou’re currently on Tier 1 + partial Tier 2. The biggest gap is CTV — your cinematic content is tailor-made for streaming environments." },
      { role: "user", content: "We haven't tried Pinterest at all. Is it worth it?" },
      { role: "assistant", content: "For Ffern specifically, Pinterest is worth testing but not a priority.\n\n**Why it could work:**\n- Pinterest users have 2x higher purchase intent than other social platforms\n- \"Niche perfume\" and \"luxury fragrance\" are growing search categories\n- Your aesthetic (botanical, artisanal, English countryside) maps perfectly to Pinterest’s visual language\n\n**Why it’s Tier 3:**\n- Smaller audience than Meta/TikTok for fragrance discovery\n- Attribution is harder — long consideration cycle, hard to track\n- Your team’s creative capacity is better spent on channels with proven ROAS\n\n**My recommendation:** Run a $500/mo test for 60 days using your existing lifestyle photography. If CPA comes in under $60, scale it. If not, redirect to TikTok where you’re already seeing strong returns." },
    ],
  },
  {
    id: "seed-general-2",
    name: "Competitive landscape for niche fragrance",
    status: "active",
    group: "general",
    createdAt: ts(9 * DAY),
    lastMessageAt: ts(4 * DAY),
    messageCount: 6,
    messages: [
      { role: "user", content: "Who are Ffern’s main competitors in paid media and what are they doing?" },
      { role: "assistant", content: "Based on ad library data and industry signals, here are Ffern’s key competitors in the niche/luxury fragrance paid media space:\n\n**Direct competitors:**\n- **Le Labo** — Heavy Meta spend, lifestyle-focused creative, strong Google Shopping presence\n- **Byredo** — Instagram-first, high-production video ads, experimenting with TikTok\n- **Diptyque** — Broad channel mix including CTV, seasonal campaign bursts\n- **Aesop** — Minimal paid media, relies heavily on organic + retail\n\n**What they’re doing that you’re not:**\n1. CTV — Diptyque and Le Labo are both running streaming ads\n2. Influencer partnerships on TikTok — Byredo is aggressive here\n3. Google Performance Max — most competitors are using PMax alongside standard Shopping\n\n**Your advantages:**\n- Cinematic content quality exceeds all competitors (the Bill Nighy films are unmatched)\n- Membership/waitlist model creates natural scarcity\n- Your ROAS of 4.8x is strong for the category\n\nBiggest opportunity: CTV with your existing film assets. None of your competitors have content this good for streaming placement." },
      { role: "user", content: "How does our spend level compare to theirs?" },
      { role: "assistant", content: "Rough estimates based on ad library activity and industry benchmarks:\n\n| Brand | Est. Monthly Paid | Primary Channels | Model |\n|-------|-------------------|-----------------|-------|\n| **Le Labo** | $80-120K | Meta, Google, CTV | Retail + DTC |\n| **Byredo** | $60-90K | Meta, TikTok, Google | Retail + DTC |\n| **Diptyque** | $100-150K | Meta, CTV, Google, DOOH | Primarily retail |\n| **Aesop** | $15-25K | Google, Meta (minimal) | Retail-first |\n| **Ffern** | ~$5K | Meta, Google Shopping | DTC-only |\n\nYou’re outspending only Aesop, but your ROAS is significantly better than all of them. At 4.8x blended ROAS, every dollar you add to paid media generates nearly $5 in revenue.\n\n**The real takeaway:** You’re under-investing relative to your efficiency. Most DTC brands at your ROAS would be spending 3-5x more. The question isn’t whether to spend more — it’s how fast you can scale without breaking efficiency." },
      { role: "user", content: "That’s a strong argument. What would doubling our spend look like?" },
      { role: "assistant", content: "Modeled scenario: $5K → $10K/month\n\n**Conservative estimate (ROAS drops to 4.0x):**\n- Revenue: $40K/mo (up from $24.8K)\n- Incremental revenue: +$15.2K/mo\n- Incremental profit (at 70% margin): +$10.6K/mo\n- Net after ad spend increase: +$5.6K/mo profit\n\n**Optimistic estimate (ROAS holds at 4.5x):**\n- Revenue: $45K/mo\n- Incremental revenue: +$20.2K/mo\n- Net after ad spend: +$9.2K/mo profit\n\n**Where the extra $5K goes:**\n- +$2K to Google Shopping (your most efficient channel)\n- +$1.5K to TikTok (still in scaling phase)\n- +$1K to Meta (with refreshed creative)\n- +$500 to Google Search (non-brand keywords)\n\n**Risk factors:**\n- Creative fatigue will accelerate — you’ll need 2-3x more creative assets\n- Audience saturation on Meta could push CPA up 10-15%\n- Need to rebuild lookalike audiences monthly instead of quarterly\n\nRecommendation: scale to $8K first for 4 weeks, validate ROAS holds above 4.0x, then push to $10K. Staggered scaling is safer than a sudden jump." },
    ],
  },
];

/**
 * Ffern-specific seed sessions. These are identical to the default ones
 * (the content already references Ffern). Exported separately for clarity.
 */
export const FFERN_SEED_CHAT_SESSIONS = SEED_CHAT_SESSIONS;
