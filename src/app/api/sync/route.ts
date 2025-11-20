import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SyncState from '@/models/SyncState';

export async function GET() {
  await dbConnect();

  try {
    let state = await SyncState.findOne({ type: 'global' });

    if (!state) {
      state = await SyncState.create({
        type: 'global',
        webVersion: 0,
        deviceVersion: 0,
      });
    }

    return NextResponse.json(state);
  } catch (error) {
    console.error('Error fetching sync state:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();

  try {
    const body = await request.json();
    const { deviceVersion } = body;

    if (typeof deviceVersion !== 'number') {
      return NextResponse.json({ error: 'Invalid deviceVersion' }, { status: 400 });
    }

    const state = await SyncState.findOneAndUpdate(
      { type: 'global' },
      { deviceVersion },
      { new: true, upsert: true }
    );

    return NextResponse.json(state);
  } catch (error) {
    console.error('Error updating sync state:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

