/**
 * Gazetteer — Middle East conflict zone place name → coordinates lookup.
 *
 * Used to extract locations from news article titles and summaries without
 * relying on external APIs. Lookup is O(n) on entry count, fast enough for
 * our article volumes.
 *
 * Importance scale:
 *   3 = capital / major city (high geo-confidence)
 *   2 = significant city / military site
 *   1 = small city / specific site
 */

export interface GazetteerEntry {
  /** All recognized name forms, lowercase. First entry is the canonical display name. */
  names: string[];
  lat: number;
  lon: number;
  country: string;
  region?: string;
  importance: 1 | 2 | 3;
}

// Approximate radius (km) to assign based on importance when precision is "area"
export const IMPORTANCE_RADIUS: Record<1 | 2 | 3, number> = {
  3: 20,
  2: 10,
  1: 150, // country-level fallback entries have large uncertainty radius
};

const ENTRIES: GazetteerEntry[] = [
  // ── Iran ─────────────────────────────────────────────────────────────────
  { names: ["tehran", "teheran"], lat: 35.6892, lon: 51.3890, country: "Iran", region: "Tehran Province", importance: 3 },
  { names: ["isfahan", "esfahan", "isfahān"], lat: 32.6539, lon: 51.6660, country: "Iran", region: "Isfahan Province", importance: 3 },
  { names: ["shiraz"], lat: 29.5918, lon: 52.5836, country: "Iran", region: "Fars Province", importance: 3 },
  { names: ["tabriz"], lat: 38.0962, lon: 46.2738, country: "Iran", region: "East Azerbaijan Province", importance: 3 },
  { names: ["mashhad", "mashad"], lat: 36.2972, lon: 59.6067, country: "Iran", region: "Razavi Khorasan Province", importance: 3 },
  { names: ["ahvaz", "ahwaz"], lat: 31.3183, lon: 48.6706, country: "Iran", region: "Khuzestan Province", importance: 2 },
  { names: ["karaj"], lat: 35.8323, lon: 50.9994, country: "Iran", region: "Alborz Province", importance: 2 },
  { names: ["qom", "qum"], lat: 34.6416, lon: 50.8746, country: "Iran", region: "Qom Province", importance: 2 },
  { names: ["kermanshah"], lat: 34.3277, lon: 47.0780, country: "Iran", region: "Kermanshah Province", importance: 2 },
  { names: ["hamadan", "hamedan"], lat: 34.7992, lon: 48.5146, country: "Iran", region: "Hamadan Province", importance: 2 },
  { names: ["bandar abbas", "bandar-abbas", "bandarabbas"], lat: 27.1832, lon: 56.2666, country: "Iran", region: "Hormozgan Province", importance: 2 },
  { names: ["bushehr", "boushehr"], lat: 28.9684, lon: 50.8385, country: "Iran", region: "Bushehr Province", importance: 2 },
  { names: ["natanz"], lat: 33.5214, lon: 51.9201, country: "Iran", region: "Isfahan Province", importance: 1 },
  { names: ["fordow", "fordo"], lat: 34.8859, lon: 50.6010, country: "Iran", region: "Qom Province", importance: 1 },
  { names: ["parchin"], lat: 35.5278, lon: 51.7741, country: "Iran", region: "Tehran Province", importance: 1 },
  { names: ["arak"], lat: 34.0954, lon: 49.6890, country: "Iran", region: "Markazi Province", importance: 1 },
  { names: ["dezful"], lat: 32.3811, lon: 48.3985, country: "Iran", region: "Khuzestan Province", importance: 1 },
  { names: ["kharg island", "kharg", "khark island"], lat: 29.2364, lon: 50.3228, country: "Iran", region: "Bushehr Province", importance: 1 },
  { names: ["chabahar"], lat: 25.2919, lon: 60.6412, country: "Iran", region: "Sistan and Baluchestan Province", importance: 1 },
  { names: ["kerman"], lat: 30.2839, lon: 57.0834, country: "Iran", region: "Kerman Province", importance: 2 },
  { names: ["rasht"], lat: 37.2808, lon: 49.5832, country: "Iran", region: "Gilan Province", importance: 2 },
  { names: ["urmia", "orumiyeh"], lat: 37.5527, lon: 45.0761, country: "Iran", region: "West Azerbaijan Province", importance: 2 },
  { names: ["zahedan"], lat: 29.4963, lon: 60.8629, country: "Iran", region: "Sistan and Baluchestan Province", importance: 2 },
  { names: ["khuzestan"], lat: 31.5000, lon: 48.7500, country: "Iran", region: "Khuzestan Province", importance: 2 },
  { names: ["karaj", "karadj"], lat: 35.8400, lon: 50.9391, country: "Iran", region: "Alborz Province", importance: 2 },
{ names: ["yazd"], lat: 31.8974, lon: 54.3569, country: "Iran", region: "Yazd Province", importance: 2 },
{ names: ["semnan"], lat: 35.5729, lon: 53.3971, country: "Iran", region: "Semnan Province", importance: 2 },
{ names: ["zanjan"], lat: 36.6764, lon: 48.4963, country: "Iran", region: "Zanjan Province", importance: 2 },
{ names: ["sanandaj"], lat: 35.3219, lon: 46.9862, country: "Iran", region: "Kurdistan Province", importance: 2 },
{ names: ["ardabil", "ardebil"], lat: 38.2498, lon: 48.2933, country: "Iran", region: "Ardabil Province", importance: 2 },
{ names: ["qeshm"], lat: 26.9581, lon: 56.2719, country: "Iran", region: "Hormozgan Province", importance: 1 },
{ names: ["kish island", "kish"], lat: 26.5578, lon: 53.9802, country: "Iran", region: "Hormozgan Province", importance: 1 },
{ names: ["lavan island", "lavan"], lat: 26.8100, lon: 53.3100, country: "Iran", region: "Hormozgan Province", importance: 1 },
{ names: ["assaluyeh", "asalouyeh"], lat: 27.4761, lon: 52.6077, country: "Iran", region: "Bushehr Province", importance: 1 },
{ names: ["bandar imam khomeini"], lat: 30.4342, lon: 49.0782, country: "Iran", region: "Khuzestan Province", importance: 1 },
{ names: ["bandar-e mahshahr", "mahshahr"], lat: 30.5569, lon: 49.1981, country: "Iran", region: "Khuzestan Province", importance: 1 },
{ names: ["abadan"], lat: 30.3473, lon: 48.3043, country: "Iran", region: "Khuzestan Province", importance: 2 },
{ names: ["qeshm island"], lat: 26.9581, lon: 56.2719, country: "Iran", region: "Hormozgan Province", importance: 1 },
{ names: ["imam khomeini airport", "ika", "tehran imam khomeini international airport"], lat: 35.4161, lon: 51.1522, country: "Iran", region: "Tehran Province", importance: 1 },
{ names: ["mehrabad", "mehrabad airport"], lat: 35.6892, lon: 51.3134, country: "Iran", region: "Tehran Province", importance: 1 },
{ names: ["tabriz airport", "tabriz international airport"], lat: 38.1339, lon: 46.2350, country: "Iran", region: "East Azerbaijan Province", importance: 1 },
{ names: ["bushehr nuclear plant", "bushehr nuclear power plant"], lat: 28.8294, lon: 50.8853, country: "Iran", region: "Bushehr Province", importance: 1 },
{ names: ["arak heavy water reactor", "khondab", "khondab reactor"], lat: 34.4140, lon: 49.2330, country: "Iran", region: "Markazi Province", importance: 1 },
{ names: ["isfahan nuclear site", "isfahan nuclear technology center"], lat: 32.5670, lon: 51.8470, country: "Iran", region: "Isfahan Province", importance: 1 },
{ names: ["parchin military complex"], lat: 35.5278, lon: 51.7741, country: "Iran", region: "Tehran Province", importance: 1 },
{ names: ["minab"], lat: 27.1482, lon: 57.0828, country: "Iran", region: "Hormozgan Province", importance: 1 },
{ names: ["leadership house", "beit rahbari"], lat: 35.7990, lon: 51.4350, country: "Iran", region: "Tehran Province", importance: 1 },
{ names: ["azadi stadium", "azadi complex"], lat: 35.7302, lon: 51.3077, country: "Iran", region: "Tehran Province", importance: 1 },
{ names: ["golestan palace"], lat: 35.6805, lon: 51.4200, country: "Iran", region: "Tehran Province", importance: 1 },
{ names: ["grand bazaar tehran", "bazaar tehran"], lat: 35.6687, lon: 51.4192, country: "Iran", region: "Tehran Province", importance: 1 },
{ names: ["malek ashtar university", "malek-ashtar"], lat: 35.7500, lon: 51.3800, country: "Iran", region: "Tehran Province", importance: 1 },
{ names: ["irib headquarters", "islamic republic of iran broadcasting"], lat: 35.7254, lon: 51.3700, country: "Iran", region: "Tehran Province", importance: 1 },
{ names: ["assembly of experts iran"], lat: 35.6944, lon: 51.4215, country: "Iran", region: "Tehran Province", importance: 1 },
{ names: ["nakhchivan airport"], lat: 39.1888, lon: 45.4584, country: "Azerbaijan", region: "Nakhchivan", importance: 1 },
  // ── Iraq ─────────────────────────────────────────────────────────────────
  { names: ["baghdad"], lat: 33.3152, lon: 44.3661, country: "Iraq", region: "Baghdad Governorate", importance: 3 },
  { names: ["basra", "basrah"], lat: 30.5085, lon: 47.7835, country: "Iraq", region: "Basra Governorate", importance: 3 },
  { names: ["erbil", "irbil", "arbil", "hewlêr"], lat: 36.1911, lon: 44.0091, country: "Iraq", region: "Kurdistan Region", importance: 3 },
  { names: ["mosul"], lat: 36.3419, lon: 43.1158, country: "Iraq", region: "Nineveh Governorate", importance: 3 },
  { names: ["kirkuk"], lat: 35.4681, lon: 44.3922, country: "Iraq", region: "Kirkuk Governorate", importance: 2 },
  { names: ["najaf", "an-najaf"], lat: 31.9961, lon: 44.3182, country: "Iraq", region: "Najaf Governorate", importance: 2 },
  { names: ["karbala", "kerbala"], lat: 32.6165, lon: 44.0243, country: "Iraq", region: "Karbala Governorate", importance: 2 },
  { names: ["fallujah", "falluja"], lat: 33.3500, lon: 43.7855, country: "Iraq", region: "Anbar Governorate", importance: 2 },
  { names: ["ramadi"], lat: 33.4234, lon: 43.2987, country: "Iraq", region: "Anbar Governorate", importance: 2 },
  { names: ["tikrit"], lat: 34.5989, lon: 43.6781, country: "Iraq", region: "Saladin Governorate", importance: 2 },
  { names: ["sinjar"], lat: 36.3167, lon: 41.8333, country: "Iraq", region: "Nineveh Governorate", importance: 1 },
  { names: ["al-asad", "al asad", "ain al-asad"], lat: 33.7874, lon: 42.4411, country: "Iraq", region: "Anbar Governorate", importance: 1 },
  { names: ["sulaymaniyah", "sulaimani"], lat: 35.5600, lon: 45.4320, country: "Iraq", region: "Kurdistan Region", importance: 2 },
  { names: ["dohuk", "duhok"], lat: 36.8669, lon: 42.9866, country: "Iraq", region: "Kurdistan Region", importance: 2 },
  { names: ["diyala"], lat: 33.7489, lon: 45.0736, country: "Iraq", region: "Diyala Governorate", importance: 2 },
  { names: ["taji"], lat: 33.5247, lon: 44.3606, country: "Iraq", region: "Baghdad Governorate", importance: 1 },
  { names: ["ain al-asad", "ain asad"], lat: 33.7874, lon: 42.4411, country: "Iraq", region: "Anbar Governorate", importance: 1 },
  { names: ["balad", "balad air base"], lat: 34.0149, lon: 44.1457, country: "Iraq", region: "Saladin Governorate", importance: 1 },
{ names: ["baghdad international airport", "biap"], lat: 33.2625, lon: 44.2346, country: "Iraq", region: "Baghdad Governorate", importance: 1 },
{ names: ["green zone", "international zone baghdad"], lat: 33.3078, lon: 44.3717, country: "Iraq", region: "Baghdad Governorate", importance: 1 },
{ names: ["k1 base", "k-1 base"], lat: 35.4660, lon: 44.3070, country: "Iraq", region: "Kirkuk Governorate", importance: 1 },
{ names: ["harir", "harir air base"], lat: 36.4060, lon: 44.2420, country: "Iraq", region: "Kurdistan Region", importance: 1 },
{ names: ["qaim", "al-qaim"], lat: 34.3858, lon: 41.0050, country: "Iraq", region: "Anbar Governorate", importance: 1 },
{ names: ["jurf al-sakhar", "jurf as-sakhar"], lat: 32.6461, lon: 44.0085, country: "Iraq", region: "Babil Governorate", importance: 1 },
{ names: ["victory base baghdad", "victory base complex"], lat: 33.2625, lon: 44.2346, country: "Iraq", region: "Baghdad Governorate", importance: 1 },
  // ── Syria ─────────────────────────────────────────────────────────────────
  { names: ["damascus", "dimashq"], lat: 33.5138, lon: 36.2765, country: "Syria", region: "Damascus Governorate", importance: 3 },
  { names: ["aleppo", "halab"], lat: 36.2021, lon: 37.1343, country: "Syria", region: "Aleppo Governorate", importance: 3 },
  { names: ["homs", "hums"], lat: 34.7324, lon: 36.7137, country: "Syria", region: "Homs Governorate", importance: 2 },
  { names: ["latakia", "lattakia"], lat: 35.5317, lon: 35.7917, country: "Syria", region: "Latakia Governorate", importance: 2 },
  { names: ["deir ez-zor", "deir ezzor", "deir al-zour", "dayr az-zawr"], lat: 35.3352, lon: 40.1407, country: "Syria", region: "Deir ez-Zor Governorate", importance: 2 },
  { names: ["palmyra", "tadmur", "tadmor"], lat: 34.5519, lon: 38.2668, country: "Syria", region: "Homs Governorate", importance: 1 },
  { names: ["abu kamal", "al-bukamal"], lat: 34.4504, lon: 40.9185, country: "Syria", region: "Deir ez-Zor Governorate", importance: 1 },
  { names: ["t4 airbase", "t4 air base", "tiyas", "tiyas airbase"], lat: 34.5256, lon: 37.6213, country: "Syria", region: "Homs Governorate", importance: 1 },
  { names: ["idlib"], lat: 35.9304, lon: 36.6291, country: "Syria", region: "Idlib Governorate", importance: 2 },
  { names: ["daraa", "dera", "dera'a"], lat: 32.6189, lon: 36.1021, country: "Syria", region: "Daraa Governorate", importance: 2 },
  { names: ["raqqa"], lat: 35.9500, lon: 39.0167, country: "Syria", region: "Raqqa Governorate", importance: 2 },
  { names: ["hasaka", "al-hasakah"], lat: 36.4835, lon: 40.7500, country: "Syria", region: "Al-Hasakah Governorate", importance: 2 },
  { names: ["mezzeh", "mezze"], lat: 33.4953, lon: 36.2372, country: "Syria", region: "Damascus Governorate", importance: 1 },
  { names: ["t3 pumping station", "t3 station"], lat: 33.6330, lon: 38.5670, country: "Syria", region: "Homs Governorate", importance: 1 },
{ names: ["damascus international airport", "damascus airport"], lat: 33.4115, lon: 36.5156, country: "Syria", region: "Damascus Governorate", importance: 1 },
{ names: ["sayyidah zaynab", "sayeda zainab", "set zaynab"], lat: 33.4445, lon: 36.3707, country: "Syria", region: "Damascus Countryside", importance: 1 },
{ names: ["al mayadin", "mayadin"], lat: 35.0198, lon: 40.4442, country: "Syria", region: "Deir ez-Zor Governorate", importance: 1 },
{ names: ["al tanf", "tanf"], lat: 33.4894, lon: 38.6187, country: "Syria", region: "Homs Governorate", importance: 1 },
{ names: ["qasr", "qasr district"], lat: 33.5000, lon: 36.3000, country: "Syria", region: "Damascus Area", importance: 1 },
{ names: ["hama"], lat: 35.1318, lon: 36.7578, country: "Syria", region: "Hama Governorate", importance: 2 },
{ names: ["qamishli", "qamishlo", "qamishly"], lat: 37.0521, lon: 41.2229, country: "Syria", region: "Al-Hasakah Governorate", importance: 2 },
  // ── Lebanon ───────────────────────────────────────────────────────────────
  { names: ["beirut"], lat: 33.8938, lon: 35.5018, country: "Lebanon", region: "Beirut Governorate", importance: 3 },
  { names: ["tyre", "sour", "tyr"], lat: 33.2705, lon: 35.2031, country: "Lebanon", region: "South Governorate", importance: 2 },
  { names: ["sidon", "saida"], lat: 33.5597, lon: 35.3711, country: "Lebanon", region: "South Governorate", importance: 2 },
  { names: ["tripoli", "trablous"], lat: 34.4367, lon: 35.8497, country: "Lebanon", region: "North Governorate", importance: 2 },
  { names: ["dahiyeh", "dahieh", "dahye"], lat: 33.8538, lon: 35.5018, country: "Lebanon", region: "Beirut Governorate", importance: 1 },
  { names: ["baalbek"], lat: 34.0042, lon: 36.2144, country: "Lebanon", region: "Bekaa Governorate", importance: 1 },
  { names: ["bekaa valley", "bekaa", "beqaa"], lat: 33.8500, lon: 35.9000, country: "Lebanon", region: "Bekaa Governorate", importance: 2 },
  { names: ["nabatieh", "nabatiyeh"], lat: 33.3780, lon: 35.4839, country: "Lebanon", region: "Nabatieh Governorate", importance: 1 },
{ names: ["bint jbeil", "bint jbayl"], lat: 33.1194, lon: 35.4339, country: "Lebanon", region: "Nabatieh Governorate", importance: 1 },
{ names: ["marjayoun", "marjeyoun"], lat: 33.3603, lon: 35.5908, country: "Lebanon", region: "Nabatieh Governorate", importance: 1 },
{ names: ["naqoura", "naqura"], lat: 33.1181, lon: 35.1397, country: "Lebanon", region: "South Governorate", importance: 1 },
{ names: ["south lebanon"], lat: 33.2500, lon: 35.3500, country: "Lebanon", region: "South Lebanon", importance: 2 },
  // ── Yemen ─────────────────────────────────────────────────────────────────
  { names: ["sanaa", "sana'a", "sana"], lat: 15.3694, lon: 44.1910, country: "Yemen", region: "Sanaa Governorate", importance: 3 },
  { names: ["hodeidah", "hudaydah", "hodeida"], lat: 14.7980, lon: 42.9511, country: "Yemen", region: "Hodeidah Governorate", importance: 2 },
  { names: ["aden"], lat: 12.7855, lon: 45.0187, country: "Yemen", region: "Aden Governorate", importance: 2 },
  { names: ["marib", "ma'rib"], lat: 15.4696, lon: 45.3238, country: "Yemen", region: "Marib Governorate", importance: 2 },
  { names: ["taiz", "ta'izz"], lat: 13.5776, lon: 44.0177, country: "Yemen", region: "Taiz Governorate", importance: 2 },
  { names: ["hajjah"], lat: 15.6936, lon: 43.6022, country: "Yemen", region: "Hajjah Governorate", importance: 1 },
  { names: ["mukalla", "al-mukalla"], lat: 14.5333, lon: 49.1333, country: "Yemen", region: "Hadhramaut Governorate", importance: 2 },
  { names: ["saada", "sa'dah"], lat: 16.9409, lon: 43.7614, country: "Yemen", region: "Sa'dah Governorate", importance: 1 },
{ names: ["salif", "as salif"], lat: 15.3050, lon: 42.6766, country: "Yemen", region: "Hodeidah Governorate", importance: 1 },
{ names: ["ras isa"], lat: 15.4330, lon: 42.6590, country: "Yemen", region: "Hodeidah Governorate", importance: 1 },
{ names: ["mocha", "mokha", "al mukha"], lat: 13.3190, lon: 43.2504, country: "Yemen", region: "Taiz Governorate", importance: 1 },
{ names: ["socotra", "soqotra"], lat: 12.4634, lon: 53.8237, country: "Yemen", region: "Socotra", importance: 1 },
  // ── Gaza / West Bank ──────────────────────────────────────────────────────
  { names: ["gaza city", "gaza"], lat: 31.5017, lon: 34.4668, country: "Gaza", region: "Gaza Strip", importance: 3 },
  { names: ["rafah"], lat: 31.2968, lon: 34.2516, country: "Gaza", region: "Rafah", importance: 2 },
  { names: ["khan younis", "khan yunis"], lat: 31.3443, lon: 34.3064, country: "Gaza", region: "Khan Younis", importance: 2 },
  { names: ["jabalia", "jabaliya"], lat: 31.5271, lon: 34.4831, country: "Gaza", region: "North Gaza", importance: 2 },
  { names: ["beit lahiya"], lat: 31.5518, lon: 34.4961, country: "Gaza", region: "North Gaza", importance: 1 },
  { names: ["beit hanoun"], lat: 31.5330, lon: 34.5322, country: "Gaza", region: "North Gaza", importance: 1 },
  { names: ["deir al-balah", "deir balah"], lat: 31.4176, lon: 34.3508, country: "Gaza", region: "Deir al-Balah", importance: 1 },
  { names: ["jenin"], lat: 32.4672, lon: 35.3021, country: "West Bank", region: "Jenin", importance: 2 },
  { names: ["nablus"], lat: 32.2211, lon: 35.2544, country: "West Bank", region: "Nablus", importance: 2 },
  { names: ["ramallah"], lat: 31.9022, lon: 35.2034, country: "West Bank", region: "Ramallah", importance: 2 },
  { names: ["hebron", "al-khalil"], lat: 31.5326, lon: 35.0998, country: "West Bank", region: "Hebron", importance: 2 },
  { names: ["tulkarm"], lat: 32.3104, lon: 35.0286, country: "West Bank", region: "Tulkarm", importance: 1 },
  { names: ["shati", "beach camp"], lat: 31.5354, lon: 34.4588, country: "Gaza", region: "North Gaza", importance: 1 },
{ names: ["netzarim"], lat: 31.4500, lon: 34.3900, country: "Gaza", region: "Central Gaza", importance: 1 },
{ names: ["philadelphi corridor", "philadelphi"], lat: 31.2500, lon: 34.2500, country: "Gaza", region: "Rafah Border Area", importance: 1 },
{ names: ["al mawasi", "mawasi"], lat: 31.3500, lon: 34.2500, country: "Gaza", region: "Khan Younis/Rafah Coast", importance: 1 },
{ names: ["nur shams"], lat: 32.3000, lon: 35.0500, country: "West Bank", region: "Tulkarm", importance: 1 },
{ names: ["balata"], lat: 32.2100, lon: 35.2900, country: "West Bank", region: "Nablus", importance: 1 },
  // ── Israel ────────────────────────────────────────────────────────────────
  { names: ["tel aviv", "tel-aviv"], lat: 32.0853, lon: 34.7818, country: "Israel", region: "Tel Aviv District", importance: 3 },
  { names: ["haifa"], lat: 32.7940, lon: 34.9896, country: "Israel", region: "Haifa District", importance: 2 },
  { names: ["jerusalem"], lat: 31.7683, lon: 35.2137, country: "Israel", region: "Jerusalem", importance: 3 },
  { names: ["beer sheva", "beersheba", "be'er sheva"], lat: 31.2530, lon: 34.7915, country: "Israel", region: "Southern District", importance: 2 },
  { names: ["ashkelon"], lat: 31.6688, lon: 34.5742, country: "Israel", region: "Southern District", importance: 2 },
  { names: ["ashdod"], lat: 31.8018, lon: 34.6495, country: "Israel", region: "Southern District", importance: 2 },
  { names: ["eilat"], lat: 29.5577, lon: 34.9519, country: "Israel", region: "Southern District", importance: 2 },
  { names: ["sderot"], lat: 31.5240, lon: 34.5963, country: "Israel", region: "Southern District", importance: 1 },
  { names: ["golan heights", "golan"], lat: 33.1000, lon: 35.7700, country: "Israel", region: "Golan Heights", importance: 2 },
  { names: ["galilee", "northern israel"], lat: 32.9000, lon: 35.3000, country: "Israel", region: "Northern District", importance: 2 },
{ names: ["ben gurion", "ben gurion airport", "tlv airport"], lat: 32.0114, lon: 34.8867, country: "Israel", region: "Central District", importance: 1 },
{ names: ["nevatim", "nevatim airbase", "nevatim air base"], lat: 31.2076, lon: 35.0123, country: "Israel", region: "Southern District", importance: 1 },
{ names: ["ramon airbase", "ramon air base", "ramon airport"], lat: 30.7761, lon: 34.6667, country: "Israel", region: "Southern District", importance: 1 },
{ names: ["metula"], lat: 33.2791, lon: 35.5795, country: "Israel", region: "Northern District", importance: 1 },
{ names: ["kiryat shmona"], lat: 33.2073, lon: 35.5704, country: "Israel", region: "Northern District", importance: 1 },
{ names: ["acre", "akko"], lat: 32.9230, lon: 35.0818, country: "Israel", region: "Northern District", importance: 1 },
{ names: ["bnei brak"], lat: 32.0840, lon: 34.8338, country: "Israel", region: "Tel Aviv District", importance: 1 },
{ names: ["rosh haayin", "rosh ha'ayin"], lat: 32.0957, lon: 34.9578, country: "Israel", region: "Central District", importance: 1 },
{ names: ["bat yam"], lat: 32.0231, lon: 34.7503, country: "Israel", region: "Tel Aviv District", importance: 1 },
{ names: ["rehovot"], lat: 31.8928, lon: 34.8113, country: "Israel", region: "Central District", importance: 1 },
{ names: ["kiryat ekron", "kiryat ekron mall"], lat: 31.8600, lon: 34.8100, country: "Israel", region: "Central District", importance: 1 },
{ names: ["petah tikva", "petah tiqwa"], lat: 32.0878, lon: 34.8878, country: "Israel", region: "Central District", importance: 1 },
  // ── International waters / sea areas ──────────────────────────────────────
  { names: ["strait of hormuz", "hormuz strait", "hormuz"], lat: 26.5958, lon: 56.2715, country: "International Waters", region: "Strait of Hormuz", importance: 2 },
  { names: ["red sea"], lat: 20.0000, lon: 38.0000, country: "International Waters", region: "Red Sea", importance: 2 },
  { names: ["gulf of aden", "gulf of oman"], lat: 15.0000, lon: 51.0000, country: "International Waters", region: "Gulf of Aden", importance: 2 },
  { names: ["persian gulf", "arabian gulf"], lat: 27.0000, lon: 51.0000, country: "International Waters", region: "Persian Gulf", importance: 2 },
  { names: ["mediterranean sea", "mediterranean"], lat: 33.0000, lon: 34.0000, country: "International Waters", region: "Eastern Mediterranean", importance: 2 },

  // ── Saudi Arabia (border / relevant areas) ────────────────────────────────
  { names: ["riyadh"], lat: 24.7136, lon: 46.6753, country: "Saudi Arabia", region: "Riyadh Province", importance: 3 },
  { names: ["jeddah"], lat: 21.4858, lon: 39.1925, country: "Saudi Arabia", region: "Makkah Province", importance: 2 },
  { names: ["abha"], lat: 18.2164, lon: 42.5053, country: "Saudi Arabia", region: "Asir Province", importance: 1 },
{ names: ["prince sultan air base", "al kharj air base"], lat: 24.0627, lon: 47.5805, country: "Saudi Arabia", region: "Riyadh Province", importance: 1 },
{ names: ["ras tanura", "ras al-tanura"], lat: 26.6453, lon: 50.1611, country: "Saudi Arabia", region: "Eastern Province", importance: 2 },
{ names: ["al kharj"], lat: 24.1558, lon: 47.3178, country: "Saudi Arabia", region: "Riyadh Province", importance: 1 },
{ names: ["dhahran"], lat: 26.3083, lon: 50.1383, country: "Saudi Arabia", region: "Eastern Province", importance: 2 },
  // ── Jordan ────────────────────────────────────────────────────────────────
  { names: ["amman"], lat: 31.9522, lon: 35.2332, country: "Jordan", region: "Amman Governorate", importance: 3 },
  { names: ["mafraq"], lat: 32.3429, lon: 36.2080, country: "Jordan", region: "Mafraq Governorate", importance: 1 },
{ names: ["aqaba"], lat: 29.5321, lon: 35.0063, country: "Jordan", region: "Aqaba Governorate", importance: 1 },
{ names: ["tabuk"], lat: 28.3998, lon: 36.5715, country: "Saudi Arabia", region: "Tabuk Province", importance: 1 },
{ names: ["yanbu", "yanbu al bahr"], lat: 24.0895, lon: 38.0618, country: "Saudi Arabia", region: "Medina Province", importance: 1 },
{ names: ["alexandria"], lat: 31.2001, lon: 29.9187, country: "Egypt", region: "Alexandria Governorate", importance: 2 },
{ names: ["el arish", "al arish", "arish"], lat: 31.1313, lon: 33.7984, country: "Egypt", region: "North Sinai", importance: 1 },
{ names: ["paphos"], lat: 34.7720, lon: 32.4297, country: "Cyprus", importance: 1 },
{ names: ["muscat talks", "muscat oman talks"], lat: 23.5880, lon: 58.3829, country: "Oman", importance: 1 }, // già hai muscat, skip
{ names: ["geneva"], lat: 46.2044, lon: 6.1432, country: "Switzerland", importance: 1 }, // negoziati nucleari
  // ── Kuwait / UAE / Qatar / Bahrain ────────────────────────────────────────
  { names: ["kuwait city", "kuwait"], lat: 29.3759, lon: 47.9774, country: "Kuwait", importance: 3 },
  { names: ["dubai"], lat: 25.2048, lon: 55.2708, country: "UAE", region: "Dubai Emirate", importance: 3 },
  { names: ["dubai airport", "dubai international airport", "dxb airport"], lat: 25.2532, lon: 55.3657, country: "UAE", region: "Dubai International Airport", importance: 2 },
  { names: ["abu dhabi"], lat: 24.4539, lon: 54.3773, country: "UAE", region: "Abu Dhabi Emirate", importance: 3 },
  { names: ["sharjah"], lat: 25.3463, lon: 55.4209, country: "UAE", region: "Sharjah Emirate", importance: 2 },
  { names: ["doha", "qatar"], lat: 25.2854, lon: 51.5310, country: "Qatar", region: "Ad Dawhah", importance: 3 },
  { names: ["al udeid", "al-udeid", "udeid air base"], lat: 25.1173, lon: 51.3149, country: "Qatar", region: "Al Udeid", importance: 1 },
  { names: ["manama", "bahrain"], lat: 26.2235, lon: 50.5876, country: "Bahrain", importance: 3 },
  { names: ["5th fleet", "naval support activity bahrain"], lat: 26.2100, lon: 50.6200, country: "Bahrain", importance: 1 },
{ names: ["hamad international airport", "doha airport"], lat: 25.2731, lon: 51.6080, country: "Qatar", region: "Ad Dawhah", importance: 1 },
{ names: ["ras laffan", "ras laffan industrial city"], lat: 25.9087, lon: 51.5635, country: "Qatar", region: "Al Shamal", importance: 2 },
  // ── Turkey ────────────────────────────────────────────────────────────────
  { names: ["ankara"], lat: 39.9334, lon: 32.8597, country: "Turkey", importance: 3 },
  { names: ["istanbul"], lat: 41.0082, lon: 28.9784, country: "Turkey", importance: 3 },
  { names: ["incirlik", "incirlik air base"], lat: 37.0013, lon: 35.4259, country: "Turkey", region: "Adana Province", importance: 1 },
  { names: ["turkey", "turkish", "turkiye", "türkiye"], lat: 38.9637, lon: 35.2433, country: "Turkey", importance: 1 },

  // ── Cyprus ────────────────────────────────────────────────────────────────
  { names: ["nicosia", "lefkosia"], lat: 35.1856, lon: 33.3823, country: "Cyprus", importance: 3 },
  { names: ["limassol", "lemesos"], lat: 34.6786, lon: 33.0413, country: "Cyprus", importance: 2 },
  { names: ["larnaca", "larnaka"], lat: 34.9229, lon: 33.6233, country: "Cyprus", importance: 2 },
  { names: ["akrotiri", "akrotiri air base", "raf akrotiri"], lat: 34.5942, lon: 32.9873, country: "Cyprus", region: "British Sovereign Base", importance: 1 },
  { names: ["cyprus", "cypriot"], lat: 35.1264, lon: 33.4299, country: "Cyprus", importance: 1 },

  // ── Egypt / Suez ──────────────────────────────────────────────────────────
  { names: ["cairo"], lat: 30.0444, lon: 31.2357, country: "Egypt", importance: 3 },
  { names: ["suez canal", "suez"], lat: 30.5852, lon: 32.2654, country: "Egypt", region: "Suez Canal", importance: 2 },
  { names: ["sinai", "sinai peninsula"], lat: 30.0000, lon: 34.0000, country: "Egypt", region: "Sinai", importance: 2 },
  { names: ["port said"], lat: 31.2565, lon: 32.2841, country: "Egypt", region: "Suez Canal", importance: 2 },
  { names: ["sharm el-sheikh", "sharm el sheikh"], lat: 27.9158, lon: 34.3300, country: "Egypt", importance: 2 },
  { names: ["egypt", "egyptian"], lat: 26.8206, lon: 30.8025, country: "Egypt", importance: 1 },

  // ── Azerbaijan ────────────────────────────────────────────────────────────
  { names: ["baku"], lat: 40.4093, lon: 49.8671, country: "Azerbaijan", importance: 3 },
  { names: ["nagorno-karabakh", "karabakh", "artsakh"], lat: 39.8265, lon: 46.7617, country: "Azerbaijan", region: "Nagorno-Karabakh", importance: 2 },
  { names: ["azerbaijan", "azerbaijani", "azeri"], lat: 40.1431, lon: 47.5769, country: "Azerbaijan", importance: 1 },

  // ── Pakistan ──────────────────────────────────────────────────────────────
  { names: ["islamabad"], lat: 33.7294, lon: 73.0931, country: "Pakistan", importance: 3 },
  { names: ["karachi"], lat: 24.8607, lon: 67.0011, country: "Pakistan", importance: 3 },
  { names: ["balochistan", "baluchistan"], lat: 28.4907, lon: 65.0958, country: "Pakistan", region: "Balochistan", importance: 2 },
  { names: ["pakistan", "pakistani"], lat: 30.3753, lon: 69.3451, country: "Pakistan", importance: 1 },

  // ── Oman ──────────────────────────────────────────────────────────────────
  { names: ["muscat"], lat: 23.5880, lon: 58.3829, country: "Oman", importance: 3 },
  { names: ["oman", "omani", "gulf of oman"], lat: 21.5125, lon: 55.9233, country: "Oman", importance: 1 },

  // ── Somalia / Horn of Africa (Houthi shipping attacks) ────────────────────
  { names: ["mogadishu"], lat: 2.0469, lon: 45.3182, country: "Somalia", importance: 3 },
  { names: ["somalia", "somali"], lat: 5.1521, lon: 46.1996, country: "Somalia", importance: 1 },
  { names: ["djibouti"], lat: 11.8251, lon: 42.5903, country: "Djibouti", importance: 3 },
  { names: ["eritrea"], lat: 15.1794, lon: 39.7823, country: "Eritrea", importance: 1 },
  { names: ["bab el-mandeb", "bab-el-mandeb", "mandeb strait"], lat: 12.5853, lon: 43.3333, country: "International Waters", region: "Bab el-Mandeb Strait", importance: 2 },

  // ── India / Sri Lanka (shipping lanes — attacks affected vessels) ──────────
  { names: ["arabian sea"], lat: 17.0000, lon: 65.0000, country: "International Waters", region: "Arabian Sea", importance: 2 },
  { names: ["indian ocean"], lat: 10.0000, lon: 70.0000, country: "International Waters", region: "Indian Ocean", importance: 2 },
  { names: ["mumbai", "bombay"], lat: 19.0760, lon: 72.8777, country: "India", importance: 3 },
  { names: ["colombo", "sri lanka"], lat: 6.9271, lon: 79.8612, country: "Sri Lanka", importance: 2 },

{ names: ["strait of hormuz blockade", "hormuz closure"], lat: 26.5958, lon: 56.2715, country: "International Waters", region: "Strait of Hormuz", importance: 2 }, // già hai hormuz — skip
{ names: ["visakhapatnam", "vizag"], lat: 17.6868, lon: 83.2185, country: "India", region: "Andhra Pradesh", importance: 1 }, // IRIS Dena affondata nei pressi
{ names: ["galle", "galle sri lanka"], lat: 6.0329, lon: 80.2168, country: "Sri Lanka", importance: 1 }, // USS vs IRIS Dena
  { names: ["mina salman port", "mina salman"], lat: 26.2019, lon: 50.5854, country: "Bahrain", importance: 1 },
{ names: ["salman industrial zone"], lat: 26.2200, lon: 50.6500, country: "Bahrain", importance: 1 },
  { names: ["fujairah"], lat: 25.1288, lon: 56.3265, country: "UAE", region: "Fujairah", importance: 2 },
{ names: ["khasab"], lat: 26.1799, lon: 56.2477, country: "Oman", region: "Musandam", importance: 1 },
{ names: ["musandam"], lat: 26.1970, lon: 56.2460, country: "Oman", region: "Musandam", importance: 1 },
{ names: ["jebel ali"], lat: 24.9857, lon: 55.0238, country: "UAE", region: "Dubai Emirate", importance: 1 },
{ names: ["ruwais"], lat: 24.1100, lon: 52.7300, country: "UAE", region: "Abu Dhabi Emirate", importance: 1 },
{ names: ["fujairah oil terminal", "fujairah port"], lat: 25.1127, lon: 56.3547, country: "UAE", region: "Fujairah", importance: 1 },
{ names: ["abu dhabi airport", "zayed international airport"], lat: 24.4428, lon: 54.6512, country: "UAE", region: "Abu Dhabi Emirate", importance: 1 },
  // ── Country-level fallbacks (low importance — used when no city matched) ──
  // These ensure articles that mention only a country name still get ingested.
  { names: ["iran", "iranian", "persia", "persian"], lat: 32.4279, lon: 53.6880, country: "Iran", importance: 1 },
  { names: ["iraq", "iraqi"], lat: 33.2232, lon: 43.6793, country: "Iraq", importance: 1 },
  { names: ["syria", "syrian"], lat: 34.8021, lon: 38.9968, country: "Syria", importance: 1 },
  { names: ["lebanon", "lebanese"], lat: 33.8547, lon: 35.8623, country: "Lebanon", importance: 1 },
  { names: ["israel", "israeli", "idf", "zahal"], lat: 31.0461, lon: 34.8516, country: "Israel", importance: 1 },
  { names: ["palestine", "palestinian", "hamas", "islamic jihad", "pij"], lat: 31.5017, lon: 34.4668, country: "Gaza", region: "Gaza Strip", importance: 1 },
  { names: ["yemen", "yemeni", "houthi", "houthis", "ansarallah", "ansar allah"], lat: 15.5527, lon: 48.5164, country: "Yemen", importance: 1 },
  { names: ["hezbollah", "hizbollah", "south lebanon"], lat: 33.2705, lon: 35.2031, country: "Lebanon", region: "South Lebanon", importance: 1 },
  { names: ["irgc", "revolutionary guard", "quds force", "sepah"], lat: 35.6892, lon: 51.3890, country: "Iran", region: "Tehran Province", importance: 1 },
  { names: ["west bank", "cisgiordania"], lat: 32.0000, lon: 35.2500, country: "West Bank", importance: 1 },
  { names: ["azerbaijan", "azeri", "nakhchivan"], lat: 40.1431, lon: 47.5769, country: "Azerbaijan", importance: 1 }, // già presente parzialmente
{ names: ["operation epic fury", "epic fury"], lat: 35.6892, lon: 51.3890, country: "Iran", region: "Tehran Province", importance: 1 },
];

