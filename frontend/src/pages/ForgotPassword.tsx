import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setResetUrl('');
    try {
      const res = await authService.forgotPassword(email);
      setMessage(res?.message || 'If this account exists, reset instructions were sent.');
      if (res?.data?.resetUrl) setResetUrl(res.data.resetUrl);
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Could not request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Forgot password</h1>
        <p className="mt-1 text-sm text-gray-600">Enter your email and we will create a reset link.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-green-500 focus:ring-2 focus:ring-green-500"
            placeholder="you@restaurant.com"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-600 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? 'Preparing reset...' : 'Send reset link'}
          </button>
        </form>
        {message ? <p className="mt-4 text-sm text-gray-700">{message}</p> : null}
        {resetUrl ? (
          <a href={resetUrl} className="mt-2 block break-all text-sm text-green-700 underline">
            {resetUrl}
          </a>
        ) : null}
        <Link to="/login" className="mt-5 inline-block text-sm text-gray-600 hover:text-gray-900">
          Back to login
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
