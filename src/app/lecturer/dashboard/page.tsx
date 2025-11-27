'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Monitor, LogOut, PlusCircle, Copy, ExternalLink, Loader2, Globe, Wifi, Edit, Eye, Clock, Calendar, Users, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createSessionSchema, type CreateSessionInput } from '@/lib/validations/session';

interface Session {
  _id: string;
  sessionCode: string;
  modeType: 'internet' | 'lan';
  shareType: 'full-screen' | 'partial';
  expirationType: 'no-expiration' | 'date-duration' | 'time-based';
  expirationDate?: string;
  expirationTime?: number;
  deviceLimit?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  isExpired?: boolean;
}

export default function LecturerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const form = useForm<CreateSessionInput>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      modeType: 'internet',
      shareType: 'full-screen',
      expirationType: 'no-expiration',
    },
  });

  const editForm = useForm<CreateSessionInput>({
    resolver: zodResolver(createSessionSchema),
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
        if (result.details && Array.isArray(result.details)) {
          result.details.forEach((error: any) => {
            const fieldPath = error.path || [];
            if (fieldPath.length > 0) {
              const fieldName = fieldPath[0] as keyof CreateSessionInput;
              form.setError(fieldName, {
                type: 'server',
                message: error.message || 'Invalid value',
              });
            }
          });
        } else {
          toast.error(result.error || 'Failed to create session');
        }
        return;
      }

      toast.success('Session created successfully!');
      form.reset({
        modeType: 'internet',
        shareType: 'full-screen',
        expirationType: 'no-expiration',
      });
      await fetchSessions();
      setSelectedSession(result.session);
      setIsDetailsDialogOpen(true);
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const onEditSubmit = async (data: CreateSessionInput) => {
    if (!editingSession) return;

    try {
      const response = await fetch(`/api/sessions/${editingSession.sessionCode}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.details && Array.isArray(result.details)) {
          result.details.forEach((error: any) => {
            const fieldPath = error.path || [];
            if (fieldPath.length > 0) {
              const fieldName = fieldPath[0] as keyof CreateSessionInput;
              editForm.setError(fieldName, {
                type: 'server',
                message: error.message || 'Invalid value',
              });
            }
          });
        } else {
          toast.error(result.error || 'Failed to update session');
        }
        return;
      }

      toast.success('Session updated successfully!');
      setIsEditDialogOpen(false);
      setEditingSession(null);
      await fetchSessions();
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    }
  };

  const handleEdit = (session: Session) => {
    setEditingSession(session);
    editForm.reset({
      modeType: session.modeType,
      shareType: session.shareType,
      expirationType: session.expirationType,
      expirationDate: session.expirationDate ? new Date(session.expirationDate).toISOString().split('T')[0] : undefined,
      expirationTime: session.expirationTime,
      deviceLimit: session.deviceLimit,
    });
    setIsEditDialogOpen(true);
  };

  const handleViewDetails = async (sessionCode: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionCode}`);
      if (!response.ok) throw new Error('Failed to fetch session');
      const data = await response.json();
      setSelectedSession(data.session);
      setIsDetailsDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load session details');
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

  const getExpirationText = (session: Session) => {
    if (session.expirationType === 'no-expiration') {
      return 'No expiration';
    }
    if (session.expirationType === 'date-duration' && session.expirationDate) {
      return `Expires: ${new Date(session.expirationDate).toLocaleString()}`;
    }
    if (session.expirationType === 'time-based' && session.expirationTime) {
      const expirationDate = new Date(session.createdAt);
      expirationDate.setMinutes(expirationDate.getMinutes() + session.expirationTime);
      return `Expires: ${expirationDate.toLocaleString()}`;
    }
    return 'Unknown';
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

                    <FormField
                      control={form.control}
                      name="expirationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiration Settings</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-3 gap-4">
                              <Card
                                className={`cursor-pointer transition-all ${
                                  field.value === 'no-expiration'
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                                    : 'hover:border-gray-300'
                                }`}
                                onClick={() => {
                                  field.onChange('no-expiration');
                                  form.setValue('expirationDate', undefined);
                                  form.setValue('expirationTime', undefined);
                                }}
                              >
                                <CardContent className="pt-6">
                                  <div className="flex flex-col items-center text-center space-y-2">
                                    <Clock className="h-8 w-8 text-blue-600" />
                                    <h3 className="font-semibold text-sm">No Expiration</h3>
                                  </div>
                                </CardContent>
                              </Card>
                              <Card
                                className={`cursor-pointer transition-all ${
                                  field.value === 'date-duration'
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                                    : 'hover:border-gray-300'
                                }`}
                                onClick={() => field.onChange('date-duration')}
                              >
                                <CardContent className="pt-6">
                                  <div className="flex flex-col items-center text-center space-y-2">
                                    <Calendar className="h-8 w-8 text-blue-600" />
                                    <h3 className="font-semibold text-sm">Date Duration</h3>
                                  </div>
                                </CardContent>
                              </Card>
                              <Card
                                className={`cursor-pointer transition-all ${
                                  field.value === 'time-based'
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                                    : 'hover:border-gray-300'
                                }`}
                                onClick={() => {
                                  field.onChange('time-based');
                                  form.setValue('expirationDate', undefined);
                                }}
                              >
                                <CardContent className="pt-6">
                                  <div className="flex flex-col items-center text-center space-y-2">
                                    <Clock className="h-8 w-8 text-blue-600" />
                                    <h3 className="font-semibold text-sm">Time Based</h3>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch('expirationType') === 'date-duration' && (
                      <FormField
                        control={form.control}
                        name="expirationDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiration Date & Time</FormLabel>
                            <FormControl>
                              <Input
                                type="datetime-local"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch('expirationType') === 'time-based' && (
                      <FormField
                        control={form.control}
                        name="expirationTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiration Time (minutes)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="e.g., 60 for 1 hour"
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormDescription>
                              Session will expire after this many minutes from creation
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="deviceLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Device Limit (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="e.g., 30"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormDescription>
                            Maximum number of devices that can connect. You'll be notified if exceeded.
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
                      <Card key={session._id} className={session.isExpired || !session.isActive ? 'opacity-60' : ''}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
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
                                {session.isExpired || !session.isActive ? (
                                  <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                    Expired
                                  </span>
                                ) : null}
                              </div>
                              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                <p>Created: {new Date(session.createdAt).toLocaleString()}</p>
                                <p>{getExpirationText(session)}</p>
                                {session.deviceLimit && (
                                  <p className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    Device Limit: {session.deviceLimit}
                                  </p>
                                )}
                              </div>
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
                                onClick={() => handleViewDetails(session.sessionCode)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(session)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyJoinLink(session.sessionCode)}
                              >
                                <Copy className="h-4 w-4 mr-1" />
                                Copy
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => openMonitoringPanel(session.sessionCode)}
                                disabled={session.isExpired || !session.isActive}
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

      {/* Session Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
            <DialogDescription>
              Complete information about your monitoring session
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Session Code</p>
                  <p className="text-lg font-semibold">{selectedSession.sessionCode}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className={`text-lg font-semibold ${selectedSession.isExpired || !selectedSession.isActive ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedSession.isExpired || !selectedSession.isActive ? 'Expired/Inactive' : 'Active'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Connection Mode</p>
                  <p className="text-lg">{selectedSession.modeType === 'internet' ? 'Internet' : 'LAN'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Screen Sharing</p>
                  <p className="text-lg">{selectedSession.shareType === 'full-screen' ? 'Full-Screen Forced' : 'Partial'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Expiration</p>
                  <p className="text-lg">{getExpirationText(selectedSession)}</p>
                </div>
                {selectedSession.deviceLimit && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Device Limit</p>
                    <p className="text-lg">{selectedSession.deviceLimit} devices</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Created</p>
                  <p className="text-lg">{new Date(selectedSession.createdAt).toLocaleString()}</p>
                </div>
                {selectedSession.updatedAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Last Updated</p>
                    <p className="text-lg">{new Date(selectedSession.updatedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Join Link</p>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded text-sm">
                    {typeof window !== 'undefined' ? `${window.location.origin}/join/${selectedSession.sessionCode}` : ''}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyJoinLink(selectedSession.sessionCode)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
            <DialogDescription>
              Update your monitoring session settings
            </DialogDescription>
          </DialogHeader>
          {editingSession && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
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
                                <h3 className="font-semibold">Full-Screen</h3>
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
                                <h3 className="font-semibold">Partial</h3>
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
                  control={editForm.control}
                  name="expirationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Settings</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-3 gap-4">
                          <Card
                            className={`cursor-pointer transition-all ${
                              field.value === 'no-expiration'
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                                : 'hover:border-gray-300'
                            }`}
                            onClick={() => {
                              field.onChange('no-expiration');
                              editForm.setValue('expirationDate', undefined);
                              editForm.setValue('expirationTime', undefined);
                            }}
                          >
                            <CardContent className="pt-6">
                              <div className="flex flex-col items-center text-center space-y-2">
                                <Clock className="h-8 w-8 text-blue-600" />
                                <h3 className="font-semibold text-sm">No Expiration</h3>
                              </div>
                            </CardContent>
                          </Card>
                          <Card
                            className={`cursor-pointer transition-all ${
                              field.value === 'date-duration'
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                                : 'hover:border-gray-300'
                            }`}
                            onClick={() => field.onChange('date-duration')}
                          >
                            <CardContent className="pt-6">
                              <div className="flex flex-col items-center text-center space-y-2">
                                <Calendar className="h-8 w-8 text-blue-600" />
                                <h3 className="font-semibold text-sm">Date Duration</h3>
                              </div>
                            </CardContent>
                          </Card>
                          <Card
                            className={`cursor-pointer transition-all ${
                              field.value === 'time-based'
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                                : 'hover:border-gray-300'
                            }`}
                            onClick={() => {
                              field.onChange('time-based');
                              editForm.setValue('expirationDate', undefined);
                            }}
                          >
                            <CardContent className="pt-6">
                              <div className="flex flex-col items-center text-center space-y-2">
                                <Clock className="h-8 w-8 text-blue-600" />
                                <h3 className="font-semibold text-sm">Time Based</h3>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {editForm.watch('expirationType') === 'date-duration' && (
                  <FormField
                    control={editForm.control}
                    name="expirationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiration Date & Time</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {editForm.watch('expirationType') === 'time-based' && (
                  <FormField
                    control={editForm.control}
                    name="expirationTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiration Time (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="e.g., 60 for 1 hour"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={editForm.control}
                  name="deviceLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Device Limit (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="e.g., 30"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Update Session
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
