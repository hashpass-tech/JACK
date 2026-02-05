import { NextRequest, NextResponse } from 'next/server';
import { getIntent } from '@/lib/store';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const intent = getIntent(params.id);

    if (!intent) {
        return NextResponse.json({ error: 'Intent not found' }, { status: 404 });
    }

    return NextResponse.json(intent);
}
