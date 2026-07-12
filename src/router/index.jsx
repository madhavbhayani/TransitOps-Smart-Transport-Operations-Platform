import { createBrowserRouter } from 'react-router-dom';
import LandingPage from '../screens/Landing/Landing_Page';
import Login from '../screens/Auth/Login';
import ConsoleLayout from '../components/Layout/ConsoleLayout';
import Dashboard from '../screens/Console/Dashboard/Dashboard';
import DriversList from '../screens/Console/Drivers/Drivers_List';
import DriverDetail from '../screens/Console/Drivers/Driver_Detail';
import FleetPage from '../screens/Console/Fleet/Fleet_Page';
import VehiclesRegister from '../screens/Console/Fleet/VehiclesRegister';
import VehiclesDetail from '../screens/Console/Fleet/VehiclesDetail';
import RegisterMaintenance from '../screens/Console/Maintenance/RegisterMaintenance';
import TripList from '../screens/Console/Trips/Trip_List';
import TripDetail from '../screens/Console/Trips/Trip_Detail';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/console',
    element: <ConsoleLayout />,
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />
      },
      {
        path: 'drivers',
        element: <DriversList />
      },
      {
        path: 'drivers/:id',
        element: <DriverDetail />
      },
      {
        path: 'fleet',
        element: <FleetPage />
      },
      {
        path: 'fleet/new',
        element: <VehiclesRegister />
      },
      {
        path: 'fleet/:id',
        element: <VehiclesDetail />
      },
      {
        path: 'maintenance',
        element: <RegisterMaintenance />
      },
      {
        path: 'trips',
        element: <TripList />
      },
      {
        path: 'trips/:id',
        element: <TripDetail />
      }
    ]
  }
]);
