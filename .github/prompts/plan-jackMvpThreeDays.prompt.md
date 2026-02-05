# JACK MVP Demo Plan - 3 Days 9 Hours

**Deadline**: 3 days, 9 hours, 58 minutes remaining
**Goal**: Functional JACK demo showing intent submission → solver execution → on-chain settlement with policy enforcement

## Executive Summary

**Current State**: 30% complete
- ✅ Excellent whitepaper and architecture documentation
- ✅ Beautiful frontend UI/UX (production-ready visuals)
- ✅ Well-designed SDK interface
- ❌ Zero smart contract implementation
- ❌ Zero backend infrastructure
- ❌ Zero wallet integration

**Strategy**: Build "Wizard of Oz" MVP - make it look fully autonomous, but simulate solver logic, routing, and privacy with hardcoded logic behind the scenes. Goal is to **prove the concept** and **validate the UX**, not build production infrastructure.

---

## Day 1 (Today): Smart Contracts + Testnet Deploy

### Objective
Deploy minimal Uniswap v4 hook to Base Sepolia testnet with basic policy enforcement.

### Tasks

#### 1. Set up Foundry (1 hour)
**Location**: `contracts/` directory
- Install Foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- Initialize project: `forge init --no-commit`
- Create `foundry.toml` with Base Sepolia RPC
- Install Uniswap v4 dependencies:
  ```bash
  forge install Uniswap/v4-core
  forge install Uniswap/v4-periphery
  ```

#### 2. Implement JACKPolicyHook.sol (3 hours)
**Location**: `contracts/JACKPolicyHook.sol`

**Minimal Implementation**:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "v4-core/BaseHook.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {BeforeSwapDelta} from "v4-core/types/BeforeSwapDelta.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";

contract JACKPolicyHook is BaseHook {
    event PolicyEnforced(bytes32 indexed intentId, uint256 minAmountOut, uint256 actualAmountOut, bool passed);
    
    mapping(bytes32 => uint256) public intentMinAmounts;
    
    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}
    
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false
        });
    }
    
    function setIntentConstraint(bytes32 intentId, uint256 minAmountOut) external {
        intentMinAmounts[intentId] = minAmountOut;
    }
    
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external override returns (bytes4, BeforeSwapDelta, uint24) {
        // Basic policy: check if swap meets minimum output requirement
        bytes32 intentId = abi.decode(hookData, (bytes32));
        uint256 minRequired = intentMinAmounts[intentId];
        
        // In real implementation, would calculate expected output here
        // For MVP, just emit event and allow swap
        emit PolicyEnforced(intentId, minRequired, 0, true);
        
        return (this.beforeSwap.selector, BeforeSwapDelta.wrap(0), 0);
    }
}
```

#### 3. Deploy to Base Sepolia (2 hours)
**Deploy Script**: `contracts/script/DeployHook.s.sol`
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../JACKPolicyHook.sol";

contract DeployHook is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        JACKPolicyHook hook = new JACKPolicyHook(IPoolManager(poolManager));
        
        console.log("JACKPolicyHook deployed at:", address(hook));
        
        vm.stopBroadcast();
    }
}
```

**Commands**:
```bash
# Create .env with PRIVATE_KEY and POOL_MANAGER_ADDRESS
forge script script/DeployHook.s.sol --rpc-url base-sepolia --broadcast --verify
```

#### 4. Test Contract (1 hour)
- Execute test swap through hook
- Verify policy enforcement on-chain
- Confirm events emitted correctly
- Document contract addresses

**Deliverable**: Deployed and verified contract on Base Sepolia with transaction hash and Basescan link.

---

## Day 2: Backend API + Wallet Integration

### Morning (4 hours): Backend Kernel

#### 1. Create API Routes (2 hours)
**Location**: `apps/dashboard/src/app/api/`

