
import { calculateRiseSetTimes } from 'https://hyptiea.github.io/elements/astronomy/set-rise.js';

class PlanetRiseSet extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.LONGITUDE = 7.5;
        this.LAT = 47.2;

        this.planetData = [
            { name: 'Sonne', data: [], file: 'sun.json' },
            { name: 'Mond', data: [], file: 'moon.json' },
            { name: 'Merkur', data: [], file: 'mercury.json' },
            { name: 'Venus', data: [], file: 'venus.json' },
            { name: 'Mars', data: [], file: 'mars.json' },
            { name: 'Jupiter', data: [], file: 'jupiter.json' },
            { name: 'Saturn', data: [], file: 'saturn.json' },
        ];

        this.render();
        this.init();
    }

    async init() {
        this.showLoading();
        await this.loadAllData();
        this.calculateRiseSetTimes();
        this.hideLoading();
    }

    async loadAllData() {
        const baseUrl = 'https://hyptiea.github.io/elements/data/astronomy/';

        const loadPromises = this.planetData.map(async (planet, index) => {
            try {
                const response = await fetch(baseUrl + planet.file);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                this.planetData[index].data = data;
            } catch (error) {
                console.error(`Failed to load ${planet.name}:`, error);
                try {
                    const altResponse = await fetch(`./data/astronomy/${planet.file}`);
                    if (altResponse.ok) {
                        const data = await altResponse.json();
                        this.planetData[index].data = data;
                    }
                } catch (altError) {
                    console.error(`Alternative path failed for ${planet.name}:`, altError);
                }
            }
        });

        await Promise.all(loadPromises);
    }

    interpolateCoordinates(data, targetDate) {
        if (!data || data.length === 0) return null;

        const sortedData = [...data].sort((a, b) =>
            new Date(a.isoDateTime) - new Date(b.isoDateTime)
        );

        let before = null;
        let after = null;

        for (let i = 0; i < sortedData.length; i++) {
            const entryDate = new Date(sortedData[i].isoDateTime);
            if (entryDate <= targetDate) {
                before = sortedData[i];
            } else if (!after) {
                after = sortedData[i];
                break;
            }
        }

        if (before && after) {
            const beforeDate = new Date(before.isoDateTime);
            const afterDate = new Date(after.isoDateTime);
            const fraction = (targetDate - beforeDate) / (afterDate - beforeDate);

            const interpolatedRA = parseFloat(before.ra) +
                (parseFloat(after.ra) - parseFloat(before.ra)) * fraction;
            const interpolatedDec = parseFloat(before.dec) +
                (parseFloat(after.dec) - parseFloat(before.dec)) * fraction;

            return { ra: interpolatedRA, dec: interpolatedDec };
        } else if (before) {
            return { ra: parseFloat(before.ra), dec: parseFloat(before.dec) };
        } else if (after) {
            return { ra: parseFloat(after.ra), dec: parseFloat(after.dec) };
        }

        return null;
    }

    calculateRiseSetTimes() {
        const targetDate = new Date();
        const planetList = this.shadowRoot.querySelector('#planet-list');
        planetList.innerHTML = '';

        this.planetData.forEach(planet => {
            if (planet.data.length === 0) {
                planetList.innerHTML += `<div>${planet.name}: No data</div>`;
                return;
            }

            const coords = this.interpolateCoordinates(planet.data, targetDate);
            if (!coords) {
                planetList.innerHTML += `<div>${planet.name}: No coordinates</div>`;
                return;
            }

            const riseSet = calculateRiseSetTimes(
                coords.ra,
                coords.dec,
                this.LAT,
                targetDate,
                this.LONGITUDE
            );

            planetList.innerHTML += `
                        <div>
                            <strong>${planet.name}</strong>
                            <p>
                            <a href="https://hypteia.bearblog.dev/${planet.name.toLowerCase()}aufgang">Aufgang:</a> ${this.formatTime(riseSet?.rise)} </p>
                           <p>  <a href="https://hypteia.bearblog.dev/${planet.name.toLowerCase()}untergang">Untergang:</a>${this.formatTime(riseSet?.set)}</p>
                        </div>
                    `;
        });
    }

    formatTime(date) {
        if (!date) return 'N/A';
        return date.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showLoading() {
        const planetList = this.shadowRoot.querySelector('#planet-list');
        planetList.innerHTML = '<div>Laden...</div>';
    }

    hideLoading() {
        // Loading text will be replaced by planet data
    }

    render() {
        this.shadowRoot.innerHTML = `
                    <style>
                
                        div {
                            margin: 5px 0;
                        }
                            a {
                            color: inherit;
                            
                            }
                            a:visited {
                            color: inherit;
                            
                            }

                        * {
                        padding: 0;
                        margin: 0;
                        }

                        #planet-list {
                            display: grid;
                            gap:15px;
                            grid-template-columns: 1fr 1fr 1fr;
                        }
                    </style>

                    <h3>Aufgangs- und Untergangszeiten der sichtbaren Planeten</h3>
                    <div id="planet-list"></div>
                `;
    }
}

customElements.define('planet-rise-set', PlanetRiseSet);