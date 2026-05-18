import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import EntwicklungsstufenPage from '@/pages/EntwicklungsstufenPage';
import FundortePage from '@/pages/FundortePage';
import DigimonSammlungPage from '@/pages/DigimonSammlungPage';
import NeuesDigimonHinzufuegenPage from '@/pages/NeuesDigimonHinzufuegenPage';
import PublicFormEntwicklungsstufen from '@/pages/public/PublicForm_Entwicklungsstufen';
import PublicFormFundorte from '@/pages/public/PublicForm_Fundorte';
import PublicFormDigimonSammlung from '@/pages/public/PublicForm_DigimonSammlung';
import PublicFormNeuesDigimonHinzufuegen from '@/pages/public/PublicForm_NeuesDigimonHinzufuegen';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a0afe1e9fbe2869afe78216" element={<PublicFormEntwicklungsstufen />} />
              <Route path="public/6a0afe27e626c150192ec8f1" element={<PublicFormFundorte />} />
              <Route path="public/6a0afe2a52bbcc96eaf6263d" element={<PublicFormDigimonSammlung />} />
              <Route path="public/6a0afe2bb2622b0fdc1b48ab" element={<PublicFormNeuesDigimonHinzufuegen />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="entwicklungsstufen" element={<EntwicklungsstufenPage />} />
                <Route path="fundorte" element={<FundortePage />} />
                <Route path="digimon-sammlung" element={<DigimonSammlungPage />} />
                <Route path="neues-digimon-hinzufuegen" element={<NeuesDigimonHinzufuegenPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
