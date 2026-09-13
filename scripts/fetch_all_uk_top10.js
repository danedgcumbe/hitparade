import fs from 'fs';

function cleanWikiText(str) {
  if (!str) return '';
  return str
    .replace(/\{\{ref label[^\}]*\}\}/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<small>[\s\S]*?<\/small>/gi, '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\{\{dts[^\}]*\}\}/gi, '')
    .replace(/\{\{[^\}]*\}\}/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[\"\'‡♦#]/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&ndash;|&mdash;/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function getEraForYear(year) {
  if (year < 1970) return '50s-60s';
  if (year < 1990) return '70s-80s';
  if (year < 2010) return '90s-00s';
  if (year < 2020) return '2010s';
  return '2020s';
}

async function fetchYear(year, retry = 3) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=List_of_UK_top-ten_singles_in_${year}&prop=wikitext&format=json`;
  for (let attempt = 1; attempt <= retry; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'HitParadeOfficialUKTop10Scraper/1.0 (music.quiz@hitparade.org)'
        }
      });
      const data = await res.json();
      const text = data.parse?.wikitext?.['*'] || '';
      if (!text) return [];

      const tables = text.match(/\{\| class=\"wikitable[^\"]*\"[\s\S]*?\n\|\}/g) || [];
      // Main singles table is the one with Single/Artist and weeks/peak
      let mainTable = tables.find(t => 
        (t.toLowerCase().includes('! single') || t.toLowerCase().includes('!single') || t.toLowerCase().includes('! scope="col" | single')) &&
        (t.toLowerCase().includes('artist') || t.toLowerCase().includes('peak'))
      );
      if (!mainTable && tables.length > 1) {
        mainTable = tables[1];
      }
      if (!mainTable && tables.length > 0) {
        mainTable = tables[0];
      }
      if (!mainTable) return [];

      const rows = mainTable.split(/\n\|-/);
      const yearTracks = [];

      for (const row of rows) {
        if (row.includes('! colspan') || row.includes('! Entered') || row.toLowerCase().includes('!single') || row.includes('! scope="col"')) continue;
        const cells = row.split(/\n\|/);
        if (cells.length < 4) continue;

        let singleCell = '', artistCell = '', peakCell = '';

        for (let c of cells) {
          c = c.trim();
          if (!c) continue;
          const cleanCell = c.replace(/^[^|]*\|/, '').trim();
          if ((c.includes('[[') || c.includes('"')) && !singleCell && !c.match(/^\d{1,2}$/) && !c.includes('{{dts')) {
            singleCell = cleanCell;
          } else if (singleCell && !artistCell && (c.includes('[[') || cleanCell.length > 1) && !cleanCell.match(/^\d{1,2}$/)) {
            artistCell = cleanCell;
          } else if (c.match(/\|?\s*(\d{1,2})\s*$/) && !peakCell && singleCell) {
            const m = c.match(/(\d{1,2})\s*$/);
            if (m && parseInt(m[1]) >= 1 && parseInt(m[1]) <= 10) {
              peakCell = m[1];
            }
          }
        }

        const title = cleanWikiText(singleCell);
        const artist = cleanWikiText(artistCell);
        const peakNum = peakCell ? parseInt(peakCell) : 1;

        if (title && artist && title.length > 1 && artist.length > 1 && !title.toLowerCase().includes('singles in') && !artist.toLowerCase().includes('singles in')) {
          yearTracks.push({
            title,
            artist,
            ukPeak: `#${peakNum} (${year})`,
            peak: peakNum,
            year,
            era: getEraForYear(year),
            appleMusicQuery: `${artist} ${title}`
          });
        }
      }
      return yearTracks;
    } catch (e) {
      if (attempt === retry) {
        console.warn(`Year ${year} failed after ${retry} attempts:`, e.message);
        return [];
      }
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  return [];
}

async function fetchAll() {
  console.log('Starting full UK Top 10 Wikipedia Catalog extraction (1952-2024)...');
  const allTracks = [];
  const years = [];
  for (let y = 1952; y <= 2024; y++) {
    years.push(y);
  }

  for (let i = 0; i < years.length; i++) {
    const yr = years[i];
    const tracks = await fetchYear(yr);
    console.log(`[${i + 1}/${years.length}] Year ${yr}: ${tracks.length} Top 10 singles extracted.`);
    allTracks.push(...tracks);
    // 250ms delay between years to respect Wikipedia rate limits
    await new Promise(r => setTimeout(r, 250));
  }

  // Deduplicate tracks by normalized artist & title
  const uniqueMap = new Map();
  for (const t of allTracks) {
    const key = `${t.artist.toLowerCase()} - ${t.title.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, {
        id: `uk-top10-${t.year}-${uniqueMap.size + 1}`,
        ...t
      });
    }
  }

  const uniqueTracks = Array.from(uniqueMap.values());
  const allArtists = Array.from(new Set(uniqueTracks.map(t => t.artist))).sort((a, b) => a.localeCompare(b));

  console.log(`\n========================================`);
  console.log(`Total Top 10 Singles Extracted: ${allTracks.length}`);
  console.log(`Total Unique Top 10 Singles: ${uniqueTracks.length}`);
  console.log(`Total Unique Top 10 Artists: ${allArtists.length}`);

  const countsByEra = {};
  uniqueTracks.forEach(t => {
    countsByEra[t.era] = (countsByEra[t.era] || 0) + 1;
  });
  console.log('Breakdown by Era:', countsByEra);
  console.log(`========================================\n`);

  fs.mkdirSync('./src/data', { recursive: true });

  fs.writeFileSync('./src/data/ukTop10Singles.json', JSON.stringify(uniqueTracks, null, 2));
  fs.writeFileSync('./src/data/ukTop10Artists.json', JSON.stringify(allArtists, null, 2));

  console.log('Wrote comprehensive catalog to src/data/ukTop10Singles.json & src/data/ukTop10Artists.json');
}

fetchAll();
