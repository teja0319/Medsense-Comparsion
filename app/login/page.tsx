'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Loader Spinner ───────────────────────────────────────────────────────────
function LoaderSpinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ─── Toast Component ──────────────────────────────────────────────────────────
type ToastType = 'success' | 'error';

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: ToastType;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
      <div
        className={`flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm font-medium shadow-2xl backdrop-blur-xl border ${
          type === 'success'
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : 'bg-red-500/15 text-red-300 border-red-500/30'
        }`}
      >
        <span className="text-base">{type === 'success' ? '✓' : '✕'}</span>
        {message}
        <button
          onClick={onClose}
          className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ─── OTP Input Component ──────────────────────────────────────────────────────
function OTPDigitInput({
  value,
  onChange,
  onComplete,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  onComplete: () => void;
  disabled: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const focusInput = (index: number) => {
    if (index >= 0 && index < 6) {
      inputRefs.current[index]?.focus();
    }
  };

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char.slice(-1);
    const newValue = newDigits.join('');
    onChange(newValue.replace(/ /g, ''));

    if (char && index < 5) {
      focusInput(index + 1);
    }

    if (char && index === 5 && newValue.replace(/ /g, '').length === 6) {
      setTimeout(onComplete, 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...digits];
      if (digits[index] && digits[index] !== ' ') {
        newDigits[index] = '';
        onChange(newDigits.join('').replace(/ /g, ''));
      } else if (index > 0) {
        newDigits[index - 1] = '';
        onChange(newDigits.join('').replace(/ /g, ''));
        focusInput(index - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight') {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted);
      focusInput(Math.min(pasted.length, 5));
      if (pasted.length === 6) {
        setTimeout(onComplete, 100);
      }
    }
  };

  return (
    <div className="flex items-center justify-center gap-2.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="relative">
          {i === 3 && (
            <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-1.5 h-0.5 rounded-full bg-white/30" />
          )}
          <input
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            disabled={disabled}
            value={digits[i]?.trim() || ''}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={`
              w-12 h-14 text-center text-xl font-semibold rounded-xl
              bg-white/[0.06] border border-white/[0.12]
              text-white placeholder-white/20
              outline-none transition-all duration-200
              focus:border-indigo-400/60 focus:bg-white/[0.1]
              focus:ring-2 focus:ring-indigo-400/25
              focus:shadow-[0_0_20px_rgba(129,140,248,0.15)]
              disabled:opacity-40 disabled:cursor-not-allowed
              hover:border-white/20 hover:bg-white/[0.08]
            `}
            aria-label={`Digit ${i + 1}`}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Main Login Page ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type });
  }, []);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to send OTP', 'error');
        return;
      }

      showToast('Verification code sent successfully!', 'success');
      setStep('otp');
      setOtp('');
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      showToast('Please enter the 6-digit OTP', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Verification failed', 'error');
        setOtp('');
        return;
      }

      showToast('Login successful! Redirecting...', 'success');
      setTimeout(() => router.push('/'), 800);
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setOtp('');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950">
      {/* ── Animated Background Orbs ─────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Large indigo orb */}
        <div
          className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, oklch(0.55 0.2 270), transparent 70%)',
            animation: 'float-slow 20s ease-in-out infinite',
          }}
        />
        {/* Medium violet orb */}
        <div
          className="absolute -bottom-24 -right-24 h-[400px] w-[400px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, oklch(0.5 0.22 300), transparent 70%)',
            animation: 'float-slow 25s ease-in-out infinite reverse',
          }}
        />
        {/* Small accent orb */}
        <div
          className="absolute top-1/3 right-1/4 h-[200px] w-[200px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, oklch(0.6 0.18 240), transparent 70%)',
            animation: 'float-slow 15s ease-in-out infinite',
          }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>




      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Login Card ───────────────────────────────────────────────────── */}
      <div
        className={`relative z-10 w-full max-w-md mx-4 transition-all duration-700 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="bg-white/[0.05] backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
          {/* Top accent gradient line */}
          <div className="h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

          <div className="p-8 sm:p-10">
            {/* ── Branding ─────────────────────────────────────────────── */}
            <div className="text-center mb-8">
              {/* Logo mark */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-550/30 border border-white/10 animate-pulse mx-auto mb-5">
                <svg
                  className="w-8 h-8 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2C12 7.5 16.5 12 22 12C16.5 12 12 16.5 12 22C12 16.5 7.5 12 2 12C7.5 12 12 7.5 12 2Z" />
                  <path d="M18 3C18 5 19.5 6.5 21.5 6.5C19.5 6.5 18 8 18 10C18 8 16.5 6.5 14.5 6.5C16.5 6.5 18 5 18 3Z" opacity="0.85" />
                  <path d="M6 14C6 15.5 7 16.5 8.5 16.5C7 16.5 6 17.5 6 19C6 17.5 5 16.5 3.5 16.5C5 16.5 6 15.5 6 14Z" opacity="0.7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Medsense
              </h1>
              <p className="text-sm text-white/40 mt-1.5 font-medium tracking-wide uppercase">
                Secure Dashboard Access
              </p>
            </div>

            {/* ── Step Content ──────────────────────────────────────────── */}
            <div className="relative">
              {/* Email Step */}
              <div
                className={`transition-all duration-500 ease-in-out ${
                  step === 'email'
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-8 absolute inset-0 pointer-events-none'
                }`}
              >
                <form onSubmit={handleRequestOTP} className="space-y-5">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2"
                    >
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={loading}
                      autoFocus
                      className="
                        w-full h-12 px-4 rounded-xl
                        bg-white/[0.06] border border-white/[0.12]
                        text-white placeholder-white/25
                        text-sm font-medium
                        outline-none transition-all duration-200
                        focus:border-indigo-400/60 focus:bg-white/[0.1]
                        focus:ring-2 focus:ring-indigo-400/25
                        focus:shadow-[0_0_20px_rgba(129,140,248,0.1)]
                        disabled:opacity-40 disabled:cursor-not-allowed
                        hover:border-white/20 hover:bg-white/[0.08]
                      "
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="
                      w-full h-12 rounded-xl font-semibold text-sm
                      bg-gradient-to-r from-indigo-500 to-violet-600
                      text-white
                      shadow-lg shadow-indigo-500/25
                      hover:shadow-xl hover:shadow-indigo-500/30
                      hover:from-indigo-400 hover:to-violet-500
                      active:scale-[0.98]
                      transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg
                      flex items-center justify-center gap-2
                    "
                  >
                    {loading ? (
                      <>
                        <LoaderSpinner className="w-4 h-4" />
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Request OTP
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* OTP Step */}
              <div
                className={`transition-all duration-500 ease-in-out ${
                  step === 'otp'
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 translate-x-8 absolute inset-0 pointer-events-none'
                }`}
              >
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-xs text-white/40 font-medium">
                      We sent a 6-digit code to
                    </p>
                    <p className="text-sm text-white/80 font-semibold mt-1 truncate">
                      {email}
                    </p>
                  </div>

                  <OTPDigitInput
                    value={otp}
                    onChange={setOtp}
                    onComplete={handleVerifyOTP}
                    disabled={loading}
                  />

                  <button
                    type="button"
                    onClick={handleVerifyOTP}
                    disabled={loading || otp.length !== 6}
                    className="
                      w-full h-12 rounded-xl font-semibold text-sm
                      bg-gradient-to-r from-indigo-500 to-violet-600
                      text-white
                      shadow-lg shadow-indigo-500/25
                      hover:shadow-xl hover:shadow-indigo-500/30
                      hover:from-indigo-400 hover:to-violet-500
                      active:scale-[0.98]
                      transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg
                      flex items-center justify-center gap-2
                    "
                  >
                    {loading ? (
                      <>
                        <LoaderSpinner className="w-4 h-4" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Verify &amp; Login
                      </>
                    )}
                  </button>

                  {/* Resend & Back */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={loading}
                      className="text-xs text-white/40 hover:text-white/70 transition-colors font-medium flex items-center gap-1 disabled:opacity-40"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestOTP}
                      disabled={loading}
                      className="text-xs text-indigo-400/70 hover:text-indigo-300 transition-colors font-medium disabled:opacity-40"
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom accent line */}
          <div className="h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <p className="text-center text-[11px] text-white/20 mt-6 font-medium">
          Protected by end-to-end encryption · OTP expires in 5 minutes
        </p>
      </div>
    </div>
  );
}
