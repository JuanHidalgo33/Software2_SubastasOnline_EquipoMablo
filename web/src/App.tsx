import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { AuctionDetailPage } from './pages/AuctionDetailPage';
import { AuctionListPage } from './pages/AuctionListPage';
import { LoginPage } from './pages/LoginPage';
import { PublishAuctionPage } from './pages/PublishAuctionPage';
import { RegisterPage } from './pages/RegisterPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<AuctionListPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/auctions/new"
          element={
            <RequireAuth>
              <PublishAuctionPage />
            </RequireAuth>
          }
        />
          <Route path="/auctions/:id" element={<AuctionDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}