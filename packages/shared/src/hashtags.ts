const HASHTAG_REGEX = /#(\w+)/g;

export function extractHashtags(text: string): string[] {
  const matches = text.match(HASHTAG_REGEX);
  if (!matches) return [];
  return [...new Set(matches.map((t) => t.toLowerCase()))];
}

export function getHashtagCounts(
  prayers: Array<{ text: string }>
): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const p of prayers) {
    for (const tag of extractHashtags(p.text)) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function addHashtagsToMockData(text: string): string {
  const prayerHashtags: Record<string, string[]> = {
    cancer: ['#healing', '#cancer'],
    chemo: ['#healing', '#cancer'],
    surgery: ['#healing', '#surgery'],
    migraine: ['#healing', '#chronic'],
    anxiety: ['#mentalhealth', '#peace'],
    panic: ['#mentalhealth', '#peace'],
    depression: ['#mentalhealth'],
    marriage: ['#marriage', '#family'],
    divorce: ['#family', '#healing'],
    pregnant: ['#family', '#pregnancy'],
    infertility: ['#family', '#healing'],
    lost: ['#grief', '#comfort'],
    layoff: ['#provision', '#career'],
    unemployed: ['#provision', '#career'],
    job: ['#career', '#provision'],
    burned: ['#rest', '#career'],
    move: ['#guidance', '#faith'],
    wisdom: ['#guidance', '#faith'],
    anxiety_peace: ['#peace', '#mentalhealth'],
    lonely: ['#community', '#comfort'],
    church: ['#church', '#community'],
    persecuted: ['#persecution', '#faith'],
    baptism: ['#faith', '#testimony'],
    fast: ['#faith'],
    prodigal: ['#family', '#hope'],
  };

  const lower = text.toLowerCase();
  const tags = new Set<string>();
  for (const [keyword, hashtags] of Object.entries(prayerHashtags)) {
    if (lower.includes(keyword)) {
      hashtags.forEach((t) => tags.add(t));
    }
  }
  if (tags.size === 0) return text;

  // Add hashtags at the end
  return text + '\n\n' + [...tags].join(' ');
}
