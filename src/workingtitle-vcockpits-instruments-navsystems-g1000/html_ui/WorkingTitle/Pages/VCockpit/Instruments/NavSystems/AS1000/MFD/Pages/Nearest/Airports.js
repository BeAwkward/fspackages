class WT_Nearest_Airports_View extends WT_HTML_View {
    constructor() {
        super();
        this.inputStackHandle = null;

        this.menu = this.initMenu();
    }
    initMenu() {
        let menu = new WT_Soft_Key_Menu(false);
        menu.addSoftKey(5, new WT_Soft_Key("APT", this.browseAirports.bind(this)));
        menu.addSoftKey(6, new WT_Soft_Key("RNWY", this.browseRunways.bind(this)));
        menu.addSoftKey(7, new WT_Soft_Key("FREQ", this.browseFrequencies.bind(this)));
        menu.addSoftKey(8, new WT_Soft_Key("APR", this.browseApproaches.bind(this)));
        return menu;
    }
    popInput() {
        if (this.inputStackHandle) {
            this.inputStackHandle.pop();
            this.inputStackHandle = null;
        }
    }
    browseAirports() {
        this.popInput();
        this.inputStackHandle = this.inputStack.push(this.airportsInputLayer);
    }
    browseRunways() {
        this.popInput();
        this.inputStackHandle = this.inputStack.push(this.runwaysInputLayer);
    }
    browseFrequencies() {
        this.popInput();
        this.inputStackHandle = this.inputStack.push(this.frequenciesInputLayer);
    }
    browseApproaches() {
        this.popInput();
        this.inputStackHandle = this.inputStack.push(this.approachesInputLayer);
    }
    connectedCallback() {
        let template = document.getElementById('nearest-airports-page');
        let templateContent = template.content;

        this.appendChild(templateContent.cloneNode(true));
        super.connectedCallback();

        this.airportsInputLayer = new Selectables_Input_Layer(new Selectables_Input_Layer_Dynamic_Source(this.elements.airportList, ".ident"));
        this.runwaysInputLayer = new Selectables_Input_Layer(new Selectables_Input_Layer_Dynamic_Source(this.elements.runways, ".selectable"));
        this.frequenciesInputLayer = new Selectables_Input_Layer(new Selectables_Input_Layer_Dynamic_Source(this.elements.frequencyList, ".selectable"));
        this.approachesInputLayer = new Selectables_Input_Layer(new Selectables_Input_Layer_Dynamic_Source(this.elements.approachList, ".selectable"));
        DOMUtilities.AddScopedEventListener(this.elements.airportList, ".ident", "highlighted", e => {
            this.model.setSelectedAirport(e.detail.element.parentNode.dataset.icao);
        });
    }
    /**
     * @param {WT_Nearest_Airports_Model} model 
     */
    setModel(model) {
        this.model = model;
        model.airports.subscribe(this.updateAirports.bind(this));
        model.selectedAirport.subscribe(this.updateSelectedAirport.bind(this));
        this.elements.map.appendChild(this.model.mapInstrument);
    }
    updateSelectedRunway(runway) {
        this.elements.runwayDesignation = runway.designation;
        this.elements.runwaySurface = runway.getSurfaceString();
        this.elements.runwayLength = fastToFixed(runway.length, 0) + "FT";
        this.elements.runwayWidth = fastToFixed(runway.width, 0) + "FT";
    }
    updateSelectedAirport(airport) {
        if (airport == null)
            return;
        let infos = airport.airport.GetInfos();
        if (infos && infos.icao != "" && infos.getWaypointType() == "A" && infos.IsUpToDate()) {
            this.elements.facilityName.textContent = infos.name;
            this.elements.city.textContent = infos.city;
            if (infos.coordinates) {
                this.elements.elevation = fastToFixed(infos.coordinates.alt, 0) + "FT";
            }
            this.runways = infos.runways;
            if (this.runways) {
                for (let runway of this.runways) {

                }
            }
            if (infos.frequencies) {
                let elems = [];
                for (let i = 0; i < infos.frequencies.length; i++) {
                    elems.push(`<div class="element"><span class="name">${infos.frequencies[i].name}</span><span class="value selectable" data-frequency="${infos.frequencies[i].mhValue}">${infos.frequencies[i].mhValue.toFixed(2)}</span></div>`);
                }
                this.elements.frequencyList.innerHTML = elems.join("");
            }
            if (infos.approaches) {
                let elems = [];
                for (let i = 0; i < infos.approaches.length; i++) {
                    elems.push(`<div class="element selectable" data-approach="${i}"><span class="name">${infos.ident}-${infos.approaches[i].name}</span></div>`);
                }
                this.elements.approachList.innerHTML = elems.join("");
            }
        }
    }
    updateAirports(airports) {
        let listElement = this.elements.airportList;

        if (!airports)
            return;

        let elements = [];
        for (let airport of airports) {
            if (airport == null)
                continue;
            let element = listElement.querySelector(`[data-icao="${airport.icao}"]`);
            if (!element) {
                element = document.createElement("div");
                element.innerHTML = `
                    <span class="ident"></span>
                    <airport-icon></airport-icon>
                    <span class="bearing"></span>
                    <span class="distance"></span>
                `;
                element.querySelector(".ident").innerHTML = airport.ident;
                element.querySelector("airport-icon").angle = airport.longestRunwayDirection;
                element.querySelector("airport-icon").applyInfo(airport);
            }
            element.dataset.icao = airport.icao;
            element.querySelector(".bearing").innerHTML = airport.bearing.toFixed(0) + "°";
            element.querySelector(".distance").innerHTML = this.model.unitChooser.chooseDistance((airport.distance * 1.852).toFixed(1) + "<span class='small'>KM</span>", airport.distance.toFixed(1) + "<span class='small'>NM</span>");
            elements.push(element);
        }

        let firstElement = listElement.firstChild;
        let previousElement = null;
        let modifications = 0;
        let first = true;
        for (let element of elements) {
            if (previousElement && previousElement.nextSibling == element || (first && firstElement == element)) {
            } else {
                if (previousElement && previousElement.nextSibling) {
                    listElement.insertBefore(element, first ? listElement.firstChild : previousElement.nextSibling);
                } else {
                    if (first) {
                        listElement.insertBefore(element, listElement.firstChild);
                    } else {
                        listElement.appendChild(element);
                    }
                }
                modifications++;
            }
            previousElement = element;
            first = false;
        }
        let removed = 0;
        if (previousElement) {
            let remove = previousElement.nextSibling;
            while (remove) {
                let next = remove.nextSibling;
                listElement.removeChild(remove);
                remove = next;
                removed++;
            }
        }
        console.log("Modifications: " + modifications);
        console.log("Removed: " + removed);
    }
    update(dt) {
        if (this.model)
            this.model.update(dt);
    }
    exit() {
        this.popInput();
    }
    enter(inputStack) {
        this.inputStack = inputStack;
        this.browseAirports();
    }
    activate() {
        this.previousMenu = this.model.softKeyController.currentMenu;
        this.model.softKeyController.setMenu(this.menu);
    }
    deactivate() {
        this.model.softKeyController.setMenu(this.previousMenu);
    }
}
customElements.define("g1000-nearest-airports-page", WT_Nearest_Airports_View);