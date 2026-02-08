/**
 * Property-based test for Yellow Provider Initialization
 *
 * Feature: uniswap-v4-prize-track-integration
 * Property 1: Yellow Provider Initialization
 *
 * For any valid Yellow configuration (custody address, adjudicator address,
 * chain ID, wallet client), initializing the SDK should create a YellowProvider
 * instance with those exact configuration values.
 *
 * **Validates: Requirements 1.1**
 */

import { describe, it, expect } from "vitest";
import { fc } from "@fast-check/vitest";
import { JACK_SDK } from "../../src/index.js";
import { YellowProvider } from "../../src/yellow/yellow-provider.js";
import type { WalletClient } from "viem";

// ============================================================================
// Generators
// ============================================================================

/**
 * Generates a valid Ethereum address (0x + 40 hex chars) cast to `0x${string}`.
 */
const arbAddress = fc
  .hexaString({ minLength: 40, maxLength: 40 })
  .map((hex) => `0x${hex}` as `0x${string}`);

/**
 * Generates a valid positive chain ID (1 to 2^31-1).
 */
const arbChainId = fc.integer({ min: 1, max: 2_147_483_647 });

/**
 * Minimal mock WalletClient sufficient for YellowProvider constructor.
 */
const mockWalletClient = {
  account: { address: "0x1234567890abcdef1234567890abcdef12345678" },
} as unknown as WalletClient;

// ============================================================================
// Property 1: Yellow Provider Initialization
// ============================================================================

describe("Feature: uniswap-v4-prize-track-integration, Property 1: Yellow Provider Initialization", () => {
  /**
   * **Validates: Requirements 1.1**
   *
   * For any valid custody address, adjudicator address, and chain ID,
   * initializing JACK_SDK with Yellow config creates a YellowProvider
   * that stores those exact values.
   */
  it("JACK_SDK creates YellowProvider with exact configuration values", () => {
    fc.assert(
      fc.property(
        arbAddress,
        arbAddress,
        arbChainId,
        (custodyAddress, adjudicatorAddress, chainId) => {
          const sdk = new JACK_SDK({
            baseUrl: "https://api.jack.test",
            yellow: {
              custodyAddress,
              adjudicatorAddress,
              chainId,
              walletClient: mockWalletClient,
              rpcUrl: "http://localhost:8545",
            },
          });

          // YellowProvider should be created
          expect(sdk.yellow).toBeDefined();
          expect(sdk.yellow).toBeInstanceOf(YellowProvider);

          // Verify the NitroliteClient received the correct config
          const client = sdk.yellow!.getNitroliteClient();
          expect(client.config.custodyAddress).toBe(custodyAddress);
          expect(client.config.adjudicatorAddress).toBe(adjudicatorAddress);
          expect(client.config.challengeDuration).toBe(BigInt(3600)); // default
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 1.1**
   *
   * When no Yellow config is provided, sdk.yellow should be undefined.
   */
  it("JACK_SDK without Yellow config has no YellowProvider", () => {
    const sdk = new JACK_SDK({ baseUrl: "https://api.jack.test" });
    expect(sdk.yellow).toBeUndefined();
  });
});