**File**: `api/intents/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';

// In-memory storage (replace with DB later)
const intents = new Map();

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const intent = {
    id: `JK-${Math.random().toString(36).substr(2, 9)}`,
    ...body,
    status: 'CREATED',
    createdAt: Date.now(),
    executionSteps: [
      { step: 'Intent Signed & Broadcast', status: 'COMPLETED', timestamp: Date.now() }
    ]
  };
  
  intents.set(intent.id, intent);
  
  // Start async execution simulation
  simulateExecution(intent.id);
  
  return NextResponse.json({ intentId: intent.id, status: intent.status });
}

async function simulateExecution(intentId: string) {
  const intent = intents.get(intentId);
  if (!intent) return;
  
  // Simulate solver matching (5s)
  await sleep(5000);
  intent.status = 'SOLVER_MATCHED';
  intent.executionSteps.push({
    step: 'Solver Matching (Yellow Fusion+)',
    status: 'COMPLETED',
    timestamp: Date.now()
  });
  
  // Simulate routing (10s)
  await sleep(10000);
  intent.status = 'ROUTING';
  intent.executionSteps.push({
    step: 'Cross-Chain Routing (LI.FI)',
    status: 'COMPLETED',
    timestamp: Date.now()
  });
  
  // Simulate settlement (15s)
  await sleep(15000);
  intent.status = 'SETTLING';
  intent.executionSteps.push({
    step: 'Final Settlement (Uniswap v4 Hook)',
    status: 'IN_PROGRESS',
    timestamp: Date.now()
  });
  
  // Simulate policy check (5s)
  await sleep(5000);
  intent.executionSteps.push({
    step: 'Policy Check Passed',
    status: 'COMPLETED',
    timestamp: Date.now()
  });
  
  // Complete
  await sleep(5000);
  intent.status = 'SETTLED';
  intent.settlementTx = '0x' + Math.random().toString(16).substr(2, 64);
  intent.executionSteps.push({
    step: 'Settlement Complete',
    status: 'COMPLETED',
    timestamp: Date.now()
  });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**File**: `api/intents/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';

const intents = new Map(); // Share with above

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const intent = intents.get(params.id);
  
  if (!intent) {
    return NextResponse.json({ error: 'Intent not found' }, { status: 404 });
  }
  
  return NextResponse.json(intent);
}
```

#### 2. Mock Solver Logic (1 hour)
- Hardcode "Yellow Fusion+" as winning solver
- Generate fake route: Arbitrum → Stargate → Base → Uniswap v4
- Calculate estimated fees from whitepaper ($12-15 range)
- Add realistic gas estimates

#### 3. State Machine Implementation (1 hour)
- Define state enum: `CREATED | SOLVER_MATCHED | ROUTING | SETTLING | SETTLED | FAILED`
- Add error handling for failed states
- Implement timeout logic (expire after 5 minutes)

### Afternoon (4 hours): Frontend Integration

#### 1. Add Wallet Connection (1.5 hours)
**Install dependencies**:
```bash
cd apps/dashboard
pnpm add wagmi viem @tanstack/react-query
pnpm add @rainbow-me/rainbowkit
```

**File**: `apps/dashboard/src/app/providers.tsx`
```typescript
'use client';

import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { baseSepolia, arbitrumSepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { chains, publicClient } = configureChains(
  [baseSepolia, arbitrumSepolia],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'JACK',
  projectId: 'YOUR_PROJECT_ID',
  chains
});

const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider chains={chains}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
```

**Update**: `apps/dashboard/src/components/Dashboard.tsx`
- Replace mock "Connect Wallet" with `<ConnectButton />` from RainbowKit
- Display connected address in header

#### 2. Implement EIP-712 Signing (1.5 hours)
**File**: `packages/sdk/index.ts`

```typescript
import { SignTypedDataParameters } from 'viem';

export class JACKClient {
  private walletClient: any; // WalletClient from wagmi
  
  constructor(walletClient: any) {
    this.walletClient = walletClient;
  }
  
  async createIntent(params: IntentParams): Promise<Intent> {
    const intent: Intent = {
      id: '', // Assigned by backend
      params,
      timestamp: Date.now()
    };
    
    return intent;
  }
  
  async signIntent(intent: Intent): Promise<{ intent: Intent; signature: string }> {
    const domain = {
      name: 'JACK',
      version: '1',
      chainId: 84532, // Base Sepolia
      verifyingContract: '0x...' as `0x${string}`
    };
    
    const types = {
      Intent: [
        { name: 'sourceChain', type: 'string' },
        { name: 'destinationChain', type: 'string' },
        { name: 'tokenIn', type: 'string' },
        { name: 'tokenOut', type: 'string' },
        { name: 'amountIn', type: 'string' },
        { name: 'minAmountOut', type: 'string' },
        { name: 'deadline', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' }
      ]
    };
    
    const signature = await this.walletClient.signTypedData({
      domain,
      types,
      primaryType: 'Intent',
      message: intent.params
    });
    
    return { intent, signature };
  }
  
  async submitIntent(intent: Intent, signature: string): Promise<{ intentId: string }> {
    const response = await fetch('/api/intents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, signature })
    });
    
    const data = await response.json();
    return { intentId: data.intentId };
  }
  
