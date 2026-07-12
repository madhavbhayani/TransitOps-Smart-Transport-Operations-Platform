import { createBrowserRouter } from 'react-router-dom';
import LandingPage from '../screens/Landing/Landing_Page';
import Login from '../screens/Auth/Login';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <Login />,
  },
]);
