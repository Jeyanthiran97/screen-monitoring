import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './lib/mongodb';
import Session from './models/Session';
import StudentSession from './models/StudentSession';

dotenv.config();

const app = express();
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || '*',
  credentials: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/socket.io',
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Connect to MongoDB
connectDB().catch((error) => {
  console.error('❌ Failed to connect to MongoDB:', error);
  process.exit(1);
});

// Socket.IO connection handler
io.on('connection', async (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-session', async (data: { sessionCode: string; studentName?: string; role?: string }) => {
    try {
      await connectDB();
      const session = await Session.findOne({ sessionCode: data.sessionCode });

      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      // Check if session is expired
      if (session.isExpired() || !session.isActive) {
        socket.emit('error', { message: 'Session has expired or is inactive' });
        return;
      }

      socket.join(data.sessionCode);

      if (data.role === 'lecturer') {
        console.log(`Lecturer joined session ${data.sessionCode}, socket ID: ${socket.id}`);
        // Lecturer joined - notify all students
        socket.to(data.sessionCode).emit('lecturer-connected', {
          lecturerSocketId: socket.id,
        });
        socket.emit('lecturer-joined', {
          sessionId: session._id.toString(),
          modeType: session.modeType,
          shareType: session.shareType,
        });
      } else if (data.studentName) {
        // Check device limit
        const activeStudents = await StudentSession.countDocuments({
          sessionId: session._id,
          isActive: true,
        });

        if (session.deviceLimit && activeStudents >= session.deviceLimit) {
          socket.emit('error', { 
            message: `Device limit reached. Maximum ${session.deviceLimit} device(s) allowed.` 
          });
          
          // Notify lecturer about limit exceeded
          socket.to(data.sessionCode).emit('device-limit-exceeded', {
            sessionCode: data.sessionCode,
            currentCount: activeStudents,
            limit: session.deviceLimit,
            attemptedBy: data.studentName,
          });
          return;
        }

        // Student joined
        const studentSession = await StudentSession.findOneAndUpdate(
          { sessionId: session._id, socketId: socket.id },
          {
            sessionId: session._id,
            studentName: data.studentName,
            socketId: socket.id,
            isActive: true,
            connectedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        // Get updated count
        const newCount = await StudentSession.countDocuments({
          sessionId: session._id,
          isActive: true,
        });

        // Notify lecturer
        io.to(data.sessionCode).emit('student-joined', {
          studentId: studentSession._id.toString(),
          studentName: data.studentName,
          socketId: socket.id,
          deviceCount: newCount,
          deviceLimit: session.deviceLimit,
        });
        
        console.log(`Student ${data.studentName} joined session ${data.sessionCode}. Notified room.`);

        socket.emit('session-joined', {
          sessionId: session._id.toString(),
          modeType: session.modeType,
          shareType: session.shareType,
        });
      }
    } catch (error) {
      console.error('Join session error:', error);
      socket.emit('error', { message: 'Failed to join session' });
    }
  });

  socket.on('offer', (data: { offer: RTCSessionDescriptionInit; targetSocketId: string }) => {
    socket.to(data.targetSocketId).emit('offer', {
      offer: data.offer,
      socketId: socket.id,
    });
  });

  socket.on('lecturer-connected', (data: { lecturerSocketId: string; targetSocketId: string }) => {
    socket.to(data.targetSocketId).emit('lecturer-connected', {
      lecturerSocketId: data.lecturerSocketId,
    });
  });

  socket.on('answer', (data: { answer: RTCSessionDescriptionInit; targetSocketId: string }) => {
    socket.to(data.targetSocketId).emit('answer', {
      answer: data.answer,
      socketId: socket.id,
    });
  });

  socket.on('ice-candidate', (data: { candidate: RTCIceCandidateInit; targetSocketId: string }) => {
    socket.to(data.targetSocketId).emit('ice-candidate', {
      candidate: data.candidate,
      socketId: socket.id,
    });
  });

  socket.on('disconnect', async () => {
    try {
      await connectDB();
      const studentSession = await StudentSession.findOne({ socketId: socket.id });

      if (studentSession) {
        studentSession.isActive = false;
        studentSession.disconnectedAt = new Date();
        await studentSession.save();

        const session = await Session.findById(studentSession.sessionId);
        if (session) {
          const newCount = await StudentSession.countDocuments({
            sessionId: session._id,
            isActive: true,
          });

          socket.to(session.sessionCode).emit('student-left', {
            studentId: studentSession._id.toString(),
            studentName: studentSession.studentName,
            deviceCount: newCount,
            deviceLimit: session.deviceLimit,
          });
        }
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
  console.log(`📡 Socket.IO path: /socket.io`);
  console.log(`🌐 CORS origin: ${process.env.ALLOWED_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || '*'}`);
  console.log(`💾 MongoDB: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
});

