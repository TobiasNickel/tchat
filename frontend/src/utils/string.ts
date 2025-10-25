export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9-\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function slugifyChecker(s: string): string {
  return s.toLocaleUpperCase().replace(/[^a-zA-Z0-9-\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
