import { createBrowserRouter } from 'react-router-dom';
import LandingPage from '../screens/Landing/Landing_Page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
]);
