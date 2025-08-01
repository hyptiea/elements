class AccordionContainer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        const filename = this.getAttribute('filename');
        const title = this.getAttribute('title');

        if (!filename) {
            console.error('Filename attribute is required');
            return;
        }

        try {
            const response = await fetch('https://hyptiea.github.io/elements/texts/' + filename + '.md');
            if (!response.ok) throw new Error('Failed to fetch markdown');

            const markdown = await response.text();
            const htmlContent = marked.parse(markdown);

            this.render(htmlContent, title);
        } catch (error) {
            console.error('Error fetching or parsing markdown:', error);
            this.shadowRoot.innerHTML = `<div>Error loading markdown content.</div>`;
        }
    }

    render(htmlContent, title) {
        // Create a temporary div to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        const elements = Array.from(tempDiv.childNodes);
        let accordionHTML = '';
        let currentSection = null;
        let sectionIndex = 0;

        elements.forEach(element => {
            // Check if element is a heading (h1-h6)
            if (element.nodeType === Node.ELEMENT_NODE && 
                element.tagName && 
                element.tagName.match(/^H[1-6]$/)) {

                // Close previous section if exists
                if (currentSection !== null) {
                    accordionHTML += '</div>';
                }

                // Start new section
                const headerId = `section-${sectionIndex++}`;
                const headerText = element.textContent || element.innerText || '';

                accordionHTML += `
                    <button class="accordion" data-target="${headerId}">
                        ${headerText}
                    </button>
                    <div id="${headerId}" class="panel">
                `;
                currentSection = headerId;
            } else if (element.nodeType === Node.ELEMENT_NODE || 
                      (element.nodeType === Node.TEXT_NODE && element.textContent.trim())) {

                // Add content to current section or create a default section
                if (currentSection === null) {
                    const headerId = `section-${sectionIndex++}`;
                    accordionHTML += `
                        <button class="accordion" data-target="${headerId}">
                            ${title}
                        </button>
                        <div id="${headerId}" class="panel">
                    `;
                    currentSection = headerId;
                }

                if (element.nodeType === Node.ELEMENT_NODE) {
                    accordionHTML += element.outerHTML;
                } else {
                    accordionHTML += element.textContent;
                }
            }
        });

        // Close the last section
        if (currentSection !== null) {
            accordionHTML += '</div>';
        }

        // Apply styles and render
        this.shadowRoot.innerHTML = `
            <style>
                .accordion {
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 1.2rem;
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    background-color: transparent;
                    border: none;
                    text-align: left;
                    outline: none;
                    transition: 0.4s;
                    display: block;
                    color: inherit
                }

        

                .panel {
                    display: none;
                    overflow: hidden;
                }

                .panel.show {
                    display: block;
                }
            </style>
            <div class="accordion-wrapper">
                ${accordionHTML}
            </div>
        `;

        // Add accordion functionality
        this.addAccordionListeners();
    }

    addAccordionListeners() {
        this.shadowRoot.querySelectorAll('.accordion').forEach(button => {
            button.addEventListener('click', (e) => {
                const targetId = button.getAttribute('data-target');
                const panel = this.shadowRoot.getElementById(targetId);

                if (panel) {
                    const isCurrentlyOpen = panel.style.display === 'block';

                    // Close all panels
                    this.shadowRoot.querySelectorAll('.panel').forEach(p => {
                        p.style.display = 'none';
                    });

                    // Remove active class from all buttons
                    this.shadowRoot.querySelectorAll('.accordion').forEach(btn => {
                        btn.classList.remove('active');
                    });

                    // Toggle current panel
                    if (!isCurrentlyOpen) {
                        panel.style.display = 'block';
                        button.classList.add('active');
                    }
                }
            });
        });
    }
}

customElements.define('accordion-container', AccordionContainer);
