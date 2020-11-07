class WT_Annunciations_Model {
    /**
     * @param {*} xmlConfig 
     * @param {WT_Sound} sound 
     * @param {WT_Plane_State} planeState
     */
    constructor(xmlConfig, sound, planeState) {
        this.sound = sound;
        this.planeState = planeState;
        this.isPlayingSound = {};

        this.engineType = Simplane.getEngineType();
        this.annunciations = [];
        this.messages = new Subject(this.annunciations, false);
        this.alertLevel = new Subject(0);
        this.hasUnacknowledgedAnnunciations = new Subject(false);
        this.init(xmlConfig);

        planeState.onShutDown.subscribe(() => {
            this.acknowledgeAll();
            SimVar.SetSimVarValue("L:Generic_Master_Warning_Active", "Bool", 0);
            SimVar.SetSimVarValue("L:Generic_Master_Caution_Active", "Bool", 0);
        });
    }
    init(xml) {
        let annunciationsRoot = xml.getElementsByTagName("Annunciations");
        if (annunciationsRoot.length > 0) {
            for (let annunciation of annunciationsRoot[0].getElementsByTagName("Annunciation")) {
                this.addXmlMessage(annunciation);
            }
        }
    }
    addMessage(_type, _text, _handler) {
        var msg = new Annunciation_Message();
        msg.Type = _type;
        msg.Text = _text;
        msg.Handler = _handler.bind(msg);
        this.annunciations.push(msg);
    }
    getXmlMessageType(type) {
        switch (type) {
            case "Warning":
                return Annunciation_MessageType.WARNING;
            case "Caution":
                return Annunciation_MessageType.CAUTION;
            case "Advisory":
                return Annunciation_MessageType.ADVISORY;
            case "SafeOp":
                return Annunciation_MessageType.SAFEOP;
        }
    }
    addXmlMessage(_element) {
        var msg = new Annunciation_Message_XML();
        msg.Type = this.getXmlMessageType(_element.getElementsByTagName("Type")[0].textContent)
        msg.baseText = _element.getElementsByTagName("Text")[0].textContent;
        let conditions = _element.getElementsByTagName("Condition");
        for (let i = 0; i < conditions.length; i++) {
            let condition = new XMLCondition();
            condition.logic = new CompositeLogicXMLElement(this.gps, conditions[i]);
            condition.suffix = conditions[i].getAttribute("Suffix");
            msg.conditions.push(condition);
        }
        this.annunciations.push(msg);
    }
    update(dt) {
        let anyUpdated = false;
        let alertLevel = 0;
        let hasUnacknowledged = false;
        let hasWarnings = false;
        let hasCautions = false;
        for (let annunciation of this.annunciations) {
            const value = annunciation.Handler ? annunciation.Handler() : false;
            if (value != annunciation.Visible) {
                anyUpdated = true;
                if (!value) {
                    annunciation.Acknowledged = false;
                }
                annunciation.Visible = value;
            }
            if (annunciation.Visible && !annunciation.Acknowledged) {
                switch (annunciation.Type) {
                    case Annunciation_MessageType.WARNING:
                        alertLevel = Math.max(alertLevel, 3);
                        hasWarnings = true;
                        this.playSound("tone_warning", "tone");
                        break;
                    case Annunciation_MessageType.CAUTION:
                        alertLevel = Math.max(alertLevel, 2);
                        hasCautions = true;
                        this.playSound("tone_caution", "tone");
                        break;
                    case Annunciation_MessageType.ADVISORY:
                        alertLevel = Math.max(alertLevel, 1);
                        break;
                }
                hasUnacknowledged = true;
            }
        }

        SimVar.SetSimVarValue("L:Generic_Master_Warning_Active", "Bool", hasWarnings);
        SimVar.SetSimVarValue("L:Generic_Master_Caution_Active", "Bool", hasCautions);

        this.hasUnacknowledgedAnnunciations.value = hasUnacknowledged;
        this.alertLevel.value = alertLevel;
        if (anyUpdated) {
            this.messages.value = this.annunciations;
        }
    }
    playSound(id, group = "") {
        if (!this.isPlayingSound[group]) {
            this.sound.play(id).then(() => this.isPlayingSound[group] = false);
            this.isPlayingSound[group] = true;
        }
    }
    acknowledgeAll() {
        for (let annunciation of this.annunciations) {
            if (annunciation.Visible) {
                annunciation.Acknowledged = true;
            }
        }
    }
    acknowledgeCautions() {
        for (let annunciation of this.annunciations) {
            if (annunciation.Type == Annunciation_MessageType.CAUTION && annunciation.Visible) {
                annunciation.Acknowledged = true;
            }
        }
    }
    acknowledgeWarnings() {
        const acknowledgedWarning = false;
        for (let annunciation of this.annunciations) {
            if (annunciation.Type == Annunciation_MessageType.WARNING && annunciation.Visible) {
                annunciation.Acknowledged = true;
                acknowledgedWarning = true;
            }
        }
        if (acknowledgedWarning) {
            this.playSound("aural_warning_ok", "aural");
        }
    }
}

class WT_Annunciations_View extends WT_HTML_View {
    /**
     * @param {WT_Annunciations_Model} model 
     */
    setModel(model) {
        this.model = model;
        this.model.messages.subscribe(this.updateAnnunciations.bind(this));
    }
    updateAnnunciations(annunciations) {
        this.elements.new.innerHTML = "";
        this.elements.acknowledged.innerHTML = "";

        for (let annunciation of annunciations) {
            if (annunciation.Visible) {
                if (annunciation.Type == Annunciation_MessageType.WARNING || annunciation.Type == Annunciation_MessageType.CAUTION || annunciation.Type == Annunciation_MessageType.ADVISORY) {
                    let type = "";
                    switch (annunciation.Type) {
                        case Annunciation_MessageType.WARNING:
                            type = "Warning";
                            break;
                        case Annunciation_MessageType.CAUTION:
                            type = "Caution";
                            break;
                        case Annunciation_MessageType.ADVISORY:
                            type = "Advisory";
                            break;
                    }
                    let element = document.createElement("li");
                    element.className = type;
                    element.textContent = annunciation.Text;
                    if (!annunciation.Acknowledged) {
                        this.elements.new.appendChild(element);
                    } else {
                        this.elements.acknowledged.appendChild(element);
                    }
                }
            }
        }
        const hasAnnunciations = this.elements.new.children.length > 0 || this.elements.acknowledged.children.length > 0;
        if (this.elements.new.children.length > 0) {
            this.setAttribute("hasNew", "hasNew");
        } else {
            this.removeAttribute("hasNew");
        }
        this.setAttribute("state", hasAnnunciations ? "visible" : "hidden");
    }
}
customElements.define("g1000-annunciations", WT_Annunciations_View);