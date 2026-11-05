---
max_turns: 40
timeout_seconds: 1200
runs: 1
tags: [plan, write]
allowed_tools: [Skill, Read, Glob, Grep, Write, Edit, Agent]
---

write it "A signed-in shopper can apply one discount code on /cart. A valid code shows 'Code applied' and reduces the total by its percentage. An unknown code shows 'This code is not valid' and leaves the total unchanged. Codes are 1 to 20 characters." App: https://staging.shop.example.com

The R-NN table you derive from this text is confirmed as is, and there are no open questions. No tracker is configured: keep everything local.
