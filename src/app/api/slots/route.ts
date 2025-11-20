import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Slot from '@/models/Slot';
import SyncState from '@/models/SyncState';

const GRID_SIZE = 8;
const MAX_SLOTS = 10;

export async function GET() {
  await dbConnect();

  try {
    let slots = await Slot.find({}).sort({ id: 1 });

    // Initialize slots if they don't exist
    if (slots.length < MAX_SLOTS) {
      const currentIds = new Set(slots.map((s) => s.id));
      const newSlots = [];

      for (let i = 1; i <= MAX_SLOTS; i++) {
        if (!currentIds.has(i)) {
          newSlots.push({
            id: i,
            name: `Slot ${i}`,
            grid: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)),
            lastModified: Date.now(),
          });
        }
      }

      if (newSlots.length > 0) {
        await Slot.insertMany(newSlots);
        slots = await Slot.find({}).sort({ id: 1 });
      }
    }

    return NextResponse.json(slots);
  } catch (error) {
    console.error('Error fetching slots:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();

  try {
    const body = await request.json();
    const { id, name, grid } = body;

    if (!id || !grid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update Slot
    const updatedSlot = await Slot.findOneAndUpdate(
      { id },
      { 
        name, 
        grid, 
        lastModified: Date.now() 
      },
      { new: true, upsert: true } // upsert just in case, though GET handles init
    );

    // Increment Web Sync Version
    await SyncState.findOneAndUpdate(
      { type: 'global' },
      { $inc: { webVersion: 1 } },
      { upsert: true, new: true }
    );

    return NextResponse.json(updatedSlot);
  } catch (error) {
    console.error('Error updating slot:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

