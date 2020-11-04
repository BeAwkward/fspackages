class Pane_Input_Layer extends Selectables_Input_Layer {
    constructor(pane, source) {
        super(source);
        this.pane = pane;
    }
    onCLR() {
        this.pane.exit();
    }
    onNavigationPush() {
        this.pane.exit();
    }
}

class WT_Procedures_Input_Layer extends Pane_Input_Layer {
    onProceduresPush() {
        this.pane.exit();
    }
}

class WT_Procedures_Menu_View extends WT_HTML_View {
    /**
     * @param {WT_Show_Procedure_Handler} showProcedureHandler 
     * @param {Procedures} procedures
     */
    constructor(showProcedureHandler, procedures) {
        super();
        this.showProcedureHandler = showProcedureHandler;
        this.procedures = procedures;

        this.subscriptions = new Subscriptions();
        this.inputLayer = new WT_Procedures_Input_Layer(this, new Selectables_Input_Layer_Dynamic_Source(this, "selectable-button"));
    }
    connectedCallback() {
        console.log("ergerg");
        const template = document.getElementById('procedures-menu');
        this.appendChild(template.content.cloneNode(true));
        console.log("dergerg");

        super.connectedCallback();
    };
    disconnectedCallback() {
        this.subscriptions.unsubscribe();
    }
    enter(inputStack) {
        this.inputStackHandle = inputStack.push(this.inputLayer);
        this.inputStackHandle.onPopped.subscribe(() => {
            //this.parentNode.removeChild(this);
        });
    }
    back() {
        this.exit();
    }
    exit() {
        if (this.inputStackHandle) {
            this.inputStackHandle = this.inputStackHandle.pop();
        }
    }
    selectApproach() {
        this.exit();
        this.showProcedureHandler.showApproaches();
    }
    selectArrival() {
        this.exit();
        this.showProcedureHandler.showArrivals();
    }
    selectDeparture() {
        this.exit();
        this.showProcedureHandler.showDepartures();
    }
}
customElements.define("g1000-procedures-menu", WT_Procedures_Menu_View);