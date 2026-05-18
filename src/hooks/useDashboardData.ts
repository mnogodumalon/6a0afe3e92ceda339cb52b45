import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Entwicklungsstufen, Fundorte, DigimonSammlung, NeuesDigimonHinzufuegen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [entwicklungsstufen, setEntwicklungsstufen] = useState<Entwicklungsstufen[]>([]);
  const [fundorte, setFundorte] = useState<Fundorte[]>([]);
  const [digimonSammlung, setDigimonSammlung] = useState<DigimonSammlung[]>([]);
  const [neuesDigimonHinzufuegen, setNeuesDigimonHinzufuegen] = useState<NeuesDigimonHinzufuegen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [entwicklungsstufenData, fundorteData, digimonSammlungData, neuesDigimonHinzufuegenData] = await Promise.all([
        LivingAppsService.getEntwicklungsstufen(),
        LivingAppsService.getFundorte(),
        LivingAppsService.getDigimonSammlung(),
        LivingAppsService.getNeuesDigimonHinzufuegen(),
      ]);
      setEntwicklungsstufen(entwicklungsstufenData);
      setFundorte(fundorteData);
      setDigimonSammlung(digimonSammlungData);
      setNeuesDigimonHinzufuegen(neuesDigimonHinzufuegenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [entwicklungsstufenData, fundorteData, digimonSammlungData, neuesDigimonHinzufuegenData] = await Promise.all([
          LivingAppsService.getEntwicklungsstufen(),
          LivingAppsService.getFundorte(),
          LivingAppsService.getDigimonSammlung(),
          LivingAppsService.getNeuesDigimonHinzufuegen(),
        ]);
        setEntwicklungsstufen(entwicklungsstufenData);
        setFundorte(fundorteData);
        setDigimonSammlung(digimonSammlungData);
        setNeuesDigimonHinzufuegen(neuesDigimonHinzufuegenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const entwicklungsstufenMap = useMemo(() => {
    const m = new Map<string, Entwicklungsstufen>();
    entwicklungsstufen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [entwicklungsstufen]);

  const fundorteMap = useMemo(() => {
    const m = new Map<string, Fundorte>();
    fundorte.forEach(r => m.set(r.record_id, r));
    return m;
  }, [fundorte]);

  return { entwicklungsstufen, setEntwicklungsstufen, fundorte, setFundorte, digimonSammlung, setDigimonSammlung, neuesDigimonHinzufuegen, setNeuesDigimonHinzufuegen, loading, error, fetchAll, entwicklungsstufenMap, fundorteMap };
}