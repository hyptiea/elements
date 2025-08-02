const MAJOR_ASPECTS = {
  Konjunktion: { 
    angle: 0, 
    orb: { default: 5, sun: 5, moon: 5, outer: 5 },
    symbol: '☌',
  },
  Opposition: { 
    angle: 180, 
    orb: { default: 10, sun: 10, moon: 10, outer: 10 },
    symbol: '☍'
  }
};

// Hilfsfunktionen für astronomische Berechnungen
class AstronomicalCalculations {
  // Berechnung der Obliquity (Schiefe der Ekliptik)
  static calculateObliquity(jd) {
    // T = Jahrhunderte seit J2000.0
    const T = (jd - 2451545.0) / 36525.0;

    // IAU 2006 Formel
    const obliquity = 23.439291111111 
      - 0.0130041666667 * T 
      - 0.00000016388889 * T * T 
      + 0.0000005036111 * T * T * T;

    return obliquity;
  }

  // Konvertierung von RA/Dec zu ekliptikaler Länge und Breite
  static raDecToEcliptic(ra, dec, jd) {
    const obliquity = this.calculateObliquity(jd);

    // Umrechnung in Radiant
    const raRad = (parseFloat(ra) * Math.PI) / 180;
    const decRad = (parseFloat(dec) * Math.PI) / 180;
    const oblRad = (obliquity * Math.PI) / 180;

    // Berechnung der ekliptikalen Koordinaten
    const sinRA = Math.sin(raRad);
    const cosRA = Math.cos(raRad);
    const sinDec = Math.sin(decRad);
    const cosDec = Math.cos(decRad);
    const sinObl = Math.sin(oblRad);
    const cosObl = Math.cos(oblRad);

    // Ekliptikale Länge
    const x = cosRA * cosDec;
    const y = sinRA * cosDec * cosObl + sinDec * sinObl;
    let longitude = Math.atan2(y, x) * 180 / Math.PI;

    // Normalisierung auf 0-360°
    if (longitude < 0) longitude += 360;

    // Ekliptikale Breite
    const z = sinRA * cosDec * sinObl - sinDec * cosObl;
    const latitude = Math.asin(z) * 180 / Math.PI;

    return { longitude, latitude };
  }

  // Berechnung des Winkelabstands zwischen zwei Längen
  static calculateAngularDistance(long1, long2) {
    let diff = Math.abs(long1 - long2);
    if (diff > 180) diff = 360 - diff;
    return diff;
  }

  // Interpolation zwischen zwei Datenpunkten
  static interpolatePosition(data, targetTime) {
    const targetJD = this.dateToJulianDay(new Date(targetTime));

    // Finde die zwei nächsten Datenpunkte
    let before = null;
    let after = null;

    for (let i = 0; i < data.length - 1; i++) {
      if (data[i].jd <= targetJD && data[i + 1].jd > targetJD) {
        before = data[i];
        after = data[i + 1];
        break;
      }
    }

    if (!before || !after) {
      // Fallback: nächster verfügbarer Punkt
      return data.reduce((prev, curr) => 
        Math.abs(curr.jd - targetJD) < Math.abs(prev.jd - targetJD) ? curr : prev
      );
    }

    // Lineare Interpolation
    const fraction = (targetJD - before.jd) / (after.jd - before.jd);

    return {
      jd: targetJD,
      ra: parseFloat(before.ra) + fraction * (parseFloat(after.ra) - parseFloat(before.ra)),
      dec: parseFloat(before.dec) + fraction * (parseFloat(after.dec) - parseFloat(before.dec)),
      isoDateTime: targetTime
    };
  }

  // Julian Day Berechnung
  static dateToJulianDay(date) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();

    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;

    let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + 
             Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

    jd += (hour - 12) / 24 + minute / 1440 + second / 86400;

    return jd;
  }
}

