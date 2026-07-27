# Contributing to ATO Lens (Tax History AU)

Thank you for your interest in contributing to ATO Lens!

## Guidelines

1. **Australian Financial Year Standard**: All features must adhere to Australian financial years (1 July to 30 June).
2. **Local-First Privacy**: Never add telemetry, tracking scripts, or automatic external network calls without explicit opt-in user consent.
3. **Provenance**: Ensure any extracted document value maintains a `confidence`, `sourceDocumentId`, and `sourcePage` provenance structure.

## Development Setup

```bash
npm install
npm run dev
```

## Pull Request Checklist
- [ ] Code passes TypeScript check (`npx tsc --noEmit`)
- [ ] Application builds without errors (`npm run build`)
- [ ] Privacy network monitor verifies 0 unexpected outbound calls
