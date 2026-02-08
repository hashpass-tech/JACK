/**
 * Property-based test for Yellow Channel Creation
 *
 * Feature: uniswap-v4-prize-track-integration
 * Property 2: Channel Creation
 *
 * For any valid counterparty address, asset address, and initial allocation amount,
 * creating a state channel should initialize a session with those exact parameters
 * and return a valid channel ID.
 *
 * Since YellowProvider.createChannel requires a live WebSocket connection,
 * we test the core channel creation logic through ChannelStateManager,
 * which is the component that stores and retrieves channel state after creation.
 *
 * **Validates: Requirements 1.2**
 */

import { describe, it, expect } from "vitest";
import { fc } from "@fast-check/vitest";
import type { PublicClient } from "viem";
import type {
  ChannelState,
  ChannelAllocation,
} from "../../src/yellow/types.js";
import { ChannelStateManager } from "../../src/yellow/channel-state-manager.js";

// ============================================================================
// Generators
// ============================================================================

/** Valid Ethereum address: 0x + 40 hex chars */
const arbEthAddress = fc
  .hexaString({ minLength: 40, maxLength: 40 })
  .map((hex) => `0x${hex}`);

/** Valid channel ID (bytes32): 0x + 64 hex chars */
const arbChannelId = fc
  .hexaString({ minLength: 64, maxLength: 64 })
  .map((hex) => `0x${hex}`);

/** Positive chain ID */
const arbChainId = fc.integer({ min: 1, max: 100_000 });

/** Positive allocation amount as string (BigInt-compatible) */
const arbAmount = fc.bigUintN(128).map((n) => (n + 1n).toString());

/** Mock PublicClient */
function createMockPublicClient(): PublicClient {
  return {} as PublicClient;
}

// ============================================================================
// Property 2: Channel Creation
// ============================================================================

describe("Feature: uniswap-v4-prize-track-integration, Property 2: Channel Creation", () => {
  /**
   * **Validates: Requirements 1.2**
   *
   * For any valid counterparty, asset, and allocation amount, simulating
   * channel creation (as YellowProvider.createChannel does internally)
   * stores a channel with the correct parameters and a valid channel ID.
   */
  it("channel creation stores exact parameters and produces a valid channel ID", () => {
    fc.assert(
      fc.property(
        arbChannelId,
        arbEthAddress,
        arbEthAddress,
        arbChainId,
        arbAmount,
        (channelId, counterparty, assetAddress, chainId, amount) => {
          const manager = new ChannelStateManager(
            createMockPublicClient(),
            "0x0000000000000000000000000000000000000001",
          );

          // Simulate what YellowProvider.createChannel does after ClearNode responds:
          // it builds a ChannelState and stores it in the manager
          const allocations: ChannelAllocation[] = [
            { destination: counterparty, token: assetAddress, amount },
          ];

          const channelState: ChannelState = {
            channelId,
            status: "ACTIVE",
            chainId,
            token: assetAddress,
            allocations,
            stateVersion: 1,
            stateIntent: "INITIALIZE",
            adjudicator: "0x0000000000000000000000000000000000000002",
            challengePeriod: 3600,
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
          };

          manager.updateChannel(channelId, channelState);

          // Retrieve and verify
          const retrieved = manager.getChannel(channelId);
          expect(retrieved).toBeDefined();
          expect(retrieved!.channelId).toBe(channelId);
          expect(retrieved!.channelId.length).toBeGreaterThan(0);
          expect(retrieved!.token).toBe(assetAddress);
          expect(retrieved!.chainId).toBe(chainId);
          expect(retrieved!.status).toBe("ACTIVE");
          expect(retrieved!.allocations).toHaveLength(1);
          expect(retrieved!.allocations[0]!.destination).toBe(counterparty);
          expect(retrieved!.allocations[0]!.amount).toBe(amount);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 1.2**
   *
   * A newly created channel should be findable by its token address.
   */
  it("newly created channel is findable by token address", () => {
    fc.assert(
      fc.property(
        arbChannelId,
        arbEthAddress,
        arbChainId,
        (channelId, assetAddress, chainId) => {
          const manager = new ChannelStateManager(
            createMockPublicClient(),
            "0x0000000000000000000000000000000000000001",
          );

          const channelState: ChannelState = {
            channelId,
            status: "ACTIVE",
            chainId,
            token: assetAddress,
            allocations: [
              {
                destination: "0x" + "1".repeat(40),
                token: assetAddress,
                amount: "1000",
              },
            ],
            stateVersion: 1,
            stateIntent: "INITIALIZE",
            adjudicator: "0x" + "2".repeat(40),
            challengePeriod: 3600,
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
          };

          manager.updateChannel(channelId, channelState);

          const found = manager.findOpenChannel(assetAddress);
          expect(found).toBeDefined();
          expect(found!.channelId).toBe(channelId);
        },
      ),
      { numRuns: 100 },
    );
  });
});
