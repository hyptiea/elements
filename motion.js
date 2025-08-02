import PlanetaryMotionAnalyzer from 'https://hyptiea.github.io/elements/astronomy/motion.js';

class CurrentAspects extends HTMLElement {
    constructor(planetData) {
        super();
        this.attachShadow({ mode: 'open' });
        this.aspectCalculator = new AspectCalculator();
        
        this.render();
        this.init();
    }

    async init() {
        this.showLoading();
        await this.loadAllData();
        this.calculateCurrentAspects();
        this.hideLoading();
    }

    async loadAllData() {
        const planetFiles = {
            Sonne: 'sun.json',
            Mond: 'moon.json',
            Merkur: 'mercury.json',
            Venus: 'venus.json',
            Mars: 'mars.json',
            Jupiter: 'jupiter.json',
            Saturn: 'saturn.json',
            Uranus: 'uranus.json'
        };

        const baseUrl = 'https://hyptiea.github.io/elements/data/astronomy/';

        const loadPromises = Object.entries(planetFiles).map(async ([planet, file]) => {
            try {
                const response = await fetch(baseUrl + file);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                this.aspectCalculator.planetData[planet] = data;
            } catch (error) {
                console.error(`Failed to load ${planet}:`, error);
                try {
                    const altResponse = await fetch(`https://hyptiea.github.io/elements/data/astronomy/${file}`);
                    if (altResponse.ok) {
                        const data = await altResponse.json();
                        this.aspectCalculator.planetData[planet] = data;
                    }
                } catch (altError) {
                    console.error(`Alternative path failed for ${planet}:`, altError);
                }
            }
        });

        await Promise.all(loadPromises);
    }

    calculateCurrentAspects() {
        const now = new Date().toISOString();
        const aspects = this.aspectCalculator.calculateAspectsForDate(now);
        this.displayAspects(aspects);
    }

    displayAspects(aspects) {
        const aspectList = this.shadowRoot.querySelector('#aspect-list');

        if (aspects.length === 0) {
            aspectList.innerHTML = '<div>No major aspects found</div>';
            return;
        }

        aspectList.innerHTML = aspects.map(aspect => `
                    <a href="https://hypteia.bearblog.dev/${aspect.planet1.toLowerCase()}-${aspect.aspect.toLowerCase()}-${aspect.planet2.toLowerCase()}">
                        ${aspect.planet1} ${aspect.aspect}  ${aspect.planet2}
                        (${aspect.orb.toFixed(1)}°)
                        ${aspect.exact ? ' - Exakt' : ''}
                    </div>
                `).join('');
    }

    showLoading() {
        const aspectList = this.shadowRoot.querySelector('#aspect-list');
        aspectList.innerHTML = '<div>Lade Aspekte...</div>';
    }

    hideLoading() {
        // Loading text will be replaced by aspect data
    }

    render() {
        this.shadowRoot.innerHTML = `
                    <style>
                        :host {
                            display: block;
                        }

                        a {
                            display: block;
                            color: inherit;

                        }
                             a:visited {
                            color: inherit;
                        }
                        div {
                            margin: 3px 0;
                        }

                        .exact {
                            font-weight: bold;
                        }
                    </style>

                    <h3>Konjunktionen und Oppositionen</h3>
                    <div id="aspect-list"></div>
                `;
    }
}

customElements.define('current-aspects', CurrentAspects);