import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updatePassword, user } = useAuth();

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        console.log('ResetPassword: Page loaded, current URL:', window.location.href);
        console.log('ResetPassword: Hash:', window.location.hash);
        
        // Parse hash fragments (where Supabase sends tokens)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        // Also check URL search parameters as fallback
        const token = searchParams.get('token');
        const searchType = searchParams.get('type');
        
        console.log('ResetPassword: Hash params:', { 
          accessToken: !!accessToken, 
          refreshToken: !!refreshToken, 
          type 
        });
        console.log('ResetPassword: Search params:', { 
          token: !!token, 
          type: searchType 
        });
        
        // If we have access_token and refresh_token in hash, set the session
        if (accessToken && refreshToken) {
          console.log('ResetPassword: Setting session from hash tokens');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('Error setting session:', error);
            setError('Invalid or expired reset link. Please request a new password reset.');
          } else if (data.session) {
            console.log('ResetPassword: Session established from hash tokens');
            setIsValidToken(true);
            // Clean up the hash to remove tokens from URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else if (token && searchType === 'recovery') {
          // Handle the recovery token from search parameters (fallback)
          console.log('ResetPassword: Processing recovery token from search params');
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });
          
          if (error) {
            console.error('Error verifying recovery token:', error);
            setError('Invalid or expired reset link. Please request a new password reset.');
          } else if (data.session) {
            console.log('ResetPassword: Session established from recovery token');
            setIsValidToken(true);
          } else {
            console.log('ResetPassword: No session after token verification');
            setError('Failed to establish session. Please request a new password reset.');
          }
        } else {
          // Check if we already have a valid session
          console.log('ResetPassword: Checking existing session');
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            console.log('ResetPassword: Valid session found');
            setIsValidToken(true);
          } else {
            console.log('ResetPassword: No valid session or tokens found');
            setError('Invalid or expired reset link. Please request a new password reset.');
          }
        }
      } catch (err) {
        console.error('Error handling password reset:', err);
        setError('Failed to validate reset link');
      } finally {
        setIsChecking(false);
      }
    };

    handlePasswordReset();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await updatePassword(password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="space-y-6">
        <div className="text-center pt-6">
          <img 
            src="/logo.svg" 
            alt="Arabic Voice Agent" 
            className="h-32 w-auto mx-auto mb-2"
          />
        </div>
        <div className="text-center">
          <div className="text-white">Validating reset link...</div>
        </div>
      </div>
    );
  }

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
              Password updated successfully! You can now sign in with your new password.
            </div>
          </div>
          <div className="text-sm">
            <button
              onClick={() => navigate('/sign-in')}
              className="font-medium text-blue-200 hover:text-blue-100 transition-colors"
            >
              Go to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidToken && !isChecking) {
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
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold text-white mb-2">Password Reset</h2>
            <p className="text-gray-300 text-sm">
              {error || 'Unable to validate your reset link. This could be because the link has expired or is invalid.'}
            </p>
          </div>
          {error && (
            <div className="rounded-md bg-red-900/50 border border-red-500 p-4">
              <div className="text-sm text-red-200">{error}</div>
            </div>
          )}
          <div className="text-sm space-y-2">
            <div>
              <button
                onClick={() => navigate('/forgot-password')}
                className="font-medium text-blue-200 hover:text-blue-100 transition-colors"
              >
                Request new reset link
              </button>
            </div>
            <div>
              <button
                onClick={() => navigate('/sign-in')}
                className="font-medium text-blue-200 hover:text-blue-100 transition-colors"
              >
                Back to sign in
              </button>
            </div>
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
        <h2 className="text-xl font-semibold text-white mb-2">
          {user?.email ? `Choose a new password for ${user.email}` : 'Reset your password'}
        </h2>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-md bg-red-900/50 border border-red-500 p-4">
            <div className="text-sm text-red-200">{error}</div>
          </div>
        )}
        <div className="rounded-md shadow-sm space-y-2">
          <div>
            <label htmlFor="password" className="sr-only">
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-t-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90 backdrop-blur-sm"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="sr-only">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-b-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90 backdrop-blur-sm"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResetPassword; 