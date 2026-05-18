import type { DigimonSammlung, NeuesDigimonHinzufuegen } from './app';

export type EnrichedDigimonSammlung = DigimonSammlung & {
  entwicklungsstufeName: string;
  fundortName: string;
};

export type EnrichedNeuesDigimonHinzufuegen = NeuesDigimonHinzufuegen & {
  entwicklungsstufe_auswahlName: string;
  fundort_auswahlName: string;
};
