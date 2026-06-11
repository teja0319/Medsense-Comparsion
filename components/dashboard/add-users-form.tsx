'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Loader2, Shield, User, UserPlus, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export function AddUsersForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'user' | 'superadmin'>('user');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Strength Criteria
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const strengthScore = [
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasDigit,
    hasSpecial
  ].filter(Boolean).length;

  const isPasswordStrong = hasMinLength && hasUppercase && hasLowercase && hasDigit && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    if (!isPasswordStrong) {
      setMessage({ type: 'error', text: 'Password must meet all strength requirements' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
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
      setShowPassword(false);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create user' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-2 animate-in fade-in duration-300">
      <Card className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-300/80">
        <CardHeader className="space-y-1.5 px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm shadow-blue-100/50">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-slate-800">Add New User</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Create a new user account with role assignment (User or Superadmin)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {message && (
            <div
              className={`p-3.5 rounded-xl flex items-start gap-2.5 border text-xs transition-all animate-in slide-in-from-top-2 duration-300 ${
                message.type === 'success'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-blue-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4.5 w-4.5 text-rose-600 flex-shrink-0" />
              )}
              <span className="font-semibold">{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-slate-600 tracking-wide uppercase">
                Email Address
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="off"
                  className="pl-11 h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all rounded-xl text-sm font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold text-slate-600 tracking-wide uppercase">
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                  className="pl-11 pr-11 h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all rounded-xl text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Password Strength Checklist */}
            {password.length > 0 && (
              <div className="space-y-3.5 p-4 bg-slate-50/50 border border-slate-200/80 rounded-xl animate-in slide-in-from-top-2 duration-200">
                {/* Strength Meter */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Password Strength:</span>
                    <span className={
                      strengthScore === 5 ? "text-blue-600 font-bold" :
                      strengthScore >= 3 ? "text-amber-500 font-bold" :
                      "text-rose-500 font-bold"
                    }>
                      {strengthScore === 5 ? "Strong" :
                       strengthScore >= 3 ? "Medium" :
                       "Weak"}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex gap-0.5">
                    <div className={`h-full flex-1 transition-all duration-300 ${strengthScore >= 1 ? (strengthScore === 5 ? 'bg-blue-500' : strengthScore >= 3 ? 'bg-amber-500' : 'bg-rose-500') : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 transition-all duration-300 ${strengthScore >= 2 ? (strengthScore === 5 ? 'bg-blue-500' : strengthScore >= 3 ? 'bg-amber-500' : 'bg-rose-500') : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 transition-all duration-300 ${strengthScore >= 3 ? (strengthScore === 5 ? 'bg-blue-500' : strengthScore >= 3 ? 'bg-amber-500' : 'bg-rose-500') : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 transition-all duration-300 ${strengthScore >= 4 ? (strengthScore === 5 ? 'bg-blue-500' : strengthScore >= 3 ? 'bg-amber-500' : 'bg-rose-500') : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 transition-all duration-300 ${strengthScore >= 5 ? 'bg-blue-500' : 'bg-transparent'}`} />
                  </div>
                </div>

                {/* Checklist */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-200/50 pt-2.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    {hasMinLength ? (
                      <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 font-bold">•</div>
                    )}
                    <span className={hasMinLength ? "text-blue-700 font-semibold transition-colors" : "text-slate-500 transition-colors"}>At least 8 characters</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {hasUppercase ? (
                      <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 font-bold">•</div>
                    )}
                    <span className={hasUppercase ? "text-blue-700 font-semibold transition-colors" : "text-slate-500 transition-colors"}>One uppercase letter (A-Z)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {hasLowercase ? (
                      <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 font-bold">•</div>
                    )}
                    <span className={hasLowercase ? "text-blue-700 font-semibold transition-colors" : "text-slate-500 transition-colors"}>One lowercase letter (a-z)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {hasDigit ? (
                      <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 font-bold">•</div>
                    )}
                    <span className={hasDigit ? "text-blue-700 font-semibold transition-colors" : "text-slate-500 transition-colors"}>One number (0-9)</span>
                  </div>
                  <div className="flex items-center gap-2.5 col-span-2">
                    {hasSpecial ? (
                      <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 font-bold">•</div>
                    )}
                    <span className={hasSpecial ? "text-blue-700 font-semibold transition-colors" : "text-slate-500 transition-colors"}>One special character (!@#$%^&* etc.)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Role Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 tracking-wide uppercase">
                Role Selection
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  disabled={loading}
                  className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl border-2 transition-all font-semibold text-sm outline-none ${
                    role === 'user'
                      ? 'border-blue-500 bg-blue-50/20 text-blue-700 shadow-sm shadow-blue-50/10'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50/80 hover:text-slate-700'
                  }`}
                >
                  <User className="h-4.5 w-4.5" />
                  User
                </button>
                <button
                  type="button"
                  onClick={() => setRole('superadmin')}
                  disabled={loading}
                  className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl border-2 transition-all font-semibold text-sm outline-none ${
                    role === 'superadmin'
                      ? 'border-blue-500 bg-blue-50/20 text-blue-700 shadow-sm shadow-blue-50/10'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50/80 hover:text-slate-700'
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
              disabled={loading || !email || !password || !isPasswordStrong}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all duration-150 flex items-center justify-center gap-2.5 mt-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  Creating User...
                </>
              ) : (
                <>
                  <UserPlus className="h-4.5 w-4.5" />
                  Create User
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
