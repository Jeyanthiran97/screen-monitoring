'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { Monitor, Maximize2, Minimize2, Users, Loader2, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Student {
  id: string;
  studentName: string;
  socketId: string;
  connectedAt: string;
}

export default function MonitorSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionCode = params.sessionCode as string;
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const videoRefsRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    fetchStudents();
    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
    };
  }, [sessionCode]);

  const fetchStudents = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionCode}/students`);
      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }
      const data = await response.json();
      setStudents(data.students);
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const connectSocket = () => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
      path: '/api/socket',
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-session', { sessionCode, role: 'lecturer' });
    });

    socket.on('student-joined', async (data: { studentId: string; studentName: string; socketId: string }) => {
      toast.success(`${data.studentName} joined the session`);
      setStudents((prev) => [
        ...prev,
        {
          id: data.studentId,
          studentName: data.studentName,
          socketId: data.socketId,
          connectedAt: new Date().toISOString(),
        },
      ]);

      // Setup WebRTC connection
      await setupPeerConnection(data.socketId, data.studentId);
    });

    socket.on('student-left', (data: { studentId: string; studentName: string }) => {
      toast.info(`${data.studentName} left the session`);
      setStudents((prev) => prev.filter((s) => s.id !== data.studentId));

      // Cleanup peer connection
      const pc = peerConnectionsRef.current.get(data.studentId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(data.studentId);
      }
    });

    socket.on('offer', async (data: { offer: RTCSessionDescriptionInit; socketId: string }) => {
      const student = students.find((s) => s.socketId === data.socketId);
      if (!student) return;

      const pc = peerConnectionsRef.current.get(student.id) || (await setupPeerConnection(data.socketId, student.id));

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer', {
        answer,
        targetSocketId: data.socketId,
      });
    });

    socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit; socketId: string }) => {
      const student = students.find((s) => s.socketId === data.socketId);
      if (!student) return;

      const pc = peerConnectionsRef.current.get(student.id);
      if (pc && data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });
  };

  const setupPeerConnection = async (socketId: string, studentId: string): Promise<RTCPeerConnection> => {
    // Get session mode from API to determine ICE servers
    const sessionResponse = await fetch(`/api/sessions/${sessionCode}`);
    const sessionData = await sessionResponse.json();
    const modeType = sessionData.session?.modeType || 'internet';

    const configuration: RTCConfiguration = {
      iceServers:
        modeType === 'internet'
          ? [{ urls: 'stun:stun.l.google.com:19302' }]
          : [],
    };

    const pc = new RTCPeerConnection(configuration);
    peerConnectionsRef.current.set(studentId, pc);

    pc.ontrack = (event) => {
      const videoElement = videoRefsRef.current.get(studentId);
      if (videoElement && event.streams[0]) {
        videoElement.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          targetSocketId: socketId,
        });
      }
    };

    return pc;
  };

  const getGridCols = (count: number) => {
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    if (count <= 16) return 'grid-cols-4';
    return 'grid-cols-5';
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Monitor className="h-6 w-6 text-blue-400" />
              <h1 className="text-xl font-bold">Monitoring Session</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Users className="h-4 w-4" />
              <span>{students.length} student{students.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            Session: <code className="bg-gray-700 px-2 py-1 rounded">{sessionCode}</code>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {students.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Monitor className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">No students connected yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Share the join link with students to start monitoring
                </p>
              </div>
            </CardContent>
          </Card>
        ) : isFullScreen && selectedStudent ? (
          <div className="relative">
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsFullScreen(false);
                  setSelectedStudent(null);
                }}
              >
                <Minimize2 className="h-4 w-4 mr-2" />
                Exit Full Screen
              </Button>
            </div>
            <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <video
                ref={(el) => {
                  if (el) videoRefsRef.current.set(selectedStudent, el);
                }}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-4 left-4 bg-black/50 px-4 py-2 rounded">
                <p className="text-white font-semibold">
                  {students.find((s) => s.id === selectedStudent)?.studentName}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className={`grid ${getGridCols(students.length)} gap-4`}>
            {students.map((student) => (
              <Card
                key={student.id}
                className="bg-gray-800 border-gray-700 cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => {
                  setSelectedStudent(student.id);
                  setIsFullScreen(true);
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm">{student.studentName}</CardTitle>
                    <Button variant="ghost" size="sm">
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="bg-black rounded-b-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                    <video
                      ref={(el) => {
                        if (el) videoRefsRef.current.set(student.id, el);
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

