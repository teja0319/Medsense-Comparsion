'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';

interface UserClaimLimit {
  userId: string;
  email: string;
  claimLimit: number;
  currentLoad: number;
  queuedCount: number;
}

export function ClaimSettings() {
  const [users, setUsers] = useState<UserClaimLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newLimit, setNewLimit] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      
      // Fetch claim info for each user
      const usersWithLimits = await Promise.all(
        data.users
          .filter((u: any) => u.role === 'user') // Only regular users, not superadmin
          .map(async (user: any) => {
            try {
              const claimsRes = await fetch(`/api/claims/${user._id}`);
              const claimsData = claimsRes.ok ? await claimsRes.json() : {};
              return {
                userId: user._id,
                email: user.email,
                claimLimit: claimsData.limit || 0,
                currentLoad: claimsData.assigned?.length || 0,
                queuedCount: claimsData.queue?.length || 0,
              };
            } catch {
              return {
                userId: user._id,
                email: user.email,
                claimLimit: 0,
                currentLoad: 0,
                queuedCount: 0,
              };
            }
          })
      );
      setUsers(usersWithLimits);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLimit = async (userId: string, limit: number) => {
    if (limit < 0) {
      setMessage({ type: 'error', text: 'Limit must be non-negative' });
      return;
    }

    try {
      setUpdating(userId);
      const response = await fetch(`/api/claims/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setLimit',
          limit: limit,
        }),
      });

      if (!response.ok) throw new Error('Failed to update limit');
      setMessage({ type: 'success', text: `Limit updated to ${limit}` });
      setEditingId(null);
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update claim limit' });
    } finally {
      setUpdating(null);
    }
  };

  const getLoadPercentage = (current: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.round((current / limit) * 100);
  };

  const getLoadColor = (current: number, limit: number) => {
    const percentage = getLoadPercentage(current, limit);
    if (percentage >= 100) return 'bg-red-100 border-red-300';
    if (percentage >= 75) return 'bg-yellow-100 border-yellow-300';
    return 'bg-green-100 border-green-300';
  };

  if (loading) {
    return <ClaimSettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Claim Settings & Auto-Assign Limits</CardTitle>
          <CardDescription>
            Configure automatic claim assignment limits for each user. Claims exceeding the limit are queued.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No users found. Create users first in the "Add Users" tab.
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.userId}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.email}</h3>
                      <p className="text-sm text-gray-500">User ID: {user.userId}</p>
                    </div>
                    {user.queuedCount > 0 && (
                      <Badge variant="destructive" className="bg-orange-100 text-orange-800 border-orange-300">
                        {user.queuedCount} Queued
                      </Badge>
                    )}
                  </div>

                  {/* Load Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between mb-2">
                      <Label className="text-sm font-medium">Current Load</Label>
                      <span className="text-sm text-gray-600">
                        {user.currentLoad} / {user.claimLimit} claims
                      </span>
                    </div>
                    <div className={`h-2 rounded-full ${getLoadColor(user.currentLoad, user.claimLimit)}`} />
                    <p className="text-xs text-gray-500 mt-1">
                      {getLoadPercentage(user.currentLoad, user.claimLimit)}% capacity
                    </p>
                  </div>

                  {/* Claim Limit Input */}
                  <div className="flex gap-2 items-end">
                    {editingId === user.userId ? (
                      <>
                        <div className="flex-1">
                          <Label htmlFor={`limit-${user.userId}`} className="text-sm">
                            Set New Limit
                          </Label>
                          <Input
                            id={`limit-${user.userId}`}
                            type="number"
                            min="0"
                            value={newLimit}
                            onChange={(e) => setNewLimit(e.target.value)}
                            placeholder="Enter claim limit"
                            className="mt-1"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleUpdateLimit(user.userId, parseInt(newLimit) || 0)
                          }
                          disabled={updating === user.userId}
                        >
                          {updating === user.userId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setNewLimit('');
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(user.userId);
                          setNewLimit(user.claimLimit.toString());
                        }}
                        className="w-full"
                      >
                        Edit Limit ({user.claimLimit})
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How Auto-Assign Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-semibold">1. Set Limits:</span> Define the maximum claims each user can handle
          </p>
          <p>
            <span className="font-semibold">2. Auto-Queue:</span> Claims exceeding the limit are automatically queued
          </p>
          <p>
            <span className="font-semibold">3. FIFO Processing:</span> When users release claims, queued claims are assigned in order
          </p>
          <p className="text-gray-600">
            Use the green/yellow/red load indicator to monitor user capacity.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ClaimSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64 bg-slate-150" />
          <Skeleton className="h-4 w-full max-w-md bg-slate-100 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-48 bg-slate-100" />
                  <Skeleton className="h-3 w-36 bg-slate-100" />
                </div>
                <Skeleton className="h-5.5 w-16 bg-slate-100 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20 bg-slate-100" />
                  <Skeleton className="h-4 w-24 bg-slate-100" />
                </div>
                <Skeleton className="h-2 w-full bg-slate-100 rounded-full" />
                <Skeleton className="h-3 w-16 bg-slate-100" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24 bg-slate-100" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40 bg-slate-150" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full bg-slate-100" />
          <Skeleton className="h-4 w-full bg-slate-100" />
          <Skeleton className="h-4 w-2/3 bg-slate-100" />
        </CardContent>
      </Card>
    </div>
  );
}
