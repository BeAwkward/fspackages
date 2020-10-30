class WT_Departure_Procedure extends WT_Procedure {
    constructor(index, name, runwayCoordinates, runwayTransitions, commonLegs, enRouteTransitions) {
        super(name, index);
        this.runwayCoordinates = runwayCoordinates;
        this.runwayTransitions = runwayTransitions;
        this.commonLegs = commonLegs;
        this.enRouteTransitions = enRouteTransitions;
    }
    /**
     * @param {WT_Procedure_Leg[]} legs 
     */
    getCommonLegs() {
        return this.commonLegs;
    }
    getRunwayTransition(transitionIndex) {
        return this.runwayTransitions[transitionIndex];
    }
    getRunwayTransitions() {
        return this.runwayTransitions;
    }
    getEnRouteTransition(transitionIndex) {
        return this.enRouteTransitions[transitionIndex];
    }
    getEnRouteTransitions() {
        return this.enRouteTransitions;
    }
}

class WT_Selected_Departure_Procedure extends WT_Selected_Procedure {
    /**
     * @param {WT_Departure_Procedure} procedure 
     */
    constructor(procedure) {
        super();
        this.procedure = procedure;
        this.runwayTransitionIndex = null;
        this.enRouteTransitionIndex = null;
    }
    setRunwayTransitionIndex(index) {
        if (this.runwayTransitionIndex !== index) {
            this.runwayTransitionIndex = index;
            this.onUpdated.fire(this);
        }
    }
    setEnRouteTransitionIndex(index) {
        if (this.enRouteTransitionIndex !== index) {
            this.enRouteTransitionIndex = index;
            this.onUpdated.fire(this);
        }
    }
    /**
     * @returns {WT_Procedure_Waypoints[]}
     */
    getAllTransitionLegs() {
        let transitions = [];
        console.log(`${this.procedure.getEnRouteTransitions().length} transitions`);
        for (let transition of this.procedure.getEnRouteTransitions()) {
            let legs = [];
            legs.push(this.getAirportLeg());
            legs.push(...transition.legs);
            let waypoints = new WT_Procedure_Waypoints(legs);
            transitions.push(waypoints);
        }
        return transitions;
    }
    getAirportLeg() {
        let leg = new WT_Procedure_Leg({
            type: 18,
            distance: 0,
            course: 0,
            theta: 0,
            rho: 0,
            turnDirection: 0,
        })
        leg.setFix({
            ident: "RW",
            coordinates: this.procedure.runwayCoordinates
        });

        return leg;
    }
    getSequence() {
        let legs = [];
        legs.push(this.getAirportLeg());
        if (this.runwayTransitionIndex !== null) {
            legs.push(...this.procedure.getRunwayTransition(this.runwayTransitionIndex).legs);
        }
        legs.push(...this.procedure.getCommonLegs());
        if (this.enRouteTransitionIndex !== null) {
            legs.push(...this.procedure.getEnRouteTransition(this.enRouteTransitionIndex).legs);
        }
        let waypointCollection = new WT_Procedure_Waypoints(legs);
        let waypoints = waypointCollection.waypoints;

        let header = ` ID  TYPE ORGIN /   FIX   DIST   Θ     ρ  BRG TURN`;
        let headerText = `${this.procedure.name} / ${this.runwayTransitionIndex} / ${this.enRouteTransitionIndex}`;
        let str = `${"".padStart((header.length - headerText.length - 2) / 2, "-")} ${headerText} ${"".padStart(Math.ceil((header.length - headerText.length - 2) / 2), "-")}\n`;
        str += header + "\n";
        str += "".padStart(header.length, "-") + "\n";
        let i = 0;
        str += waypoints.map(waypoint => {//${waypoint.coordinates.lat.toFixed(4)},${waypoint.coordinates.long.toFixed(4)}
            let vars = [
                `[${(i++).toFixed(0).padStart(2, " ")}]`,
                "-",
                waypoint.leg.type.toFixed(0).padStart(2, " "),
                waypoint.leg.origin ? waypoint.leg.origin.ident.padStart(6, " ") : "     ",
                "/",
                waypoint.leg.fix ? waypoint.leg.fix.ident.padStart(5, " ") : "     ",
                waypoint.leg.distance.toFixed(1).padStart(4, " ") + "ɴᴍ",
                waypoint.leg.theta.toFixed(0).padStart(3, " "),
                waypoint.leg.rho.toFixed(0).padStart(5, " "),
                `${waypoint.leg.bearing.toFixed(0).padStart(3, " ")}°`,
                (waypoint.leg.turnDirection ? waypoint.leg.turnDirection : 0).toFixed(0).padStart(4, " ")
            ]
            return vars.join(" ") + "\n";
        }).join("");
        str += "".padStart(header.length, "-") + "\n";
        console.log(str);

        //console.log(JSON.stringify(waypoints, null, 2));

        return waypoints;
    }
    getAirport() {
        return this.procedure.airport;
    }
    load(flightPlan) {
    }
}