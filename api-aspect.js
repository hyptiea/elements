class ApiDataDisplay extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const apiUrl = this.getAttribute('api');
        const planets = this.getAttribute('planets');
        const dateAttribute = this.getAttribute('date');        
        const date = dateAttribute ? new Date(dateAttribute).toISOString() : new Date().toISOString();        
        if (apiUrl) {
            this.fetchData(apiUrl, planets, date);
        }
    }

    fetchData(url, planets, date) {        
        const dateObj = new Date(date);        
        if (isNaN(dateObj.getTime())) {
            console.error('Invalid date:', date);
            return; // Exit if date is invalid
        }        
        fetch(`${url}?datetime=${dateObj.toISOString()}&bodies=${planets}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                const html = ''

                const de = {
                    conjunction: 'Konjunktion',
                    opposition: 'Opposition'
                }

                data.aspects.forEach(element => {
                    html+= `<p>${element.body1}  ${de[element.aspect_type]} ${element.body2} <small>${element.orb_degrees}</small></p>`
                });


                // Display the fetched data as a bold string
                this.shadowRoot.innerHTML = html
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                this.shadowRoot.innerHTML = `<strong>Error fetching data</strong>`;
            });
    }
}

// Define the new web component
customElements.define('api-const', ApiDataDisplay);