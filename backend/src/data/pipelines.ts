/**
 * Major oil & gas pipeline data adapted from worldmonitor.
 * Used for infrastructure layer on the map and proximity analysis.
 */

export interface Pipeline {
  id: string;
  name: string;
  type: "oil" | "gas" | "products";
  status: "operating" | "construction" | "planned" | "damaged";
  points: [number, number][]; // [lon, lat] pairs
  capacity: string;
  length: string;
  operator: string;
  countries: string[];
}

export const PIPELINES: Pipeline[] = [
  // ===== MAJOR OIL PIPELINES =====

  // Middle East
  {
    id: "east-west-saudi",
    name: "East-West Pipeline (Petroline)",
    type: "oil",
    status: "operating",
    points: [[49.4, 26.5], [46.5, 25.0], [43.0, 24.0], [39.2, 21.5]],
    capacity: "5 million bpd",
    length: "1,200 km",
    operator: "Saudi Aramco",
    countries: ["Saudi Arabia"],
  },
  {
    id: "kirkuk-ceyhan",
    name: "Kirkuk-Ceyhan Pipeline",
    type: "oil",
    status: "operating",
    points: [[44.4, 35.5], [43.0, 36.5], [41.5, 37.0], [36.0, 37.0]],
    capacity: "1.6 million bpd",
    length: "970 km",
    operator: "BOTAS/SOMO",
    countries: ["Iraq", "Turkey"],
  },
  {
    id: "sumed",
    name: "SUMED Pipeline",
    type: "oil",
    status: "operating",
    points: [[33.8, 28.0], [31.2, 30.2]],
    capacity: "2.5 million bpd",
    length: "320 km",
    operator: "Arab Petroleum Pipeline Co",
    countries: ["Egypt"],
  },
  {
    id: "btc",
    name: "Baku-Tbilisi-Ceyhan (BTC)",
    type: "oil",
    status: "operating",
    points: [[50.0, 40.2], [44.8, 41.7], [43.6, 41.6], [41.0, 40.5], [38.0, 39.0], [36.0, 37.0]],
    capacity: "1.2 million bpd",
    length: "1,768 km",
    operator: "BP",
    countries: ["Azerbaijan", "Georgia", "Turkey"],
  },

  // Russia/Europe
  {
    id: "druzhba",
    name: "Druzhba Pipeline",
    type: "oil",
    status: "operating",
    points: [[52.5, 54.7], [48.0, 52.5], [45.0, 51.0], [37.0, 51.5], [30.0, 50.5], [24.0, 51.5], [16.0, 52.0]],
    capacity: "1.4 million bpd",
    length: "5,500 km",
    operator: "Transneft",
    countries: ["Russia", "Belarus", "Poland", "Germany", "Ukraine"],
  },
  {
    id: "cpc",
    name: "Caspian Pipeline Consortium",
    type: "oil",
    status: "operating",
    points: [[51.9, 46.9], [48.0, 45.5], [45.0, 44.5], [40.0, 44.0], [37.8, 44.7]],
    capacity: "1.4 million bpd",
    length: "1,511 km",
    operator: "CPC",
    countries: ["Kazakhstan", "Russia"],
  },
  {
    id: "espo",
    name: "Eastern Siberia-Pacific Ocean (ESPO)",
    type: "oil",
    status: "operating",
    points: [[114.5, 56.5], [120.0, 55.0], [126.0, 52.0], [131.0, 48.5], [133.0, 47.0]],
    capacity: "1.6 million bpd",
    length: "4,857 km",
    operator: "Transneft",
    countries: ["Russia"],
  },

  // Africa
  {
    id: "chad-cameroon",
    name: "Chad-Cameroon Pipeline",
    type: "oil",
    status: "operating",
    points: [[18.4, 9.5], [15.0, 7.5], [12.0, 5.0], [9.9, 4.0]],
    capacity: "250,000 bpd",
    length: "1,070 km",
    operator: "COTCO",
    countries: ["Chad", "Cameroon"],
  },
  {
    id: "trans-saharan",
    name: "Trans-Saharan Pipeline (proposed)",
    type: "gas",
    status: "planned",
    points: [[3.4, 6.4], [3.0, 10.0], [3.0, 14.0], [2.0, 22.0], [1.5, 28.0], [1.0, 33.0], [0.5, 36.8]],
    capacity: "30 bcm/year",
    length: "4,128 km",
    operator: "Nigeria/Niger/Algeria JV",
    countries: ["Nigeria", "Niger", "Algeria"],
  },

  // ===== MAJOR GAS PIPELINES =====

  // Russia/Europe
  {
    id: "turkstream",
    name: "TurkStream",
    type: "gas",
    status: "operating",
    points: [[38.5, 44.6], [35.0, 43.5], [31.0, 42.5], [29.0, 41.3]],
    capacity: "31.5 bcm/year",
    length: "930 km",
    operator: "Gazprom",
    countries: ["Russia", "Turkey"],
  },
  {
    id: "yamal-europe",
    name: "Yamal-Europe Pipeline",
    type: "gas",
    status: "operating",
    points: [[73.5, 67.5], [66.0, 64.0], [55.0, 60.0], [45.0, 57.0], [32.0, 55.0], [24.0, 53.0], [17.0, 52.5], [14.0, 52.5]],
    capacity: "33 bcm/year",
    length: "4,196 km",
    operator: "Gazprom",
    countries: ["Russia", "Belarus", "Poland", "Germany"],
  },
  {
    id: "tanap",
    name: "Trans-Anatolian Pipeline (TANAP)",
    type: "gas",
    status: "operating",
    points: [[42.0, 41.6], [39.0, 40.0], [35.0, 39.0], [32.0, 38.5], [29.0, 39.5], [26.5, 40.5]],
    capacity: "16 bcm/year",
    length: "1,850 km",
    operator: "TANAP",
    countries: ["Azerbaijan", "Georgia", "Turkey"],
  },
  {
    id: "brotherhood",
    name: "Brotherhood Pipeline System",
    type: "gas",
    status: "operating",
    points: [[76.0, 66.5], [70.0, 63.0], [60.0, 58.0], [50.0, 55.0], [40.0, 52.0], [32.0, 50.5], [24.0, 49.0], [18.0, 48.5]],
    capacity: "100+ bcm/year",
    length: "4,500 km",
    operator: "Gazprom",
    countries: ["Russia", "Ukraine", "Slovakia", "Czech Republic"],
  },

  // Middle East
  {
    id: "dolphin",
    name: "Dolphin Gas Pipeline",
    type: "gas",
    status: "operating",
    points: [[51.5, 25.9], [52.0, 25.3], [54.4, 24.5]],
    capacity: "3.2 bcf/day",
    length: "364 km",
    operator: "Dolphin Energy",
    countries: ["Qatar", "UAE"],
  },
  {
    id: "arab-gas",
    name: "Arab Gas Pipeline",
    type: "gas",
    status: "operating",
    points: [[34.4, 31.5], [35.5, 32.0], [36.3, 33.9], [36.0, 35.5], [36.2, 36.6]],
    capacity: "10 bcm/year",
    length: "1,200 km",
    operator: "Various",
    countries: ["Egypt", "Jordan", "Syria", "Lebanon"],
  },

  // Central Asia / China
  {
    id: "central-asia-china",
    name: "Central Asia-China Gas Pipeline",
    type: "gas",
    status: "operating",
    points: [[62.5, 39.0], [66.0, 41.3], [69.0, 41.0], [75.0, 40.5], [80.0, 40.0], [87.5, 44.0]],
    capacity: "55 bcm/year",
    length: "1,833 km",
    operator: "CNPC",
    countries: ["Turkmenistan", "Uzbekistan", "Kazakhstan", "China"],
  },
  {
    id: "power-of-siberia",
    name: "Power of Siberia",
    type: "gas",
    status: "operating",
    points: [[118.0, 62.0], [122.0, 58.0], [127.5, 52.0], [130.0, 48.5], [127.5, 45.8]],
    capacity: "38 bcm/year",
    length: "3,000 km",
    operator: "Gazprom",
    countries: ["Russia", "China"],
  },

  // Africa
  {
    id: "transmed",
    name: "TransMed Pipeline",
    type: "gas",
    status: "operating",
    points: [[3.0, 36.8], [8.0, 37.0], [10.0, 37.5], [12.5, 37.8], [14.2, 40.8]],
    capacity: "33.5 bcm/year",
    length: "2,475 km",
    operator: "Sonatrach/Eni",
    countries: ["Algeria", "Tunisia", "Italy"],
  },
  {
    id: "greenstream",
    name: "Greenstream Pipeline",
    type: "gas",
    status: "operating",
    points: [[12.5, 32.9], [12.0, 35.0], [11.5, 37.0], [15.0, 38.2]],
    capacity: "11 bcm/year",
    length: "520 km",
    operator: "Greenstream BV",
    countries: ["Libya", "Italy"],
  },
  {
    id: "medgaz",
    name: "Medgaz Pipeline",
    type: "gas",
    status: "operating",
    points: [[-0.6, 35.9], [-1.5, 36.5], [-2.5, 36.8]],
    capacity: "8 bcm/year",
    length: "210 km",
    operator: "Medgaz SA",
    countries: ["Algeria", "Spain"],
  },
  {
    id: "west-african-gas",
    name: "West African Gas Pipeline",
    type: "gas",
    status: "operating",
    points: [[5.5, 4.3], [2.5, 6.1], [1.2, 6.2], [0.2, 5.6]],
    capacity: "5 bcm/year",
    length: "678 km",
    operator: "WAPCo",
    countries: ["Nigeria", "Benin", "Togo", "Ghana"],
  },

  // Europe undersea
  {
    id: "langeled",
    name: "Langeled Pipeline",
    type: "gas",
    status: "operating",
    points: [[2.0, 61.5], [1.0, 59.0], [0.0, 56.5], [0.5, 53.5]],
    capacity: "25.5 bcm/year",
    length: "1,200 km",
    operator: "Gassco",
    countries: ["Norway", "UK"],
  },

  // South America
  {
    id: "gasbol",
    name: "Bolivia-Brazil Pipeline (GASBOL)",
    type: "gas",
    status: "operating",
    points: [[-63.2, -17.8], [-60.0, -19.0], [-56.0, -21.0], [-50.0, -22.5], [-47.0, -23.5]],
    capacity: "30 mcm/day",
    length: "3,150 km",
    operator: "TBG",
    countries: ["Bolivia", "Brazil"],
  },
];

export const PIPELINE_COLORS: Record<string, string> = {
  oil: "#ff6b35",
  gas: "#00b4d8",
  products: "#ffd166",
};

export const PIPELINE_STATUS_COLORS: Record<string, string> = {
  operating: "#44ff88",
  construction: "#ffaa00",
  planned: "#888888",
  damaged: "#ff4444",
};
