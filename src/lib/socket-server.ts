import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import connectDB from './mongodb';
import Session from '@/models/Session';
import StudentSession from '@/models/StudentSession';

let io: SocketIOServer | null = null;

export function initializeSocket(server: HTTPServer) {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
    },
    path: '/api/socket',
  });

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

        socket.join(data.sessionCode);

        if (data.role === 'lecturer') {
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

          // Notify lecturer
          socket.to(data.sessionCode).emit('student-joined', {
            studentId: studentSession._id.toString(),
            studentName: data.studentName,
            socketId: socket.id,
          });

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
            socket.to(session.sessionCode).emit('student-left', {
              studentId: studentSession._id.toString(),
              studentName: studentSession.studentName,
            });
          }
        }
      } catch (error) {
        console.error('Disconnect error:', error);
      }
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

