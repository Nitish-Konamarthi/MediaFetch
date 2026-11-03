# Reusable Engineering Prompts

Use these prompts with the repository instructions in [AGENTS.md](AGENTS.md). Keep each task limited to its approved scope.

## Explore

> Inspect the relevant code and documentation for **[change]**. Report the current behavior, constraints, affected areas, risks, and missing information. Do not edit files.

## Plan

> Based on the exploration of **[change]**, propose a small implementation plan. Include affected components, interface or data changes, security implications, tests, documentation updates, and acceptance criteria. Do not edit files. Identify any decisions that need my input.

## Implement

> Implement only the approved plan for **[change]**. Follow AGENTS.md and the relevant architecture documents. Add or update appropriate tests and documentation. Do not commit or push. Report files changed and checks run.

## Verify and review

> Independently review the complete diff for **[change]**. Check correctness, security, regressions, architecture fit, and missing tests. Run only the relevant approved checks. Report findings by severity and do not modify files unless asked.
