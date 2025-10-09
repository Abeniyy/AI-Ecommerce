import Navbar from '../components/Navbar';
import { Outlet } from 'react-router-dom';

export default function RootLayout() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <Outlet />
      </main>
    </>
  );
}
