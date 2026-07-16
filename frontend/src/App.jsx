import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
  createHashRouter,
} from 'react-router-dom';
import { isStaticDemo } from './api';
import Layout from './components/Layout';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Product from './pages/Product';
import Games from './pages/Games';
import GamesHub from './pages/GamesHub';
import Cart from './pages/Cart';
import Auth from './pages/Auth';
import Account from './pages/Account';
import NotFound from './pages/NotFound';
import TradeIn from './pages/TradeIn';
import Guides from './pages/Guides';
import Model from './pages/Model';
import Sell from './pages/Sell';

const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'catalog', element: <Catalog /> },
      { path: 'favorites', element: <Catalog favoritesOnly /> },
      { path: 'product/:id', element: <Product /> },
      { path: 'model/:brand/:model', element: <Model /> },
      { path: 'games', element: <GamesHub /> },
      { path: 'games/precision', element: <Games game="precision" /> },
      { path: 'games/quiz', element: <Games game="quiz" /> },
      { path: 'games/tictactoe', element: <Games game="tictactoe" /> },
      { path: 'cart', element: <Cart /> },
      { path: 'auth', element: <Auth /> },
      { path: 'account', element: <Account /> },
      { path: 'sell', element: <Sell /> },
      { path: 'trade-in', element: <TradeIn /> },
      { path: 'guides', element: <Guides /> },
      { path: 'index.html', element: <Navigate to="/" replace /> },
      { path: 'product.html', element: <Navigate to="/catalog" replace /> },
      { path: 'auth.html', element: <Navigate to="/auth" replace /> },
      { path: 'admin.html', element: <Navigate to="/account" replace /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];

const router = isStaticDemo
  ? createHashRouter(routes)
  : createBrowserRouter(routes, {
      basename: import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL,
    });

export default function App() {
  return <RouterProvider router={router} />;
}
