import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { ArrowRight, AlertCircle, Sparkles, ShieldCheck, Mail, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

export const CustomerLoginPage: React.FC = () => {
  const { login, verifyLoginOtp, resendLoginOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  // Step 1 State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 2 2FA State
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [tempToken, setTempToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [maskedTarget, setMaskedTarget] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

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
        navigate(redirect);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await verifyLoginOtp({
        tempToken,
        otp: otpCode,
        channel,
      });
      navigate(redirect);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
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
      setResendSuccess(`A fresh 6-digit code has been sent to ${res.maskedTarget || maskedTarget}`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border border-stone-warm-200/90 p-8 sm:p-10 shadow-warm-xl space-y-6">
        {step === 'credentials' ? (
          <>
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-terracotta-600 text-white flex items-center justify-center mx-auto shadow-warm-md">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="font-display font-black text-2xl text-charcoal-900 tracking-tight">
                Sign In to Kumor Para
              </h1>
              <p className="text-xs text-stone-warm-600">
                Access your handcrafted orders, saved addresses, and GST tax invoices.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ananya@example.com"
              />

              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              <Button
                type="submit"
                size="lg"
                variant="primary"
                className="w-full shadow-warm-md"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Verify
              </Button>
            </form>

            {/* Link to Register */}
            <div className="text-center pt-2">
              <p className="text-xs text-stone-warm-600">
                Don&apos;t have an account yet?{' '}
                <Link
                  to={`/register${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
                  className="font-bold text-terracotta-600 hover:underline"
                >
                  Create Account
                </Link>
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: 2FA OTP Verification */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-terracotta-100 text-terracotta-700 flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck className="w-6 h-6 text-terracotta-600" />
              </div>
              <h1 className="font-display font-black text-2xl text-charcoal-900 tracking-tight">
                Two-Factor Security Code
              </h1>
              <p className="text-xs text-stone-warm-600">
                We sent a 6-digit verification code to your registered {channel}:
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

            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div className="space-y-1.5 text-center">
                <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
                  Enter 6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.6em] text-2xl font-mono font-black py-3 rounded-2xl border-2 border-stone-warm-300 focus:border-terracotta-500 focus:ring-4 focus:ring-terracotta-100 outline-none transition-all text-charcoal-900 bg-stone-warm-50/50"
                />
                <p className="text-[11px] text-stone-warm-500">
                  Code expires in 5 minutes &bull; Maximum 5 verification attempts
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                variant="primary"
                className="w-full shadow-warm-md"
                isLoading={isLoading}
                disabled={otpCode.length !== 6}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Verify &amp; Sign In
              </Button>
            </form>

            {/* Resend OTP Strip */}
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
  );
};