// Hauptklasse für Aspekt-Berechnungen
class AspectCalculator {
planetData = {}

constructor() {
    this.planetData = {};

    // Feste Reihenfolge der Planeten (astrologisch sinnvoll)
    this.planetOrder = [
      'Sonne', 'Mond', 'Merkur', 'Venus', 'Mars', 
      'Jupiter', 'Saturn', 'Uranus', 'Neptun', 'Pluto'
    ];

    this.planetSymbols = {
      Sonne: '☉\uFE0E', Mond: '☽\uFE0E', Merkur: '☿\uFE0E', Venus: '♀\uFE0E', Mars: '♂\uFE0E',
      Jupiter: '♃\uFE0E', Saturn: '♄\uFE0E'
    };

    this.outerPlanets = ['Jupiter', 'Saturn', 'Uranus', 'Neptun', 'Pluto'];
  }

 calculateAspectsForDate(isoDateTime) {
    const aspects = [];

    // Verwende die feste Reihenfolge statt Object.keys()
    const availablePlanets = this.planetOrder.filter(planet => 
      this.planetData[planet] && this.planetData[planet].length > 0
    );

    const positions = this.getAllPlanetPositions(isoDateTime);

    // Alle Planetenkombinationen durchgehen
    for (let i = 0; i < availablePlanets.length; i++) {
      for (let j = i + 1; j < availablePlanets.length; j++) {
        const planet1 = availablePlanets[i];
        const planet2 = availablePlanets[j];

        if (!positions[planet1] || !positions[planet2]) continue;

        const aspect = this.calculateAspectBetween(
          planet1, positions[planet1],
          planet2, positions[planet2]
        );

        if (aspect) {
          aspects.push(aspect);
        }
      }
    }

    // Sortierung nach Exaktheit (kleinster Orb zuerst)
    return aspects.sort((a, b) => a.orb - b.orb);
  }


  // Berechnung aller Planetenpositionen für einen Zeitpunkt
  getAllPlanetPositions(isoDateTime) {
    const positions = {};

    for (const [planet, data] of Object.entries(this.planetData)) {
      const position = AstronomicalCalculations.interpolatePosition(data, isoDateTime);
      if (position) {
        const ecliptic = AstronomicalCalculations.raDecToEcliptic(
          position.ra, 
          position.dec, 
          position.jd
        );
        positions[planet] = {
          ...position,
          ecliptic
        };
      }
    }

    return positions;
  }

  // Berechnung eines Aspekts zwischen zwei Planeten
  calculateAspectBetween(planet1Name, pos1, planet2Name, pos2) {
    const long1 = pos1.ecliptic.longitude;
    const long2 = pos2.ecliptic.longitude;

    const angularDistance = AstronomicalCalculations.calculateAngularDistance(long1, long2);

    // Prüfe alle möglichen Aspekte
    for (const [aspectName, config] of Object.entries(MAJOR_ASPECTS)) {
      const orb = this.getOrbForAspect(planet1Name, planet2Name, config);
      const deviation = Math.abs(angularDistance - config.angle);

      if (deviation <= orb) {
        return {
          planet1: planet1Name,
          planet2: planet2Name,
          planet1Symbol: this.planetSymbols[planet1Name],
          planet2Symbol: this.planetSymbols[planet2Name],
          aspect: aspectName,
          aspectSymbol: config.symbol,
          angle: config.angle,
          actualAngle: angularDistance,
          orb: deviation,
          orbPercent: (deviation / orb * 100).toFixed(1),
          exact: deviation < 0.1
        };
      }
    }

    return null;
  }

  // Bestimmung des Orbs basierend auf den beteiligten Planeten
  getOrbForAspect(planet1, planet2, aspectConfig) {
    const orbs = aspectConfig.orb;

    // Sonne oder Mond beteiligt
    if (planet1 === 'Sonne' || planet2 === 'Sonne') return orbs.sun || orbs.default;
    if (planet1 === 'Mond' || planet2 === 'Mond') return orbs.moon || orbs.default;

    // Beide sind äußere Planeten
    if (this.outerPlanets.includes(planet1) && this.outerPlanets.includes(planet2)) {
      return orbs.outer || orbs.default;
    }

    return orbs.default;
  }



}

// Export und Verwendung
export default AspectCalculator;

