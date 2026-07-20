import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LoadingState } from './components/LoadingState';
import { DirectoryDataProvider, useDirectoryData } from './data/DirectoryData';
import { AboutDataPage } from './pages/AboutDataPage';
import { CompanyDetailPage } from './pages/CompanyDetailPage';
import { DirectoryPage } from './pages/DirectoryPage';
import { NotFoundPage } from './pages/NotFoundPage';

function RoutedApp() {
  const { loading, error } = useDirectoryData();
  if (loading || error) return <LoadingState error={error} />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DirectoryPage />} />
        <Route path="companies" element={<Navigate to="/" replace />} />
        <Route path="companies/:employerId" element={<CompanyDetailPage />} />
        <Route path="about" element={<AboutDataPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return <DirectoryDataProvider><RoutedApp /></DirectoryDataProvider>;
}
