import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Hero } from '../components/Hero/Hero';
import { Features } from '../components/Features/Features';
import { Footer } from '../components/Footer/Footer';

function HomePage() {
  const { user, isAnonymous, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Header with Auth */}
      <header className="absolute top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Arabic Voice Agent</h1>
          <div>
            {isAnonymous ? (
              <div className="space-x-3">
                <button
                  onClick={() => navigate('/sign-in')}
                  className="px-4 py-2 text-white hover:text-gray-200 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/sign-up')}
                  className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  Sign Up
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-white/80">{user?.email}</span>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 text-white hover:text-gray-200 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <Hero />
      <Features />
      <Footer />
    </div>
  );
}

export default HomePage;
