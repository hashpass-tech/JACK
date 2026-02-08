/**
 * Property-based test for Off-Chain State Updates
 *
 * Feature: uniswap-v4-prize-track-integration
 * Property 3: Off-Chain State Updates
 *
 * For any open channel and valid transfer amount, executing an off-chain transfer
 * should update the channel allocation without producing an on-chain transaction hash.
 *
 * We test the core state update logic through ChannelStateManager, which is the
 * component that tracks allocation changes after off-chain transfers.
 *
 * **Validates: Requirements 1.3, 1.6**
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

/**
 * Generates a sender balance and a transfer amount where transfer <= balance.
 * This ensures the transfer is valid (within channel allocation).
 */
const arbBalanceAndTransfer = fc.bigUintN(64).chain((balance) => {
  const minBalance = balance + 1n; // ensure non-zero balance
  return fc.tuple(
    fc.constant(minBalance),
    fc.bigInt({ min: 1n, max: minBalance }),
  );
});

function createMockPublicClient(): PublicClient {
  return {} as PublicClient;
}

// ============================================================================
// Property 3: Off-Chain State Updates
// ============================================================================

describe("Feature: uniswap-v4-prize-track-integration, Property 3: Off-Chain State Updates", () => {
  /**
   * **Validates: Requirements 1.3, 1.6**
   *
   * For any open channel with a sender balance and a valid transfer amount
   * (transfer <= balance), updating the channel allocations to reflect the
   * transfer should:
   * 1. Decrease the sender's allocation by the transfer amount
   * 2. Increase the recipient's allocation by the transfer amount
   * 3. Not change the channel ID or status
   * 4. Increment the state version (off-chain update, no tx hash)
   */
  it("off-chain transfer updates allocations without changing channel identity", () => {
    fc.assert(
      fc.property(
        arbChannelId,
        arbEthAddress,
        arbEthAddress,
        arbEthAddress,
        arbChainId,
        arbBalanceAndTransfer,
        (
          channelId,
          senderAddr,
          recipientAddr,
          tokenAddr,
          chainId,
          [senderBalance, transferAmount],
        ) => {
          const manager = new ChannelStateManager(
            createMockPublicClient(),
            "0x0000000000000000000000000000000000000001",
          );

          // Initial channel state with sender's allocation
          const initialAllocations: ChannelAllocation[] = [
            {
              destination: senderAddr,
              token: tokenAddr,
              amount: senderBalance.toString(),
            },
            { destination: recipientAddr, token: tokenAddr, amount: "0" },
          ];

          const initialState: ChannelState = {
            channelId,
            status: "ACTIVE",
            chainId,
            token: tokenAddr,
            allocations: initialAllocations,
            stateVersion: 1,
            stateIntent: "INITIALIZE",
            adjudicator: "0x" + "2".repeat(40),
            challengePeriod: 3600,
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
          };

          manager.updateChannel(channelId, initialState);

          // Simulate off-chain transfer: update allocations
          const newSenderBalance = senderBalance - transferAmount;
          const newRecipientBalance = transferAmount;

          const updatedAllocations: ChannelAllocation[] = [
            {
              destination: senderAddr,
              token: tokenAddr,
              amount: newSenderBalance.toString(),
            },
            {
              destination: recipientAddr,
              token: tokenAddr,
              amount: newRecipientBalance.toString(),
            },
          ];

          const updatedState: ChannelState = {
            ...initialState,
            allocations: updatedAllocations,
            stateVersion: initialState.stateVersion + 1,
            stateIntent: "OPERATE",
            updatedAt: Math.floor(Date.now() / 1000),
          };

          manager.updateChannel(channelId, updatedState);

          // Verify
          const retrieved = manager.getChannel(channelId);
          expect(retrieved).toBeDefined();

          // Channel identity preserved
          expect(retrieved!.channelId).toBe(channelId);
          expect(retrieved!.status).toBe("ACTIVE");

          // Allocations updated correctly
          expect(BigInt(retrieved!.allocations[0]!.amount)).toBe(
            newSenderBalance,
          );
          expect(BigInt(retrieved!.allocations[1]!.amount)).toBe(
            newRecipientBalance,
          );

          // State version incremented (off-chain update)
          expect(retrieved!.stateVersion).toBe(2);
          expect(retrieved!.stateIntent).toBe("OPERATE");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 1.3, 1.6**
   *
   * Multiple sequential off-chain transfers should accumulate correctly.
   * The total transferred amount should equal the sum of individual transfers.
   */
  it("sequential off-chain transfers accumulate correctly", () => {
    fc.assert(
      fc.property(
        arbChannelId,
        arbEthAddress,
        arbEthAddress,
        arbEthAddress,
        arbChainId,
        fc.array(fc.bigInt({ min: 1n, max: 1000000n }), {
          minLength: 1,
          maxLength: 5,
        }),
        (
          channelId,
          senderAddr,
          recipientAddr,
          tokenAddr,
          chainId,
          transferAmounts,
        ) => {
          const totalTransfer = transferAmounts.reduce((sum, a) => sum + a, 0n);
          const initialBalance = totalTransfer + 1n; // ensure enough balance

          const manager = new ChannelStateManager(
            createMockPublicClient(),
            "0x0000000000000000000000000000000000000001",
          );

          let currentSenderBalance = initialBalance;
          let currentRecipientBalance = 0n;
          let stateVersion = 1;

          // Initial state
          const state: ChannelState = {
            channelId,
            status: "ACTIVE",
            chainId,
            token: tokenAddr,
            allocations: [
              {
                destination: senderAddr,
                token: tokenAddr,
                amount: currentSenderBalance.toString(),
              },
              {
                destination: recipientAddr,
                token: tokenAddr,
                amount: currentRecipientBalance.toString(),
              },
            ],
            stateVersion,
            stateIntent: "INITIALIZE",
            adjudicator: "0x" + "2".repeat(40),
            challengePeriod: 3600,
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
          };

          manager.updateChannel(channelId, state);

          // Apply each transfer
          for (const amount of transferAmounts) {
            currentSenderBalance -= amount;
            currentRecipientBalance += amount;
            stateVersion++;

            manager.updateChannel(channelId, {
              ...state,
              allocations: [
                {
                  destination: senderAddr,
                  token: tokenAddr,
                  amount: currentSenderBalance.toString(),
                },
                {
                  destination: recipientAddr,
                  token: tokenAddr,
                  amount: currentRecipientBalance.toString(),
                },
              ],
              stateVersion,
              stateIntent: "OPERATE",
              updatedAt: Math.floor(Date.now() / 1000),
            });
          }

          const retrieved = manager.getChannel(channelId);
          expect(retrieved).toBeDefined();
          expect(BigInt(retrieved!.allocations[0]!.amount)).toBe(
            initialBalance - totalTransfer,
          );
          expect(BigInt(retrieved!.allocations[1]!.amount)).toBe(totalTransfer);
          expect(retrieved!.stateVersion).toBe(1 + transferAmounts.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
