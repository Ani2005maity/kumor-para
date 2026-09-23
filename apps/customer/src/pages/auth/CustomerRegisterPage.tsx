import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { INDIAN_STATES } from '../../lib/utils';
import {
  ArrowRight,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Mail,
  CheckCircle2,
  RefreshCw,
  PartyPopper,
} from 'lucide-react';

function maskEmail(email: string): string {
  if (!email) return '***@***.com';
  const [name, domain] = email.split('@');
  if (!domain) return '***@***.com';
  if (name.length <= 2) {
    return `${name[0]}***@${domain}`;
  }
  return `${name[0]}***${name[name.length - 1]}@${domain}`;
}

export const CustomerRegisterPage: React.FC = () => {
  const { signup, verifyRegistrationOtp, resendRegistrationOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  // Step 1 Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    street: '',
    city: '',
    state: 'West Bengal',
    stateCode: '19',
    pincode: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 2 OTP State
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [userId, setUserId] = useState('');
  const [emailMasked, setEmailMasked] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);

  // OTP inputs
  const [emailOtp, setEmailOtp] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Resend Cooldowns
  const [emailCooldown, setEmailCooldown] = useState(60);
  const [emailResending, setEmailResending] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  // Handle unverified user coming from Login redirect
  useEffect(() => {
    const unverifiedUserId = searchParams.get('unverifiedUserId');
    const paramEmail = searchParams.get('email');
    if (unverifiedUserId) {
      setUserId(unverifiedUserId);
      if (paramEmail) {
        setEmailMasked(maskEmail(paramEmail));
      }
      setStep('otp');
    }
  }, [searchParams]);

  // Countdown timers
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = setInterval(() => setEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [emailCooldown]);

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stateName = e.target.value;
    const match = INDIAN_STATES.find((s) => s.name === stateName);
    setFormData((prev) => ({
      ...prev,
      state: stateName,
      stateCode: match ? match.code : '19',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!formData.phone || formData.phone.length < 10) {
      setError('Valid 10-digit Indian phone number is required');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        address: formData.street
          ? {
              name: formData.name,
              phone: formData.phone,
              street: formData.street,
              city: formData.city,
              state: formData.state,
              stateCode: formData.stateCode,
              pincode: formData.pincode,
            }
          : undefined,
      });

      if ('verificationRequired' in result && result.verificationRequired) {
        setUserId(result.userId);
        setEmailMasked(result.emailMasked);
        setEmailVerified(result.emailVerified);
        setEmailCooldown(result.resendCooldownSeconds || 60);
        setStep('otp');
      } else {
        navigate(redirect);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailOtp.length !== 6) {
      setError('Please enter a valid 6-digit email verification code.');
      return;
    }
    setError('');
    setEmailLoading(true);

    try {
      const res = await verifyRegistrationOtp({
        userId,
        channel: 'email',
        otp: emailOtp,
      });
      setEmailVerified(res.emailVerified);
      setSuccessBanner('Account verified and activated successfully! Redirecting...');
      setTimeout(() => navigate(redirect), 1200);
    } catch (err: any) {
      setError(err.message || 'Invalid email verification code. Please check and try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (emailCooldown > 0 || emailResending) return;
    setEmailResending(true);
    setError('');
    try {
      const res = await resendRegistrationOtp({ userId, channel: 'email' });
      setEmailCooldown(res.resendCooldownSeconds || 60);
      setEmailMasked(res.maskedTarget);
      setSuccessBanner(`Fresh verification code sent to ${res.maskedTarget}`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend email code');
    } finally {
      setEmailResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-stone-warm-200/90 p-8 sm:p-10 shadow-warm-xl space-y-6">
        {step === 'form' ? (
          <>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-terracotta-600 text-white flex items-center justify-center mx-auto shadow-warm-md">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="font-display font-black text-2xl text-charcoal-900 tracking-tight">
                Create Customer Account
              </h1>
              <p className="text-xs text-stone-warm-600">
                Join thousands of craft patrons supporting authentic independent Indian artisans.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ananya Sen"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email Address (OTP Verified)"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. ananya@example.com"
                />

                <Input
                  label="Contact Mobile Number"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                />
              </div>

              <Input
                label="Password (min 8 chars)"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />

              <div className="pt-2 border-t border-stone-warm-100 space-y-3">
                <p className="text-xs font-bold text-charcoal-800">Primary Delivery Address (Optional)</p>

                <Input
                  label="Street Address"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  placeholder="e.g. 12 Lake View Road"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Kolkata"
                  />

                  <Input
                    label="PIN Code"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="e.g. 700029"
                  />

                  <Select label="State" value={formData.state} onChange={handleStateChange}>
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                variant="primary"
                className="w-full shadow-warm-md mt-4"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue &bull; Verify Email Code
              </Button>
            </form>

            <div className="text-center pt-2">
              <p className="text-xs text-stone-warm-600">
                Already have an account?{' '}
                <Link
                  to={`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
                  className="font-bold text-terracotta-600 hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Email OTP Verification */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-terracotta-100 text-terracotta-700 flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck className="w-6 h-6 text-terracotta-600" />
              </div>
              <h1 className="font-display font-black text-2xl text-charcoal-900 tracking-tight">
                Verify Your Email
              </h1>
              <p className="text-xs text-stone-warm-600 max-w-md mx-auto">
                We've sent a 6-digit verification code to <span className="font-mono font-bold text-charcoal-900">{emailMasked}</span>. Enter the code below to activate your account.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successBanner && (
              <div className="p-3.5 rounded-2xl bg-green-50 border border-green-200 flex items-center gap-2.5 text-green-700 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successBanner}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Email Verification Box */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  emailVerified
                    ? 'bg-green-50/60 border-green-200'
                    : 'bg-stone-warm-50/70 border-stone-warm-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-terracotta-600" />
                    <div>
                      <span className="text-xs font-bold text-charcoal-900">Email Verification</span>
                      <p className="text-[11px] font-mono text-stone-warm-500">{emailMasked}</p>
                    </div>
                  </div>
                  {emailVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Code Required
                    </span>
                  )}
                </div>

                {!emailVerified && (
                  <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full text-center tracking-[0.5em] font-mono font-bold text-xl py-3 rounded-xl border border-stone-warm-300 focus:border-terracotta-500 outline-none bg-white shadow-inner"
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      variant="primary"
                      className="w-full shadow-warm-md"
                      isLoading={emailLoading}
                      disabled={emailOtp.length !== 6}
                    >
                      Verify &bull; Activate Account
                    </Button>

                    <div className="flex justify-between items-center pt-2">
                      <button
                        type="button"
                        onClick={() => setStep('form')}
                        className="text-xs text-stone-warm-500 hover:text-stone-warm-700 hover:underline"
                      >
                        &larr; Change email address
                      </button>

                      <button
                        type="button"
                        onClick={handleResendEmail}
                        disabled={emailCooldown > 0 || emailResending}
                        className={`text-xs font-bold inline-flex items-center gap-1.5 ${
                          emailCooldown > 0
                            ? 'text-stone-warm-400 cursor-not-allowed'
                            : 'text-terracotta-600 hover:underline'
                        }`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${emailResending ? 'animate-spin' : ''}`} />
                        <span>{emailCooldown > 0 ? `Resend code in ${emailCooldown}s` : 'Resend Email Code'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {emailVerified && (
                <div className="p-4 rounded-2xl bg-terracotta-50 border border-terracotta-200 text-center space-y-2 animate-fade-in">
                  <PartyPopper className="w-6 h-6 text-terracotta-600 mx-auto" />
                  <p className="text-xs font-bold text-charcoal-900">
                    Congratulations! Your email has been verified and your account is active.
                  </p>
                  <Button
                    type="button"
                    size="md"
                    variant="primary"
                    className="w-full"
                    onClick={() => navigate(redirect)}
                  >
                    Enter Marketplace &bull; Start Exploring
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
