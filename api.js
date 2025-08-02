class ApiDataDisplay extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const apiUrl = this.getAttribute('api');
        if (apiUrl) {
            this.fetchData(apiUrl);
        }
    }

    fetchData(url) {
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Display the fetched data as a bold string
                this.shadowRoot.innerHTML = `<strong>${JSON.stringify(data.constellation)}</strong>`;
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                this.shadowRoot.innerHTML = `<strong>Error fetching data</strong>`;
            });
    }
}

// Define the new web component
customElements.define('api-const', ApiDataDisplay);