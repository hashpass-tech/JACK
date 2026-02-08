/**
 * Yellow Network Testnet Demo — Real Sepolia Proof
 *
 * This script produces real on-chain Sepolia transaction hashes proving
 * Yellow Network state channel interaction:
 *
 *   1. Authenticate with ClearNode sandbox via WebSocket
 *   2. Create a state channel on Sepolia (on-chain tx)
 *   3. Fund the channel via resize (on-chain tx)
 *   4. Execute off-chain transfer (no tx — that's the point)
 *   5. Close channel and settle on-chain (on-chain tx)
 *   6. Withdraw funds (on-chain tx)
 *
 * Produces 3-4 Sepolia tx hashes as proof for the Yellow Network prize track.
 *
 * Usage:
 *   PRIVATE_KEY=0x... node --import tsx scripts/prize-tracks/yellow-testnet-demo.ts
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1
 */

import {
  NitroliteClient,
  WalletStateSigner,
  createECDSAMessageSigner,
  createEIP712AuthMessageSigner,
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createGetConfigMessage,
  createGetLedgerBalancesMessage,
  createCreateChannelMessage,
  createResizeChannelMessage,
  createTransferMessage,
  createCloseChannelMessage,
} from "@erc7824/nitrolite";
import { createPublicClient, createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import WebSocket from "ws";
import "dotenv/config";

// ============================================================================
// Configuration
// ============================================================================

const CLEARNODE_WS = "wss://clearnet-sandbox.yellow.com/ws";
const SEPOLIA_RPC = process.env.ALCHEMY_RPC_URL || "https://1rpc.io/sepolia";

// Yellow Network contracts on Sepolia
const CUSTODY_ADDRESS = "0x019B65A265EB3363822f2752141b3dF16131b262" as const;
const ADJUDICATOR_ADDRESS =
  "0x7c7ccbc98469190849BCC6c926307794fDfB11F2" as const;

// ============================================================================
// Proof Collector
// ============================================================================

interface ProofEntry {
  step: string;
  type: "on-chain" | "off-chain";
  txHash?: string;
  etherscanUrl?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

const proofs: ProofEntry[] = [];

function addProof(
  step: string,
  type: "on-chain" | "off-chain",
  txHash?: string,
  data?: Record<string, unknown>,
) {
  const entry: ProofEntry = {
    step,
    type,
    txHash,
    etherscanUrl: txHash
      ? `https://sepolia.etherscan.io/tx/${txHash}`
      : undefined,
    data,
    timestamp: Date.now(),
  };
  proofs.push(entry);
  return entry;
}

// ============================================================================
// Helpers
// ============================================================================

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function waitForWsMessage(
  ws: WebSocket,
  method: string,
  timeoutMs = 30000,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.off("message", handler);
      reject(new Error(`Timeout waiting for ${method} response`));
    }, timeoutMs);

    function handler(data: WebSocket.Data) {
      try {
        const msg = JSON.parse(data.toString());
        // Debug: log all messages
        log(
          `  [WS] ${msg.res ? msg.res[1] : "unknown"}: ${JSON.stringify(msg).slice(0, 200)}`,
        );
        if (msg.res && msg.res[1] === method) {
          clearTimeout(timeout);
          ws.off("message", handler);
          resolve(msg.res[2]);
        }
        // Handle error responses from ClearNode
        if (msg.res && msg.res[1] === "error") {
          clearTimeout(timeout);
          ws.off("message", handler);
          reject(
            new Error(
              `ClearNode error (waiting for ${method}): ${msg.res[2]?.error || JSON.stringify(msg.res[2])}`,
            ),
          );
        }
        if (msg.error) {
          clearTimeout(timeout);
          ws.off("message", handler);
          reject(
            new Error(`RPC error on ${method}: ${JSON.stringify(msg.error)}`),
          );
        }
      } catch {
        // ignore parse errors from other messages
      }
    }

    ws.on("message", handler);
  });
}

function waitForWsOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }
    ws.once("open", () => resolve());
    ws.once("error", (err) => reject(err));
  });
}

// ============================================================================
// Main Demo
// ============================================================================

