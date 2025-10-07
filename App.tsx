import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import LabelLensApp from './LabelLensApp';

const App: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <LabelLensApp /> : <LoginScreen />;
};

export default App;