# Contributing to Cued

Thanks for helping improve Cued.

## Before you start

- Check for an existing issue, or open one using the bug-report or feature-request form.
- Keep work within the approved milestone in [the roadmap](docs/ROADMAP.md).
- Read the [development guide](docs/DEVELOPMENT.md) for local setup and verification.
- Do not include API keys, tokens, connection strings, private media details, or user data in issues, commits, pull requests, or screenshots.

## Change workflow

1. Start from the latest `main` branch and create a focused branch.
2. Make the smallest change that solves the issue.
3. Update English, Swedish, and Dutch text together when user-facing copy changes.
4. Add or update focused tests for behavioural changes.
5. Run the checks listed in the development guide.
6. Open a pull request using the template, link its issue, and request a review.

`main` is protected: contributors cannot push directly to it. A pull request needs passing CI and an approval from someone other than the author before it can merge.

## Reviews

Keep pull requests small and describe the user-visible outcome, technical approach, and verification. Reviewers should check correctness, scope, tests, privacy, translations, and whether the change remains consistent with Cued's product and architecture documents.
