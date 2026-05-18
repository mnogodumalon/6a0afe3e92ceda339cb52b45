import type { EnrichedDigimonSammlung, EnrichedNeuesDigimonHinzufuegen } from '@/types/enriched';
import type { DigimonSammlung, Entwicklungsstufen, Fundorte, NeuesDigimonHinzufuegen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface DigimonSammlungMaps {
  entwicklungsstufenMap: Map<string, Entwicklungsstufen>;
  fundorteMap: Map<string, Fundorte>;
}

export function enrichDigimonSammlung(
  digimonSammlung: DigimonSammlung[],
  maps: DigimonSammlungMaps
): EnrichedDigimonSammlung[] {
  return digimonSammlung.map(r => ({
    ...r,
    entwicklungsstufeName: resolveDisplay(r.fields.entwicklungsstufe, maps.entwicklungsstufenMap, 'name'),
    fundortName: resolveDisplay(r.fields.fundort, maps.fundorteMap, 'ortsname'),
  }));
}

interface NeuesDigimonHinzufuegenMaps {
  entwicklungsstufenMap: Map<string, Entwicklungsstufen>;
  fundorteMap: Map<string, Fundorte>;
}

export function enrichNeuesDigimonHinzufuegen(
  neuesDigimonHinzufuegen: NeuesDigimonHinzufuegen[],
  maps: NeuesDigimonHinzufuegenMaps
): EnrichedNeuesDigimonHinzufuegen[] {
  return neuesDigimonHinzufuegen.map(r => ({
    ...r,
    entwicklungsstufe_auswahlName: resolveDisplay(r.fields.entwicklungsstufe_auswahl, maps.entwicklungsstufenMap, 'name'),
    fundort_auswahlName: resolveDisplay(r.fields.fundort_auswahl, maps.fundorteMap, 'ortsname'),
  }));
}
