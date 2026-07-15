import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (token !== process.env.REVALIDATION_TOKEN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { tag } = await request.json();

    if (!tag) {
      return NextResponse.json({ error: 'Missing tag parameter' }, { status: 400 });
    }

    // Ledger v1.6 Constraint: Strictly utilize On-Demand Revalidation (revalidatePath)
    // Time-based ISR is strictly prohibited.
    revalidatePath(tag, 'page');

    return NextResponse.json({ revalidated: true, tag, now: Date.now() });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json({ error: 'Error revalidating' }, { status: 500 });
  }
}
