import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../lib/api';

export interface ISellerProfile {
  _id: string;
  userId: string;
  shopName: string;
  slug: string;
  bio?: string;
  story?: string;
  craftSpecialization?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejectionReason?: string;
  commissionRate?: number;
  isVacationMode?: boolean;
  logo?: string;
  banner?: string;
  pickupAddress: {
    name: string;
    phone: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
  };
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName?: string;
  };
  pan?: string;
  gstin?: string;
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'seller' | 'admin';
  emailVerified?: boolean;
  phoneVerified?: boolean;
  isAccountActive?: boolean;
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
  sellerId?: string;
  emailMasked: string;
  phoneMasked?: string;
  emailVerified: boolean;
  phoneVerified?: boolean;
  resendCooldownSeconds: number;
  user?: IUser;
  seller?: ISellerProfile;
}

export type SellerLoginResult = { user: IUser; seller?: ISellerProfile } | MfaChallenge;
export type SellerSignupResult = { user: IUser; seller?: ISellerProfile } | RegistrationChallenge;

interface AuthContextType {
  user: IUser | null;
  seller: ISellerProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<SellerLoginResult>;
  verifyLoginOtp: (params: { tempToken: string; otp: string; channel?: 'email' | 'phone' }) => Promise<{ user: IUser; seller?: ISellerProfile }>;
  resendLoginOtp: (params: { tempToken: string; channel?: 'email' | 'phone' }) => Promise<{ maskedTarget: string; resendCooldownSeconds: number }>;
  register: (payload: any) => Promise<SellerSignupResult>;
  verifyRegistrationOtp: (params: { userId: string; otp: string; channel?: 'email' | 'phone' }) => Promise<{
    isFullyVerified: boolean;
    channelVerified: 'email' | 'phone';
    emailVerified: boolean;
    phoneVerified?: boolean;
    user?: IUser;
    seller?: ISellerProfile;
  }>;
  resendRegistrationOtp: (params: { userId: string; channel?: 'email' | 'phone' }) => Promise<{
    channel: 'email' | 'phone';
    maskedTarget: string;
    resendCooldownSeconds: number;
  }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [seller, setSeller] = useState<ISellerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: IUser; seller?: ISellerProfile }>('/auth/me');
      if (data && data.user) {
        if (data.user.role !== 'seller') {
          setUser(null);
          setSeller(null);
          return;
        }
        setUser(data.user);
        if (data.seller) {
          setSeller(data.seller);
        } else {
          try {
            const sellerRes = await api.get<{ seller: ISellerProfile }>('/sellers/me');
            if (sellerRes?.seller) setSeller(sellerRes.seller);
          } catch {
            // Pending creation
          }
        }
      } else {
        setUser(null);
        setSeller(null);
      }
    } catch {
      setUser(null);
      setSeller(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string): Promise<SellerLoginResult> => {
    const data = await api.post<any>('/auth/seller/login', {
      email,
      password,
    });

    if (data?.mfaRequired) {
      return {
        mfaRequired: true,
        tempToken: data.tempToken,
        channel: data.channel || 'email',
        maskedTarget: data.maskedTarget,
        resendCooldownSeconds: data.resendCooldownSeconds || 60,
      };
    }

    if (data?.verificationRequired) {
      return {
        verificationRequired: true,
        userId: data.userId,
        sellerId: data.sellerId,
        emailMasked: data.emailMasked,
        phoneMasked: data.phoneMasked,
        emailVerified: Boolean(data.emailVerified),
        resendCooldownSeconds: data.resendCooldownSeconds || 60,
      } as any;
    }

    if (data?.user) {
      if (data.user.role !== 'seller') {
        await api.post('/auth/logout');
        throw new ApiError('Access denied: This portal is reserved for Kumor Para artisans and creators.', 403);
      }
      setUser(data.user);
      if (data.seller) {
        setSeller(data.seller);
      } else {
        await fetchCurrentUser();
      }
      return { user: data.user, seller: data.seller };
    }

    throw new ApiError('Invalid response from server', 500);
  };

  const verifyLoginOtp = async (params: { tempToken: string; otp: string; channel?: 'email' | 'phone' }) => {
    const data = await api.post<{ user: IUser; seller?: ISellerProfile }>('/auth/login/verify-otp', params);
    if (!data?.user) {
      throw new ApiError('Verification failed', 400);
    }
    if (data.user.role !== 'seller') {
      await api.post('/auth/logout');
      throw new ApiError('Access denied: User is not a registered seller.', 403);
    }
    setUser(data.user);
    if (data.seller) {
      setSeller(data.seller);
    } else {
      await fetchCurrentUser();
    }
    return data;
  };

  const resendLoginOtp = async (params: { tempToken: string; channel?: 'email' | 'phone' }) => {
    return api.post<{ maskedTarget: string; resendCooldownSeconds: number }>('/auth/login/resend-otp', params);
  };

  const register = async (payload: any): Promise<SellerSignupResult> => {
    const data = await api.post<any>('/auth/seller/signup', {
      ...payload,
    });

    if (data?.verificationRequired) {
      return {
        verificationRequired: true,
        userId: data.userId,
        sellerId: data.sellerId,
        emailMasked: data.emailMasked,
        phoneMasked: data.phoneMasked,
        emailVerified: Boolean(data.emailVerified),
        phoneVerified: Boolean(data.phoneVerified),
        resendCooldownSeconds: data.resendCooldownSeconds || 60,
        user: data.user,
        seller: data.seller,
      };
    }

    if (data?.user) {
      setUser(data.user);
      if (data.seller) {
        setSeller(data.seller);
      } else {
        await fetchCurrentUser();
      }
      return { user: data.user, seller: data.seller };
    }

    throw new ApiError('Artisan registration failed', 500);
  };

  const verifyRegistrationOtp = async (params: { userId: string; otp: string; channel?: 'email' | 'phone' }) => {
    const res = await api.post<{
      isFullyVerified: boolean;
      channelVerified: 'email' | 'phone';
      emailVerified: boolean;
      phoneVerified?: boolean;
      user?: IUser;
      seller?: ISellerProfile;
    }>('/auth/verify-registration-otp', {
      ...params,
      channel: params.channel || 'email',
    });

    if (res.isFullyVerified && res.user) {
      setUser(res.user);
      if (res.seller) {
        setSeller(res.seller);
      } else {
        await fetchCurrentUser();
      }
    }
    return res;
  };

  const resendRegistrationOtp = async (params: { userId: string; channel?: 'email' | 'phone' }) => {
    return api.post<{
      channel: 'email' | 'phone';
      maskedTarget: string;
      resendCooldownSeconds: number;
    }>('/auth/resend-registration-otp', {
      ...params,
      channel: params.channel || 'email',
    });
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      setUser(null);
      setSeller(null);
    }
  };

  const refreshProfile = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        seller,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        verifyLoginOtp,
        resendLoginOtp,
        register,
        verifyRegistrationOtp,
        resendRegistrationOtp,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
