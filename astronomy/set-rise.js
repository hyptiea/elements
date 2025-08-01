function toRadians(angle) {
    return angle * Math.PI / 180;
}

function calculateJulianDate(year, month, day) {
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;

    let JD = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4)
        - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

    return JD;
}
function calculateRiseSetTimes(ra, dec, latitude, date, longitude = 7.5) { // Korrigierter Standardwert
    // Hour angle in radians
    const H_rad = calcHourAngle(dec, latitude);
    if (H_rad === null) {
        return { rise: 'circumpolar or never visible', set: 'circumpolar or never visible' };
    }

    // Convert hour angle from radians to hours
    const H_hours = H_rad * 180 / Math.PI / 15;

    // Calculate transit time (when object crosses meridian)
    const transitTime = calculateTransitTime(ra, date, longitude);

    // Rise and set times
    const riseTime = new Date(transitTime.getTime() - H_hours * 3600000); // H hours before transit
    const setTime = new Date(transitTime.getTime() + H_hours * 3600000);  // H hours after transit

    return { rise: riseTime, set: setTime };
}

function calculateTransitTime(ra, date, longitude) {
    // Calculate JD for noon of the given date
    const noon = new Date(date);
    noon.setHours(12, 0, 0, 0);

    const year = noon.getFullYear();
    const month = noon.getMonth() + 1;
    const day = noon.getDate();
    const JD = calculateJulianDate(year, month, day) + 0.5; // JD at noon

    // Calculate GMST at 0h UT
    const JD0 = Math.floor(JD - 0.5) + 0.5;
    const GMST0 = calculateGMST(JD0);

    // Calculate when LST = RA (transit time)
    let transitLST = ra;

    // Convert LST to UT
    let transitUT = (transitLST - GMST0 - longitude / 15) * 0.9972695663;

    // Normalize to 0-24
    while (transitUT < 0) transitUT += 24;
    while (transitUT >= 24) transitUT -= 24;

    // Create transit time
    const transitTime = new Date(date);
    transitTime.setUTCHours(0, 0, 0, 0);
    transitTime.setTime(transitTime.getTime() + transitUT * 3600000);

    return transitTime;
}

function calculateGMST(julianDate) {
    const T = (julianDate - 2451545.0) / 36525.0;
    let GMST = 280.46061837 + 360.98564736629 * (julianDate - 2451545.0) + 
               0.000387933 * T * T - T * T * T / 38710000.0;

    GMST = GMST % 360;
    if (GMST < 0) GMST += 360;

    return GMST / 15; // Convert to hours
}


function lstToLocalTime(lst, date, longitude = 0, gmst0) {
    // Calculate the difference between LST and GMST
    const lstGmstDiff = lst - gmst0;

    // Convert to UTC hours
    let utcHours = lstGmstDiff - longitude / 15;

    // Normalize to 0-24 range
    while (utcHours < 0) utcHours += 24;
    while (utcHours >= 24) utcHours -= 24;

    // Create new date object for the result
    const result = new Date(date);
    result.setUTCHours(Math.floor(utcHours));
    result.setUTCMinutes(Math.floor((utcHours % 1) * 60));
    result.setUTCSeconds(0);
    result.setUTCMilliseconds(0);

    return result;
}



function calcHourAngle(dec, latitude) {
    const h0 = toRadians(-0.833); // Standard refraction at horizon
    const decRad = toRadians(dec);
    const latRad = toRadians(latitude);

    const cosH = (Math.sin(h0) - Math.sin(decRad) * Math.sin(latRad))
        / (Math.cos(decRad) * Math.cos(latRad));

    if (Math.abs(cosH) > 1) {
        return null; // Object is circumpolar or never visible
    }

    const H = Math.acos(cosH);
    return H;
}

export {
    calculateRiseSetTimes,
    calculateJulianDate,
    calculateGMST,
    calcHourAngle,
    lstToLocalTime,
    toRadians
}
