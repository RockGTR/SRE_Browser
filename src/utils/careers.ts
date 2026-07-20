export function careersSearchUrl(employerName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${employerName} careers jobs`)}`;
}
