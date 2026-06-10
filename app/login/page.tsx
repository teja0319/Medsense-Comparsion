'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid email or password');
        setLoading(false);
        return;
      }
      router.push('/projects/857d529e-75cf-4210-bea3-ca023a15ed1d');
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[oklch(0.98_0.005_260)] text-slate-950">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[oklch(0.85_0.1_265/0.3)] rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[oklch(0.85_0.1_300/0.2)] rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[oklch(0.9_0.05_265/0.15)] rounded-full blur-[200px]" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[oklch(0.55_0.176_265.75)] to-[oklch(0.45_0.2_290)] shadow-lg shadow-[oklch(0.55_0.176_265.75/0.25)] mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">MedSense</h1>
          <p className="text-sm text-slate-500 mt-1">Claims Analysis Dashboard</p>
        </div>

        {/* Card */}
        <div className="backdrop-blur-xl bg-white/70 border border-white/50 rounded-2xl p-8 shadow-2xl shadow-slate-200/50">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Welcome back</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to access your dashboard</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">Email address</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[oklch(0.55_0.176_265.75)] transition-colors" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/60 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[oklch(0.55_0.176_265.75)] focus:ring-1 focus:ring-[oklch(0.55_0.176_265.75/0.3)] transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[oklch(0.55_0.176_265.75)] transition-colors" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-11 pr-12 py-3 rounded-xl bg-white/60 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[oklch(0.55_0.176_265.75)] focus:ring-1 focus:ring-[oklch(0.55_0.176_265.75/0.3)] transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[oklch(0.55_0.176_265.75)] to-[oklch(0.5_0.2_290)] text-white font-semibold text-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.176_265.75/0.5)] focus:ring-offset-2 focus:ring-offset-white disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[oklch(0.55_0.176_265.75/0.2)]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          MedSense Claims Analysis Platform
        </p>
      </div>
    </div>
  );
}

