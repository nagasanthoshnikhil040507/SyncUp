import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

/**
 * AppShell
 *
 * Layout wrapper for all authenticated pages.
 * Renders the sticky Navbar above the page content.
 * Used as the element for the protected route group in AppRouter.
 */
const AppShell = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default AppShell;
