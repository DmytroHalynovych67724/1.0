import { lazy, Suspense } from 'react';
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
import Cart from './pages/Cart';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';
import TradeIn from './pages/TradeIn';
import Guides from './pages/Guides';
import Model from './pages/Model';
import BrandMark from './components/BrandMark';
import { useStore } from './store';
import RouteError from './components/RouteError';

const Account = lazy(() => import('./pages/Account'));
const Sell = lazy(() => import('./pages/Sell'));
const Games = lazy(() => import('./pages/Games'));
const GamesHub = lazy(() => import('./pages/GamesHub'));

function RouteLoading() {
  const { language } = useStore();
  return <div className="shell page-loader route-loading" role="status"><BrandMark /><span>{language === 'uk' ? 'Завантаження…' : language === 'en' ? 'Loading…' : 'Ładowanie…'}</span></div>;
}

const routes = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: 'catalog', element: <Catalog /> },
      { path: 'marketplace', element: <Catalog section="used" /> },
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
  return <Suspense fallback={<RouteLoading />}><RouterProvider router={router} /></Suspense>;
}
