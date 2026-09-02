/**
 * Transimex Canada Rate Cards & Pricing Data Model
 * Real-world tariff rate card configuration for Canada <-> Africa & Global corridors.
 */

export type FreightMode = "air" | "sea_fcl" | "sea_lcl" | "land";

export interface WeightBreak {
  min_kg: number;
  max_kg: number;
  rate_per_kg: number; // in CAD
}

export interface RateCard {
  id: string;
  origin_country: string; // ISO 2 code (e.g., "CA")
  origin_name: string;
  destination_country: string; // ISO 2 code (e.g., "CM", "GH", "CI", "CD", "TD", "CF", "SA", "CN", "US")
  destination_name: string;
  destination_hub: string; // e.g., "Douala Port / Yaoundé Nsimalen"
  mode: FreightMode;
  mode_label: string;
  currency: "CAD";
  volumetric_divisor: number; // 6000 for air IATA, 5000 for courier, 3000 for land
  weight_breaks?: WeightBreak[];
  rate_per_cbm?: number; // for sea_lcl
  flat_container_rates?: {
    "20ft": number;
    "40ft": number;
  };
  min_charge: number;
  fuel_surcharge_pct: number; // e.g., 0.12 (12%)
  customs_handling_fee: number; // Flat fee in CAD
  insurance_pct: number; // e.g., 0.015 (1.5% of declared value)
  transit_time_days: string; // e.g., "3-5 business days"
  active: boolean;
  notes?: string;
  updated_at: string;
}

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  region: string;
  hubs: string[];
}

export const SUPPORTED_ORIGINS: CountryOption[] = [
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    region: "North America",
    hubs: ["Montreal (YUL / Port)", "Toronto (YYZ / Hub)", "Vancouver (YVR / Gateway)", "Calgary (YYC / Rail)"],
  },
];

export const SUPPORTED_DESTINATIONS: CountryOption[] = [
  {
    code: "CM",
    name: "Cameroon",
    flag: "🇨🇲",
    region: "Central Africa",
    hubs: ["Douala Port / DLA Airport", "Yaoundé Nsimalen (NSI)"],
  },
  {
    code: "GH",
    name: "Ghana",
    flag: "🇬🇭",
    region: "West Africa",
    hubs: ["Tema Port", "Kotoka International (ACC) - Accra"],
  },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    flag: "🇨🇮",
    region: "West Africa",
    hubs: ["Abidjan Port Autonome", "Félix-Houphouët-Boigny Airport (ABJ)"],
  },
  {
    code: "CD",
    name: "DR Congo (RDC)",
    flag: "🇨🇩",
    region: "Central Africa",
    hubs: ["Kinshasa N'Djili (FIH)", "Matadi Port Corridor"],
  },
  {
    code: "TD",
    name: "Chad",
    flag: "🇹🇩",
    region: "Central Africa",
    hubs: ["N'Djamena Hassan Djamous (NDJ)", "Douala-N'Djamena Land Corridor"],
  },
  {
    code: "CF",
    name: "Central African Republic",
    flag: "🇨🇫",
    region: "Central Africa",
    hubs: ["Bangui M'Poko (BGF)", "Douala-Bangui Overland Transit"],
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    flag: "🇸🇦",
    region: "Middle East",
    hubs: ["Jeddah Islamic Port (JED)", "Riyadh King Khalid (RUH)"],
  },
  {
    code: "CN",
    name: "China",
    flag: "🇨🇳",
    region: "Asia-Pacific",
    hubs: ["Shanghai Port (PVG)", "Guangzhou Baiyun (CAN)", "Shenzhen"],
  },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    region: "North America",
    hubs: ["Detroit Corridor Hub", "Chicago Rail Terminal", "New York / Newark (EWR)"],
  },
  {
    code: "CA",
    name: "Canada (Domestic)",
    flag: "🇨🇦",
    region: "North America",
    hubs: ["Cross-Canada Inter-Provincial Hub"],
  },
];