// Build a lowercase name → entry index for fast lookup
const _index = new Map<string, number>();
for (let i = 0; i < ENTRIES.length; i++) {
  for (const name of ENTRIES[i].names) {
    _index.set(name, i);
  }
}

/**
 * Extract the most relevant location from a piece of text.
 *
 * Strategy:
 *  1. Tokenize text into 1-, 2-, and 3-word ngrams (lowercase)
 *  2. Match against gazetteer index (longest match wins)
 *  3. Return the entry with highest importance among matches
 */
export function lookupLocation(text: string): GazetteerEntry | null {
  const lower = text.toLowerCase().replace(/[,.()\[\]]/g, " ");
  const tokens = lower.split(/\s+/).filter(Boolean);

  const matches: { entry: GazetteerEntry; nameLen: number }[] = [];

  // Try 3-grams, 2-grams, 1-grams
  for (let size = 3; size >= 1; size--) {
    for (let i = 0; i <= tokens.length - size; i++) {
      const ngram = tokens.slice(i, i + size).join(" ");
      const idx = _index.get(ngram);
      if (idx !== undefined) {
        matches.push({ entry: ENTRIES[idx], nameLen: size });
      }
    }
  }

  if (matches.length === 0) return null;

  // Prefer longer name matches (more specific), then higher importance
  matches.sort((a, b) => {
    if (b.nameLen !== a.nameLen) return b.nameLen - a.nameLen;
    return b.entry.importance - a.entry.importance;
  });

  return matches[0].entry;
}

