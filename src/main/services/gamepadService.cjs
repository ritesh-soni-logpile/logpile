const { execFile } = require('child_process');

let cachedResult = null;
let lastCheckTime = 0;
let inFlightPromise = null;
const CACHE_TTL_MS = 30000;

/**
 * Normalizes hardware PnP names into clean, recognizable gamer labels.
 */
function resolveFriendlyGamepadName(devices) {
  if (!Array.isArray(devices) || devices.length === 0) return null;

  // 1. Prioritize Xbox controllers (wired, wireless dongle, or Bluetooth)
  const xbox = devices.find(d => /xbox/i.test(d));
  if (xbox) {
    return xbox
      .replace(/\s*for Windows/i, '')
      .replace(/controller/i, 'Controller')
      .trim();
  }

  // 2. Prioritize PlayStation controllers (DualSense, DualShock 4, etc.)
  const ps = devices.find(d => /dualsense|dualshock|playstation|sony/i.test(d));
  if (ps) {
    if (/dualsense/i.test(ps)) return 'PlayStation DualSense Controller';
    if (/dualshock/i.test(ps)) return 'PlayStation DualShock Controller';
    return 'PlayStation Controller';
  }

  // 3. Prioritize Nintendo Switch Pro Controller
  const nintendo = devices.find(d => /switch|nintendo/i.test(d));
  if (nintendo) return 'Nintendo Switch Pro Controller';

  // 4. Standard HID game controllers / DirectInput
  const generic = devices.find(d => /game controller|gamepad/i.test(d));
  if (generic) return 'Game Controller (HID)';

  return devices[0].replace(/\s*for Windows/i, '').trim();
}

/**
 * 100% Offline Windows PnP Gamepad Query
 * Directly queries local OS hardware via Win32_PnPEntity.
 * Detects plugged-in or paired controllers immediately, bypassing Chromium's
 * W3C privacy requirement that delays navigator.getGamepads() until a button is pressed.
 */
function getConnectedGamepads() {
  const now = Date.now();
  if (cachedResult && (now - lastCheckTime < CACHE_TTL_MS)) {
    return Promise.resolve(cachedResult);
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  if (process.platform !== 'win32') {
    return Promise.resolve({ connected: false, name: null, devices: [] });
  }

  inFlightPromise = new Promise((resolve) => {
    const filter = "Status='OK' AND (PNPClass='XnaComposite' OR PNPClass='XboxComposite' OR PNPClass='Gamepad' OR (PNPClass='HIDClass' AND (Name LIKE '%game controller%' OR Name LIKE '%gamepad%' OR Name LIKE '%Xbox%' OR Name LIKE '%DualSense%' OR Name LIKE '%DualShock%' OR Name LIKE '%Wireless Controller%')))";
    const script = `Get-CimInstance Win32_PnPEntity -Filter "${filter}" | Where-Object { $_.Name -notmatch 'Virtual|Synthetic|Bus|System' } | Select-Object -ExpandProperty Name`;

    execFile('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8', timeout: 3500 }, (err, stdout) => {
      inFlightPromise = null;
      if (err) {
        // In case of error or timeout, fall back to previous cache if available, else empty
        const fallback = cachedResult || { connected: false, name: null, devices: [] };
        return resolve(fallback);
      }

      const lines = (stdout || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const devices = [...new Set(lines)];
      const connected = devices.length > 0;
      const name = resolveFriendlyGamepadName(devices);

      cachedResult = { connected, name, devices };
      lastCheckTime = Date.now();
      resolve(cachedResult);
    });
  });

  return inFlightPromise;
}

module.exports = {
  getConnectedGamepads,
  resolveFriendlyGamepadName,
};
