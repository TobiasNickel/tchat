export function parseQueryString(s?: string): { [key: string]: string } {
  const _queryString = s !== undefined ? s : window.location.href.split('?')[1] || '';
  const queryString = _queryString.startsWith('?') ? _queryString.slice(1) : _queryString;

  return queryString.split('&').reduce((acc, pair) => {
    const [key, value] = pair.split('=').map(decodeURIComponent);
    if (key) {
      acc[key] = value || '';
    }
    return acc;
  }, {} as { [key: string]: string });
}