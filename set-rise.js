import { RiseSetCalculator } from 'https://hyptiea.github.io/elements/astronomy/set-rise.js';

class PlanetRiseSetViewer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.calculator = null;
        this.planetData = null;

        this.observerLat = 47.2;
        this.observerLon = 7.5;
    }

    static get observedAttributes() {
        return ['latitude', 'longitude', 'location-name'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'latitude') this.observerLat = parseFloat(newValue);
        if (name === 'longitude') this.observerLon = parseFloat(newValue);
        if (this.calculator) {
            this.calculator = new RiseSetCalculator(this.observerLat, this.observerLon);
            this.updateDisplay();
        }
    }

    connectedCallback() {
        this.render();
        this.calculator = new RiseSetCalculator(this.observerLat, this.observerLon);
        this.loadPlanetData();
    }

    render() {
        const locationName = this.getAttribute('location-name') || 'Zürich';

        this.shadowRoot.innerHTML = `
            <style>
                .loading {
                    padding: 40px;
                }

                .error {
                    padding: 15px;
                    border-radius: 4px;
                    margin: 20px 0;
                    border-left: 3px solid #ccc;
                }

                .planet-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                    border-radius: 4px;
                    overflow: hidden;
                }

                .planet-row {
                    padding: 12px 0;
                    display: grid;
                    grid-template-columns: 1fr 80px 80px 120px;
                    gap: 8px;
                }

                .time-value {
                    text-align: center;
                }

                .status {
                    text-align: center;
                    padding: 0;
                    border-radius: 12px;
                }

                .status.visible {
                    background: #e8f5e8;
                    color: #2e7d32;
                }

                .status.hidden {
                    background: #f5f5f5;
                    color: #757575;
                }

                .header-row {
                    font-weight: bold;
                                  }

                @media (max-width: 600px) {
                    .planet-row {
                        grid-template-columns: 1fr 70px 70px 90px;
                        gap: 10px;
                        padding: 12px 15px;
                    }
                }

        
        
            </style>

            <div class="header">
                <div class="subtitle">
                    ${locationName} • ${new Date().toLocaleDateString('de-DE')}
                </div>
            </div>

            <div id="content">
                <div class="loading">Lade Planetendaten...</div>
            </div>
        `;
    }

    async loadPlanetData() {
        const planets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'sun', 'moon'];
        this.planetData = {};

        try {
            const promises = planets.map(async (planet) => {
                try {
                    const response = await fetch(`https://hyptiea.github.io/elements/data/astronomy/${planet}.json`);
                    if (response.ok) {
                        const data = await response.json();
                        this.planetData[planet] = data;
                    } else {
                        console.warn(`Daten für ${planet} nicht verfügbar (${response.status})`);
                    }
                } catch (error) {
                    console.warn(`Fehler beim Laden von ${planet}:`, error);
                }
            });

            await Promise.all(promises);

            if (Object.keys(this.planetData).length === 0) {
                throw new Error('Keine Planetendaten verfügbar');
            }

            this.updateDisplay();

        } catch (error) {
            console.error('Fehler beim Laden der Planetendaten:', error);
            this.showError('Fehler beim Laden der Planetendaten.');
        }
    }

    updateDisplay() {
        if (!this.planetData || !this.calculator) return;

        const content = this.shadowRoot.getElementById('content');
        const today = new Date();

        const planetNames = {
            mercury: 'Merkur',
            venus: 'Venus',
            mars: 'Mars',
            jupiter: 'Jupiter',
            saturn: 'Saturn',
            sun: 'Sonne',
            moon: 'Mond'
        };

        // Planeten-Reihenfolge für Anzeige
        const planetOrder = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

        let html = `
            <div class="planet-list">
                <div class="planet-row header-row">
                    <div class="planet-name">Planet</div>
                    <div class="time-value">Aufgang</div>
                    <div class="time-value">Untergang</div>
                    <div class="status">Status</div>
                </div>
        `;

        for (const planetKey of planetOrder) {
            const data = this.planetData[planetKey];
            if (!Array.isArray(data) || data.length === 0) continue;

            const name = planetNames[planetKey] || planetKey.charAt(0).toUpperCase() + planetKey.slice(1);
            const todayData = this.filterTodayData(data, today);

            if (todayData.length === 0) continue;

            const { riseTime, setTime } = this.calculator.findRiseSetTimes(todayData);
            const status = this.getCurrentStatus(todayData);

            html += `
                <div class="planet-row">
                    <div class="planet-name">${name}</div>
                    <div class="time-value ${!riseTime ? 'none' : ''}">
                        ${riseTime ? riseTime.toLocaleTimeString('de-DE', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        }) : '---'}
                    </div>
                    <div class="time-value ${!setTime ? 'none' : ''}">
                        ${setTime ? setTime.toLocaleTimeString('de-DE', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        }) : '---'}
                    </div>
                    <div class="status ${status.visible ? 'visible' : 'hidden'}">
                        ${status.visible ? 'Sichtbar' : 'Verborgen'}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        content.innerHTML = html;
    }

    filterTodayData(data, targetDate) {
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const startJD = this.dateToJD(startOfDay);
        const endJD = this.dateToJD(endOfDay);

        return data.filter(item => item.jd >= startJD && item.jd <= endJD);
    }

    getCurrentStatus(todayData) {
        if (!todayData || todayData.length === 0) {
            return { visible: false };
        }

        const now = new Date();
        const currentJD = this.dateToJD(now);

        const { ra, dec } = this.interpolateData(todayData, currentJD);
        const lst = this.calculator.calculateLST(currentJD);
        const { altitude } = this.calculator.equatorialToHorizontal(ra, dec, lst);

        return { visible: altitude > 0 };
    }

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

        const lastData = data[data.length - 1];
        return {
            ra: this.toRadians(parseFloat(lastData.ra)),
            dec: this.toRadians(parseFloat(lastData.dec))
        };
    }

    dateToJD(date) {
        return (date.getTime() / 86400000) + 2440587.5;
    }

    toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    showError(message) {
        const content = this.shadowRoot.getElementById('content');
        content.innerHTML = `<div class="error">${message}</div>`;
    }
}

customElements.define('planet-rise-set-viewer', PlanetRiseSetViewer);
