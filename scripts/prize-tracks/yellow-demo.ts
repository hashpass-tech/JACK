/**
 * Yellow Network Demo Script
 *
 * Demonstrates the Yellow Network integration with JACK SDK:
 * 1. Initialize JACK_SDK with Yellow configuration
 * 2. Create a state channel with a test counterparty
 * 3. Execute 3-5 off-chain transfers with logging
 * 4. Close channel and capture settlement transaction hash
 * 5. Display summary with off-chain state updates and on-chain proof
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1
 */

import { JACK_SDK } from "../../packages/sdk/src/index.js";
import type { YellowSDKConfig } from "../../packages/sdk/src/index.js";
import type {
  YellowChannelResult,
  YellowTransferResult,
  ChannelAllocation,
} from "../../packages/sdk/src/yellow/types.js";
import type { WalletClient } from "viem";

// ============================================================================
// Demo Configuration
// ============================================================================

export interface YellowDemoConfig {
  /** Custody contract address on Sepolia */
  custodyAddress: `0x${string}`;
  /** Adjudicator contract address on Sepolia */
  adjudicatorAddress: `0x${string}`;
  /** Chain ID (11155111 for Sepolia) */
  chainId: number;
  /** Viem WalletClient for signing */
  walletClient: WalletClient;
  /** Test counterparty address */
  counterparty: `0x${string}`;
  /** ERC-20 token address for the channel */
  assetAddress: `0x${string}`;
  /** Initial allocation amount (as string for BigInt compat) */
  initialAmount: string;
  /** RPC URL for the chain */
  rpcUrl?: string;
  /** JACK API base URL */
  apiBaseUrl?: string;
}

// ============================================================================
// Transfer Log Entry
// ============================================================================

interface TransferLog {
  index: number;
  amount: string;
  direction: "send" | "receive";
  success: boolean;
  updatedAllocations?: ChannelAllocation[];
  timestamp: number;
}

// ============================================================================
// Demo Summary
// ============================================================================

export interface YellowDemoSummary {
  channelId: string | undefined;
  channelCreationTxHash: string | undefined;
  transfers: TransferLog[];
  totalTransfers: number;
  successfulTransfers: number;
  totalVolume: string;
  settlementTxHash: string | undefined;
  finalStatus: string;
  gasSaved: string;
  durationMs: number;
}

// ============================================================================
// Main Demo Function
// ============================================================================

/**
 * Run the Yellow Network demo.
 *
 * Initializes the JACK SDK with Yellow configuration, creates a state channel,
 * executes off-chain transfers, closes the channel, and returns a summary.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1
 */
