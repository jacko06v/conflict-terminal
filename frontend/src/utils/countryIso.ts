// Maps event country names → ISO 3166-1 Alpha-2 codes (for map highlighting)
export const COUNTRY_TO_ISO2: Record<string, string> = {
  "Iran": "IR", "Islamic Republic of Iran": "IR",
  "Iraq": "IQ",
  "Israel": "IL", "Israel/Gaza": "IL",
  "Palestine": "PS", "Gaza": "PS", "West Bank": "PS", "Palestinian Territory": "PS",
  "Syria": "SY", "Syrian Arab Republic": "SY",
  "Lebanon": "LB",
  "Yemen": "YE",
  "Saudi Arabia": "SA",
  "United Arab Emirates": "AE", "UAE": "AE",
  "Turkey": "TR", "Türkiye": "TR",
  "Egypt": "EG",
  "Jordan": "JO",
  "Kuwait": "KW",
  "Qatar": "QA",
  "Bahrain": "BH",
  "Oman": "OM",
  "Cyprus": "CY",
  "Libya": "LY",
  "Sudan": "SD",
  "Somalia": "SO",
  "Ethiopia": "ET",
  "Eritrea": "ER",
  "Djibouti": "DJ",
  "Azerbaijan": "AZ",
  "Armenia": "AM",
  "Pakistan": "PK",
  "Afghanistan": "AF",
  "Russia": "RU", "Russian Federation": "RU",
  "Ukraine": "UA",
  "United States": "US", "USA": "US",
  "United Kingdom": "GB", "UK": "GB",
  "France": "FR",
  "China": "CN",
  "India": "IN",
  "Georgia": "GE",
};

export function countryToIso2(country: string | null | undefined): string {
  if (!country) return "";
  return COUNTRY_TO_ISO2[country] ?? COUNTRY_TO_ISO2[country.trim()] ?? "";
}
