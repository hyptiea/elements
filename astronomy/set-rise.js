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
function calculateRiseSetTimes(ra, dec, latitude, date, longitude) {
    // Hour angle in radians
    const H_rad = calcHourAngle(dec, latitude);
    if (H_rad === null) {
        return { rise: 'circumpolar or never visible', set: 'circumpolar or never visible' };
    }

    // Convert hour angle from radians to hours
    const H_hours = H_rad * 180 / Math.PI / 15;

    // Calculate transit time (when object crosses meridian)
    const transitTime = calculateTransitTime(ra, date, longitude);

    // Rise and set times (in UTC)
    const riseTime = new Date(transitTime.getTime() - H_hours * 3600000);
    const setTime = new Date(transitTime.getTime() + H_hours * 3600000);

    return { 
        rise: riseTime, 
        set: setTime,
        transit: transitTime 
    };
}


function calculateTransitTime(ra, date, longitude) {
    // Calculate JD for 0h UT of the given date
    const utcDate = new Date(date);
    utcDate.setUTCHours(0, 0, 0, 0);

    const year = utcDate.getUTCFullYear();
    const month = utcDate.getUTCMonth() + 1;
    const day = utcDate.getUTCDate();
    const JD0 = calculateJulianDate(year, month, day);

    // Calculate GMST at 0h UT (in hours)
    const GMST0 = calculateGMST(JD0);

    // *** FIX: Convert RA from degrees to hours before calculation ***
    const ra_hours = ra / 15;

    // Calculate when LST = RA to find transit time in UT
    // The formula is UT = (RA - GMST0 - Longitude) corrected for sidereal time
    let transitUT = (ra_hours - GMST0 - longitude / 15) / 1.002737909;

    // Normalize to 0-24 hours
    while (transitUT < 0) transitUT += 24;
    while (transitUT >= 24) transitUT -= 24;

    // Create transit time in UTC
    const transitTime = new Date(utcDate);
    // Use setUTCHours with fractional hours for better precision before converting
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



function calcHourAngle(dec, latitude, objectType = 'planet') {
    // Different refraction corrections
    const refractionCorrections = {
        'sun': -0.833,      // Standard solar refraction
        'moon': -0.7,       // Moon's varying size
        'planet': -0.567,   // Point source
        'star': -0.567      // Point source
    };

    const h0 = toRadians(refractionCorrections[objectType] || -0.567);
    const decRad = toRadians(dec);
    const latRad = toRadians(latitude);

    const cosH = (Math.sin(h0) - Math.sin(decRad) * Math.sin(latRad))
        / (Math.cos(decRad) * Math.cos(latRad));

    if (Math.abs(cosH) > 1) {
        return null;
    }

    return Math.acos(cosH);
}


export {
    calculateRiseSetTimes,
    calculateJulianDate,
    calculateGMST,
    calcHourAngle,
    lstToLocalTime,
    toRadians
}
