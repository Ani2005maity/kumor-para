import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

export interface CustomerUser {
  _id: string;
  name: string;
  email: string;
  role: 'customer' | 'seller' | 'admin';
  phone?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  isAccountActive?: boolean;
  addresses?: Array<{
    _id?: string;
    name: string;
    phone: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
    isDefault?: boolean;
  }>;
}

export interface MfaChallenge {
  mfaRequired: true;
  tempToken: string;
  channel: 'email' | 'phone';
  maskedTarget: string;
  resendCooldownSeconds: number;
}

export interface RegistrationChallenge {
  verificationRequired: true;
  userId: string;
  emailMasked: string;
  phoneMasked?: string;
  emailVerified: boolean;
  phoneVerified?: boolean;
  resendCooldownSeconds: number;
  user?: CustomerUser;
}

export type LoginResult = { user: CustomerUser } | MfaChallenge;
export type SignupResult = { user: CustomerUser } | RegistrationChallenge;

interface SignupPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  address?: {
    name: string;
    phone: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
  };
}

interface AuthContextType {
  user: CustomerUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyLoginOtp: (params: { tempToken: string; otp: string; channel?: 'email' | 'phone' }) => Promise<CustomerUser>;
  resendLoginOtp: (params: { tempToken: string; channel?: 'email' | 'phone' }) => Promise<{ maskedTarget: string; resendCooldownSeconds: number }>;
  signup: (payload: SignupPayload) => Promise<SignupResult>;
  verifyRegistrationOtp: (params: { userId: string; otp: string; channel?: 'email' | 'phone' }) => Promise<{
    isFullyVerified: boolean;
    channelVerified: 'email' | 'phone';
    emailVerified: boolean;
    phoneVerified?: boolean;
    user?: CustomerUser;
  }>;
  resendRegistrationOtp: (params: { userId: string; channel?: 'email' | 'phone' }) => Promise<{
    channel: 'email' | 'phone';
    maskedTarget: string;
    resendCooldownSeconds: number;
  }>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<CustomerUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async (): Promise<CustomerUser | null> => {
    try {
      const res = await api.get<{ user: CustomerUser }>('/auth/me');
      if (res && res.user) {
        setUser(res.user);
        return res.user;
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const res = await api.post<any>('/auth/customer/login', { email, password });
    if (res?.mfaRequired) {
      return {
        mfaRequired: true,
        tempToken: res.tempToken,
        channel: res.channel,
        maskedTarget: res.maskedTarget,
        resendCooldownSeconds: res.resendCooldownSeconds || 60,
      };
    }
    if (res?.verificationRequired) {
      return {
        verificationRequired: true,
        userId: res.userId,
        emailMasked: res.emailMasked,
        phoneMasked: res.phoneMasked,
        emailVerified: Boolean(res.emailVerified),
        phoneVerified: Boolean(res.phoneVerified),
        resendCooldownSeconds: res.resendCooldownSeconds || 60,
      } as any;
    }
    if (res?.user) {
      setUser(res.user);
      return { user: res.user };
    }
    throw new Error('Invalid login response from server');
  };

  const verifyLoginOtp = async (params: { tempToken: string; otp: string; channel?: 'email' | 'phone' }): Promise<CustomerUser> => {
    const res = await api.post<{ user: CustomerUser }>('/auth/login/verify-otp', params);
    if (!res?.user) {
      throw new Error('OTP verification failed');
    }
    setUser(res.user);
    return res.user;
  };

  const resendLoginOtp = async (params: { tempToken: string; channel?: 'email' | 'phone' }) => {
    const res = await api.post<{ maskedTarget: string; resendCooldownSeconds: number }>('/auth/login/resend-otp', params);
    return res;
  };

  const signup = async (payload: SignupPayload): Promise<SignupResult> => {
    const res = await api.post<any>('/auth/customer/signup', payload);
    if (res?.verificationRequired) {
      return {
        verificationRequired: true,
        userId: res.userId,
        emailMasked: res.emailMasked,
        phoneMasked: res.phoneMasked,
        emailVerified: Boolean(res.emailVerified),
        phoneVerified: Boolean(res.phoneVerified),
        resendCooldownSeconds: res.resendCooldownSeconds || 60,
        user: res.user,
      };
    }
    if (res?.user) {
      setUser(res.user);
      return { user: res.user };
    }
    throw new Error('Registration failed');
  };

  const verifyRegistrationOtp = async (params: { userId: string; otp: string; channel?: 'email' | 'phone' }) => {
    const res = await api.post<{
      isFullyVerified: boolean;
      channelVerified: 'email' | 'phone';
      emailVerified: boolean;
      phoneVerified?: boolean;
      user?: CustomerUser;
    }>('/auth/verify-registration-otp', {
      ...params,
      channel: params.channel || 'email',
    });

    if (res.isFullyVerified && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const resendRegistrationOtp = async (params: { userId: string; channel?: 'email' | 'phone' }) => {
    const res = await api.post<{
      channel: 'email' | 'phone';
      maskedTarget: string;
      resendCooldownSeconds: number;
    }>('/auth/resend-registration-otp', {
      ...params,
      channel: params.channel || 'email',
    });
    return res;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        verifyLoginOtp,
        resendLoginOtp,
        signup,
        verifyRegistrationOtp,
        resendRegistrationOtp,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
