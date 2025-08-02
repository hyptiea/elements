import mercury from 'https://hyptiea.github.io/elements/data/astronomy/mercury.json?raw';
import venus from 'https://hyptiea.github.io/elements/data/astronomy/venus.json?raw';
import mars from 'https://hyptiea.github.io/elements/data/astronomy/mars.json?raw';
import jupiter from 'https://hyptiea.github.io/elements/data/astronomy/jupiter.json?raw';
import saturn from 'https://hyptiea.github.io/elements/data/astronomy/saturn.json?raw';
import uranus from 'https://hyptiea.github.io/elements/data/astronomy/uranus.json?raw';

class PlanetaryMotionAnalyzer {
  constructor(planetData) {
    this.planets = {
      mercury,
      venus,
      mars,
      jupiter,
      saturn,
      uranus,
      neptune,
      pluto
    };
this.stationThresholds = {
  mercury: 0.15,    // ~1.4°/day average, threshold ~10%
  venus: 0.12,      // ~1.2°/day average
  mars: 0.05,       // ~0.5°/day average
  jupiter: 0.01,    // ~0.08°/day average
  saturn: 0.006,    // ~0.03°/day average
  uranus: 0.003,    // ~0.01°/day average
  neptune: 0.002,   // ~0.006°/day average
  pluto: 0.0015     // ~0.004°/day average - increased threshold
};

// Add smoothing window for outer planets
this.smoothingWindows = {
  mercury: 3,
  venus: 3,
  mars: 5,
  jupiter: 7,
  saturn: 9,
  uranus: 11,
  neptune: 13,
  pluto: 15  // Use 15-day window for smoothing
};

  }

  /**
   * Berechnet die scheinbare tägliche Bewegung in Rektaszension
   */
  calculateDailyMotion(data, index) {
    if (index === 0 || index >= data.length - 1) return null;

    const prev = data[index - 1];
    const current = data[index];
    const next = data[index + 1];

    // RA-Differenz unter Berücksichtigung des 360°-Übergangs
    let raDiff = parseFloat(next.ra) - parseFloat(prev.ra);
    if (raDiff > 180) raDiff -= 360;
    if (raDiff < -180) raDiff += 360;

    // Zeitdifferenz in Tagen
    const timeDiff = next.jd - prev.jd;

    return raDiff / timeDiff;
  }

  /**
   * Berechnet die durchschnittliche tägliche Bewegung eines Planeten
   */
  calculateAverageMotion(planetName) {
    const data = this.planets[planetName];
    if (!data || data.length < 2) return null;

    let totalMotion = 0;
    let count = 0;

    for (let i = 1; i < data.length - 1; i++) {
      const motion = this.calculateDailyMotion(data, i);
      if (motion !== null && motion > 0) { // Nur direkte Bewegung
        totalMotion += Math.abs(motion);
        count++;
      }
    }

    return count > 0 ? totalMotion / count : null;
  }

