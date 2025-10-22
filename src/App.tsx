import { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import { setAccessToken } from './services/googleSheets';
import { createSession, endSession } from './services/sessionService';

function App() {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');

      if (token) {
        setAccessToken(token);
        setAccessTokenState(token);
        window.history.replaceState({}, document.title, window.location.pathname);

        fetchUserEmail(token);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserEmail = async (token: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserEmail(data.email);

        const newSessionId = await createSession(data.email);
        if (newSessionId) {
          setSessionId(newSessionId);
        }
      } else {
        console.error('Failed to fetch user info:', response.status);
        setAccessTokenState(null);
      }
    } catch (error) {
      console.error('Error fetching user email:', error);
      setAccessTokenState(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (token: string) => {
    setAccessToken(token);
    setAccessTokenState(token);
  };

  const handleLogout = async () => {
    if (sessionId) {
      await endSession(sessionId, 0);
    }

    setAccessToken('');
    setAccessTokenState(null);
    setUserEmail(null);
    setSessionId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!accessToken || !userEmail || !sessionId) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <Dashboard sessionId={sessionId} analystEmail={userEmail} onLogout={handleLogout} />;
}

export default App;