// Seeded RateCards for all major Transimex Corridors
export const SEED_RATE_CARDS: RateCard[] = [
  // ==========================================
  // Canada -> Cameroon (CM)
  // ==========================================
  {
    id: "RC-CA-CM-AIR",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "CM",
    destination_name: "Cameroon",
    destination_hub: "Douala (DLA) / Yaoundé (NSI)",
    mode: "air",
    mode_label: "Air Cargo Expedited",
    currency: "CAD",
    volumetric_divisor: 6000,
    weight_breaks: [
      { min_kg: 0, max_kg: 45, rate_per_kg: 11.5 },
      { min_kg: 45, max_kg: 100, rate_per_kg: 9.8 },
      { min_kg: 100, max_kg: 300, rate_per_kg: 8.2 },
      { min_kg: 300, max_kg: 99999, rate_per_kg: 7.1 },
    ],
    min_charge: 220,
    fuel_surcharge_pct: 0.14,
    customs_handling_fee: 65,
    insurance_pct: 0.018,
    transit_time_days: "4-7 business days",
    active: true,
    notes: "Direct or single-transit airline allocation with priority customs clearance at DLA.",
    updated_at: "2026-08-15T00:00:00Z",
  },
  {
    id: "RC-CA-CM-SEA-LCL",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "CM",
    destination_name: "Cameroon",
    destination_hub: "Douala Seaport",
    mode: "sea_lcl",
    mode_label: "Ocean LCL Groupage",
    currency: "CAD",
    volumetric_divisor: 1000,
    rate_per_cbm: 285,
    min_charge: 350,
    fuel_surcharge_pct: 0.08,
    customs_handling_fee: 120,
    insurance_pct: 0.015,
    transit_time_days: "28-35 days",
    active: true,
    notes: "Consolidated container stuffing at Montreal / Halifax berths.",
    updated_at: "2026-08-15T00:00:00Z",
  },
  {
    id: "RC-CA-CM-SEA-FCL",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "CM",
    destination_name: "Cameroon",
    destination_hub: "Douala Seaport Berth",
    mode: "sea_fcl",
    mode_label: "Full Container Load (FCL)",
    currency: "CAD",
    volumetric_divisor: 1,
    flat_container_rates: {
      "20ft": 3850,
      "40ft": 5950,
    },
    min_charge: 3850,
    fuel_surcharge_pct: 0.06,
    customs_handling_fee: 250,
    insurance_pct: 0.012,
    transit_time_days: "26-32 days",
    active: true,
    notes: "Direct ocean booking via CMA CGM / Maersk with 14 free demurrage days at Douala.",
    updated_at: "2026-08-15T00:00:00Z",
  },

  // ==========================================
  // Canada -> Ghana (GH)
  // ==========================================
  {
    id: "RC-CA-GH-AIR",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "GH",
    destination_name: "Ghana",
    destination_hub: "Accra Kotoka (ACC)",
    mode: "air",
    mode_label: "Air Cargo Expedited",
    currency: "CAD",
    volumetric_divisor: 6000,
    weight_breaks: [
      { min_kg: 0, max_kg: 45, rate_per_kg: 10.9 },
      { min_kg: 45, max_kg: 100, rate_per_kg: 9.2 },
      { min_kg: 100, max_kg: 300, rate_per_kg: 7.9 },
      { min_kg: 300, max_kg: 99999, rate_per_kg: 6.8 },
    ],
    min_charge: 210,
    fuel_surcharge_pct: 0.12,
    customs_handling_fee: 55,
    insurance_pct: 0.018,
    transit_time_days: "3-6 business days",
    active: true,
    notes: "Reliable belly cargo connection to Kotoka International.",
    updated_at: "2026-08-20T00:00:00Z",
  },
  {
    id: "RC-CA-GH-SEA-LCL",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "GH",
    destination_name: "Ghana",
    destination_hub: "Tema Seaport",
    mode: "sea_lcl",
    mode_label: "Ocean LCL Groupage",
    currency: "CAD",
    volumetric_divisor: 1000,
    rate_per_cbm: 260,
    min_charge: 320,
    fuel_surcharge_pct: 0.08,
    customs_handling_fee: 110,
    insurance_pct: 0.015,
    transit_time_days: "24-30 days",
    active: true,
    notes: "Direct container discharge at Tema Port container terminal.",
    updated_at: "2026-08-20T00:00:00Z",
  },
  {
    id: "RC-CA-GH-SEA-FCL",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "GH",
    destination_name: "Ghana",
    destination_hub: "Tema Seaport",
    mode: "sea_fcl",
    mode_label: "Full Container Load (FCL)",
    currency: "CAD",
    volumetric_divisor: 1,
    flat_container_rates: {
      "20ft": 3600,
      "40ft": 5600,
    },
    min_charge: 3600,
    fuel_surcharge_pct: 0.06,
    customs_handling_fee: 220,
    insurance_pct: 0.012,
    transit_time_days: "22-28 days",
    active: true,
    updated_at: "2026-08-20T00:00:00Z",
  },

  // ==========================================
  // Canada -> Côte d'Ivoire (CI)
  // ==========================================
  {
    id: "RC-CA-CI-AIR",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "CI",
    destination_name: "Côte d'Ivoire",
    destination_hub: "Abidjan (ABJ)",
    mode: "air",
    mode_label: "Air Cargo Expedited",
    currency: "CAD",
    volumetric_divisor: 6000,
    weight_breaks: [
      { min_kg: 0, max_kg: 45, rate_per_kg: 11.2 },
      { min_kg: 45, max_kg: 100, rate_per_kg: 9.5 },
      { min_kg: 100, max_kg: 300, rate_per_kg: 8.0 },
      { min_kg: 300, max_kg: 99999, rate_per_kg: 6.9 },
    ],
    min_charge: 215,
    fuel_surcharge_pct: 0.13,
    customs_handling_fee: 60,
    insurance_pct: 0.018,
    transit_time_days: "4-7 business days",
    active: true,
    updated_at: "2026-08-18T00:00:00Z",
  },
  {
    id: "RC-CA-CI-SEA-LCL",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "CI",
    destination_name: "Côte d'Ivoire",
    destination_hub: "Abidjan Port Autonome",
    mode: "sea_lcl",
    mode_label: "Ocean LCL Groupage",
    currency: "CAD",
    volumetric_divisor: 1000,
    rate_per_cbm: 275,
    min_charge: 340,
    fuel_surcharge_pct: 0.08,
    customs_handling_fee: 115,
    insurance_pct: 0.015,
    transit_time_days: "26-32 days",
    active: true,
    updated_at: "2026-08-18T00:00:00Z",
  },

  // ==========================================
  // Canada -> DR Congo (CD)
  // ==========================================
  {
    id: "RC-CA-CD-AIR",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "CD",
    destination_name: "DR Congo",
    destination_hub: "Kinshasa N'Djili (FIH)",
    mode: "air",
    mode_label: "Air Cargo Expedited",
    currency: "CAD",
    volumetric_divisor: 6000,
    weight_breaks: [
      { min_kg: 0, max_kg: 45, rate_per_kg: 12.8 },
      { min_kg: 45, max_kg: 100, rate_per_kg: 10.9 },
      { min_kg: 100, max_kg: 300, rate_per_kg: 9.4 },
      { min_kg: 300, max_kg: 99999, rate_per_kg: 8.2 },
    ],
    min_charge: 240,
    fuel_surcharge_pct: 0.15,
    customs_handling_fee: 75,
    insurance_pct: 0.02,
    transit_time_days: "5-8 business days",
    active: true,
    updated_at: "2026-08-10T00:00:00Z",
  },
  {
    id: "RC-CA-CD-SEA-FCL",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "CD",
    destination_name: "DR Congo",
    destination_hub: "Matadi Seaport",
    mode: "sea_fcl",
    mode_label: "Full Container Load (FCL)",
    currency: "CAD",
    volumetric_divisor: 1,
    flat_container_rates: {
      "20ft": 4200,
      "40ft": 6700,
    },
    min_charge: 4200,
    fuel_surcharge_pct: 0.07,
    customs_handling_fee: 280,
    insurance_pct: 0.015,
    transit_time_days: "32-40 days",
    active: true,
    updated_at: "2026-08-10T00:00:00Z",
  },

  // ==========================================
  // Canada -> Chad (TD)
  // ==========================================
  {
    id: "RC-CA-TD-AIR",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "TD",
    destination_name: "Chad",
    destination_hub: "N'Djamena (NDJ)",
    mode: "air",
    mode_label: "Air Cargo Expedited",
    currency: "CAD",
    volumetric_divisor: 6000,
    weight_breaks: [
      { min_kg: 0, max_kg: 45, rate_per_kg: 13.5 },
      { min_kg: 45, max_kg: 100, rate_per_kg: 11.6 },
      { min_kg: 100, max_kg: 300, rate_per_kg: 9.9 },
      { min_kg: 300, max_kg: 99999, rate_per_kg: 8.8 },
    ],
    min_charge: 260,
    fuel_surcharge_pct: 0.16,
    customs_handling_fee: 80,
    insurance_pct: 0.02,
    transit_time_days: "6-9 business days",
    active: true,
    updated_at: "2026-08-12T00:00:00Z",
  },

  // ==========================================
  // Canada -> Saudi Arabia (SA)
  // ==========================================
  {
    id: "RC-CA-SA-AIR",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "SA",
    destination_name: "Saudi Arabia",
    destination_hub: "Jeddah (JED) / Riyadh (RUH)",
    mode: "air",
    mode_label: "Air Cargo Expedited",
    currency: "CAD",
    volumetric_divisor: 6000,
    weight_breaks: [
      { min_kg: 0, max_kg: 45, rate_per_kg: 9.5 },
      { min_kg: 45, max_kg: 100, rate_per_kg: 8.1 },
      { min_kg: 100, max_kg: 300, rate_per_kg: 6.9 },
      { min_kg: 300, max_kg: 99999, rate_per_kg: 5.9 },
    ],
    min_charge: 195,
    fuel_surcharge_pct: 0.12,
    customs_handling_fee: 50,
    insurance_pct: 0.015,
    transit_time_days: "3-5 business days",
    active: true,
    updated_at: "2026-08-22T00:00:00Z",
  },
  {
    id: "RC-CA-SA-SEA-FCL",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "SA",
    destination_name: "Saudi Arabia",
    destination_hub: "Jeddah Islamic Port",
    mode: "sea_fcl",
    mode_label: "Full Container Load (FCL)",
    currency: "CAD",
    volumetric_divisor: 1,
    flat_container_rates: {
      "20ft": 3100,
      "40ft": 4800,
    },
    min_charge: 3100,
    fuel_surcharge_pct: 0.05,
    customs_handling_fee: 190,
    insurance_pct: 0.012,
    transit_time_days: "20-25 days",
    active: true,
    updated_at: "2026-08-22T00:00:00Z",
  },

  // ==========================================
  // Canada -> China (CN)
  // ==========================================
  {
    id: "RC-CA-CN-AIR",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "CN",
    destination_name: "China",
    destination_hub: "Shanghai (PVG) / Guangzhou (CAN)",
    mode: "air",
    mode_label: "Air Cargo Expedited",
    currency: "CAD",
    volumetric_divisor: 6000,
    weight_breaks: [
      { min_kg: 0, max_kg: 45, rate_per_kg: 8.8 },
      { min_kg: 45, max_kg: 100, rate_per_kg: 7.4 },
      { min_kg: 100, max_kg: 300, rate_per_kg: 6.2 },
      { min_kg: 300, max_kg: 99999, rate_per_kg: 5.3 },
    ],
    min_charge: 180,
    fuel_surcharge_pct: 0.12,
    customs_handling_fee: 50,
    insurance_pct: 0.015,
    transit_time_days: "3-5 business days",
    active: true,
    updated_at: "2026-08-25T00:00:00Z",
  },

  // ==========================================
  // Canada -> United States (US) - Cross-Border Land & Air
  // ==========================================
  {
    id: "RC-CA-US-LAND",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "US",
    destination_name: "United States",
    destination_hub: "Detroit / Chicago / Mid-West Corridor",
    mode: "land",
    mode_label: "Cross-Border Dedicated Trucking",
    currency: "CAD",
    volumetric_divisor: 3000,
    weight_breaks: [
      { min_kg: 0, max_kg: 500, rate_per_kg: 1.85 },
      { min_kg: 500, max_kg: 2000, rate_per_kg: 1.45 },
      { min_kg: 2000, max_kg: 10000, rate_per_kg: 0.95 },
      { min_kg: 10000, max_kg: 99999, rate_per_kg: 0.65 },
    ],
    min_charge: 280,
    fuel_surcharge_pct: 0.18,
    customs_handling_fee: 85,
    insurance_pct: 0.01,
    transit_time_days: "1-3 business days",
    active: true,
    notes: "Bonded PARS / PAPS carrier clearance at Ambassador Bridge & Blue Water.",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "RC-CA-US-AIR",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "US",
    destination_name: "United States",
    destination_hub: "US Airport Gateway (JFK / ORD / LAX)",
    mode: "air",
    mode_label: "Air Cargo Expedited",
    currency: "CAD",
    volumetric_divisor: 6000,
    weight_breaks: [
      { min_kg: 0, max_kg: 45, rate_per_kg: 5.5 },
      { min_kg: 45, max_kg: 100, rate_per_kg: 4.2 },
      { min_kg: 100, max_kg: 300, rate_per_kg: 3.4 },
      { min_kg: 300, max_kg: 99999, rate_per_kg: 2.8 },
    ],
    min_charge: 150,
    fuel_surcharge_pct: 0.12,
    customs_handling_fee: 45,
    insurance_pct: 0.01,
    transit_time_days: "1-2 business days",
    active: true,
    updated_at: "2026-09-01T00:00:00Z",
  },

  // ==========================================
  // Canada Domestic Inter-Provincial Land
  // ==========================================
  {
    id: "RC-CA-CA-LAND",
    origin_country: "CA",
    origin_name: "Canada",
    destination_country: "CA",
    destination_name: "Canada (Domestic)",
    destination_hub: "Montreal - Toronto - Calgary - Vancouver",
    mode: "land",
    mode_label: "Domestic LTL / FTL Highway",
    currency: "CAD",
    volumetric_divisor: 3000,
    weight_breaks: [
      { min_kg: 0, max_kg: 500, rate_per_kg: 1.25 },
      { min_kg: 500, max_kg: 2000, rate_per_kg: 0.95 },
      { min_kg: 2000, max_kg: 10000, rate_per_kg: 0.65 },
      { min_kg: 10000, max_kg: 99999, rate_per_kg: 0.42 },
    ],
    min_charge: 160,
    fuel_surcharge_pct: 0.16,
    customs_handling_fee: 0,
    insurance_pct: 0.01,
    transit_time_days: "2-5 business days",
    active: true,
    notes: "Interprovincial scheduled highway lines across Trans-Canada corridor.",
    updated_at: "2026-09-01T00:00:00Z",
  },
];
