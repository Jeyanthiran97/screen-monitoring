'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Monitor, LogOut, PlusCircle, Copy, ExternalLink, Loader2, Globe, Wifi } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createSessionSchema, type CreateSessionInput } from '@/lib/validations/session';

interface Session {
  _id: string;
  sessionCode: string;
  modeType: 'internet' | 'lan';
  shareType: 'full-screen' | 'partial';
  createdAt: string;
}

export default function LecturerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<CreateSessionInput>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      modeType: 'internet',
      shareType: 'full-screen',
    },
  });

  useEffect(() => {
    checkAuth();
    fetchSessions();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      if (data.user.role !== 'lecturer') {
        router.push('/login');
        return;
      }
      if (!data.user.isApproved) {
        toast.error('Your account is pending admin approval');
        router.push('/login');
        return;
      }
      setUser(data.user);
    } catch (error) {
      router.push('/login');
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const data = await response.json();
      setSessions(data.sessions);
    } catch (error) {
      toast.error('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CreateSessionInput) => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Failed to create session');
        return;
      }

      toast.success('Session created successfully!');
      form.reset();
      fetchSessions();
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const copyJoinLink = (sessionCode: string) => {
    const link = `${window.location.origin}/join/${sessionCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Join link copied to clipboard!');
  };

  const openMonitoringPanel = (sessionCode: string) => {
    window.open(`/lecturer/monitor/${sessionCode}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Monitor className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold">Lecturer Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="create" className="space-y-6">
          <TabsList>
            <TabsTrigger value="create">Create Session</TabsTrigger>
            <TabsTrigger value="sessions">My Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Create Monitoring Session</CardTitle>
                <CardDescription>
                  Create a new session for students to join and share their screens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="modeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Connection Mode</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-2 gap-4">
                              <Card
                                className={`cursor-pointer transition-all ${
                                  field.value === 'internet'
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                                    : 'hover:border-gray-300'
                                }`}
                                onClick={() => field.onChange('internet')}
                              >
                                <CardContent className="pt-6">
                                  <div className="flex flex-col items-center text-center space-y-2">
                                    <Globe className="h-8 w-8 text-blue-600" />
                                    <h3 className="font-semibold">Internet Mode</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      Remote monitoring with STUN/TURN servers
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                              <Card
                                className={`cursor-pointer transition-all ${
                                  field.value === 'lan'
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                                    : 'hover:border-gray-300'
                                }`}
                                onClick={() => field.onChange('lan')}
                              >
                                <CardContent className="pt-6">
                                  <div className="flex flex-col items-center text-center space-y-2">
                                    <Wifi className="h-8 w-8 text-blue-600" />
                                    <h3 className="font-semibold">LAN Mode</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      Local network only, no internet required
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="shareType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Screen Sharing Mode</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-2 gap-4">
                              <Card
                                className={`cursor-pointer transition-all ${
                                  field.value === 'full-screen'
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                                    : 'hover:border-gray-300'
                                }`}
                                onClick={() => field.onChange('full-screen')}
                              >
                                <CardContent className="pt-6">
                                  <div className="flex flex-col items-center text-center space-y-2">
                                    <Monitor className="h-8 w-8 text-blue-600" />
                                    <h3 className="font-semibold">Full-Screen Forced</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      Students share entire screen automatically
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                              <Card
                                className={`cursor-pointer transition-all ${
                                  field.value === 'partial'
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                                    : 'hover:border-gray-300'
                                }`}
                                onClick={() => field.onChange('partial')}
                              >
                                <CardContent className="pt-6">
                                  <div className="flex flex-col items-center text-center space-y-2">
                                    <Monitor className="h-8 w-8 text-blue-600" />
                                    <h3 className="font-semibold">Partial (Zoom-style)</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      Students choose screen/window/tab
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Choose how students will share their screens
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isCreating}>
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Create Session
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>My Sessions</CardTitle>
                <CardDescription>Recent monitoring sessions you've created</CardDescription>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No sessions yet. Create your first session!</p>
                ) : (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <Card key={session._id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">Session: {session.sessionCode}</h3>
                                <span className={`px-2 py-1 text-xs rounded ${
                                  session.modeType === 'internet'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                }`}>
                                  {session.modeType === 'internet' ? 'Internet' : 'LAN'}
                                </span>
                                <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                  {session.shareType === 'full-screen' ? 'Full-Screen' : 'Partial'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Created: {new Date(session.createdAt).toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-500 mt-2">
                                Join Link: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                  {typeof window !== 'undefined' ? `${window.location.origin}/join/${session.sessionCode}` : ''}
                                </code>
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyJoinLink(session.sessionCode)}
                              >
                                <Copy className="h-4 w-4 mr-1" />
                                Copy Link
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => openMonitoringPanel(session.sessionCode)}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Monitor
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

