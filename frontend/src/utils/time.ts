// we got a time string like a Date was JSON stringified: i.e.: "2024-07-05T11:00:59.410Z"
// this function convert it to a human readable "time ago" string
export function timeAgo(time: string) {
  if (!time) return 'never';
  const date = getLocalDate(time);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60 && seconds >= 1) {
    return `${seconds} seconds ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60 && minutes >= 1) {
    return `${minutes} minutes ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24 && hours >= 1) {
    return `${hours} hours ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 365 && days >= 1) {
    return `${days} days ago`;
  }
  const years = Math.floor(days / 365);
  if (years >= 1) {
    return `${years} years ago`;
  }
  return 'Just now';
}

export function getLocalDate(time: string){
  const parsedDate = new Date(time)
  return dateAddMinutes(parsedDate, -parsedDate.getTimezoneOffset())
}

export function formatTime(time: string){
  return dateFormatter(time, 'MM-DD-YYYY HH:mm:ss');
}

// Time string like a Date was JSON stringified: i.e.: "2024-07-05T11:00:59.410Z"
//this function will convert to DD-MM-YYYY
export function dateFormatter(time: string, format?: string) {
  if (!time) return '';
  const date = getLocalDate(time);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' });

  if (format === "MM-DD-YYYY") {
    return `${month}-${day}-${year}`;
  } else if (format) {
    return format
      .replace('YYYY', year.toString())
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds)
      .replace('dddd', dayOfWeek);
  }

  return `${day}-${month}-${year}`;
}

function dateAddMinutes(date: Date, minutes: number): Date {
  const newDate = new Date(date);
  newDate.setMinutes(newDate.getMinutes() + minutes);
  return newDate;
}
