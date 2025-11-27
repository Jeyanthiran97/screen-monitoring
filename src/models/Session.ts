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
  expirationTime?: number; // in minutes from creation
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
      required: false, // Will be generated in pre-save hook
      unique: true,
      index: true,
      sparse: true, // Allow null values for uniqueness check
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
      type: Number, // minutes from creation
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

// Generate unique session code before saving
SessionSchema.pre('save', async function () {
  // Only generate code for new documents that don't have a sessionCode
  if (this.sessionCode) {
    return;
  }
  
  const generateCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };
  
  let code = generateCode();
  const SessionModel = mongoose.models.Session || mongoose.model('Session', SessionSchema);
  let exists = await SessionModel.findOne({ sessionCode: code });
  
  // Keep generating until we find a unique code (max 100 attempts)
  let attempts = 0;
  while (exists && attempts < 100) {
    code = generateCode();
    exists = await SessionModel.findOne({ sessionCode: code });
    attempts++;
  }
  
  if (attempts >= 100) {
    throw new Error('Failed to generate unique session code');
  }
  
  this.sessionCode = code;
});

// Method to check if session is expired
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

