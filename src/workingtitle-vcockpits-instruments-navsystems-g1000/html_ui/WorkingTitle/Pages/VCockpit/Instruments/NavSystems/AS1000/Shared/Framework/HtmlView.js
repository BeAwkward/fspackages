class WT_HTML_View extends HTMLElement {
    constructor() {
        super();
        this.elements = {};
        DOMUtilities.AddScopedEventListener(this, "[data-click]", "selected", this.onButtonClick.bind(this));
        DOMUtilities.AddScopedEventListener(this, "[data-change]", "change", this.onChange.bind(this));
        DOMUtilities.AddScopedEventListener(this, "[data-input]", "input", this.onInput.bind(this));
    }
    bindElements() {
        const elements = this.querySelectorAll("[data-element]");
        for (let element of elements) {
            // We only want to collect elements that aren't in another view already
            while (element = element.parentNode) {
                if (element == this) {
                    const elementName = element.getAttribute("data-element");
                    if (elementName in this.elements) {
                        console.warn(`A duplicate element "${elementName}" was found`);
                    }
                    this.elements[elementName] = element;
                    break;
                } else if (element instanceof WT_HTML_View) {
                    break;
                }
            }
        }
    }
    connectedCallback() {
        this.bindElements();
    }
    onButtonClick(e, node) {
        if (node.dataset.click) {
            let click = node.dataset.click;
            if (this[click])
                this[click](e.target);
            else
                console.warn(`An expected click event "${click}" did not have a handler`);
        }
        e.stopPropagation();
    }
    onChange(e, node) {
        if (node.dataset.change) {
            let change = node.dataset.change;
            if (this[change])
                this[change](e.target.value, e.target);
            else
                console.warn(`An expected change event "${change}" did not have a handler`);
        }
        e.stopPropagation();
    }
    onInput(e, node) {
        if (node.dataset.input) {
            let input = node.dataset.input;
            if (this[input])
                this[input](e.target.value, e.target);
            else
                console.warn(`An expected input event "${input}" did not have a handler`);
        }
        e.stopPropagation();
    }
    update(dt) {
    }
    enter(inputStack) {
        return false;
    }
    activate() {
    }
    deactivate() {
    }
}