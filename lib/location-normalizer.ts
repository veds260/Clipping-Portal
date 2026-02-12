/**
 * Normalize free-text Twitter location strings into real countries/regions.
 * Returns null for joke/meme locations that can't be mapped.
 */

// Country/region keywords mapped to normalized names
const LOCATION_MAP: [RegExp, string][] = [
  // Africa
  [/\bnigeria\b/i, 'Nigeria'],
  [/\blagos\b/i, 'Nigeria'],
  [/\babuja\b/i, 'Nigeria'],
  [/\bnairobi\b/i, 'Kenya'],
  [/\bkenya\b/i, 'Kenya'],
  [/\bghana\b/i, 'Ghana'],
  [/\baccra\b/i, 'Ghana'],
  [/\bsouth africa\b/i, 'South Africa'],
  [/\bjohannesburg\b/i, 'South Africa'],
  [/\bcape town\b/i, 'South Africa'],
  [/\begypt\b/i, 'Egypt'],
  [/\bcairo\b/i, 'Egypt'],
  [/\btanzania\b/i, 'Tanzania'],
  [/\buganda\b/i, 'Uganda'],
  [/\bethiopia\b/i, 'Ethiopia'],
  [/\bcameroon\b/i, 'Cameroon'],
  [/\bsenegal\b/i, 'Senegal'],
  [/\brwanda\b/i, 'Rwanda'],
  [/\bmorocco\b/i, 'Morocco'],
  [/\btunisia\b/i, 'Tunisia'],
  [/\balgeria\b/i, 'Algeria'],
  [/\bzimbabwe\b/i, 'Zimbabwe'],
  [/\bmozambique\b/i, 'Mozambique'],
  [/\bcongo\b/i, 'Congo'],
  [/\bivory coast\b/i, 'Ivory Coast'],
  [/\bcote d.ivoire\b/i, 'Ivory Coast'],
  [/\bangola\b/i, 'Angola'],

  // North America
  [/\bunited states\b/i, 'United States'],
  [/\busa\b/i, 'United States'],
  [/\bu\.s\.a\b/i, 'United States'],
  [/\bnew york\b/i, 'United States'],
  [/\blos angeles\b/i, 'United States'],
  [/\bchicago\b/i, 'United States'],
  [/\bhouston\b/i, 'United States'],
  [/\bmiami\b/i, 'United States'],
  [/\bsan francisco\b/i, 'United States'],
  [/\batlanta\b/i, 'United States'],
  [/\bdallas\b/i, 'United States'],
  [/\bseattle\b/i, 'United States'],
  [/\bboston\b/i, 'United States'],
  [/\bdenver\b/i, 'United States'],
  [/\baustin\b/i, 'United States'],
  [/\bphoenix\b/i, 'United States'],
  [/\bphiladelphia\b/i, 'United States'],
  [/\bdetroit\b/i, 'United States'],
  [/\bportland\b/i, 'United States'],
  [/\bbrooklyn\b/i, 'United States'],
  [/\bmanhattan\b/i, 'United States'],
  [/\bcalifornia\b/i, 'United States'],
  [/\btexas\b/i, 'United States'],
  [/\bflorida\b/i, 'United States'],
  [/\bcanada\b/i, 'Canada'],
  [/\btoronto\b/i, 'Canada'],
  [/\bvancouver\b/i, 'Canada'],
  [/\bmontreal\b/i, 'Canada'],
  [/\bmexico\b/i, 'Mexico'],
  [/\bmexico city\b/i, 'Mexico'],

  // Europe
  [/\bunited kingdom\b/i, 'United Kingdom'],
  [/\bengland\b/i, 'United Kingdom'],
  [/\blondon\b/i, 'United Kingdom'],
  [/\bmanchester\b/i, 'United Kingdom'],
  [/\b(?:^|\s)uk(?:\s|$|,)/i, 'United Kingdom'],
  [/\bgermany\b/i, 'Germany'],
  [/\bberlin\b/i, 'Germany'],
  [/\bmunich\b/i, 'Germany'],
  [/\bfrance\b/i, 'France'],
  [/\bparis\b/i, 'France'],
  [/\bspain\b/i, 'Spain'],
  [/\bmadrid\b/i, 'Spain'],
  [/\bbarcelona\b/i, 'Spain'],
  [/\bitaly\b/i, 'Italy'],
  [/\brome\b/i, 'Italy'],
  [/\bmilan\b/i, 'Italy'],
  [/\bnetherlands\b/i, 'Netherlands'],
  [/\bamsterdam\b/i, 'Netherlands'],
  [/\bportugal\b/i, 'Portugal'],
  [/\blisbon\b/i, 'Portugal'],
  [/\bswitzerland\b/i, 'Switzerland'],
  [/\bsweden\b/i, 'Sweden'],
  [/\bnorway\b/i, 'Norway'],
  [/\bdenmark\b/i, 'Denmark'],
  [/\bfinland\b/i, 'Finland'],
  [/\bpoland\b/i, 'Poland'],
  [/\bwarsaw\b/i, 'Poland'],
  [/\bczech\b/i, 'Czech Republic'],
  [/\bprague\b/i, 'Czech Republic'],
  [/\bgreece\b/i, 'Greece'],
  [/\bathens\b/i, 'Greece'],
  [/\bireland\b/i, 'Ireland'],
  [/\bdublin\b/i, 'Ireland'],
  [/\bscotland\b/i, 'United Kingdom'],
  [/\bwales\b/i, 'United Kingdom'],
  [/\bbelgium\b/i, 'Belgium'],
  [/\baustria\b/i, 'Austria'],
  [/\bvienna\b/i, 'Austria'],
  [/\bturkey\b/i, 'Turkey'],
  [/\btürkiye\b/i, 'Turkey'],
  [/\bistanbul\b/i, 'Turkey'],
  [/\bromania\b/i, 'Romania'],
  [/\bhungary\b/i, 'Hungary'],
  [/\bbudapest\b/i, 'Hungary'],
  [/\bukraine\b/i, 'Ukraine'],
  [/\brussia\b/i, 'Russia'],
  [/\bmoscow\b/i, 'Russia'],

  // Asia
  [/\bindia\b/i, 'India'],
  [/\bmumbai\b/i, 'India'],
  [/\bdelhi\b/i, 'India'],
  [/\bbangalore\b/i, 'India'],
  [/\bhyperabad\b/i, 'India'],
  [/\bchennai\b/i, 'India'],
  [/\bkolkata\b/i, 'India'],
  [/\bjapan\b/i, 'Japan'],
  [/\btokyo\b/i, 'Japan'],
  [/\bosaka\b/i, 'Japan'],
  [/\bchina\b/i, 'China'],
  [/\bbeijing\b/i, 'China'],
  [/\bshanghai\b/i, 'China'],
  [/\bsouth korea\b/i, 'South Korea'],
  [/\bseoul\b/i, 'South Korea'],
  [/\bsingapore\b/i, 'Singapore'],
  [/\bthailand\b/i, 'Thailand'],
  [/\bbangkok\b/i, 'Thailand'],
  [/\bvietnam\b/i, 'Vietnam'],
  [/\bindonesia\b/i, 'Indonesia'],
  [/\bjakarta\b/i, 'Indonesia'],
  [/\bmalaysia\b/i, 'Malaysia'],
  [/\bkuala lumpur\b/i, 'Malaysia'],
  [/\bphilippines\b/i, 'Philippines'],
  [/\bmanila\b/i, 'Philippines'],
  [/\bpakistan\b/i, 'Pakistan'],
  [/\bkarachi\b/i, 'Pakistan'],
  [/\blahore\b/i, 'Pakistan'],
  [/\bbangladesh\b/i, 'Bangladesh'],
  [/\bdhaka\b/i, 'Bangladesh'],
  [/\bsri lanka\b/i, 'Sri Lanka'],
  [/\btaiwan\b/i, 'Taiwan'],
  [/\bhong kong\b/i, 'Hong Kong'],

  // Middle East
  [/\bdubai\b/i, 'UAE'],
  [/\babu dhabi\b/i, 'UAE'],
  [/\b(?:^|\s)uae(?:\s|$|,)/i, 'UAE'],
  [/\bunited arab emirates\b/i, 'UAE'],
  [/\bsaudi\b/i, 'Saudi Arabia'],
  [/\briyadh\b/i, 'Saudi Arabia'],
  [/\bjeddah\b/i, 'Saudi Arabia'],
  [/\bisrael\b/i, 'Israel'],
  [/\btel aviv\b/i, 'Israel'],
  [/\bqatar\b/i, 'Qatar'],
  [/\bdoha\b/i, 'Qatar'],
  [/\bbahrain\b/i, 'Bahrain'],
  [/\bkuwait\b/i, 'Kuwait'],
  [/\biran\b/i, 'Iran'],
  [/\biraq\b/i, 'Iraq'],
  [/\bjordan\b/i, 'Jordan'],
  [/\blebanon\b/i, 'Lebanon'],
  [/\bbeirut\b/i, 'Lebanon'],

  // South America
  [/\bbrazil\b/i, 'Brazil'],
  [/\bsao paulo\b/i, 'Brazil'],
  [/\brio de janeiro\b/i, 'Brazil'],
  [/\bargentina\b/i, 'Argentina'],
  [/\bbuenos aires\b/i, 'Argentina'],
  [/\bcolombia\b/i, 'Colombia'],
  [/\bbogota\b/i, 'Colombia'],
  [/\bchile\b/i, 'Chile'],
  [/\bsantiago\b/i, 'Chile'],
  [/\bperu\b/i, 'Peru'],
  [/\blima\b/i, 'Peru'],
  [/\bvenezuela\b/i, 'Venezuela'],
  [/\becuador\b/i, 'Ecuador'],

  // Oceania
  [/\baustralia\b/i, 'Australia'],
  [/\bsydney\b/i, 'Australia'],
  [/\bmelbourne\b/i, 'Australia'],
  [/\bnew zealand\b/i, 'New Zealand'],
  [/\bauckland\b/i, 'New Zealand'],

  // US State abbreviations (common in Twitter bios)
  [/\bCA\b/, 'United States'],
  [/\bNY\b/, 'United States'],
  [/\bTX\b/, 'United States'],
  [/\bFL\b/, 'United States'],
  [/\bIL\b/, 'United States'],
  [/\bOH\b/, 'United States'],
  [/\bPA\b/, 'United States'],
  [/\bGA\b/, 'United States'],
  [/\bNC\b/, 'United States'],
  [/\bWA\b/, 'United States'],
  [/\bCO\b/, 'United States'],
  [/\bAZ\b/, 'United States'],
  [/\bMA\b/, 'United States'],
];

