export const getInitials = (fullName: string): string => {
  if (!fullName || !fullName.trim()) return '-';

  const names = fullName.trim().split(' ').filter(name => name.length > 0);

  if (names.length === 0) return '-';
  if (names.length === 1) {
    const first = names[0] ?? '';
    return `${first.charAt(0)}${first.charAt(first.length - 1)}`.toUpperCase();
  } else {
    const first = names[0] ?? '';
    const second = names[1] ?? '';
    return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
  }
};
