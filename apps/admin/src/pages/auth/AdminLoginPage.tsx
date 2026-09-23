import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid administrator credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-admin-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-admin-900 rounded-3xl border border-admin-800 p-8 sm:p-10 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-terracotta-600 text-white flex items-center justify-center mx-auto shadow-admin-sm">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-display font-black text-2xl text-white tracking-tight">
            Kumor Para Admin Console
          </h1>
          <p className="text-xs text-admin-400">
            Authorised marketplace administrator credentials required.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-800/60 flex items-center gap-2.5 text-red-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Admin Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@kumorpara.com"
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
            className="w-full shadow-admin-sm"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Authenticate Session
          </Button>
        </form>
      </div>
    </div>
  );
};
