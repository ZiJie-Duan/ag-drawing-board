import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISlot extends Document {
  id: number;
  name: string;
  grid: (string | null)[][];
  lastModified: number;
}

const SlotSchema: Schema = new Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, default: 'Slot' },
  // Use Mixed to allow nulls for empty cells
  grid: { type: [[Schema.Types.Mixed]], default: [] },
  lastModified: { type: Number, default: () => Date.now() },
});

const Slot: Model<ISlot> = mongoose.models.Slot || mongoose.model<ISlot>('Slot', SlotSchema);

export default Slot;