  /**
   * Holt den Schwellenwert für einen bestimmten Planeten
   */
  getStationThreshold(planetName) {
    // Verwende vordefinierte Werte oder berechne dynamisch
    if (this.stationThresholds[planetName]) {
      return this.stationThresholds[planetName];
    }

    // Fallback: Berechne basierend auf durchschnittlicher Bewegung
    const avgMotion = this.calculateAverageMotion(planetName);
    return avgMotion ? avgMotion * this.thresholdMultiplier : 0.01;
  }


/**
 * Calculates smoothed daily motion to reduce noise
 */
calculateSmoothedMotion(data, index, planetName) {
  const window = this.smoothingWindows[planetName] || 5;
  const halfWindow = Math.floor(window / 2);

  // Ensure we have enough data points
  if (index < halfWindow || index >= data.length - halfWindow) {
    return this.calculateDailyMotion(data, index);
  }

  let totalMotion = 0;
  let count = 0;

  // Calculate average motion over the window
  for (let i = index - halfWindow; i <= index + halfWindow; i++) {
    const motion = this.calculateDailyMotion(data, i);
    if (motion !== null) {
      totalMotion += motion;
      count++;
    }
  }

  return count > 0 ? totalMotion / count : null;
}

/**
 * Enhanced planet motion analysis with better station detection
 */
analyzePlanetMotion(planetName) {
  const data = this.planets[planetName];
  if (!data) {
    throw new Error(`Planet ${planetName} nicht gefunden`);
  }

  const threshold = this.getStationThreshold(planetName);
  const events = [];
  let currentMotion = 'unknown';
  let stationaryPeriod = [];

  // Minimum consecutive days for valid station
  const minStationDays = {
    mercury: 2,
    venus: 3,
    mars: 4,
    jupiter: 7,
    saturn: 10,
    uranus: 12,
    neptune: 14,
    pluto: 20  // Require 20 days for Pluto station
  };

  for (let i = 1; i < data.length - 1; i++) {
    // Use smoothed motion for outer planets
    const dailyMotion = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].includes(planetName)
      ? this.calculateSmoothedMotion(data, i, planetName)
      : this.calculateDailyMotion(data, i);

    if (dailyMotion === null) continue;

    let newMotion;

    // Determine motion type
    if (Math.abs(dailyMotion) < threshold) {
      newMotion = 'stationary';
      stationaryPeriod.push({ index: i, motion: dailyMotion });
    } else {
      // Check if we had a valid stationary period
      if (stationaryPeriod.length >= (minStationDays[planetName] || 3)) {
        // Find the midpoint of the stationary period
        const midIndex = stationaryPeriod[Math.floor(stationaryPeriod.length / 2)].index;

        // Determine station type based on motion before and after
        const motionBefore = this.calculateDailyMotion(data, stationaryPeriod[0].index - 2);
        const motionAfter = dailyMotion;

        let eventType;
        if (motionBefore > threshold && motionAfter < -threshold) {
          eventType = 'Station Rückläufig';
        } else if (motionBefore < -threshold && motionAfter > threshold) {
          eventType = 'Station Direktläufig';
        }

        if (eventType) {
          events.push({
            date: data[midIndex].isoDateTime,
            jd: data[midIndex].jd,
            type: eventType,
            ra: data[midIndex].ra,
            dec: data[midIndex].dec,
            dailyMotion: stationaryPeriod[Math.floor(stationaryPeriod.length / 2)].motion.toFixed(4),
            threshold: threshold.toFixed(4),
            stationDuration: stationaryPeriod.length
          });
        }
      }

      stationaryPeriod = [];
      newMotion = dailyMotion > 0 ? 'direct' : 'retrograde';
    }

    currentMotion = newMotion;
  }

  return events;
}

  /**
   * Analysiert alle Planeten und gibt eine Übersicht
   */
  analyzeAllPlanets() {
    const results = {};

    for (const planetName in this.planets) {
      try {
        const events = this.analyzePlanetMotion(planetName);
        results[planetName] = {
          events,
          summary: this.createSummary(events),
          threshold: this.getStationThreshold(planetName)
        };
      } catch (error) {
        results[planetName] = {
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Erstellt eine Zusammenfassung der Ereignisse
   */
  createSummary(events) {
    const summary = {
      stationsBeforeRetrograde: [],
      retrogradeBegins: [],
      stationsBeforeDirect: [],
      directBegins: [],
      totalRetrogradePeriods: 0
    };

    events.forEach(event => {
      switch (event.type) {
        case 'Station vor Rückläufigkeit':
          summary.stationsBeforeRetrograde.push(event.date);
          break;
        case 'Beginn Rückläufigkeit':
          summary.retrogradeBegins.push(event.date);
          summary.totalRetrogradePeriods++;
          break;
        case 'Station vor Direktläufigkeit':
          summary.stationsBeforeDirect.push(event.date);
          break;
        case 'Beginn Direktläufigkeit':
          summary.directBegins.push(event.date);
          break;
      }
    });

    return summary;
  }
}

export default PlanetaryMotionAnalyzer
