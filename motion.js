import AspectCalculator from './astronomy/motion.js';

class CurrentAspects extends HTMLElement {
    constructor() {
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


    render() {
        const calc = new AspectCalculator()
        console.log(calc);
        
        //const data = calc.analyzePlanetMotion('saturn')
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

                    <h3>Rückläufigkeit</h3>
                    <div>
                        ${JSON.stringify(data)}
                    </div>
                `;
    }
}

customElements.define('current-retrograde', CurrentAspects);