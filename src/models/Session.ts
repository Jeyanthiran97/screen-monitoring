import mongoose, { Schema, Document, Model } from 'mongoose';

export type ModeType = 'internet' | 'lan';
export type ShareType = 'full-screen' | 'partial';

export interface ISession extends Document {
  lecturerId: mongoose.Types.ObjectId;
  modeType: ModeType;
  shareType: ShareType;
  sessionCode: string;
  createdAt: Date;
  updatedAt: Date;
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
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique session code before saving
SessionSchema.pre('save', async function (next) {
  if (!this.isNew || this.sessionCode) return next();
  
  const generateCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };
  
  let code = generateCode();
  let exists = await mongoose.models.Session?.findOne({ sessionCode: code });
  
  while (exists) {
    code = generateCode();
    exists = await mongoose.models.Session?.findOne({ sessionCode: code });
  }
  
  this.sessionCode = code;
  next();
});

const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

export default Session;

