class WT_Map_Setup_Source {
    constructor() {
        this.listeners = [];
    }
    addListener(listener) {
        this.listeners.push(listener);
    }
    fireListeners(key) {
        this.listeners.forEach(listener => listener(key, this.getValue(key)));
    }
    getValue(key) {
        throw new Error("WT_Map_Setup_Source.getValue not implemented");
    }
}

class WT_Map_Setup {
    constructor(defaults) {
        this.listeners = [];
        this.values = {};

        this.defaults = defaults;
        this.load(defaults);
    }
    getStorageKey(key) {
        return `MapSetup.${key}`;
    }
    load(defaults) {
        for (let key in defaults) {
            this.values[key] = WTDataStore.get(this.getStorageKey(key), defaults[key]);
        }
    }
    saveKey(key) {
        const storageKey = this.getStorageKey(key);
        if (this.defaults[key] != this.values[key]) {
            console.log(`Stored ${key} as ${this.values[key]}`);
            WTDataStore.set(storageKey, this.values[key]);
        } else {
            WTDataStore.remove(storageKey);
        }
    }
    saveAll() {
        for (let key in this.values) {
            this.saveKey(key);
        }
    }
    addListener(listener) {
        this.listeners.push(listener);
    }
    fireListeners(key) {
        this.listeners.forEach(listener => listener(key, this.getValue(key)));
    }
    getValue(key) {
        if (key in this.values) {
            return this.values[key];
        }
        if (key in this.defaults) {
            return this.defaults[key];
        }
        throw new Error("Map setting key was invalid");
    }
    setValue(key, value) {
        if (typeof this.defaults[key] == "boolean") {
            value = value == "On";
        }
        if (typeof this.defaults[key] == "number") {
            value = parseInt(value);
        }
        console.log(`Set ${key} to ${value}`);
        this.values[key] = value;
        this.saveKey(key);
        this.fireListeners(key);
    }
    resetToDefaults() {
        for (let key in this.defaults) {
            const storageKey = this.getStorageKey(key);
            WTDataStore.remove(storageKey);
            this.values[key] = this.defaults[key];
            this.fireListeners(key);
        }
    }
}
WT_Map_Setup.DEFAULT = {
    // Map
    orientation: "north",
    autoZoom: "all on",
    trackVectorEnabled: true,
    trackVectorLength: 60,
    windVectorEnabled: true,
    navRangeRingEnabled: true,
    topographyEnabled: true,
    topographyMaxRange: 4000,
    terrainDataEnabled: false,
    fuelRingEnabled: true,
    fuelRingReserveTime: 45 * 60,
    fieldOfViewEnabled: true,

    // Land
    latLongText: "small",
    latLongRange: 0,
    freewayRange: 300,
    nationalHighwayRange: 30,
    localRoadRangeRange: 8,
    railroadRange: 15,
    largeCityText: "medium",
    largeCityRange: 800,
    mediumCityText: "medium",
    mediumCityRange: 100,
    smallCityText: "medium",
    smallCityRange: 20,
    stateProvinceText: "large",
    stateProvinceRange: 800,
    riverLakeText: "small",
    riverLakeRange: 200,
    userWaypointText: "small",
    userWaypointRange: 150,

    // Aviation
    largeAirportText: "medium",
    largeAirportRange: 800,
    mediumAirportText: "medium",
    mediumAirportRange: 100,
    smallAirportText: "medium",
    smallAirportRange: 20,
    intersectionText: "medium",
    intersectionRange: 800,
    vorText: "medium",
    vorRange: 100,
    ndbText: "medium",
    ndbRange: 20,
}

class WT_Map_Setup_Handler {
    /**
     * @param {WT_Map_Setup} mapSetup 
     * @param {MapInstrument} map 
     */
    constructor(mapSetup, map) {
        this.mapSetup = mapSetup;
        this.map = map;

        this.handlers = this.getHandlers();
        this.setInitialValues(this.handlers);
        this.mapSetup.addListener((key, value) => {
            if (key in this.handlers) {
                this.handlers[key](value);
            }
        });
    }
    getHandlers() {
        const m = this.map;
        return {
            trackVectorEnabled: value => m.showTrackVector = value,
            trackVectorLength: value => m.trackVectorElement.lookahead = value,
            orientation: value => {
                switch (value) {
                    case "north": {
                        m.rotateWithPlane(false);
                        m.planeTrackedPosY = 0.5;
                        return;
                    }
                    case "track": {
                        m.rotateWithPlane(true);
                        m.planeTrackedPosY = 2 / 3;
                        return;
                    }
                    case "heading": {
                        m.rotateWithPlane(true);
                        m.planeTrackedPosY = 2 / 3;
                        return;
                    }
                }
            },
            terrainDataEnabled: value => {
                if (value) {
                    m.mapConfigId = 2;
                    m.bingMapRef = EBingReference.PLANE;
                } else {
                    m.mapConfigId = 1;
                    m.bingMapRef = EBingReference.SEA;
                }
            },
            fuelRingEnabled: value => m.showFuelRing = value,
            fuelRingReserveTime: value => m.fuelRingElement.reserveFuelTime = value / 60,
            navRangeRingEnabled: value => {
                m.showRangeRing = value;
                m.showRangeCompass = value;
            },
            smallCityRange: value => m.smallCityMaxRangeIndex = value,
            mediumCityRange: value => m.medCityMaxRangeIndex = value,
            largeCityRange: value => m.largeCityMaxRangeIndex = value,
            smallAirportRange: value => m.smallAirportMaxRangeIndex = value,
            mediumAirportRange: value => m.medAirportMaxRangeIndex = value,
            largeAirportRange: value => m.largeAirportMaxRangeIndex = value,
            intersectionRange: value => m.intMaxRangeIndex = value,
            vorRange: value => m.vorMaxRangeIndex = value,
            ndbRange: value => m.ndbMaxRangeIndex = value,
        }
    }
    setInitialValues(handlers) {
        for (let key in handlers) {
            handlers[key](this.mapSetup.getValue(key));
        }
    }
}

