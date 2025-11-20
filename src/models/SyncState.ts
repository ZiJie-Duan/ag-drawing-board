import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISyncState extends Document {
  type: string; // Singleton identifier
  webVersion: number;
  deviceVersion: number;
}

const SyncStateSchema: Schema = new Schema({
  type: { type: String, default: 'global', unique: true },
  webVersion: { type: Number, default: 0 },
  deviceVersion: { type: Number, default: 0 },
});

const SyncState: Model<ISyncState> = mongoose.models.SyncState || mongoose.model<ISyncState>('SyncState', SyncStateSchema);

export default SyncState;

