import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LoadingState } from './components/LoadingState';
import { DashboardDataProvider, useDashboardData } from './data/DashboardData';
import { NotFoundPage } from './app/NotFoundPage';
import { CompaniesPage } from './features/companies/CompaniesPage';
import { CompanyDetailPage } from './features/companies/CompanyDetailPage';
import { DataQualityPage } from './features/data-quality/DataQualityPage';
import { FilingsCompaniesPage } from './features/filings/FilingsCompaniesPage';
import { FilingsStatesPage } from './features/filings/FilingsStatesPage';
import { OverviewPage } from './features/overview/OverviewPage';

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