class WT_Map_Setup_Model {
    /**
     * @param {WT_Map_Setup} setup 
     */
    constructor(setup) {
        this.mapSetup = setup;
        this.maxRanges = {
            freeway: 800,
            nationalHighway: 80,
            localHighway: 30,
            localRoad: 15,
            railroad: 30,
            largeCity: 1500,
            mediumCity: 200,
            smallCity: 50,
            stateProvince: 1500,
            river: 500,
            userWaypoint: 300,
            largeAirport: 1500,
            mediumAirport: 300,
            smallAirport: 100,
            intersection: 30,
            ndb: 30,
            vor: 300,
        }
    }
    setValue(key, value) {
        this.mapSetup.setValue(key, value);
    }
    getValue(key) {
        return this.mapSetup.getValue(key);
    }
}

class WT_Map_Setup_Input_Layer extends Selectables_Input_Layer {
    constructor(view) {
        super(new Selectables_Input_Layer_Dynamic_Source(view));
        this.view = view;
    }
    onCLR() {
        this.view.exit();
    }
    onNavigationPush() {
        this.view.exit();
    }
    onMenuPush() {

    }
}

class WT_Map_Setup_View extends WT_HTML_View {
    /**
     * @param {WT_MFD_Soft_Key_Menu_Handler} softKeyMenuHandler 
     * @param {MapInstrument} map 
     */
    constructor(softKeyMenuHandler, map) {
        super();
        this.softKeyMenuHandler = softKeyMenuHandler;
        this.map = map;

        this.inputLayer = new WT_Map_Setup_Input_Layer(this);
        this.onExit = new WT_Event();

        this.rangeDropDownKeys = [
            "freeway", "nationalHighway", "localHighway", "localRoad", "railroad",
            "largeCity", "mediumCity", "smallCity",
            "stateProvince", "river", "userWaypoint",
            "largeAirport", "mediumAirport", "smallAirport",
            "intersection", "vor", "ndb",
        ]
    }
    connectedCallback() {
        const template = document.getElementById('map-setup-pane');
        this.appendChild(template.content.cloneNode(true));
        super.connectedCallback();

        DOMUtilities.AddScopedEventListener(this, ".options", "input", (e) => {
            this.model.setValue(e.target.dataset.setting, e.target.value);
        });
    }
    /**
     * @param {WT_Map_Setup_Model} model 
     */
    setModel(model) {
        this.model = model;

        for (let rangeDropDownKey of this.rangeDropDownKeys) {
            const dropDown = this.elements[`${rangeDropDownKey}Range`];
            if (!dropDown)
                continue;
            const maxRange = this.model.maxRanges[rangeDropDownKey];
            dropDown.clearOptions();
            dropDown.addOption(-1, "Off");
            for (let i = 0; i < this.map.zoomRanges.length; i++) {
                const range = this.map.zoomRanges[i];
                if (range <= maxRange) {
                    dropDown.addOption(i, range >= 1 ? `${range}<span class="units">NM</span>` : `${(range * 6076.12).toFixed(0)}<span class="units">FT</span>`);
                }
            }
        }

        for (let element of this.querySelectorAll("[data-setting]")) {
            const value = this.model.getValue(element.dataset.setting);
            if (typeof variable === "boolean") {
                element.value = value ? "On" : "Off";
            } else {
                element.value = value;
            }
        }
    }
    setGroup(group) {
        for (let element of this.querySelectorAll(".options")) {
            element.removeAttribute("visible");
        }
        this.querySelector(`[data-group=${group}]`).setAttribute("visible", "");
    }
    enter(inputStack) {
        this.inputStackHandle = inputStack.push(this.inputLayer);
        this.inputStackHandle.onPopped.subscribe(() => {
            this.onExit.fire();
        });
    }
    exit() {
        if (this.inputStackHandle) {
            this.inputStackHandle = this.inputStackHandle.pop();
        }
    }
    activate() {
        this.menuHandler = this.softKeyMenuHandler.show(null);
    }
    deactivate() {
        if (this.menuHandler) {
            this.menuHandler = this.menuHandler.pop();
        }
    }
}
customElements.define("g1000-map-setup-pane", WT_Map_Setup_View);