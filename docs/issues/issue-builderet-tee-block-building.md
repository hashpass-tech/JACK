# Issue: Explore Builderet TEE-Based Block Building Integration

## Status
- **State:** Pending (Research)

## Summary
Builderet introduces Trusted Execution Environment (TEE)-based block building to deliver verifiable, private, and decentralized block construction with orderflow sharing, permissionless refunds, and multi-operator resilience. This issue proposes research and evaluation of how Builderet-style TEE block building (and adjacent innovations such as Flashbots MEV-Boost/MEV-G) could integrate with JACK’s execution, orderflow, and agent infrastructure.

## Background
Key concepts to research:
- **Builderet (TEE block building):** Uses TEEs to create verifiable, private block-building workflows. Claims include decentralized multi-operator builders, orderflow sharing, and permissionless refunds while keeping sensitive orderflow private. Identify official docs, whitepapers, or repos that describe: the trust model, attestation flows, how orderflow is shared, and how refunds are permissionless.
- **Flashbots MEV-Boost:** Middleware enabling proposer/builder separation (PBS) on Ethereum, where validators connect to relays to receive block payloads from builders. Research how MEV-Boost handles relay trust, builder selection, and payload validation to compare with TEE-based approaches.
- **Flashbots MEV-G:** Flashbots’ research initiative focused on credible neutrality and open, verifiable block-building infrastructure. Review public docs and research notes to understand how MEV-G’s goals overlap with TEE-based building.

## Goals
- Evaluate whether TEE-based block building could improve JACK’s execution quality, orderflow protection, and multi-operator resilience.
- Identify integration paths with JACK’s current execution / orderflow / agent systems.
- Determine feasibility, risks, and required infrastructure for a pilot integration.

## Proposed Investigation
- **Technical evaluation:**
  - Map Builderet’s architecture, trust model, and TEE requirements.
  - Compare with MEV-Boost relay/builder flow and MEV-G design goals.
  - Identify whether JACK needs new infrastructure (e.g., TEE attestation, relay integration, or builder API changes).
  - Determine how Builderet handles multi-operator resilience (failover, redundancy, quorum).
- **Product & ecosystem fit:**
  - Identify use cases (private orderflow, refunds, decentralized builder resiliency).
  - Evaluate how orderflow sharing and permissionless refunds align with JACK’s product roadmap.
  - Assess interoperability with existing orderflow sources and agent strategies.
- **Risks/constraints:**
  - TEE supply chain trust, attestation dependencies, and potential centralization risks.
  - Legal/compliance considerations with private orderflow handling.
  - Operational overhead for running multi-operator builder infrastructure.

## Acceptance Criteria
- A short internal memo or design note covering:
  - Feasibility summary (green/yellow/red).
  - Proposed integration path and architecture sketch (if feasible).
  - Concrete next steps, infra requirements, and effort estimate.
  - Links to authoritative Builderet and Flashbots references gathered during research.

## References
- Builderet (TEE-based block building) — overview materials and announcement sources.
- Flashbots MEV-Boost: https://boost.flashbots.net/
- Flashbots MEV-Boost repo: https://github.com/flashbots/mev-boost
- Flashbots MEV-G: https://collective.flashbots.net/
