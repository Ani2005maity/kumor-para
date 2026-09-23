import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Mail, Lock, Sparkles, ArrowRight, ShieldCheck, Store, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, verifyLoginOtp, resendLoginOtp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Step 2 2FA State
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [tempToken, setTempToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [maskedTarget, setMaskedTarget] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Missing fields', 'Please enter your email and password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);

      if ('mfaRequired' in result && result.mfaRequired) {
        setTempToken(result.tempToken);
        setChannel(result.channel || 'email');
        setMaskedTarget(result.maskedTarget || email);
        setCooldown(result.resendCooldownSeconds || 60);
        setStep('otp');
        setOtpCode('');
      } else if ('verificationRequired' in result && (result as any).verificationRequired) {
        navigate(`/register?unverifiedUserId=${(result as any).userId}&email=${encodeURIComponent(email)}`);
      } else {
        toast.success('Welcome back!', 'Successfully logged into your artisan studio.');
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
      toast.error('Login Failed', err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await verifyLoginOtp({
        tempToken,
        otp: otpCode,
        channel,
      });
      toast.success('Authentication Verified', 'Welcome back to your artisan dashboard.');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setError('');
    setResendSuccess('');

    try {
      const res = await resendLoginOtp({
        tempToken,
        channel,
      });
      setCooldown(res.resendCooldownSeconds || 60);
      setMaskedTarget(res.maskedTarget || maskedTarget);
      setResendSuccess(`Fresh code sent to ${res.maskedTarget || maskedTarget}`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-warm-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-terracotta-500 text-white shadow-warm-lg mb-4">
          <Store className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-display font-extrabold text-charcoal-900 tracking-tight">
          Kumor Para Artisan Studio
        </h2>
        <p className="mt-2 text-sm text-stone-warm-600">
          Sign in to manage your handmade creations, orders, and payouts
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-warm-lg rounded-3xl border border-stone-warm-200/90 space-y-6">
          {step === 'credentials' ? (
            <>
              {error && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  label="Artisan Email Address"
                  type="email"
                  placeholder="artisan@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  startIcon={<Mail className="w-4 h-4" />}
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  startIcon={<Lock className="w-4 h-4" />}
                  required
                />

                <Button
                  type="submit"
                  className="w-full mt-2"
                  size="lg"
                  isLoading={loading}
                >
                  Continue to Studio &bull; Verify
                </Button>
              </form>

              <div className="pt-4 border-t border-stone-warm-200 text-center">
                <p className="text-xs text-stone-warm-600">
                  New creator or artisan?{' '}
                  <Link
                    to="/register"
                    className="font-bold text-terracotta-600 hover:text-terracotta-700 hover:underline"
                  >
                    Apply to sell on Kumor Para
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Step 2: 2FA OTP */}
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-terracotta-100 text-terracotta-700 flex items-center justify-center mx-auto shadow-sm">
                  <ShieldCheck className="w-6 h-6 text-terracotta-600" />
                </div>
                <h3 className="font-display font-black text-xl text-charcoal-900 tracking-tight">
                  Artisan Security Verification
                </h3>
                <p className="text-xs text-stone-warm-600">
                  Enter the 6-digit authentication code sent to:
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-warm-100 border border-stone-warm-300 text-xs font-mono font-bold text-charcoal-800">
                  <Mail className="w-3.5 h-3.5 text-terracotta-600" />
                  <span>{maskedTarget}</span>
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {resendSuccess && (
                <div className="p-3.5 rounded-2xl bg-green-50 border border-green-200 flex items-center gap-2.5 text-green-700 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{resendSuccess}</span>
                </div>
              )}

              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="space-y-1 text-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
                    6-Digit Studio Access Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full text-center tracking-[0.5em] text-2xl font-mono font-black py-3 rounded-2xl border-2 border-stone-warm-300 focus:border-terracotta-500 focus:ring-4 focus:ring-terracotta-100 outline-none transition-all text-charcoal-900 bg-stone-warm-50/50"
                  />
                  <p className="text-[11px] text-stone-warm-500">
                    Expires in 5 minutes &bull; 5 attempts allowed
                  </p>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  isLoading={loading}
                  disabled={otpCode.length !== 6}
                >
                  Verify &amp; Enter Dashboard
                </Button>
              </form>

              <div className="pt-4 border-t border-stone-warm-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setError('');
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-stone-warm-600 hover:text-charcoal-900 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resendLoading}
                  className={`inline-flex items-center gap-1.5 font-bold transition-colors ${
                    cooldown > 0
                      ? 'text-stone-warm-400 cursor-not-allowed'
                      : 'text-terracotta-600 hover:text-terracotta-700'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                  <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
