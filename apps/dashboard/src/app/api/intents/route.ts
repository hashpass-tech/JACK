import { NextRequest, NextResponse } from 'next/server';
import { getIntents, saveIntent } from '@/lib/store';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const intentId = `JK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const timestamp = Date.now();

        const intent = {
            id: intentId,
            ...body,
            status: 'CREATED',
            createdAt: timestamp,
            executionSteps: [
                { step: 'Intent Signed & Broadcast', status: 'COMPLETED', timestamp }
            ]
        };

        saveIntent(intentId, intent);

        // Start async execution simulation
        simulateExecution(intentId);

        return NextResponse.json({ intentId, status: 'CREATED' });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}

export async function GET() {
    const intents = getIntents();
    const list = Object.values(intents).sort((a: any, b: any) => b.createdAt - a.createdAt);
    return NextResponse.json(list);
}

async function simulateExecution(intentId: string) {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const updateStatus = (status: string, step: string, details: string) => {
        const intents = getIntents();
        const intent = intents[intentId];
        if (intent) {
            intent.status = status;
            intent.executionSteps.push({
                step,
                status: 'COMPLETED',
                timestamp: Date.now(),
                details
            });
            saveIntent(intentId, intent);
        }
    };

    // 1. Solver Matching (QUOTED)
    await sleep(3000);
    updateStatus('QUOTED', 'Solver Matching (Yellow Fusion+)', 'Bid accepted: $14.20 total fee');

    // 2. Routing (EXECUTING)
    await sleep(4000);
    updateStatus('EXECUTING', 'Cross-Chain Routing (LI.FI Mock)', 'Route: Arbitrum (USDC) -> Base (WETH)');

    // 3. Settlement (SETTLING)
    await sleep(5000);
    updateStatus('SETTLING', 'On-Chain Policy Check (HOOK)', 'Policy: MinAmountOut >= 0.042 WETH verified');

    // 4. Finality (SETTLED)
    await sleep(3000);
    const intents = getIntents();
    const intent = intents[intentId];
    if (intent) {
        intent.status = 'SETTLED';
        intent.settlementTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        intent.executionSteps.push({
            step: 'Settlement Complete',
            status: 'COMPLETED',
            timestamp: Date.now(),
            details: 'Finalized on Base Sepolia'
        });
        saveIntent(intentId, intent);
    }
}
