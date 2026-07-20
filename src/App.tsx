import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LoadingState } from './components/LoadingState';
import { DashboardDataProvider, useDashboardData } from './data/DashboardData';
import { CompaniesPage } from './pages/CompaniesPage';
import { CompanyDetailPage } from './pages/CompanyDetailPage';
import { DataQualityPage } from './pages/DataQualityPage';
import { FilingsCompaniesPage } from './pages/FilingsCompaniesPage';
import { FilingsStatesPage } from './pages/FilingsStatesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OverviewPage } from './pages/OverviewPage';

function RoutedApp() {
  const { loading, error } = useDashboardData();

  if (loading || error) return <LoadingState error={error} />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="companies/:employerId" element={<CompanyDetailPage />} />
        <Route path="filings/states" element={<FilingsStatesPage />} />
        <Route path="filings/companies" element={<FilingsCompaniesPage />} />
        <Route path="data-quality" element={<DataQualityPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <DashboardDataProvider>
      <RoutedApp />
    </DashboardDataProvider>
  );
}