  async getIntentStatus(intentId: string): Promise<IntentStatus> {
    const response = await fetch(`/api/intents/${intentId}`);
    const data = await response.json();
    return data;
  }
}
```

#### 3. Wire SDK to CreateIntentView (1 hour)
**Update**: `apps/dashboard/src/components/CreateIntentView.tsx`
- Use wagmi hooks to get wallet client
- Create SDK instance with wallet client
- On form submit:
  1. Create intent from form data
  2. Sign intent with wallet
  3. Submit to backend
  4. Navigate to execution detail view

#### 4. Add Execution Polling (30 min)
**Update**: `apps/dashboard/src/components/ExecutionsListView.tsx`
- Use React Query to poll `/api/intents/:id` every 2 seconds
- Update UI with live state transitions
- Show loading spinner during execution
- Animate state changes

**Deliverable**: Working wallet connection, intent signing, and live execution monitoring.

---

## Day 3: Integration + Demo Polish

### Morning (4 hours): Connect All Pieces

#### 1. Add Contract Interaction (1.5 hours)
**File**: `apps/dashboard/src/app/api/intents/[id]/settlement/route.ts`
```typescript
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

const HOOK_ABI = [/* JACKPolicyHook ABI */];
const HOOK_ADDRESS = '0x...' as `0x${string}`;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Read PolicyEnforced events for this intent
  const logs = await publicClient.getLogs({
    address: HOOK_ADDRESS,
    event: {
      name: 'PolicyEnforced',
      inputs: [
        { name: 'intentId', type: 'bytes32', indexed: true },
        { name: 'minAmountOut', type: 'uint256' },
        { name: 'actualAmountOut', type: 'uint256' },
        { name: 'passed', type: 'bool' }
      ]
    },
    args: {
      intentId: params.id
    }
  });
  
  return NextResponse.json({ events: logs });
}
```

#### 2. Enhance Execution Detail View (1.5 hours)
**Update**: `apps/dashboard/src/components/ExecutionDetailView.tsx`
- Fetch settlement events from new endpoint
- Display decoded `PolicyEnforced` event data
- Add "View on Basescan" button linking to settlement tx
- Show constraint verification details
- Add privacy badge when constraints encrypted

#### 3. Add Privacy Toggle UI (1 hour)
**Update**: `apps/dashboard/src/components/CreateIntentView.tsx`
- Add Fhenix logo toggle switch
- Show "Constraints will be encrypted" message when enabled
- In execution detail, display constraints as `[ENCRYPTED]` when privacy=true
- Add tooltip explaining privacy layer (future FHE integration)

### Afternoon (4 hours): Demo Rehearsal + Polish

#### 1. Create Demo Mode (1 hour)
**Update**: `apps/dashboard/src/components/CreateIntentView.tsx`
- Add "Fill Demo Values" button
- Pre-fill form with working testnet values:
  - Source: Arbitrum Sepolia
  - Destination: Base Sepolia
  - Input: 100 USDC
  - Output: WETH
  - Min Output: 0.045 WETH
- Use real testnet token addresses
- Ensure route works with deployed contract

#### 2. Test Complete Flow (2 hours)
Run through complete user journey 10 times:
1. Connect MetaMask wallet
2. Switch to Base Sepolia network
3. Click "Fill Demo Values"
4. Click "Broadcast Intent"
5. Sign intent in MetaMask
6. Watch execution progress in real-time
7. Click into detail view
8. Verify settlement on Basescan

Fix any issues:
- Loading states
- Error handling
- Timeout behavior
- UI glitches
- State synchronization

#### 3. Record Backup Demo Video (30 min)
- Screen record complete flow
- Add voiceover explaining:
  - What JACK solves
  - How intent-based execution works
  - Why on-chain policy enforcement matters
- Export as MP4 for backup if live demo fails

#### 4. Prepare Presentation (30 min)
- Update landing page "Launch Dashboard" link
- Add demo instructions to README
- Create 1-page architecture diagram from whitepaper
- Prepare talking points:
  - Problem: DeFi fragmentation + MEV + manual execution
  - Solution: Intent-based autonomous execution with privacy
  - Demo: End-to-end flow in 3 minutes

**Deliverable**: Polished, rehearsed demo ready to present.

---

## Fallback Plan (If Behind Schedule)

### Priority Cuts:
1. **Skip contract deployment** - Use mock settlement with fake tx hash and Basescan link
2. **Skip real wallet signatures** - Hardcode signature, just show wallet connection UI
3. **Skip contract event reading** - Display mock PolicyEnforced events in UI

### Must-Have Core:
- ✅ Working state machine with realistic timing
- ✅ Live execution monitoring with polling
- ✅ Polished UI flow from intent creation to settlement
- ✅ Clear visual storytelling of JACK value prop

### Rationale:
Better to have a **smooth, polished simulation** than a **broken real implementation**. The goal is to validate the UX and prove the concept, not ship production code.

---

## Stretch Goals (If Ahead of Schedule)

### Nice-to-Have Enhancements:
1. **LI.FI Integration** - Real cross-chain route quotes instead of hardcoded values
2. **PostgreSQL** - Persistent storage instead of in-memory
3. **Multi-Solver UI** - Show 2-3 mock solvers competing with different bids
4. **Bond/Slashing Indicator** - UI showing solver bond amounts and slashing risk
5. **Gas Estimation** - Real gas estimates from contract simulation

### Advanced Features:
1. **Intent Cancellation** - Allow user to cancel pending intent
2. **Execution History** - Paginated list of past executions
3. **Analytics Dashboard** - Charts showing volume, success rate, avg execution time
4. **Solver Leaderboard** - Mock leaderboard showing top solvers by volume/success

---

## Success Criteria

### Demo Must Show:
1. ✅ User connects wallet (MetaMask)
2. ✅ User submits signed intent
3. ✅ Execution shows live state transitions
4. ✅ Settlement links to real contract on testnet
5. ✅ Complete flow takes <3 minutes

### Technical Requirements:
1. ✅ Deployed smart contract on Base Sepolia
2. ✅ Working backend API with state machine
3. ✅ Real wallet connection and EIP-712 signatures
4. ✅ Live execution monitoring with polling
5. ✅ Contract interaction (read events)

### Presentation Quality:
1. ✅ Smooth, bug-free demo flow
2. ✅ Professional UI (existing design is excellent)
3. ✅ Clear explanation of JACK value prop
4. ✅ Backup video in case of technical issues
5. ✅ Confident delivery under 5 minutes

---

## Risk Mitigation

### Technical Risks:
- **Contract deployment fails**: Have backup mock settlement ready
- **Wallet connection breaks**: Pre-record demo video
- **API goes down**: Use localStorage fallback for state
- **Network issues**: Run demo on localhost with mock data

### Presentation Risks:
- **Live demo fails**: Switch to backup video immediately
- **Questions about missing features**: "This is MVP, production roadmap includes..."
- **Comparison to competitors**: Focus on unique policy enforcement layer
- **Technical depth questions**: Reference whitepaper for details

### Time Risks:
- **Day 1 overruns**: Cut contract deployment, use mocks
- **Day 2 behind**: Skip wallet integration, hardcode signatures
- **Day 3 rushed**: Use existing UI as-is, minimal changes

---

## Daily Check-ins

### End of Day 1:
- [ ] Contract deployed to Base Sepolia
- [ ] Transaction hash and Basescan link verified
- [ ] Test swap executed successfully
- [ ] Contract addresses documented

### End of Day 2:
- [ ] Backend API routes functional
- [ ] Wallet connection working
- [ ] Intent signing implemented
- [ ] Execution polling live

### End of Day 3:
- [ ] Complete demo flow tested 10x
- [ ] Backup video recorded
- [ ] Presentation materials ready
- [ ] Confidence level: HIGH

---

## Resources Needed

### Infrastructure:
- Base Sepolia RPC endpoint (public Alchemy/Infura)
- Test ETH for gas (from faucet)
- Test USDC/WETH tokens (deploy mock or use existing)
- MetaMask wallet with test funds

### Tools:
- Foundry (contract development)
- Viem/Wagmi (wallet integration)
- Next.js API routes (backend)
- RainbowKit (wallet UI)

### Documentation:
- Uniswap v4 hook docs
- Wagmi documentation
- EIP-712 signing reference
- Base Sepolia explorer

---

## Post-Demo Next Steps

### If Demo Succeeds:
1. Gather feedback on UX flow
2. Identify most compelling use cases
3. Prioritize production features
4. Plan next milestone (production-ready MVP)

### Production Roadmap (Post-Demo):
1. **Week 1-2**: Real solver infrastructure
2. **Week 3-4**: LI.FI integration + routing
3. **Week 5-6**: Fhenix FHE privacy layer
4. **Week 7-8**: Multi-chain expansion
5. **Week 9-10**: Mainnet launch on Base

### Immediate Priorities:
1. Fix any demo blockers discovered
2. Document current architecture
3. Create GitHub issues for production features
4. Plan user testing sessions

---

## Final Notes

**Philosophy**: This is a **proof of concept**, not production software. Focus on:
- Clear storytelling
- Smooth UX flow
- Visual polish
- Concept validation

**NOT** on:
- Production scalability
- Security hardening
- Feature completeness
- Code quality

**The Goal**: Prove that JACK's intent-based, policy-enforced cross-chain execution is:
1. **Valuable** - Solves real user pain
2. **Feasible** - Technically achievable
3. **Differentiated** - Unique advantage over competitors
4. **Ready** - Can be built to production

**Win Condition**: Audience understands JACK, sees it work, and wants to use it or invest in it.
