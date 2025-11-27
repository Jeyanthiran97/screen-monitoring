'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Monitor, Loader2, Video, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { joinSessionSchema, type JoinSessionInput } from '@/lib/validations/student';

interface Session {
  _id: string;
  sessionCode: string;
  modeType: 'internet' | 'lan';
  shareType: 'full-screen' | 'partial';
}

export default function JoinSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionCode = params.sessionCode as string;
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const form = useForm<JoinSessionInput>({
    resolver: zodResolver(joinSessionSchema),
    defaultValues: {
      studentName: '',
    },
  });

  useEffect(() => {
    fetchSession();
    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop());
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (previewStream && previewVideoRef.current) {
      previewVideoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionCode}`);
      if (!response.ok) {
        toast.error('Session not found');
        router.push('/');
        return;
      }
      const data = await response.json();
      setSession(data.session);
    } catch (error) {
      toast.error('Failed to load session');
    } finally {
      setIsLoading(false);
    }
  };

  const startPreview = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: session?.shareType === 'full-screen'
          ? { displaySurface: 'monitor' as any }
          : true,
        audio: false,
      };

      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      setPreviewStream(stream);

      // Handle stop sharing
      stream.getVideoTracks()[0].onended = () => {
        setIsSharing(false);
        setPreviewStream(null);
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = null;
        }
      };
    } catch (error) {
      toast.error('Failed to access screen. Please grant permission.');
    }
  };

  const setupWebRTC = (modeType: 'internet' | 'lan') => {
    const configuration: RTCConfiguration = {
      iceServers:
        modeType === 'internet'
          ? [
              { urls: 'stun:stun.l.google.com:19302' },
              // Add TURN server here if needed
            ]
          : [],
    };

    const pc = new RTCPeerConnection(configuration);

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        // Will be sent when lecturer connects
        const lecturerSocketId = (window as any).lecturerSocketId;
        if (lecturerSocketId) {
          socketRef.current.emit('ice-candidate', {
            candidate: event.candidate,
            targetSocketId: lecturerSocketId,
          });
        }
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const onSubmit = async (data: JoinSessionInput) => {
    if (!session || !previewStream) {
      toast.error('Please start screen preview first');
      return;
    }

    setIsJoining(true);

    try {
      // Connect to Socket.IO
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      // Use polling-only transport for Vercel compatibility
      // Vercel serverless functions don't support long-lived WebSocket connections
      // For production, consider using a separate Socket.IO server (Railway, Render, etc.)
      const socket = io(socketUrl, {
        path: '/api/socket',
        transports: ['polling'], // Polling-only for Vercel serverless compatibility
        upgrade: false, // Disable upgrade to websocket
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Student socket connected:', socket.id);
        socket.emit('join-session', {
          sessionCode,
          studentName: data.studentName,
        });
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        toast.error('Failed to connect to server. Please try again.');
        setIsJoining(false);
      });

      socket.on('error', (error: { message: string }) => {
        console.error('Socket error:', error);
        toast.error(error.message || 'An error occurred');
        setIsJoining(false);
      });

      let lecturerSocketId: string | null = null;

      socket.on('lecturer-connected', (data: { lecturerSocketId: string }) => {
        lecturerSocketId = data.lecturerSocketId;
        (window as any).lecturerSocketId = data.lecturerSocketId;
        if (isConnected && localStreamRef.current) {
          // Create offer when lecturer connects
          createOffer();
        }
      });

      socket.on('session-joined', async (sessionData) => {
        setIsConnected(true);
        setIsSharing(true);
        localStreamRef.current = previewStream;

        // Setup WebRTC
        setupWebRTC(session.modeType);

        // Wait for lecturer to connect or create offer immediately
        if (lecturerSocketId) {
          createOffer();
        }
      });

      const createOffer = async () => {
        if (!peerConnectionRef.current || !lecturerSocketId) return;

        try {
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);

          socket.emit('offer', {
            offer,
            targetSocketId: lecturerSocketId,
          });
        } catch (error) {
          console.error('Error creating offer:', error);
        }
      };

      socket.on('answer', async (data: { answer: RTCSessionDescriptionInit }) => {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        }
      });

      socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
        if (peerConnectionRef.current && data.candidate) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }
      });

      socket.on('error', (error: { message: string }) => {
        toast.error(error.message);
        setIsJoining(false);
      });

      toast.success('Connected to session!');
    } catch (error) {
      toast.error('Failed to join session');
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="container mx-auto max-w-4xl py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="h-6 w-6 text-blue-600" />
              <CardTitle>Join Monitoring Session</CardTitle>
            </div>
            <CardDescription>
              Session Code: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{sessionCode}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!previewStream ? (
              <div className="text-center py-8">
                <Video className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Start by sharing your screen to preview
                </p>
                <Button onClick={startPreview}>
                  <Monitor className="h-4 w-4 mr-2" />
                  Start Screen Preview
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <video
                    ref={previewVideoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg border bg-black"
                    style={{ maxHeight: '500px' }}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      previewStream.getTracks().forEach((track) => track.stop());
                      setPreviewStream(null);
                      if (previewVideoRef.current) {
                        previewVideoRef.current.srcObject = null;
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {!isConnected ? (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="studentName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter your name"
                                {...field}
                                disabled={isJoining}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isJoining}>
                        {isJoining ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Joining...
                          </>
                        ) : (
                          'Join Session'
                        )}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                      <Monitor className="h-5 w-5" />
                      <span className="font-semibold">Screen sharing active</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your screen is being monitored by the lecturer
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

