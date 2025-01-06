import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { AuthForm } from './components/AuthForm';
import { CameraList } from './components/CameraList';
import { NotificationList } from './components/NotificationList';
import { CameraDetails } from './components/CameraDetails';
import { LogOut, Camera, Bell } from 'lucide-react';

function App() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return <AuthForm />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex space-x-4">
                <Link
                  to="/"
                  className="inline-flex items-center px-4 py-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Cameras
                </Link>
                <Link
                  to="/notifications"
                  className="inline-flex items-center px-4 py-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                >
                  <Bell className="w-5 h-5 mr-2" />
                  Notifications
                </Link>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-4">{session.user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<CameraList />} />
            <Route path="/notifications" element={<NotificationList />} />
            <Route path="/camera/:id" element={<CameraDetails />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;