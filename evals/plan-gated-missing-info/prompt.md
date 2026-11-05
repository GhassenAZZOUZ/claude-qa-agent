---
max_turns: 20
timeout_seconds: 600
runs: 2
tags: [plan, gate]
allowed_tools: [Skill, Read, Glob, Grep, Write, Agent]
---

plan it "Shoppers can export their order history as CSV. The export should be quick and include the relevant columns."
