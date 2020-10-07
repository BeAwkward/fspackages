class Drop_Down_Selector_Input_Layer extends Selectables_Input_Layer
{
    constructor(dropDown, source) {
        super(source, true);
        this.dropDown = dropDown;
    }
    onHighlightedElement(element) {
        if (this.dropDown)
            this.dropDown.selectionUpdated(element.getAttribute("value"));
    }
}

class AS1000_Drop_Down_Selector extends HTMLElement {
    constructor() {
        super();
        this.options = [];
        this._value = null;
        this.elements = {
            value: null,
            popup: null
        };

        DOMUtilities.AddScopedEventListener(this, "drop-down-selector-option", "selected", this.onOptionSelected.bind(this));
        this.addEventListener("selected", (e) => { if (e.detail.element == this) this.enter(e) });
    }
    get value() {
        return this._value;
    }
    set value(value) {
        if (this._value != value) {
            this._value = value;
            for (let option of this.getOptions()) {
                if (option.getAttribute("value") == value) {
                    this.updateSelectedValue(option.innerHTML);

                    let evt = document.createEvent("HTMLEvents");
                    evt.initEvent("change", true, true);
                    this.dispatchEvent(evt);
                }
            }
        }
    }
    connectedCallback() {
        for (let optionNode of this.querySelectorAll("drop-down-selector-option")) {
            this.options.push(optionNode);
        }

        const template = `
            <div class="value"></div>
            <div class="popup scrollable-container"></div>
        `;

        this.innerHTML = template;

        this.elements.value = this.querySelector(".value");
        this.elements.popup = this.querySelector(".popup");

        for (let option of this.options) {
            this.elements.popup.appendChild(option);
        }
        if (this.options.length > 0) {
            this.value = this.options[0].getAttribute("value");
        }
    }
    clearOptions() {
        this._value = null;
        this.options = [];
        this.updateSelectedValue("&nbsp;");
        this.elements.popup.innerHTML = "";
    }
    addOption(value, text) {
        let option = document.createElement("drop-down-selector-option");
        option.setAttribute("value", value);
        option.innerHTML = text;
        this.options.push(option);
        this.elements.popup.appendChild(option);
        if (this.options.length == 1) {
            this.value = this.options[0].getAttribute("value");
        }
    }
    getOptions() {
        return this.options;
    }
    updateSelectedValue(html) {
        this.elements.value.innerHTML = html;
    }
    selectionUpdated(value) {
        if (this.shouldUpdateOnSelection()) {
            this.value = value;
        }
    }
    shouldUpdateOnSelection() {
        return this.hasAttribute("updateOnSelection");
    }
    back() {
        this.exit();
    }
    enter(e) {
        if (this.options.length == 0)
            return;
            
        let inputStack = e.detail.inputStack;
        let selectableElements = [];
        let selectedOption = null;
        let i = 0;
        for (let option of this.getOptions()) {
            selectableElements.push(option);
            if (option.getAttribute("value") == this.value)
                selectedOption = option;
            i++;
        }
        let inputLayer = new Drop_Down_Selector_Input_Layer(this, new Selectables_Input_Layer_Element_Source(selectableElements));

        inputLayer.selectElement(selectedOption);
        inputLayer.setExitHandler(this);
        this.inputStackManipulator = inputStack.push(inputLayer);
        this.setAttribute("ACTIVE","ACTIVE");
    }
    exit() {
        if (this.inputStackManipulator) {
            this.inputStackManipulator.pop();
            this.inputStackManipulator = null;
        }
        this.removeAttribute("ACTIVE");
    }
    onOptionSelected(e, node) {
        e.stopPropagation();
        this.value = node.getAttribute("value");
        this.exit();
        return false;
    }
}
customElements.define("drop-down-selector", AS1000_Drop_Down_Selector);