/**
 * Property-based test for Channel Settlement Round Trip
 *
 * Feature: uniswap-v4-prize-track-integration
 * Property 4: Channel Settlement Round Trip
 *
 * For any channel with off-chain state updates, closing the channel should
 * produce an on-chain settlement transaction hash, and querying that transaction
 * should show the final channel state.
 *
 * We test the settlement round trip by simulating the full lifecycle:
 * create → transfer(s) → close, verifying that the final state is FINAL
 * and the channel preserves the last allocation state.
 *
 * **Validates: Requirements 1.4**
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

const arbEthAddress = fc
  .hexaString({ minLength: 40, maxLength: 40 })
  .map((hex) => `0x${hex}`);

const arbChannelId = fc
  .hexaString({ minLength: 64, maxLength: 64 })
  .map((hex) => `0x${hex}`);

const arbChainId = fc.integer({ min: 1, max: 100_000 });

/** Generates 1-5 transfer amounts that sum to less than the initial balance */
const arbTransferSequence = fc.array(fc.bigInt({ min: 1n, max: 100000n }), {
  minLength: 1,
  maxLength: 5,
});

function createMockPublicClient(): PublicClient {
  return {} as PublicClient;
}

// ============================================================================
// Property 4: Channel Settlement Round Trip
// ============================================================================

describe("Feature: uniswap-v4-prize-track-integration, Property 4: Channel Settlement Round Trip", () => {
  /**
   * **Validates: Requirements 1.4**
   *
   * For any channel that goes through create → transfers → close,
   * the final state should be FINAL and preserve the last allocation values.
   */
  it("channel lifecycle: create → transfers → close produces FINAL with correct allocations", () => {
    fc.assert(
      fc.property(
        arbChannelId,
        arbEthAddress,
        arbEthAddress,
        arbEthAddress,
        arbChainId,
        arbTransferSequence,
        (
          channelId,
          senderAddr,
          recipientAddr,
          tokenAddr,
          chainId,
          transferAmounts,
        ) => {
          const totalTransfer = transferAmounts.reduce((sum, a) => sum + a, 0n);
          const initialBalance = totalTransfer + 1000n; // ensure enough balance

          const manager = new ChannelStateManager(
            createMockPublicClient(),
            "0x0000000000000000000000000000000000000001",
          );

          // Phase 1: Create channel
          let stateVersion = 1;
          const initialState: ChannelState = {
            channelId,
            status: "ACTIVE",
            chainId,
            token: tokenAddr,
            allocations: [
              {
                destination: senderAddr,
                token: tokenAddr,
                amount: initialBalance.toString(),
              },
              { destination: recipientAddr, token: tokenAddr, amount: "0" },
            ],
            stateVersion,
            stateIntent: "INITIALIZE",
            adjudicator: "0x" + "2".repeat(40),
            challengePeriod: 3600,
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
          };
          manager.updateChannel(channelId, initialState);

          // Phase 2: Execute off-chain transfers
          let senderBalance = initialBalance;
          let recipientBalance = 0n;

          for (const amount of transferAmounts) {
            senderBalance -= amount;
            recipientBalance += amount;
            stateVersion++;

            manager.updateChannel(channelId, {
              ...initialState,
              allocations: [
                {
                  destination: senderAddr,
                  token: tokenAddr,
                  amount: senderBalance.toString(),
                },
                {
                  destination: recipientAddr,
                  token: tokenAddr,
                  amount: recipientBalance.toString(),
                },
              ],
              stateVersion,
              stateIntent: "OPERATE",
              updatedAt: Math.floor(Date.now() / 1000),
            });
          }

          // Phase 3: Close channel (settlement)
          stateVersion++;
          const finalState: ChannelState = {
            ...initialState,
            status: "FINAL",
            allocations: [
              {
                destination: senderAddr,
                token: tokenAddr,
                amount: senderBalance.toString(),
              },
              {
                destination: recipientAddr,
                token: tokenAddr,
                amount: recipientBalance.toString(),
              },
            ],
            stateVersion,
            stateIntent: "FINALIZE",
            updatedAt: Math.floor(Date.now() / 1000),
          };
          manager.updateChannel(channelId, finalState);

          // Verify settlement round trip
          const retrieved = manager.getChannel(channelId);
          expect(retrieved).toBeDefined();

          // Status is FINAL after settlement
          expect(retrieved!.status).toBe("FINAL");
          expect(retrieved!.stateIntent).toBe("FINALIZE");

          // Final allocations reflect all transfers
          expect(BigInt(retrieved!.allocations[0]!.amount)).toBe(senderBalance);
          expect(BigInt(retrieved!.allocations[1]!.amount)).toBe(
            recipientBalance,
          );

          // Conservation: total allocation equals initial balance
          const totalFinal =
            BigInt(retrieved!.allocations[0]!.amount) +
            BigInt(retrieved!.allocations[1]!.amount);
          expect(totalFinal).toBe(initialBalance);

          // Channel is no longer findable as open
          const openChannel = manager.findOpenChannel(tokenAddr);
          if (openChannel) {
            expect(openChannel.channelId).not.toBe(channelId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 1.4**
   *
   * Closing a channel with no transfers should still produce FINAL status
   * with the original allocations preserved.
   */
  it("closing channel with no transfers preserves original allocations", () => {
    fc.assert(
      fc.property(
        arbChannelId,
        arbEthAddress,
        arbEthAddress,
        arbChainId,
        fc.bigUintN(64).map((n) => (n + 1n).toString()),
        (channelId, ownerAddr, tokenAddr, chainId, amount) => {
          const manager = new ChannelStateManager(
            createMockPublicClient(),
            "0x0000000000000000000000000000000000000001",
          );

          // Create
          const state: ChannelState = {
            channelId,
            status: "ACTIVE",
            chainId,
            token: tokenAddr,
            allocations: [{ destination: ownerAddr, token: tokenAddr, amount }],
            stateVersion: 1,
            stateIntent: "INITIALIZE",
            adjudicator: "0x" + "2".repeat(40),
            challengePeriod: 3600,
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
          };
          manager.updateChannel(channelId, state);

          // Close immediately
          manager.updateChannel(channelId, {
            ...state,
            status: "FINAL",
            stateVersion: 2,
            stateIntent: "FINALIZE",
          });

          const retrieved = manager.getChannel(channelId);
          expect(retrieved).toBeDefined();
          expect(retrieved!.status).toBe("FINAL");
          expect(retrieved!.allocations[0]!.amount).toBe(amount);
        },
      ),
      { numRuns: 100 },
    );
  });
});
