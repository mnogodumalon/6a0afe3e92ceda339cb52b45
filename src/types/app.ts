// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Entwicklungsstufen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    name?: string;
    beschreibung?: string;
    level?: number;
    besonderheiten?: string;
  };
}

export interface Fundorte {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    ortsname?: string;
    typ?: LookupValue;
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    notizen?: string;
  };
}

export interface DigimonSammlung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    digimon_name?: string;
    nummer?: string;
    entwicklungsstufe?: string; // applookup -> URL zu 'Entwicklungsstufen' Record
    attribut?: LookupValue;
    typ?: LookupValue[];
    fundort?: string; // applookup -> URL zu 'Fundorte' Record
    erwerbsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    zustand?: LookupValue;
    besonderheiten?: string;
    bild?: string;
    notizen?: string;
  };
}

export interface NeuesDigimonHinzufuegen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    name?: string;
    entwicklungsstufe_auswahl?: string; // applookup -> URL zu 'Entwicklungsstufen' Record
    fundort_auswahl?: string; // applookup -> URL zu 'Fundorte' Record
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    schnellnotizen?: string;
  };
}

export const APP_IDS = {
  ENTWICKLUNGSSTUFEN: '6a0afe1e9fbe2869afe78216',
  FUNDORTE: '6a0afe27e626c150192ec8f1',
  DIGIMON_SAMMLUNG: '6a0afe2a52bbcc96eaf6263d',
  NEUES_DIGIMON_HINZUFUEGEN: '6a0afe2bb2622b0fdc1b48ab',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'fundorte': {
    typ: [{ key: "sammelkarten", label: "Sammelkarten" }, { key: "online_shop", label: "Online-Shop" }, { key: "geschaeft", label: "Geschäft" }, { key: "videospiel", label: "Videospiel" }, { key: "tausch", label: "Tausch" }, { key: "geschenk", label: "Geschenk" }, { key: "event", label: "Event" }, { key: "sonstiges", label: "Sonstiges" }],
  },
  'digimon_sammlung': {
    attribut: [{ key: "vaccine", label: "Vaccine" }, { key: "virus", label: "Virus" }, { key: "data", label: "Data" }, { key: "free", label: "Free" }, { key: "variable", label: "Variable" }],
    typ: [{ key: "drache", label: "Drache" }, { key: "tier", label: "Tier" }, { key: "vogel", label: "Vogel" }, { key: "insekt", label: "Insekt" }, { key: "aquatisch", label: "Aquatisch" }, { key: "pflanze", label: "Pflanze" }, { key: "maschine", label: "Maschine" }, { key: "dunkel", label: "Dunkel" }, { key: "heilig", label: "Heilig" }, { key: "unbekannt", label: "Unbekannt" }],
    zustand: [{ key: "neu", label: "Neu" }, { key: "sehr_gut", label: "Sehr gut" }, { key: "gut", label: "Gut" }, { key: "akzeptabel", label: "Akzeptabel" }, { key: "beschaedigt", label: "Beschädigt" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'entwicklungsstufen': {
    'name': 'string/text',
    'beschreibung': 'string/textarea',
    'level': 'number',
    'besonderheiten': 'string/textarea',
  },
  'fundorte': {
    'ortsname': 'string/text',
    'typ': 'lookup/select',
    'datum': 'date/date',
    'notizen': 'string/textarea',
  },
  'digimon_sammlung': {
    'digimon_name': 'string/text',
    'nummer': 'string/text',
    'entwicklungsstufe': 'applookup/select',
    'attribut': 'lookup/select',
    'typ': 'multiplelookup/checkbox',
    'fundort': 'applookup/select',
    'erwerbsdatum': 'date/date',
    'zustand': 'lookup/select',
    'besonderheiten': 'string/textarea',
    'bild': 'file',
    'notizen': 'string/textarea',
  },
  'neues_digimon_hinzufuegen': {
    'name': 'string/text',
    'entwicklungsstufe_auswahl': 'applookup/select',
    'fundort_auswahl': 'applookup/select',
    'datum': 'date/date',
    'schnellnotizen': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateEntwicklungsstufen = StripLookup<Entwicklungsstufen['fields']>;
export type CreateFundorte = StripLookup<Fundorte['fields']>;
export type CreateDigimonSammlung = StripLookup<DigimonSammlung['fields']>;
export type CreateNeuesDigimonHinzufuegen = StripLookup<NeuesDigimonHinzufuegen['fields']>;