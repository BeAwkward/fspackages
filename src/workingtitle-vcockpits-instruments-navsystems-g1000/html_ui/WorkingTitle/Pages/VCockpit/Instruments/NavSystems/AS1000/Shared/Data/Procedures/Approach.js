class WT_Approach_Procedure extends WT_Procedure {
    /**
     * @param {number} index 
     * @param {string} name 
     * @param {*} runway 
     * @param {Frequency} frequency 
     * @param {WT_Procedure_Leg[]} finalLegs 
     * @param {WT_Approach_Transition[]} transitions 
     */
    constructor(index, name, runway, frequency, finalLegs, transitions) {
        super(name, index);
        this.runway = runway;
        this.primaryFrequency = frequency;
        this.finalLegs = finalLegs;
        this.transitions = transitions;
    }
    /**
     * @param {WT_Procedure_Leg[]} legs 
     */
    getFinalLegs() {
        return this.finalLegs;
    }
    /**
     * @returns {WT_Approach_Transition}
     */
    getTransition(transitionIndex) {
        return this.transitions[transitionIndex];
    }
    /**
     * @returns {WT_Approach_Transition[]}
     */
    getTransitions() {
        return this.transitions;
    }
    /**
     * @returns {Frequency}
     */
    getPrimaryFrequency() {
        return this.primaryFrequency;
    }
}

class WT_Selected_Approach_Procedure extends WT_Selected_Procedure {
    /**
     * @param {WT_Approach_Procedure} procedure 
     */
    constructor(procedure) {
        super();
        this.procedure = procedure;
        this.transitionIndex = null;
        this.finalLegsWaypoints = new WT_Procedure_Waypoints(procedure.getFinalLegs());
        this.updateSequence();
    }
    updateSequence() {
        this.transitionWaypoints = this.transitionIndex === null ? null : new WT_Procedure_Waypoints(this.procedure.getTransition(this.transitionIndex).legs);
    }
    setTransitionIndex(index) {
        if (this.transitionIndex !== index) {
            this.transitionIndex = index;
            this.updateSequence();
            this.onUpdated.fire(this);
        }
    }
    /**
     * @returns {WT_Procedure_Waypoints[]}
     */
    getAllTransitionLegs() {
        return this.procedure.getTransitions().map(transition => new WT_Procedure_Waypoints(transition.legs));
    }
    getSequence() {
        let waypoints = [];
        if (this.transitionWaypoints !== null) {
            waypoints.push(...this.transitionWaypoints.waypoints);
        }
        waypoints.push(...this.finalLegsWaypoints.waypoints);

        this.outputWaypointsToConsole(waypoints);

        return waypoints;
    }
    getAirport() {
        return this.procedure.airport;
    }
    async load(flightPlan) {
        return new Promise(resolve => {
            console.log(`Setting destination to ${this.procedure.icao}...`);
            flightPlan.setDestination(this.procedure.icao, () => {
                console.log(`Loading approach ${this.procedure.procedureIndex} transition ${this.transitionIndex}...`);
                flightPlan.setApproachIndex(this.procedure.procedureIndex, () => {
                    console.log("Set approach index");
                    resolve();
                }, this.transitionIndex);
            });
        });
    }
    async activate(flightPlan) {
        console.log("Activating approach...");
        await this.load(flightPlan);
        flightPlan.activateApproach();
    }
}