class ApiDataDisplay extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const apiUrl = this.getAttribute('api');
        const planet = this.getAttribute('planet');
        const dateAttribute = this.getAttribute('date');        
        const date = dateAttribute ? new Date(dateAttribute).toISOString() : new Date().toISOString();        
        if (apiUrl) {
            this.fetchData(apiUrl, planet, date);
        }
    }

    fetchData(url, planet, date) {        
        const dateObj = new Date(date);        
        if (isNaN(dateObj.getTime())) {
            console.error('Invalid date:', date);
            return; // Exit if date is invalid
        }        
        fetch(`${url}?datetime=${dateObj.toISOString()}&body=${planet}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Display the fetched data as a bold string
                this.shadowRoot.innerHTML = `<strong>${data.constellation}</strong> <small>(${data.ra_degrees.toFixed(2)})</small>`;
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                this.shadowRoot.innerHTML = `<strong>Error fetching data</strong>`;
            });
    }
}

// Define the new web component
customElements.define('api-const', ApiDataDisplay);