export async function runYellowDemo(
  config: YellowDemoConfig,
): Promise<YellowDemoSummary> {
  const startTime = Date.now();
  const transfers: TransferLog[] = [];

  console.log("=".repeat(60));
  console.log("  JACK × Yellow Network Demo");
  console.log("=".repeat(60));
  console.log();

  // ── Step 1: Initialize SDK with Yellow configuration (Req 1.1) ──
  console.log("[1/5] Initializing JACK SDK with Yellow Network...");

  const yellowConfig: YellowSDKConfig = {
    custodyAddress: config.custodyAddress,
    adjudicatorAddress: config.adjudicatorAddress,
    chainId: config.chainId,
    walletClient: config.walletClient,
    rpcUrl: config.rpcUrl,
  };

  const sdk = new JACK_SDK({
    baseUrl: config.apiBaseUrl ?? "https://api.jack.example",
    yellow: yellowConfig,
  });

  if (!sdk.yellow) {
    throw new Error("YellowProvider not initialized — check configuration");
  }

  console.log("  ✓ SDK initialized");
  console.log(`  ✓ Custody:     ${config.custodyAddress}`);
  console.log(`  ✓ Adjudicator: ${config.adjudicatorAddress}`);
  console.log(`  ✓ Chain ID:    ${config.chainId}`);
  console.log();

  // ── Step 2: Connect and create state channel (Req 1.2) ──
  console.log("[2/5] Connecting to ClearNode and creating state channel...");

  const connectionResult = await sdk.yellow.connect();
  if (!connectionResult.connected) {
    console.log(
      `  ⚠ ClearNode connection failed: ${connectionResult.fallback?.message}`,
    );
    console.log("  → Proceeding with simulated channel (NitroliteClient stub)");
  } else {
    console.log(`  ✓ Connected — session: ${connectionResult.sessionAddress}`);
  }

  const channelResult: YellowChannelResult = await sdk.yellow.createChannel({
    chainId: config.chainId,
    token: config.assetAddress,
  });

  if (channelResult.fallback) {
    console.log(
      `  ⚠ Channel creation fallback: ${channelResult.fallback.message}`,
    );
  }

  const channelId = channelResult.channelId;
  const channelTxHash = channelResult.txHash;

  console.log(`  ✓ Channel ID:  ${channelId ?? "N/A"}`);
  console.log(`  ✓ Tx Hash:     ${channelTxHash ?? "N/A"}`);
  if (channelResult.state) {
    console.log(`  ✓ Status:      ${channelResult.state.status}`);
  }
  console.log();

  // ── Step 3: Execute off-chain transfers (Req 1.3, 1.6) ──
  console.log("[3/5] Executing off-chain transfers...");
  console.log();

  const transferAmounts = [
    "1000000000000000000", // 1.0 token
    "500000000000000000", // 0.5 token
    "250000000000000000", // 0.25 token
    "750000000000000000", // 0.75 token
    "100000000000000000", // 0.1 token
  ];

  for (let i = 0; i < transferAmounts.length; i++) {
    const amount = transferAmounts[i]!;
    const direction: "send" | "receive" = i % 2 === 0 ? "send" : "receive";
    const destination =
      direction === "send"
        ? config.counterparty
        : (config.walletClient.account?.address ?? "0x0");

    console.log(
      `  Transfer ${i + 1}/${transferAmounts.length}: ${direction} ${formatTokenAmount(amount)} tokens`,
    );

    const transferResult: YellowTransferResult = await sdk.yellow.transfer({
      destination,
      allocations: [{ asset: config.assetAddress, amount }],
    });

    const log: TransferLog = {
      index: i + 1,
      amount,
      direction,
      success: transferResult.success,
      updatedAllocations: transferResult.updatedAllocations,
      timestamp: Date.now(),
    };
    transfers.push(log);

    if (transferResult.success) {
      console.log(`    ✓ Off-chain update — no on-chain tx needed`);
    } else {
      console.log(
        `    ⚠ Transfer fallback: ${transferResult.fallback?.message ?? "unknown"}`,
      );
    }
  }

  console.log();
  console.log(`  Completed ${transfers.length} off-chain transfers`);
  console.log();

  // ── Step 4: Close channel and settle on-chain (Req 1.4) ──
  console.log("[4/5] Closing channel and settling on-chain...");

  let settlementTxHash: string | undefined;
  let finalStatus = "unknown";

  if (channelId) {
    const closeResult = await sdk.yellow.closeChannel({
      channelId,
      withdraw: true,
    });

    settlementTxHash = closeResult.txHash;
    finalStatus = closeResult.state?.status ?? "unknown";

    if (closeResult.fallback) {
      console.log(`  ⚠ Close fallback: ${closeResult.fallback.message}`);
    }

    console.log(`  ✓ Settlement Tx: ${settlementTxHash ?? "N/A"}`);
    console.log(`  ✓ Final Status:  ${finalStatus}`);
  } else {
    console.log("  ⚠ No channel to close");
  }
  console.log();

  // ── Step 5: Display summary (Req 1.5, 1.6) ──
  const successfulTransfers = transfers.filter((t) => t.success).length;
  const totalVolume = transfers.reduce((sum, t) => sum + BigInt(t.amount), 0n);
  const durationMs = Date.now() - startTime;
  // Estimate gas saved: ~21000 gas per transfer avoided on-chain
  const estimatedGasSaved = successfulTransfers * 21000;

  const summary: YellowDemoSummary = {
    channelId,
    channelCreationTxHash: channelTxHash,
    transfers,
    totalTransfers: transfers.length,
    successfulTransfers,
    totalVolume: totalVolume.toString(),
    settlementTxHash,
    finalStatus,
    gasSaved: `~${estimatedGasSaved} gas (~${((estimatedGasSaved * 30) / 1e9).toFixed(6)} ETH at 30 gwei)`,
    durationMs,
  };

  console.log("[5/5] Demo Summary");
  console.log("=".repeat(60));
  console.log(`  Channel ID:          ${summary.channelId ?? "N/A"}`);
  console.log(
    `  Channel Tx:          ${summary.channelCreationTxHash ?? "N/A"}`,
  );
  console.log(
    `  Transfers:           ${summary.successfulTransfers}/${summary.totalTransfers} successful`,
  );
  console.log(
    `  Total Volume:        ${formatTokenAmount(summary.totalVolume)} tokens`,
  );
  console.log(`  Settlement Tx:       ${summary.settlementTxHash ?? "N/A"}`);
  console.log(`  Final Status:        ${summary.finalStatus}`);
  console.log(`  Gas Saved:           ${summary.gasSaved}`);
  console.log(`  Duration:            ${summary.durationMs}ms`);
  console.log("=".repeat(60));

  // Disconnect
  await sdk.yellow.disconnect();

  return summary;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format a wei-denominated token amount to a human-readable string.
 */
function formatTokenAmount(weiAmount: string): string {
  const wei = BigInt(weiAmount);
  const whole = wei / 10n ** 18n;
  const fraction = wei % 10n ** 18n;
  const fractionStr = fraction.toString().padStart(18, "0").slice(0, 4);
  return `${whole}.${fractionStr}`;
}
