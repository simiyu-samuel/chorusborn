# Documentation map

Baseline date: October 26, 2026. Local schedule: Africa/Nairobi (UTC+3).

## Recommended reading order

1. [Brand](brand.md) and [product brief](product.md): what we are building and why.
2. [Scope](scope.md) and [game design](game-design.md): the complete submission experience.
3. [Architecture](architecture.md), [behavior specification](behavior-spec.md), [data/API](data-api.md), and [Twitch](twitch-integration.md): how it works.
4. [UX](ux.md) and [quality](quality.md): what users see and how we verify it.
5. [Delivery](delivery-plan.md), [submission](submission.md), and [decisions](decisions.md): execution and review.

## Authority and status

- `scope.md` owns release requirements and acceptance IDs.
- `game-design.md` owns game rules and initial tuning.
- `behavior-spec.md` owns policy semantics and evidence rules.
- `data-api.md` owns proposed data and transport contracts.
- `delivery-plan.md` owns task dependencies and planned milestones.
- `build-log.md` owns completed-work evidence.
- `sources.md` distinguishes verified external requirements from our own design.

The first local fixture build is verified in the [build log](build-log.md). Release requirements remain **planned** unless that log records their implementation. Initial tuning, service topology, performance limits, and model choices must be tested during implementation. Resolve a specification conflict explicitly; do not silently choose different behavior in separate packages.

Example contracts: [candidate](examples/lesson-candidate.json) and [candidate schema](examples/lesson-candidate.schema.json). Runtime validation exists in `packages/contracts`; a local model-backed compiler now exists (see the build log), while these examples alone do not establish production integration.
