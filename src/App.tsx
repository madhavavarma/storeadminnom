import { Route, Routes, HashRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store/Store'
import './App.css'


import AppSidebar from './pages/Layout/AppSitebar'
import Orders from './pages/Orders/Orders'
import Categories from './pages/Categories/Categories'
import Settings from './pages/Settings'
import Header from './components/Header'
import Products from './pages/Products/Products'
import { useState, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppSettingsActions } from './store/AppSettingsSlice';
import { getAppSettings } from './pages/api';
import Dashboard from './pages/Dashboard/Dashboard'
import Customers from './pages/Customers'



function AppContent() {
  const [refreshKey, setRefreshKey] = useState(0);
  const dispatch = useDispatch();

  // Load app settings from Supabase and set in Redux on mount
  useEffect(() => {
    getAppSettings()
      .then((settings) => {
        if (settings) {
          dispatch(AppSettingsActions.setAppSettings(settings));
        }
      })
      .catch(() => {
        // Optionally handle error (e.g., show notification)
        // console.error('Failed to load app settings:', err);
      });
  }, [dispatch, refreshKey]);

  const handleAuthSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex min-h-screen">
      <AppSidebar refreshKey={refreshKey} />
      <div className="flex-1 flex flex-col">
        <Header onAuthSuccess={handleAuthSuccess} />
  <main className="flex-1 bg-zinc-50 dark:bg-zinc-900 max-w-[100%]">
          <Routes>
            <Route path="/dashboard" element={<Dashboard key={refreshKey} />} />
            <Route path="/orders" element={<Orders refreshKey={refreshKey} />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories refreshKey={refreshKey} />} />
            <Route path="/settings" element={<Settings refreshKey={refreshKey} />} />
            <Route path="/customers" element={<Customers refreshKey={refreshKey} />} />
            {/* Add more routes here as needed */}
            <Route path="*" element={<Dashboard key={refreshKey} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </Provider>
  );
}

