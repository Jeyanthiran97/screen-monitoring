import mongoose, { Schema, Document, Model } from 'mongoose';

export type ModeType = 'internet' | 'lan';
export type ShareType = 'full-screen' | 'partial';
export type ExpirationType = 'no-expiration' | 'date-duration' | 'time-based';

export interface ISession extends Document {
  lecturerId: mongoose.Types.ObjectId;
  modeType: ModeType;
  shareType: ShareType;
  sessionCode: string;
  expirationType: ExpirationType;
  expirationDate?: Date;
  expirationTime?: number;
  deviceLimit?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isExpired(): boolean;
}

const SessionSchema = new Schema<ISession>(
  {
    lecturerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    modeType: {
      type: String,
      enum: ['internet', 'lan'],
      required: true,
    },
    shareType: {
      type: String,
      enum: ['full-screen', 'partial'],
      required: true,
    },
    sessionCode: {
      type: String,
      required: false,
      unique: true,
      index: true,
      sparse: true,
    },
    expirationType: {
      type: String,
      enum: ['no-expiration', 'date-duration', 'time-based'],
      default: 'no-expiration',
      required: true,
    },
    expirationDate: {
      type: Date,
      required: false,
    },
    expirationTime: {
      type: Number,
      required: false,
    },
    deviceLimit: {
      type: Number,
      required: false,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

SessionSchema.methods.isExpired = function (): boolean {
  if (this.expirationType === 'no-expiration') {
    return false;
  }
  
  if (this.expirationType === 'date-duration' && this.expirationDate) {
    return new Date() > this.expirationDate;
  }
  
  if (this.expirationType === 'time-based' && this.expirationTime) {
    const expirationTime = new Date(this.createdAt);
    expirationTime.setMinutes(expirationTime.getMinutes() + this.expirationTime);
    return new Date() > expirationTime;
  }
  
  return false;
};

const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

export default Session;

