import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { Input } from '../../components/common/Input';
import { Textarea } from '../../components/common/Textarea';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { INDIAN_STATES } from '../../lib/utils';
import {
  User,
  Store,
  MapPin,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Mail,
  RefreshCw,
  AlertCircle,
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

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    shopName: '',
    craftSpecialization: '',
    bio: '',
    street: '',
    landmark: '',
    city: '',
    stateCode: '19',
    pincode: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    pan: '',
    gstin: '',
  });

  const [loading, setLoading] = useState(false);
  const { register, verifyRegistrationOtp, resendRegistrationOtp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.phone ||
      !formData.shopName ||
      !formData.street ||
      !formData.city ||
      !formData.pincode
    ) {
      toast.error('Missing fields', 'Please fill in all mandatory profile fields including phone number.');
      return;
    }

    const cleanPhone = formData.phone.replace(/[^\d+]/g, '');
    if (cleanPhone.replace(/\D/g, '').length < 10) {
      toast.error('Invalid Phone', 'Please enter a valid 10-digit mobile number for couriers.');
      return;
    }

    const selectedState = INDIAN_STATES.find((s) => s.code === formData.stateCode);

    setLoading(true);
    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: cleanPhone,
        shopName: formData.shopName,
        legalName: formData.shopName,
        location: `${formData.city}, ${selectedState ? selectedState.name : 'West Bengal'}`,
        craftSpecialization: formData.craftSpecialization || undefined,
        bio: formData.bio || undefined,
        pickupAddress: {
          name: formData.name,
          phone: cleanPhone,
          street: formData.street,
          landmark: formData.landmark || undefined,
          city: formData.city,
          state: selectedState ? selectedState.name : 'West Bengal',
          stateCode: formData.stateCode,
          pincode: formData.pincode,
        },
        bankDetails: formData.accountNumber
          ? {
              accountNumber: formData.accountNumber,
              ifscCode: formData.ifscCode,
              accountHolderName: formData.accountHolderName || formData.name,
            }
          : undefined,
        pan: formData.pan || undefined,
        panLast4: formData.pan ? formData.pan.slice(-4) : undefined,
        gstin: formData.gstin ? formData.gstin.trim() : undefined,
      });

      if ('verificationRequired' in result && result.verificationRequired) {
        setUserId(result.userId);
        setEmailMasked(result.emailMasked);
        setEmailVerified(result.emailVerified);
        setEmailCooldown(result.resendCooldownSeconds || 60);
        setStep('otp');
        toast.info('Verification Required', 'Please enter the email verification code to submit your application.');
      } else {
        toast.success('Registration Submitted!', 'Your artisan studio application has been submitted for moderation.');
        navigate('/');
      }
    } catch (err: any) {
      toast.error('Registration Failed', err.message || 'Could not register seller account.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailOtp.length !== 6) {
      setOtpError('Please enter a valid 6-digit email OTP.');
      return;
    }
    setOtpError('');
    setEmailLoading(true);

    try {
      const res = await verifyRegistrationOtp({
        userId,
        channel: 'email',
        otp: emailOtp,
      });
      setEmailVerified(res.emailVerified);
      setOtpSuccess('Application and email verified! Redirecting to studio...');
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      setOtpError(err.message || 'Invalid email verification code. Please check and try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (emailCooldown > 0 || emailResending) return;
    setEmailResending(true);
    setOtpError('');
    try {
      const res = await resendRegistrationOtp({ userId, channel: 'email' });
      setEmailCooldown(res.resendCooldownSeconds || 60);
      setEmailMasked(res.maskedTarget);
      setOtpSuccess(`Fresh email verification code sent to ${res.maskedTarget}`);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to resend email code');
    } finally {
      setEmailResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-warm-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-terracotta-500 text-white shadow-warm-lg mb-3">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-display font-extrabold text-charcoal-900 tracking-tight">
            Join Kumor Para as an Artisan Creator
          </h2>
          <p className="mt-2 text-sm text-stone-warm-600">
            Showcase your handcrafted creations directly to patrons who value authenticity
          </p>
        </div>

        {step === 'form' ? (
          <form
            onSubmit={handleRegister}
            className="bg-white rounded-3xl p-6 sm:p-10 shadow-warm-lg border border-stone-warm-200/90 space-y-8"
          >
            {/* Section 1: Artisan Account */}
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-stone-warm-200 text-charcoal-900 font-display font-bold text-lg">
                <User className="w-5 h-5 text-terracotta-500" />
                <span>1. Creator Account Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Input
                  label="Full Name *"
                  name="name"
                  placeholder="e.g. Ananya Sen"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Email Address (OTP Verified) *"
                  name="email"
                  type="email"
                  placeholder="ananya@mrittika.in"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Password *"
                  name="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Contact Phone Number *"
                  name="phone"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Section 2: Studio Information */}
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-stone-warm-200 text-charcoal-900 font-display font-bold text-lg">
                <Store className="w-5 h-5 text-terracotta-500" />
                <span>2. Studio &amp; Craft Brand</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Input
                  label="Shop / Studio Name *"
                  name="shopName"
                  placeholder="e.g. Mrittika Clay Studio"
                  value={formData.shopName}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Craft Specialization"
                  name="craftSpecialization"
                  placeholder="e.g. Terracotta, Kantha, Dokra, Woodcraft"
                  value={formData.craftSpecialization}
                  onChange={handleChange}
                />
                <div className="sm:col-span-2">
                  <Textarea
                    label="Studio Story &amp; Bio"
                    name="bio"
                    placeholder="Tell patrons about your artisan heritage, technique, and craft journey..."
                    value={formData.bio}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Pickup Address */}
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-stone-warm-200 text-charcoal-900 font-display font-bold text-lg">
                <MapPin className="w-5 h-5 text-terracotta-500" />
                <span>3. Workshop Pickup Address (For Couriers)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Street Address *"
                    name="street"
                    placeholder="Plot 12, Kumartuli Lane"
                    value={formData.street}
                    onChange={handleChange}
                    required
                  />
                </div>
                <Input
                  label="Landmark"
                  name="landmark"
                  placeholder="Near Ghat No. 2"
                  value={formData.landmark}
                  onChange={handleChange}
                />
                <Input
                  label="City / Town *"
                  name="city"
                  placeholder="Kolkata"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
                <Select
                  label="State *"
                  name="stateCode"
                  value={formData.stateCode}
                  onChange={handleChange}
                  options={INDIAN_STATES.map((s) => ({ label: `${s.name} (${s.code})`, value: s.code }))}
                />
                <Input
                  label="Pincode *"
                  name="pincode"
                  placeholder="700005"
                  value={formData.pincode}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Section 4: Banking & Tax */}
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-stone-warm-200 text-charcoal-900 font-display font-bold text-lg">
                <Building2 className="w-5 h-5 text-terracotta-500" />
                <span>4. Bank Details &amp; Tax Configuration</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Input
                  label="Account Holder Name"
                  name="accountHolderName"
                  placeholder="Ananya Sen"
                  value={formData.accountHolderName}
                  onChange={handleChange}
                />
                <Input
                  label="Bank Account Number"
                  name="accountNumber"
                  placeholder="987654321012"
                  value={formData.accountNumber}
                  onChange={handleChange}
                />
                <Input
                  label="Bank IFSC Code"
                  name="ifscCode"
                  placeholder="SBIN0001234"
                  value={formData.ifscCode}
                  onChange={handleChange}
                />
                <Input
                  label="PAN Number"
                  name="pan"
                  placeholder="ABCDE1234F"
                  value={formData.pan}
                  onChange={handleChange}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="GSTIN (Optional — Leave blank if non-GST Bill of Supply)"
                    name="gstin"
                    placeholder="19ABCDE1234F1Z5"
                    value={formData.gstin}
                    onChange={handleChange}
                    helperText="Artisans without GSTIN issue statutory Bills of Supply with zero tax overhead."
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={loading}
            >
              Continue to Verification &bull; Submit
            </Button>

            <p className="text-xs text-stone-warm-600 text-center">
              Already registered?{' '}
              <Link to="/login" className="font-bold text-terracotta-600 hover:underline">
                Sign in here
              </Link>
            </p>
          </form>
        ) : (
          /* Step 2: Artisan Email OTP Screen */
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-warm-lg border border-stone-warm-200/90 space-y-6 max-w-xl mx-auto">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-terracotta-100 text-terracotta-700 flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck className="w-6 h-6 text-terracotta-600" />
              </div>
              <h3 className="font-display font-black text-2xl text-charcoal-900 tracking-tight">
                Verify Artisan Email
              </h3>
              <p className="text-xs text-stone-warm-600 max-w-md mx-auto">
                We've sent a 6-digit verification code to <span className="font-mono font-bold text-charcoal-900">{emailMasked}</span>. Enter the code below to submit your artisan studio application.
              </p>
            </div>

            {otpError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            {otpSuccess && (
              <div className="p-3.5 rounded-2xl bg-green-50 border border-green-200 flex items-center gap-2.5 text-green-700 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{otpSuccess}</span>
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
                      <span className="text-xs font-bold text-charcoal-900">Artisan Email Verification</span>
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
                      Verify Email &bull; Submit Studio
                    </Button>

                    <div className="flex justify-between items-center pt-2">
                      <button
                        type="button"
                        onClick={() => setStep('form')}
                        className="text-xs text-stone-warm-500 hover:text-stone-warm-700 hover:underline"
                      >
                        &larr; Back to application
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
                    Application verified and submitted for administrative approval!
                  </p>
                  <Button
                    type="button"
                    size="md"
                    variant="primary"
                    className="w-full"
                    onClick={() => navigate('/')}
                  >
                    Enter Artisan Studio
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
