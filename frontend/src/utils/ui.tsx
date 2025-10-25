export const generateColor = (
  type: 'lowContrast' | 'midContrast' | 'highContrast',
  basedOnText?: string,
  opacity?: number
): string => {
  let hue: number;

  if (basedOnText && basedOnText.length > 0) {
    // const char = basedOnText[0].toLowerCase();
    // if (char >= 'a' && char <= 'z') {
    //   hue = Math.floor(((char.charCodeAt(0) - 97) / 26) * 360);
    // } else {
    //   hue = (char.charCodeAt(0) * 10) % 360;
    // }


    const firstChar = basedOnText?.[0]?.toLowerCase() ?? '';
    const lastChar = basedOnText?.[basedOnText.length - 1]?.toLowerCase() ?? '';
    const textLength = basedOnText?.length ?? 0;
    const firstCharHue = firstChar ? ((firstChar.charCodeAt(0) - 97) / 26) * 120 : 0;
    const lastCharHue = lastChar ? ((lastChar.charCodeAt(0) - 97) / 26) * 120 : 0;
    const lengthModifier = (textLength % 10) * 12;

    hue = (firstCharHue + lastCharHue + lengthModifier) % 360;
  } else {
    hue = Math.floor(Math.random() * 360);
  }

  let saturation: string;
  let lightness: string;

  switch (type) {
    case 'lowContrast':
      saturation = '30%';
      lightness = '85%';
      break;
    case 'midContrast':
      saturation = '40%';
      lightness = '60%';
      break;
    case 'highContrast':
      saturation = '70%';
      lightness = '50%';
      break;
  }

  if (typeof opacity === 'number') {

    const clampedOpacity = Math.max(0, Math.min(1, opacity));
    return `hsla(${hue}, ${saturation}, ${lightness}, ${clampedOpacity})`;
  }

  return `hsl(${hue}, ${saturation}, ${lightness})`;
};
