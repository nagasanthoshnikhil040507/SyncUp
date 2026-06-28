import AppRouter from './router/AppRouter';
import { AuthProvider } from './context/AuthContext';

/**
 * App — Root Component
 *
 * Currently renders the router wrapped in AuthProvider.
 */
const App = () => {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
};

export default App;
