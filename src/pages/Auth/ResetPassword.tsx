import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/supabaseClient';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenPresent, setTokenPresent] = useState(false);

  // Extract tokens from the second hash
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  useEffect(() => {
    const url = window.location.href;
    const hashParts = url.split('#');
    let params = '';
    if (hashParts.length > 2) {
      params = hashParts[2];
    }
    const searchParams = new URLSearchParams(params.replace(/&/g, '&'));
    const access_token = searchParams.get('access_token');
    const refresh_token = searchParams.get('refresh_token');
    if (access_token) {
      setTokenPresent(true);
      setAccessToken(access_token);
      if (refresh_token) setRefreshToken(refresh_token);
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    // Restore session if access token is present
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Password updated! Redirecting...');
      setTimeout(() => {
        navigate('/orders');
      }, 1500);
    }
    setLoading(false);
  };

  if (!tokenPresent) {
    return <div className="p-8 text-center">Invalid or expired reset link.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex flex-1 flex-col items-center justify-center">
        <form onSubmit={handleReset} className="bg-white p-8 rounded shadow-md w-full max-w-md flex flex-col gap-4">
          <h2 className="text-2xl font-bold mb-2 text-center">Reset Password</h2>
          <input
            type="password"
            required
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border rounded px-3 py-2 focus:outline-none focus:ring text-black bg-white"
          />
          <input
            type="password"
            required
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="border rounded px-3 py-2 focus:outline-none focus:ring text-black bg-white"
          />
          <button
            type="submit"
            className="bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
          {message && <div className="text-center text-sm text-gray-500 mt-2">{message}</div>}
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;