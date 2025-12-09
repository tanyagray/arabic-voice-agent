import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setLoading(true);
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6">
        <div className="text-center pt-6">
          <img 
            src="/logo.svg" 
            alt="Arabic Voice Agent" 
            className="h-32 w-auto mx-auto mb-2"
          />
        </div>
        <div className="text-center space-y-4">
          <div className="rounded-md bg-green-900/50 border border-green-500 p-4">
            <div className="text-sm text-green-200">
              Password reset email sent! Check your inbox and follow the link to reset your password.
            </div>
          </div>
          <div className="text-sm">
            <Link
              to="/sign-in"
              className="font-medium text-blue-200 hover:text-blue-100 transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center pt-6">
        <img 
          src="/logo.svg" 
          alt="Arabic Voice Agent" 
          className="h-32 w-auto mx-auto mb-2"
        />
      </div>
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold text-white mb-2">Forgot your password?</h2>
        <p className="text-gray-300 text-sm">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-md bg-red-900/50 border border-red-500 p-4">
            <div className="text-sm text-red-200">{error}</div>
          </div>
        )}
        <div>
          <label htmlFor="email-address" className="sr-only">
            Email address
          </label>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90 backdrop-blur-sm"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </div>

        <div className="text-sm text-center">
          <Link
            to="/sign-in"
            className="font-medium text-blue-200 hover:text-blue-100 transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword; 