/**
 * Check if a text mentions any country in our region of interest.
 * Fast pre-filter before full gazetteer lookup.
 */
const REGION_KEYWORDS = [
  // Core conflict actors
  "iran", "iranian", "iraq", "iraqi", "syria", "syrian", "lebanon", "lebanese",
  "yemen", "yemeni", "houthi", "houthis", "gaza", "palestinian", "israel",
  "israeli", "hezbollah", "irgc", "hamas", "idf",
  // Key cities
  "tehran", "baghdad", "damascus", "beirut", "sanaa", "jerusalem",
  // Regions / waterways
  "middle east", "hormuz", "west bank", "red sea", "suez", "bab el-mandeb",
  "arabian sea", "persian gulf", "arabian gulf",
  // Expanded geography
  "dubai", "uae", "emirates", "qatar", "bahrain", "kuwait", "oman",
  "cyprus", "akrotiri", "ankara", "turkey", "turkish", "turkiye",
  "egypt", "egyptian", "sinai",
  "azerbaijan", "azerbaijani", "baku",
  "pakistan", "balochistan",
  "somalia", "somali", "djibouti", "eritrea",
];

export function isRelevantToRegion(text: string): boolean {
  const lower = text.toLowerCase();
  return REGION_KEYWORDS.some((kw) => lower.includes(kw));
}
