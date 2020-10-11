class WT_OAT_Model {
    /**
     * @param {WT_Unit_Chooser} unitChooser 
     */
    constructor(unitChooser) {
        this.oat = new Subject();
        this.unitChooser = unitChooser;
        this.updateTimer = 0;
    }
    update(dt) {
        this.updateTimer += dt;
        if (this.updateTimer < 1000)
            return;
        this.updateTimer = 0;
        this.oat.value = this.getATMTemperature();
    }
    getATMTemperature() {
        return this.unitChooser.chooseTemperature(SimVar.GetSimVarValue("AMBIENT TEMPERATURE", "celsius").toFixed(0) + "°<span class='units'>C</span>", SimVar.GetSimVarValue("AMBIENT TEMPERATURE", "farenheit").toFixed(0) + "°<span class='units'>F</span>");
    }
}

class WT_OAT_View extends WT_HTML_View {
    /**
     * @param {WT_OAT_Model} model 
     */
    setModel(model) {
        this.model = model;
        model.oat.subscribe(oat => this.elements.oat.innerHTML = oat);
    }
}
customElements.define("g1000-oat", WT_OAT_View);