// Locations that are clearly fake/meme
const FAKE_LOCATIONS = [
  'web3', 'web 3', 'the internet', 'internet', 'metaverse', 'worldwide',
  'global', 'everywhere', 'nowhere', 'earth', 'planet earth', 'somewhere',
  'somewhere on earth', 'the world', 'mars', 'moon', 'the moon',
  'heaven', 'hell', 'space', 'outer space', 'the void', 'void',
  'alone', 'home', 'my house', 'your mom', 'your moms house',
  'mog', 'trenches', 'the trenches', 'ethland', 'solana',
  'onchain', 'on chain', 'on-chain', 'blockchain', 'the blockchain',
  'decentralized', 'defi', 'based', 'gm', 'wagmi',
  'x.com', 'twitter', 'telegram', 'discord',
  'idk', 'not here', 'here', 'there', 'anywhere', 'wherever',
];

export function normalizeLocation(raw: string): string | null {
  if (!raw || !raw.trim()) return null;

  const cleaned = raw.trim();

  // Check if it's a known fake location
  const lower = cleaned.toLowerCase().replace(/[^\w\s]/g, '').trim();
  if (FAKE_LOCATIONS.some(fake => lower === fake || lower.startsWith(fake + ' ') || lower.endsWith(' ' + fake))) {
    return null;
  }

  // Skip locations that are just emojis or very short
  const withoutEmoji = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '').trim();
  if (withoutEmoji.length < 2) return null;

  // Try to match against known locations
  for (const [pattern, country] of LOCATION_MAP) {
    if (pattern.test(cleaned)) {
      return country;
    }
  }

  // Not fake and not mapped - return the original cleaned string
  return cleaned;
}

/**
 * Normalize an array of location counts, mapping raw locations to countries
 * and aggregating duplicates.
 */
export function normalizeLocationCounts(
  rawLocations: { location: string; count: number }[]
): { location: string; count: number }[] {
  const countryMap = new Map<string, number>();

  for (const { location, count } of rawLocations) {
    const normalized = normalizeLocation(location);
    if (normalized) {
      countryMap.set(normalized, (countryMap.get(normalized) || 0) + count);
    }
  }

  return Array.from(countryMap.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count);
}
