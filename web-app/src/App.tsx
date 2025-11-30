import { HomePage } from './pages/HomePage';
import { useAuth } from './hooks/useAuth';

function App() {
  const { isLoading, error, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p>Authentication error: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>Authenticating...</p>
        </div>
      </div>
    );
  }

  return <HomePage />;
}

export default App;
