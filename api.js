class ApiDataDisplay extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const apiUrl = this.getAttribute('api');
        const planet = this.getAttribute('planet');
        const date = this.getAttribute('date') || new Date().toISOString();

        if (apiUrl) {
            this.fetchData(apiUrl, planet), date;
        }
    }

    fetchData(url, planet, date) {
        fetch(url + '?datetime=' + new Date(date).toISOString() + '&body=' + planet)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Display the fetched data as a bold string
                this.shadowRoot.innerHTML = `<strong>${data.constellation}</strong>`;
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                this.shadowRoot.innerHTML = `<strong>Error fetching data</strong>`;
            });
    }
}

// Define the new web component
customElements.define('api-const', ApiDataDisplay);