async function main() {
  const startTime = Date.now();

  console.log("");
  console.log("=".repeat(64));
  console.log("  JACK × Yellow Network — Sepolia Testnet Demo");
  console.log("=".repeat(64));
  console.log("");

  // ── Load private key ──
  const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}` | undefined;
  if (!PRIVATE_KEY) {
    console.error("ERROR: Set PRIVATE_KEY env var (with 0x prefix)");
    process.exit(1);
  }

  const account = privateKeyToAccount(PRIVATE_KEY);
  log(`Wallet: ${account.address}`);

  // ── Create viem clients ──
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(SEPOLIA_RPC),
  });

  const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(SEPOLIA_RPC),
    account,
  }) as any; // NitroliteClient expects a narrower WalletClient type

  // ── Generate session key ──
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  const sessionSigner = createECDSAMessageSigner(sessionPrivateKey);
  log(`Session key: ${sessionAccount.address}`);

  // ── Initialize NitroliteClient ──
  const client = new NitroliteClient({
    publicClient,
    walletClient,
    stateSigner: new WalletStateSigner(walletClient as any),
    addresses: {
      custody: CUSTODY_ADDRESS,
      adjudicator: ADJUDICATOR_ADDRESS,
    },
    chainId: sepolia.id,
    challengeDuration: 3600n,
  } as any);

  log(`NitroliteClient initialized`);
  log(`  Custody:     ${CUSTODY_ADDRESS}`);
  log(`  Adjudicator: ${ADJUDICATOR_ADDRESS}`);
  console.log("");

  // ══════════════════════════════════════════════════════════════════════
  // Step 1: Connect to ClearNode and authenticate
  // ══════════════════════════════════════════════════════════════════════
  log("Step 1: Connecting to ClearNode sandbox...");

  const ws = new WebSocket(CLEARNODE_WS);
  await waitForWsOpen(ws);
  log("  WebSocket connected");

  // ClearNode sends an 'assets' broadcast on connect — capture it
  let supportedToken = "";
  const assetsPromise = new Promise<void>((resolve) => {
    function handler(data: WebSocket.Data) {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.res && msg.res[1] === "assets") {
          const assetsList = msg.res[2]?.assets || [];
          const sepoliaAsset = assetsList.find(
            (a: any) => a.chain_id === sepolia.id,
          );
          if (sepoliaAsset) {
            supportedToken = sepoliaAsset.token;
          }
          ws.off("message", handler);
          resolve();
        }
      } catch {
        /* ignore */
      }
    }
    ws.on("message", handler);
    // Resolve after 3s even if no assets message
    setTimeout(() => {
      ws.off("message", handler);
      resolve();
    }, 3000);
  });

  await assetsPromise;

  // Fetch config to discover supported assets (backup)
  const configMsg = await createGetConfigMessage(sessionSigner);
  ws.send(configMsg);
  const config = await waitForWsMessage(ws, "get_config");
  const networks = config.networks || [];
  log(`  Config fetched — ${networks.length} networks`);

  // Use the token from the assets broadcast, or find from config
  if (!supportedToken) {
    const sepoliaNetwork = networks.find((n: any) => n.chain_id === sepolia.id);
    supportedToken =
      sepoliaNetwork?.token || "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb";
  }
  const tokenAddress = supportedToken;
  log(`  Token: ${tokenAddress}`);

  // Auth request
  const authParams = {
    address: account.address,
    session_key: sessionAccount.address,
    application: "JACK Kernel",
    allowances: [{ asset: "ytest.usd", amount: "1000000000" }],
    expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
    scope: "jack.kernel",
  };

  const authRequestMsg = await createAuthRequestMessage(authParams);
  ws.send(authRequestMsg);
  log("  Auth request sent...");

  // Wait for auth_challenge
  const challengeData = await waitForWsMessage(ws, "auth_challenge");
  const challenge = challengeData.challenge_message;
  log("  Challenge received");

  // Sign challenge with main wallet (EIP-712)
  const authSigner = createEIP712AuthMessageSigner(
    walletClient,
    {
      session_key: sessionAccount.address,
      allowances: authParams.allowances,
      expires_at: authParams.expires_at,
      scope: authParams.scope,
    },
    { name: "JACK Kernel" },
  );

  const verifyMsg = await createAuthVerifyMessageFromChallenge(
    authSigner,
    challenge,
  );
  ws.send(verifyMsg);

  const authResult = await waitForWsMessage(ws, "auth_verify");
  log(`  ✓ Authenticated — session: ${authResult.session_key}`);

  addProof("Authentication", "off-chain", undefined, {
    sessionKey: authResult.session_key,
    wallet: account.address,
  });
  console.log("");

  // ══════════════════════════════════════════════════════════════════════
  // Step 2: Query existing channels or create a new one
  // ══════════════════════════════════════════════════════════════════════
  log("Step 2: Querying channels...");

  const ledgerMsg = await createGetLedgerBalancesMessage(
    sessionSigner,
    account.address,
    undefined,
    Date.now(),
  );
  ws.send(ledgerMsg);
  // ClearNode responds with 'channels' method for ledger balance queries
  const channelsData = await waitForWsMessage(ws, "channels");
  const channels = channelsData.channels || [];
  const openChannel = channels.find((c: any) => c.status === "open");

  let channelId: string;

  if (openChannel) {
    channelId = openChannel.channel_id;
    log(`  Found existing open channel: ${channelId}`);
    addProof("Channel found (existing)", "off-chain", undefined, { channelId });
  } else {
    log("  No open channel — creating new one...");

    const createChannelMsg = await createCreateChannelMessage(sessionSigner, {
      chain_id: sepolia.id,
      token: tokenAddress as `0x${string}`,
    });
    ws.send(createChannelMsg);

    const createData = await waitForWsMessage(ws, "create_channel", 60000);
    channelId = createData.channel_id;
    log(`  ClearNode prepared channel: ${channelId}`);

    // Submit on-chain
    const unsignedInitialState = {
      intent: createData.state.intent,
      version: BigInt(createData.state.version),
      data: createData.state.state_data || "0x",
      allocations: createData.state.allocations.map((a: any) => ({
        destination: a.destination,
        token: a.token,
        amount: BigInt(a.amount),
      })),
    };

    const createResult = await client.createChannel({
      channel: createData.channel,
      unsignedInitialState,
      serverSignature: createData.server_signature,
    });

    log(`  ✓ Channel created on-chain`);
    log(`    Tx: ${createResult.txHash}`);
    log(`    Waiting for confirmation...`);

    await publicClient.waitForTransactionReceipt({ hash: createResult.txHash });
    log(`    ✓ Confirmed`);

    addProof("Channel creation", "on-chain", createResult.txHash, {
      channelId,
    });
  }
  console.log("");

  // ══════════════════════════════════════════════════════════════════════
  // Step 3: Fund channel via resize (allocate from unified balance)
  // ══════════════════════════════════════════════════════════════════════
  log("Step 3: Funding channel via resize...");

  // Wait for ClearNode to index the channel
  await new Promise((r) => setTimeout(r, 5000));

  const resizeMsg = await createResizeChannelMessage(sessionSigner, {
    channel_id: channelId as `0x${string}`,
    allocate_amount: 10n,
    funds_destination: account.address,
  });
  ws.send(resizeMsg);

  const resizeData = await waitForWsMessage(ws, "resize_channel", 60000);
  log(`  ClearNode prepared resize`);

  // Get on-chain proof states for resize
  let proofStates: any[] = [];
  try {
    const onChainData = await client.getChannelData(channelId as `0x${string}`);
    if (onChainData.lastValidState) {
      proofStates = [onChainData.lastValidState];
    }
  } catch {
    log("  (no on-chain proof states available)");
  }

  const resizeState = {
    intent: resizeData.state.intent,
    version: BigInt(resizeData.state.version),
    data: resizeData.state.state_data || resizeData.state.data || "0x",
    allocations: resizeData.state.allocations.map((a: any) => ({
      destination: a.destination,
      token: a.token,
      amount: BigInt(a.amount),
    })),
    channelId: channelId as `0x${string}`,
    serverSignature: resizeData.server_signature,
  };

  const resizeResult = await client.resizeChannel({
    resizeState,
    proofStates,
  });

  log(`  ✓ Channel funded on-chain`);
  log(`    Tx: ${resizeResult.txHash}`);

  await publicClient.waitForTransactionReceipt({ hash: resizeResult.txHash });
  log(`    ✓ Confirmed`);

  addProof("Channel resize (fund)", "on-chain", resizeResult.txHash, {
    channelId,
    allocateAmount: "10",
  });
  console.log("");

  // ══════════════════════════════════════════════════════════════════════
  // Step 4: Off-chain transfer (the whole point of state channels)
  // ══════════════════════════════════════════════════════════════════════
  log("Step 4: Executing off-chain transfer...");
  log("  This is instant — no on-chain tx needed");

  // Transfer to the ClearNode broker (counterparty in the sandbox)
  const brokerAddress =
    (config as any).broker_address ||
    "0xc7E6827ad9DA2c89188fAEd836F9285E6bFdCCCC";
  log(`  Destination: ${brokerAddress}`);

  const transferMsg = await createTransferMessage(
    sessionSigner,
    {
      destination: brokerAddress as `0x${string}`,
      allocations: [{ asset: "ytest.usd", amount: "5" }],
    },
    undefined,
    Date.now(),
  );
  ws.send(transferMsg);

  try {
    const transferData = await waitForWsMessage(ws, "transfer", 15000);
    log(`  ✓ Off-chain transfer complete`);
    log(`    Amount: 5 ytest.usd`);
    log(`    No on-chain tx — state updated off-chain`);

    addProof("Off-chain transfer", "off-chain", undefined, {
      amount: "5",
      asset: "ytest.usd",
      channelId,
      transferData,
    });
  } catch (err) {
    log(`  ⚠ Transfer response: ${err instanceof Error ? err.message : err}`);
    log(`    (Transfer may have succeeded — ClearNode may not echo back)`);

    addProof("Off-chain transfer (sent)", "off-chain", undefined, {
      amount: "5",
      asset: "ytest.usd",
      channelId,
      note: "Transfer message sent, response not confirmed",
    });
  }
  console.log("");

  // ══════════════════════════════════════════════════════════════════════
  // Step 5: Close channel and settle on-chain
  // ══════════════════════════════════════════════════════════════════════
  log("Step 5: Closing channel and settling on-chain...");

  await new Promise((r) => setTimeout(r, 3000));

  const closeMsg = await createCloseChannelMessage(
    sessionSigner,
    channelId as `0x${string}`,
    account.address,
  );
  ws.send(closeMsg);

  const closeData = await waitForWsMessage(ws, "close_channel", 60000);
  log(`  ClearNode prepared close`);

  const closeTxHash = await client.closeChannel({
    finalState: {
      intent: closeData.state.intent,
      version: BigInt(closeData.state.version),
      data: closeData.state.state_data || closeData.state.data || "0x",
      allocations: closeData.state.allocations.map((a: any) => ({
        destination: a.destination,
        token: a.token,
        amount: BigInt(a.amount),
      })),
      channelId: channelId as `0x${string}`,
      serverSignature: closeData.server_signature,
    },
    stateData: closeData.state.state_data || closeData.state.data || "0x",
  });

  log(`  ✓ Channel closed on-chain`);
  log(`    Tx: ${closeTxHash}`);

  await publicClient.waitForTransactionReceipt({ hash: closeTxHash });
  log(`    ✓ Confirmed`);

  addProof("Channel close (settlement)", "on-chain", closeTxHash, {
    channelId,
  });
  console.log("");

  // ══════════════════════════════════════════════════════════════════════
  // Step 6: Withdraw funds
  // ══════════════════════════════════════════════════════════════════════
  log("Step 6: Withdrawing funds...");

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const balance = await client.getAccountBalance(
      tokenAddress as `0x${string}`,
    );
    if (balance > 0n) {
      const withdrawTx = await client.withdrawal(
        tokenAddress as `0x${string}`,
        balance,
      );
      log(`  ✓ Withdrawn ${balance} tokens`);
      log(`    Tx: ${withdrawTx}`);

      await publicClient.waitForTransactionReceipt({ hash: withdrawTx });
      log(`    ✓ Confirmed`);

      addProof("Withdrawal", "on-chain", withdrawTx, {
        amount: balance.toString(),
        token: tokenAddress,
      });
    } else {
      log("  No funds to withdraw");
    }
  } catch (err) {
    log(`  ⚠ Withdrawal: ${err instanceof Error ? err.message : err}`);
  }
  console.log("");

  // ══════════════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════════════
  const durationMs = Date.now() - startTime;

  console.log("=".repeat(64));
  console.log("  PROOF SUMMARY — Yellow Network Prize Track");
  console.log("=".repeat(64));
  console.log("");

  const onChainProofs = proofs.filter((p) => p.type === "on-chain");
  const offChainProofs = proofs.filter((p) => p.type === "off-chain");

  console.log(`  On-chain transactions (${onChainProofs.length}):`);
  for (const p of onChainProofs) {
    console.log(`    ${p.step}`);
    console.log(`      ${p.etherscanUrl}`);
  }
  console.log("");

  console.log(`  Off-chain evidence (${offChainProofs.length}):`);
  for (const p of offChainProofs) {
    console.log(`    ${p.step}: ${JSON.stringify(p.data)}`);
  }
  console.log("");

  console.log(`  Channel ID:  ${channelId}`);
  console.log(`  Duration:    ${durationMs}ms`);
  console.log(`  Network:     Sepolia (${sepolia.id})`);
  console.log("");
  console.log("=".repeat(64));

  // Write proof JSON
  const proofOutput = {
    demo: "yellow-network-testnet",
    network: "sepolia",
    chainId: sepolia.id,
    wallet: account.address,
    channelId,
    contracts: {
      custody: CUSTODY_ADDRESS,
      adjudicator: ADJUDICATOR_ADDRESS,
    },
    proofs,
    durationMs,
    timestamp: new Date().toISOString(),
  };

  const fs = await import("fs");
  const outPath = "scripts/prize-tracks/yellow-testnet-proof.json";
  fs.writeFileSync(outPath, JSON.stringify(proofOutput, null, 2));
  log(`Proof written to ${outPath}`);

  ws.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
