import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStudentSession extends Document {
  sessionId: mongoose.Types.ObjectId;
  studentName: string;
  socketId: string;
  peerId?: string;
  connectedAt: Date;
  disconnectedAt?: Date;
  isActive: boolean;
}

const StudentSessionSchema = new Schema<IStudentSession>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    socketId: {
      type: String,
      required: true,
      index: true,
    },
    peerId: {
      type: String,
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
    disconnectedAt: {
      type: Date,
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

const StudentSession: Model<IStudentSession> =
  mongoose.models.StudentSession || mongoose.model<IStudentSession>('StudentSession', StudentSessionSchema);

export default StudentSession;

