import rawCountries from "world-countries";

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export const COUNTRIES: Country[] = rawCountries
  .map((c) => ({
    code: c.cca2,
    name: c.name.common,
    flag: c.flag,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
