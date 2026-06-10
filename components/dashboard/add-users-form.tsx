'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Loader2, Shield, User, UserPlus } from 'lucide-react';

export function AddUsersForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'superadmin'>('user');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create user');
      }

      setMessage({ type: 'success', text: `User ${email} created successfully as ${role}` });
      setEmail('');
      setPassword('');
      setRole('user');
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create user' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-2 animate-in fade-in duration-200">
      <Card className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="space-y-1 px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-800">Add New User</CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Create a new user account with role assignment (User or Superadmin)
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {message && (
            <div
              className={`p-3.5 rounded-xl flex items-start gap-2.5 border text-xs transition-all ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4.5 w-4.5 text-rose-600 flex-shrink-0" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-600">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-10.5 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all rounded-xl text-sm"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-600">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-10.5 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all rounded-xl text-sm"
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600">
                Role Selection
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  disabled={loading}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all font-semibold text-sm outline-none ${
                    role === 'user'
                      ? 'border-emerald-500 bg-emerald-50/30 text-emerald-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <User className="h-4.5 w-4.5" />
                  User
                </button>
                <button
                  type="button"
                  onClick={() => setRole('superadmin')}
                  disabled={loading}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all font-semibold text-sm outline-none ${
                    role === 'superadmin'
                      ? 'border-emerald-500 bg-emerald-50/30 text-emerald-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <Shield className="h-4.5 w-4.5" />
                  Superadmin
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-all duration-150 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  Creating User...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
