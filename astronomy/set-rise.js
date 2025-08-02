class RiseSetCalculator {
    constructor(observerLat, observerLon) {
        /**
         * @param {number} observerLat - Breitengrad des Beobachters in Grad
         * @param {number} observerLon - Längengrad des Beobachters in Grad (Ost positiv)
         */
        this.observerLat = this.toRadians(observerLat);
        this.observerLon = this.toRadians(observerLon);
    }

    toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    toDegrees(radians) {
        return radians * 180 / Math.PI;
    }

    /**
     * Umwandlung von RA/Dec zu Azimut/Elevation
     * @param {number} ra - Rektaszension in Radians
     * @param {number} dec - Deklination in Radians  
     * @param {number} lst - Local Sidereal Time in Radians
     * @returns {object} {azimuth, altitude} in Radians
     */
    equatorialToHorizontal(ra, dec, lst) {
        const ha = lst - ra; // Stundenwinkel

        const sinAlt = Math.sin(dec) * Math.sin(this.observerLat) + 
                       Math.cos(dec) * Math.cos(this.observerLat) * Math.cos(ha);
        const altitude = Math.asin(sinAlt);

        let cosAz = (Math.sin(dec) - Math.sin(altitude) * Math.sin(this.observerLat)) / 
                    (Math.cos(altitude) * Math.cos(this.observerLat));
        cosAz = Math.max(-1, Math.min(1, cosAz)); // Clamp für numerische Stabilität

        let azimuth = Math.acos(cosAz);
        if (Math.sin(ha) > 0) {
            azimuth = 2 * Math.PI - azimuth;
        }

        return { azimuth, altitude };
    }

    /**
     * Berechnung der Local Sidereal Time
     * @param {number} jd - Julian Date
     * @returns {number} LST in Radians
     */
    calculateLST(jd) {
        const t = (jd - 2451545.0) / 36525.0;
        let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t;
        gmst = gmst % 360;
        const lst = gmst + this.toDegrees(this.observerLon);
        return this.toRadians(lst % 360);
    }

    /**
     * Interpolation zwischen zwei Datenpunkten
     * @param {Array} data - Array der Planetendaten
     * @param {number} targetJD - Ziel Julian Date
     * @returns {object} {ra, dec} in Radians
     */
    interpolateData(data, targetJD) {
        for (let i = 0; i < data.length - 1; i++) {
            if (data[i].jd <= targetJD && targetJD <= data[i + 1].jd) {
                const t = (targetJD - data[i].jd) / (data[i + 1].jd - data[i].jd);

                const ra = this.toRadians(parseFloat(data[i].ra) + t * 
                          (parseFloat(data[i + 1].ra) - parseFloat(data[i].ra)));
                const dec = this.toRadians(parseFloat(data[i].dec) + t * 
                           (parseFloat(data[i + 1].dec) - parseFloat(data[i].dec)));

                return { ra, dec };
            }
        }

        // Fallback: letzter verfügbarer Wert
        const lastData = data[data.length - 1];
        return {
            ra: this.toRadians(parseFloat(lastData.ra)),
            dec: this.toRadians(parseFloat(lastData.dec))
        };
    }

    /**
     * Findet Auf- und Untergangszeiten für einen Tag
     * @param {Array} data - Array der stündlichen Planetendaten
     * @param {number} horizonAltitude - Höhe über Horizont in Grad (default: 0°)
     * @returns {object} {riseTime, setTime} als Date-Objekte oder null
     */
    findRiseSetTimes(data, horizonAltitude = 0.0) {
        const horizonAltRad = this.toRadians(horizonAltitude);

        let riseTime = null;
        let setTime = null;
        let wasAboveHorizon = null;

        // Prüfe alle 15 Minuten für bessere Genauigkeit
        const stepSize = 1 / 96; // 15 Minuten in Tagen
        const startJD = data[0].jd;
        const endJD = data[data.length - 1].jd;

        for (let jd = startJD; jd <= endJD; jd += stepSize) {
            const { ra, dec } = this.interpolateData(data, jd);
            const lst = this.calculateLST(jd);
            const { altitude } = this.equatorialToHorizontal(ra, dec, lst);

            const isAboveHorizon = altitude > horizonAltRad;

            if (wasAboveHorizon !== null) {
                // Aufgang: von unter zu über Horizont
                if (!wasAboveHorizon && isAboveHorizon && !riseTime) {
                    riseTime = this.jdToDate(jd);
                }
                // Untergang: von über zu unter Horizont
                if (wasAboveHorizon && !isAboveHorizon && !setTime) {
                    setTime = this.jdToDate(jd);
                }
            }

            wasAboveHorizon = isAboveHorizon;
        }

        return { riseTime, setTime };
    }

    /**
     * Konvertiert Julian Date zu JavaScript Date
     * @param {number} jd - Julian Date
     * @returns {Date} JavaScript Date Objekt
     */
    jdToDate(jd) {
        return new Date((jd - 2440587.5) * 86400000);
    }
}
export {
    RiseSetCalculator
}