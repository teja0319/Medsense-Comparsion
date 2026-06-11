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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Shield, ShieldCheck, UserCheck, UserX, RefreshCw, Loader2 } from 'lucide-react';

interface User {
  _id: string;
  email: string;
  role: 'superadmin' | 'user';
  isActive: boolean;
  created_at: string;
}

export function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<'superadmin' | 'user'>('user');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users);
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

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      setUpdatingRole(true);
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser._id,
          role: newRole,
        }),
      });

      if (!response.ok) throw new Error('Failed to update role');
      const data = await response.json();
      if (!data?.user) throw new Error('Invalid user data returned');

      // Update local state
      setUsers(
        users.map((u) => (u._id === data.user._id ? data.user : u))
      );
      setOpenDialog(false);
      setSelectedUser(null);

      toast({
        title: 'Success',
        description: `User role updated to ${newRole}`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      setUpdatingUserId(user._id);
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          isActive: !user.isActive,
        }),
      });

      if (!response.ok) throw new Error('Failed to toggle active');
      const data = await response.json();
      if (!data?.user) throw new Error('Invalid user data returned');

      // Update local state
      setUsers(
        users.map((u) => (u._id === data.user._id ? data.user : u))
      );

      toast({
        title: 'Success',
        description: `User ${data.user.isActive ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      console.error('Error toggling active:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (loading) {
    return <UsersManagementSkeleton />;
  }

  const activeCount = users.filter((u) => u.isActive).length;
  const adminCount = users.filter((u) => u.role === 'superadmin').length;

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Shield className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{users.length}</p>
              <p className="text-[11px] text-slate-500">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{activeCount}</p>
              <p className="text-[11px] text-slate-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{adminCount}</p>
              <p className="text-[11px] text-slate-500">Admins</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">All Users</h3>
          <Button size="sm" variant="ghost" onClick={fetchUsers} className="h-7 text-xs gap-1.5">
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="text-xs font-semibold text-slate-500">Email</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Role</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Created</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id} className="group hover:bg-slate-50/50 transition-colors">
                <TableCell className="text-sm font-medium text-slate-800">{user.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === 'superadmin' ? 'default' : 'secondary'}
                    className={
                      user.role === 'superadmin'
                        ? 'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 text-[11px]'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 text-[11px]'
                    }
                  >
                    {user.role === 'superadmin' ? '⚡ Admin' : '👤 User'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        user.isActive ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-red-400'
                      }`}
                    />
                    <span className={`text-xs font-medium ${user.isActive ? 'text-emerald-700' : 'text-red-600'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {new Date(user.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] px-2.5"
                      onClick={() => {
                        setSelectedUser(user);
                        setNewRole(user.role);
                        setOpenDialog(true);
                      }}
                    >
                      Change Role
                    </Button>
                    <Button
                      size="sm"
                      variant={user.isActive ? 'destructive' : 'default'}
                      className="h-7 text-[11px] px-2.5 min-w-[85px] justify-center"
                      onClick={() => handleToggleActive(user)}
                      disabled={updatingUserId !== null}
                    >
                      {updatingUserId === user._id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : user.isActive ? (
                        <><UserX className="h-3 w-3 mr-1" /> Deactivate</>
                      ) : (
                        <><UserCheck className="h-3 w-3 mr-1" /> Activate</>
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {users.length === 0 && (
          <div className="text-center text-slate-400 py-12 text-sm">
            No users found
          </div>
        )}
      </div>

      {/* Change Role Dialog */}
      <Dialog open={openDialog} onOpenChange={(open) => {
        setOpenDialog(open);
        if (!open) setSelectedUser(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Change User Role</DialogTitle>
            <DialogDescription className="text-sm">
              Update the role for <span className="font-medium text-slate-700">{selectedUser?.email}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select
              value={newRole}
              onValueChange={(value) =>
                setNewRole(value as 'superadmin' | 'user')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">👤 User</SelectItem>
                <SelectItem value="superadmin">⚡ Superadmin</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpenDialog(false);
                  setSelectedUser(null);
                }}
                disabled={updatingRole}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleUpdateRole} disabled={updatingRole}>
                {updatingRole ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Updating...
                  </>
                ) : (
                  'Update Role'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UsersManagementSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-36 bg-slate-100" />
          <Skeleton className="h-3.5 w-48 bg-slate-100" />
        </div>
        <Skeleton className="h-9 w-24 bg-slate-100" />
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <Skeleton className="h-4 w-28 bg-slate-200" />
          <Skeleton className="h-4 w-16 bg-slate-200" />
          <Skeleton className="h-4 w-16 bg-slate-200" />
          <Skeleton className="h-4 w-24 bg-slate-200" />
          <Skeleton className="h-4 w-20 bg-slate-200" />
        </div>
        {Array.from({ length: 4 }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
            <Skeleton className="h-5 w-48 bg-slate-100" />
            <Skeleton className="h-5.5 w-16 bg-slate-105 rounded-full" />
            <Skeleton className="h-4 w-12 bg-slate-100" />
            <Skeleton className="h-4 w-24 bg-slate-100" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-20 bg-slate-100" />
              <Skeleton className="h-7 w-20 bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
