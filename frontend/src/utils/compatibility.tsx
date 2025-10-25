import { useState, useEffect } from 'react';

export interface BrowserInfo {
  name: string;
  version: string;
}

export const useBrowserCompatibility = () => {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);

  const detectBrowser = (): BrowserInfo => {
    const userAgent = navigator.userAgent;
    let name = 'Unknown';
    let version = 'Unknown';

    // Safari detection
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      name = 'Safari';
      const safariVersion = userAgent.match(/Version\/([0-9]+\.[0-9]+)/);
      version = safariVersion ? safariVersion[1]! : 'Unknown';
    }
    // Chrome detection
    else if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
      name = 'Chrome';
      const chromeVersion = userAgent.match(/Chrome\/([0-9]+\.[0-9]+)/);
      version = chromeVersion ? chromeVersion[1]! : 'Unknown';
    }
    // Firefox detection
    else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      const firefoxVersion = userAgent.match(/Firefox\/([0-9]+\.[0-9]+)/);
      version = firefoxVersion ? firefoxVersion[1]! : 'Unknown';
    }
    // Edge detection
    else if (userAgent.includes('Edge')) {
      name = 'Edge';
      const edgeVersion = userAgent.match(/Edge\/([0-9]+\.[0-9]+)/);
      version = edgeVersion ? edgeVersion[1]! : 'Unknown';
    }

    return {
      name,
      version
    };
  };

  useEffect(() => {
    const browser = detectBrowser();
    setBrowserInfo(browser);
  }, []);

  return {
    browserInfo
  };
};
