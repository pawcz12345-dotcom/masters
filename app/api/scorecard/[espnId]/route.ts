import { NextRequest, NextResponse } from 'next/server';

// ESPN event ID for the Masters Tournament 2026 — update each year
const MASTERS_EVENT_ID = '401811941';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ espnId: string }> }
) {
  const { espnId } = await params;

  try {
    const url =
      `https://sports.core.api.espn.com/v2/sports/golf/leagues/pga/events/${MASTERS_EVENT_ID}` +
      `/competitions/${MASTERS_EVENT_ID}/competitors/${espnId}/linescores?limit=100`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await fetch(url, { next: { revalidate: 60 } } as any);
    if (!res.ok) throw new Error(`ESPN ${res.status}`);

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Scorecard fetch failed:', err);
    return NextResponse.json({ error: 'Failed to fetch scorecard' }, { status: 500 });
  }
}
