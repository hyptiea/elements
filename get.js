
class AccordionContainer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        const filename = this.getAttribute('filename');
        if (!filename) {
            console.error('Filename attribute is required');
            return;
        }

        try {
            const response = await fetch('./texts/' + filename);
            if (!response.ok) throw new Error('Failed to fetch markdown');

            const markdown = await response.text();
            const htmlContent = marked.parse(markdown);

            this.render(htmlContent);
        } catch (error) {
            console.error('Error fetching or parsing markdown:', error);
            this.shadowRoot.innerHTML = `<div>Error loading markdown content.</div>`;
        }
    }

    render(htmlContent) {
        const sections = htmlContent.split(/(<h[1-6][^>]*>.*?<\/h[1-6]>)/).filter(section => section.trim() !== '');

        let accordionHTML = '';

        sections.forEach((section, index) => {
            if (section.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/)) {
                const headerId = `section-${index}`;
                const headerContent = section.replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/, (match, level, content) => {
                    return `<button class="accordion" data-target="${headerId}">${content}</button><div id="${headerId}" class="panel">`;
                });
                accordionHTML += headerContent;
            } else if (accordionHTML.endsWith('<div class="panel">')) {
                accordionHTML += section + '</div>';
            }
        });

        const style = document.createElement('style');
        style.textContent = `
                .accordion {
                    background-color: #eee;
                    color: #444;
                    cursor: pointer;
                    padding: 18px;
                    width: 100%;
                    border: none;
                    text-align: left;
                    outline: none;
                    font-size: 15px;
                    transition: 0.4s;
                }
                .active, .accordion:hover {
                    background-color: #ccc;
                }
                .panel {
                    padding: 0 18px;
                    display: none;
                    background-color: white;
                    overflow: hidden;
                }
            `;

        this.shadowRoot.innerHTML = `
                <div>${accordionHTML}</div>
            `;
        this.shadowRoot.prepend(style);

        // Add accordion functionality
        this.shadowRoot.querySelectorAll('.accordion').forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-target');
                const panel = this.shadowRoot.getElementById(targetId);
                panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
                button.classList.toggle('active');
            });
        });
    }
}

customElements.define('accordion-container', AccordionContainer);