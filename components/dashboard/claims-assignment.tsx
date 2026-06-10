'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface User {
  _id: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface UserLoad {
  userId: string;
  assignedClaimsCount: number;
  claimLimit: number;
}

export function ClaimsAssignment() {
  const [users, setUsers] = useState<User[]>([]);
  const [userLoads, setUserLoads] = useState<Map<string, UserLoad>>(new Map());
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [claimLimit, setClaimLimit] = useState('10');
  const [claimIds, setClaimIds] = useState('');
  const [queuedClaims, setQueuedClaims] = useState<string[]>([]);
  const [showQueue, setShowQueue] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchQueuedClaims();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      const activeUsers = data.users.filter((u: User) => u.isActive);
      setUsers(activeUsers);

      // Fetch load for each user
      for (const user of activeUsers) {
        await fetchUserLoad(user._id);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLoad = async (userId: string) => {
    try {
      const response = await fetch(`/api/claims/${userId}?action=load`);
      if (!response.ok) throw new Error('Failed to fetch load');
      const data = await response.json();
      setUserLoads((prev) => new Map(prev).set(userId, data));
    } catch (error) {
      console.error('Error fetching user load:', error);
    }
  };

  const fetchQueuedClaims = async () => {
    try {
      const response = await fetch('/api/claims/queue');
      if (response.ok) {
        const data = await response.json();
        setQueuedClaims(data.queued || []);
      }
    } catch (error) {
      console.error('Error fetching queued claims:', error);
    }
  };

  const handleSetLimit = async () => {
    if (!selectedUser || !claimLimit) return;

    try {
      const response = await fetch(`/api/claims/${selectedUser._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setLimit',
          limit: parseInt(claimLimit),
        }),
      });

      if (!response.ok) throw new Error('Failed to set limit');

      await fetchUserLoad(selectedUser._id);

      toast({
        title: 'Success',
        description: `Claim limit set to ${claimLimit}`,
      });
    } catch (error) {
      console.error('Error setting limit:', error);
      toast({
        title: 'Error',
        description: 'Failed to set claim limit',
        variant: 'destructive',
      });
    }
  };

  const handleAssignClaims = async () => {
    if (!selectedUser || !claimIds.trim()) return;

    try {
      const ids = claimIds
        .split('\n')
        .map((id) => id.trim())
        .filter((id) => id);

      const response = await fetch(`/api/claims/${selectedUser._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          claimIds: ids,
        }),
      });

      if (!response.ok) throw new Error('Failed to assign claims');
      const data = await response.json();

      await fetchUserLoad(selectedUser._id);
      await fetchQueuedClaims();

      toast({
        title: 'Success',
        description: `${data.assigned.length} claims assigned, ${data.queued.length} queued`,
      });

      setClaimIds('');
      setOpenDialog(false);
    } catch (error) {
      console.error('Error assigning claims:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign claims',
        variant: 'destructive',
      });
    }
  };

  const handleProcessQueue = async () => {
    try {
      const response = await fetch('/api/claims/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to process queue');
      const data = await response.json();

      await fetchUsers();
      await fetchQueuedClaims();

      toast({
        title: 'Success',
        description: `Queue processed. ${data.remainingInQueue} claims still in queue`,
      });
    } catch (error) {
      console.error('Error processing queue:', error);
      toast({
        title: 'Error',
        description: 'Failed to process queue',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <ClaimsAssignmentSkeleton />;
  }

  const getLoadPercentage = (userId: string) => {
    const load = userLoads.get(userId);
    if (!load || load.claimLimit === 0) return 0;
    return (load.assignedClaimsCount / load.claimLimit) * 100;
  };

  const isUserAtCapacity = (userId: string) => {
    const load = userLoads.get(userId);
    return load && load.assignedClaimsCount >= load.claimLimit;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Claims Assignment</h2>
        <div className="flex gap-2">
          {queuedClaims.length > 0 && (
            <>
              <Badge variant="destructive" className="text-base">
                {queuedClaims.length} in queue
              </Badge>
              <Button onClick={handleProcessQueue}>Process Queue</Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Claim Limit</TableHead>
              <TableHead>Assigned Claims</TableHead>
              <TableHead>Load</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const load = userLoads.get(user._id);
              const percentage = getLoadPercentage(user._id);
              const atCapacity = isUserAtCapacity(user._id);

              return (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    {load?.claimLimit || 'Not Set'}
                  </TableCell>
                  <TableCell>
                    {load?.assignedClaimsCount || 0}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="w-32 h-2 bg-gray-200 rounded">
                        <div
                          className={`h-full rounded ${
                            percentage > 75
                              ? 'bg-red-500'
                              : percentage > 50
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {Math.round(percentage)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        atCapacity ? 'destructive' : 'default'
                      }
                    >
                      {atCapacity ? 'At Capacity' : 'Available'}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setClaimLimit(
                              (load?.claimLimit || 10).toString()
                            );
                          }}
                        >
                          Manage
                        </Button>
                      </DialogTrigger>
                      {selectedUser?._id === user._id && (
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>
                              Manage Claims for {user.email}
                            </DialogTitle>
                            <DialogDescription>
                              Set claim limits and assign claims to this user
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-6">
                            {/* Set Limit Section */}
                            <div className="space-y-2">
                              <Label htmlFor="claim-limit">
                                Claims Limit per User
                              </Label>
                              <div className="flex gap-2">
                                <Input
                                  id="claim-limit"
                                  type="number"
                                  min="1"
                                  value={claimLimit}
                                  onChange={(e) =>
                                    setClaimLimit(e.target.value)
                                  }
                                  placeholder="Enter claim limit"
                                />
                                <Button
                                  onClick={handleSetLimit}
                                >
                                  Set Limit
                                </Button>
                              </div>
                            </div>

                            {/* Assign Claims Section */}
                            <div className="space-y-2">
                              <Label htmlFor="claim-ids">
                                Claim IDs to Assign (one per line)
                              </Label>
                              <textarea
                                id="claim-ids"
                                className="w-full h-32 p-2 border rounded-md font-mono text-sm"
                                value={claimIds}
                                onChange={(e) =>
                                  setClaimIds(e.target.value)
                                }
                                placeholder="Enter claim IDs, one per line"
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setOpenDialog(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleAssignClaims}
                                >
                                  Assign Claims
                                </Button>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      )}
                    </Dialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {users.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No active users found
        </div>
      )}

      {/* Queued Claims Section */}
      {showQueue && queuedClaims.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-2">Queued Claims</h3>
          <div className="space-y-1">
            {queuedClaims.map((claimId) => (
              <div
                key={claimId}
                className="text-sm text-gray-600"
              >
                {claimId}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClaimsAssignmentSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48 bg-slate-150" />
        <Skeleton className="h-9 w-32 bg-slate-100" />
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Skeleton className="h-4 w-12 bg-slate-200" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16 bg-slate-200" /></TableHead>
              <TableHead><Skeleton className="h-4 w-24 bg-slate-200" /></TableHead>
              <TableHead><Skeleton className="h-4 w-10 bg-slate-200" /></TableHead>
              <TableHead><Skeleton className="h-4 w-12 bg-slate-200" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16 bg-slate-200" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-36 bg-slate-100" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 bg-slate-100" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 bg-slate-100" /></TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Skeleton className="w-32 h-2 bg-slate-100 rounded" />
                    <Skeleton className="h-3 w-8 bg-slate-100" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-5.5 w-16 bg-slate-100 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-8 w-16 bg-slate-100 rounded-md" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
