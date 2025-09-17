import { supabase } from '@/supabaseClient';
import { useState } from 'react';
import { motion } from 'framer-motion';



type AuthMode = 'signIn' | 'signUp' | 'forgot';

interface SupabaseAuthProps {
  onAuthSuccess?: () => void;
}

const SupabaseAuth = ({ onAuthSuccess }: SupabaseAuthProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<AuthMode>('signIn');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Signed in successfully!');
      if (onAuthSuccess) {
        setTimeout(() => {
          onAuthSuccess();
        }, 600);
      }
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Sign up successful! Please check your email to confirm.');
    }
    setLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const redirectTo =
      process.env.NODE_ENV === 'production'
        ? 'https://madhavavarma.github.io/storeui/#/reset-password'
        : 'http://localhost:5173/storeui/#/reset-password';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Password reset email sent!');
    }
    setLoading(false);
  };

  return (
    <motion.div
      className="flex flex-col h-full justify-between p-0 text-black bg-gradient-to-br from-white via-gray-50 to-green-50"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <motion.div
        className="flex flex-col gap-6 flex-1 justify-center px-6 py-8 max-w-md mx-auto w-full"
        initial={{ scale: 0.98, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex justify-center mb-4 gap-2">
          <button
            className={`px-4 py-2 rounded-full shadow-sm font-semibold transition-all duration-200 border ${mode === 'signIn' ? 'bg-green-600 text-white scale-105' : 'bg-white text-green-700 border-green-200 hover:bg-green-50'}`}
            onClick={() => setMode('signIn')}
            disabled={loading}
          >Sign In</button>
          <button
            className={`px-4 py-2 rounded-full shadow-sm font-semibold transition-all duration-200 border ${mode === 'signUp' ? 'bg-green-600 text-white scale-105' : 'bg-white text-green-700 border-green-200 hover:bg-green-50'}`}
            onClick={() => setMode('signUp')}
            disabled={loading}
          >Sign Up</button>
          <button
            className={`px-4 py-2 rounded-full shadow-sm font-semibold transition-all duration-200 border ${mode === 'forgot' ? 'bg-green-600 text-white scale-105' : 'bg-white text-green-700 border-green-200 hover:bg-green-50'}`}
            onClick={() => setMode('forgot')}
            disabled={loading}
          >Forgot?</button>
        </div>
        {mode !== 'forgot' && (
          <motion.form
            onSubmit={mode === 'signIn' ? handleSignIn : handleSignUp}
            className="flex flex-col gap-5 bg-white/90 rounded-xl shadow-lg p-6 border border-gray-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-2xl font-extrabold mb-2 text-center text-green-700 tracking-tight drop-shadow-sm">
              {mode === 'signIn' ? 'Sign In to Your Account' : 'Create a New Account'}
            </h2>
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-200 text-black bg-white shadow-sm"
              autoComplete="email"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-200 text-black bg-white shadow-sm"
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
            />
            <button
              type="submit"
              className="bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-all duration-200 shadow-md mt-2"
              disabled={loading}
            >
              {loading ? (mode === 'signIn' ? 'Signing In...' : 'Signing Up...') : (mode === 'signIn' ? 'Sign In' : 'Sign Up')}
            </button>
          </motion.form>
        )}
        {mode === 'forgot' && (
          <motion.form
            onSubmit={handleForgot}
            className="flex flex-col gap-5 bg-white/90 rounded-xl shadow-lg p-6 border border-gray-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-2xl font-extrabold mb-2 text-center text-green-700 tracking-tight drop-shadow-sm">Forgot Password?</h2>
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-200 text-black bg-white shadow-sm"
              autoComplete="email"
            />
            <button
              type="submit"
              className="bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-all duration-200 shadow-md mt-2"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </motion.form>
        )}
        {message && (
          <motion.div
            className="text-center text-base text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 mt-2 shadow-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {message}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default SupabaseAuth;