/**
 * A flight plan managed by the FlightPlanManager.
 */
class ManagedFlightPlan {

  constructor() {

    /**
     * The collection of waypoints in this flight plan.
     * @type {WayPoint[]}
     */
    this._waypoints = [];

    /**
     * The parent instrument this flight plan is attached to locally.
     * @type {BaseInstrument}
     */
    this._parentInstrument;

    /** Whether or not the flight plan has an origin airfield. */
    this._hasOrigin = false;

    /** Whether or not the flight plan has a destination airfield. */
    this._hasDestination = false;

    /** The index where the departure segment starts in the flight plan. */
    this.departureStart = -1;

    /** The index where the enroute segment starts in the flight plan. */
    this.enrouteStart = -1;

    /** The index where the arrival begins in the flight plan. */
    this.arrivalStart = -1;

    /** The index where the approach starts in the flight plan. */
    this.approachStart = -1;

    /** The cruise altitude for this flight plan. */
    this.cruiseAltitude = 0;

    /** The index of the currently active waypoint. */
    this.activeWaypointIndex = 0;

    /** The details for selected procedures on this flight plan. */
    this.procedureDetails = new ProcedureDetails();

    /** The details of any direct-to procedures on this flight plan. */
    this.directTo = new DirectTo();
  }

  /** The length of the flight plan */
  get length() { return this._waypoints.length; }

  /** The departure segment of the flight plan. */
  get departure() { return new FlightPlanSegment(0, this._waypoints.slice(0, this.enrouteStart)); }

  /** The enroute segment of the flight plan. */
  get enroute() { return new FlightPlanSegment(this.enrouteStart, this._waypoints.slice(this.enrouteStart, this.arrivalStart)); }

  /** The arrival segment of the flight plan. */
  get arrival() { return new FlightPlanSegment(this.arrivalStart, this._waypoints.slice(this.arrivalStart, this.approachStart)); }

  /** The approach segment of the flight plan. */
  get approach() { return new FlightPlanSegment(this.approachStart, this._waypoints.slice(this.approachStart, this._waypoints.length)); }

  /** The waypoints of the flight plan. */
  get waypoints() { return [...this._waypoints]; }

  /** Whether the flight plan has an origin airfield. */
  get hasOrigin() { return this._hasOrigin; }

  /** Whether the flight plan has a destination airfield. */
  get hasDestination() { return this._hasDestination; }

  /** The currently active waypoint. */
  get activeWaypoint() { return this._waypoints[this.activeWaypointIndex]; }

  /**
   * Sets the parent instrument that the flight plan is attached to locally.
   * @param {BaseInstrument} instrument 
   */
  setParentInstrument(instrument) {
    this._parentInstrument = instrument;
  }

  /**
   * Clears the flight plan.
   */
  async clearPlan() {
    
    this._hasOrigin = false;
    this._hasDestination = false;

    this.arrivalStart = -1;
    this.enrouteStart = -1;
    this.approachStart = -1;
    this.departureStart = -1;

    this.cruiseAltitude = 0;
    this.activeWaypointIndex = 0;
    
    this.procedureDetails = new ProcedureDetails();
    this.directTo = new DirectTo();

    await GPS.clearPlan();
    this._waypoints = [];
  }

  /**
   * Syncs the flight plan to FS9GPS.
   */
  async syncToGPS() {
    await GPS.clearPlan();
    for (var i = 0; i < this._waypoints.length; i++) {
      const waypoint = this._waypoints[i];

      if (waypoint.icao && waypoint.icao.trim() !== '') {
        await GPS.addIcaoWaypoint(waypoint.icao, i);
      }
      else {
        await GPS.addUserWaypoint(waypoint.infos.coordinates.lat, waypoint.infos.coordinates.long, i, waypoint.ident);
      }
    }

    await GPS.setActiveWaypoint(this.activeWaypointIndex);
    await GPS.logCurrentPlan();
  }

  /**
   * Adds a waypoint to the flight plan.
   * @param {WayPoint} waypoint The waypoint to add.
   * @param {Number} index The index to add the waypoint at. If ommitted or if larger than the
   * flight plan length, the waypoint will be appended to the end of the flight plan.
   * @param {Boolean} replace Whether or not to replace the waypoint at the specified index
   * instead of inserting or appending.
   */
  async addWaypoint(waypoint, index) {

    const mappedWaypoint = (waypoint instanceof WayPoint) ? waypoint : RawDataMapper.toWaypoint(waypoint, this._parentInstrument);

    if (index === undefined || index >= this._waypoints.length) {
      this._waypoints.push(mappedWaypoint);
      index = this._waypoints.length - 1;
    }
    else {
      this._waypoints.splice(index, 0, mappedWaypoint);
    }
    
    this._shiftSegmentIndexes(mappedWaypoint, index);
    this._reflowDistances();
  }

  /**
   * Removes a waypoint from the flight plan.
   * @param {Number} index The index of the waypoint to remove.
   */
  async removeWaypoint(index) {
    let waypoint;

    if (index === undefined || index >= this._waypoints.length) {
      index = this._waypoints.length;
      waypoint = this._waypoints.pop()
    }
    else {
      waypoint = this._waypoints[index];
      this._waypoints.splice(index, 1);
    }
    
    this._unshiftSegmentIndexes(waypoint, index);
    this._reflowDistances();
  }

  /**
   * Gets a waypoint by index from the flight plan.
   * @param {Number} index The index of the waypoint to get.
   */
  getWaypoint(index) {
    if (index >= 0 && index < this._waypoints.length) {
      return this._waypoints[index];
    }

    return undefined;
  }

  /**
   * Shifts waypoint segment indexes up after a waypoint addition.
   * @param {WayPoint} waypoint The waypoint that is being added.
   * @param {Number} index The index that the waypoint is being added at.
   */
  async _shiftSegmentIndexes(waypoint, index) {
    if (index === 0 && waypoint.type === 'A') {
      this._hasOrigin = true;
      this.departureStart = 1;

      this.enrouteStart++;
      this.arrivalStart = Math.max(this.enrouteStart + 1, this.arrivalStart + 1);
      this.approachStart = Math.max(this.arrivalStart, this.approachStart + 1);
    }
    else if (index === this._waypoints.length - 1 && this._waypoints.length > 1 && waypoint.type === 'A') {
      this._hasDestination = true;
    }
    else {
      if (index < this.enrouteStart) this.enrouteStart++;
      if (index <= this.arrivalStart) this.arrivalStart = Math.max(this.enrouteStart + 1, this.arrivalStart + 1);
      if (index <= this.approachStart) this.approachStart = Math.max(this.arrivalStart, this.approachStart + 1);
    }

    if (index < this.activeWaypointIndex) this.activeWaypointIndex++;
    if (this.directTo.isActive && this.directTo.waypointIsInFlightPlan && index < this.directTo.waypointIndex) {
      this.directTo.waypointIndex++;
    }
  }

  /**
   * Shifts waypoint segment indexes down after a waypoint removal.
   * @param {WayPoint} waypoint The waypoint that is being removed.
   * @param {Number} index The index that the waypoint is being removed at.
   */
  _unshiftSegmentIndexes(waypoint, index) {
    if (index === 0 && waypoint.type === 'A') {
      this._hasOrigin = false;
      this.departureStart = 0;
      this.enrouteStart--;
      this.arrivalStart--;
      this.approachStart--;
    }
    else if (index === this._waypoints.length - 1 && this._waypoints.length > 1 && waypoint.type === 'A') {
      this._hasDestination = false;
    }
    else {
      if (index < this.approachStart) this.approachStart--;
      if (index < this.arrivalStart) this.arrivalStart--;
      if (index < this.enrouteStart) this.enrouteStart--;
    }

    if (index < this.activeWaypointIndex) this.activeWaypointIndex--;
    if (this.directTo.isActive && this.directTo.waypointIsInFlightPlan && index < this.directTo.waypointIndex) {
      this.directTo.waypointIndex--;
    }
  }

  /**
   * Recalculates all waypoint bearings and distances in the flight plan.
   */
  _reflowDistances() {
    let cumulativeDistance = 0;

    for (var i = 0; i < this._waypoints.length; i++) {
      if (i > 0) {

        //If there's an approach selected and this is the last approach waypoint, use the destination waypoint for coordinates
        //Runway waypoints do not have coordinates
        const referenceWaypoint = this._waypoints[i];
        const waypoint = (this.procedureDetails.approachSelected && i === this._waypoints.length - 2) ? this._waypoints[i + 1] : this._waypoints[i];
        const prevWaypoint = (this.procedureDetails.approachSelected && i === this._waypoints.length - 1) ? this._waypoints[i - 2] : this._waypoints[i - 1];

        referenceWaypoint.bearingInFP = Avionics.Utils.computeGreatCircleHeading(prevWaypoint.infos.coordinates, waypoint.infos.coordinates);
        referenceWaypoint.distanceInFP = Avionics.Utils.computeGreatCircleDistance(prevWaypoint.infos.coordinates, waypoint.infos.coordinates);
        
        cumulativeDistance += referenceWaypoint.distanceInFP;
        referenceWaypoint.cumulativeDistanceInFP = cumulativeDistance;
      }
    }
  }

  /**
   * Adds a discontinuity to the flight plan.
   * @param {Number} index The index to add the discontinuity at. If ommitted or if larger than the
   * flight plan length, the waypoint will be appended to the end of the flight plan.
   */
  addDiscontinuity(index) {
    const discontinuity = new DiscontinuityWayPointInfo();
    const waypoint = new WayPoint(this._parentInstrument);

    waypoint.type = DiscontinuityWayPointInfo.WayPointType;
    waypoint.infos = discontinuity;

    this.addWaypoint(waypoint, index);
  }

  /**
   * Adds a vectors instruction to the flight plan.
   * @param {Number} index The index to add the vectors at. If ommitted or if larger than the
   * flight plan length, the waypoint will be appended to the end of the flight plan.
   */
  addVectors(index) {
    const vectors = new VectorsWayPointInfo();
    const waypoint = new WayPoint(this._parentInstrument);

    waypoint.type = VectorsWayPointInfo.WayPointType;
    waypoint.infos = vectors;

    this.addWaypoint(waypoint, index);
  }

  /**
   * Adds a bearing a distance waypoint to the flight plan.
   * @param {Number} bearing The bearing, in degrees, from the reference fix.
   * @param {Number} distance The distance, in NM, from the reference fix along the bearing.
   * @param {WayPoint} waypoint The reference fix for this bearing/distance waypoint.
   * @param {Number} index The index to add the waypoint at. If ommitted or if larger than the
   * flight plan length, the waypoint will be appended to the end of the flight plan.
   */
  addBearingAndDistance(bearing, distance, waypoint, index) {
    const bearingAndDistance = new BearingDistanceWayPointInfo();

    bearingAndDistance.bearing = bearing;
    bearingAndDistance.distance = distance;
    bearingAndDistance.referenceFix = waypoint;

    const computedCoordinates = this.computeCoordsFromBearingAndDistance(waypoint.infos.coordinates.lat, waypoint.infos.coordinates.long, bearing, distance);
    bearingAndDistance.coordinates = new LatLongAlt(computedCoordinates.lat, computedCoordinates.lon);

    const bearingDistancewaypoint = new WayPoint(this._parentInstrument);
    waypoint.type = BearingDistanceWayPointInfo.WayPointType;
    waypoint.infos = bearingAndDistance;

    this.addWaypoint(bearingDistancewaypoint, index);
  }

  /**
   * Adds an altitude and turn waypoint to the flight plan.
   * @param {Number} altitude The altitude to target.
   * @param {Number} hasInbound Whether or not this waypoint has an inbound track.
   * @param {Number} hasOutbound Whether or not this waypoint has an outbound track.
   * @param {Number} inboundTrack The inbound track of the waypoint, if any.
   * @param {Number} outboundTrack The outbound track of the waypoint, if any.
   * @param {Number} index The index to add the waypoint at. If ommitted or if larger than the
   * flight plan length, the waypoint will be appended to the end of the flight plan.
   */
  addAltitudeTurn(altitude, hasInbound, hasOutbound, inboundTrack, outboundTrack, index) {
    const altitudeTurn = new AltitudeTurnWayPointInfo();

    altitudeTurn.coordinates = new LatLongAlt(0, 0, altitude);
    altitudeTurn.hasInboundTrack = hasInbound;
    altitudeTurn.hasOutboundTrack = hasOutbound;
    altitudeTurn.inboundTrack = inboundTrack;
    altitudeTurn.outboundTrack = outboundTrack;

    const waypoint = new WayPoint(this._parentInstrument);
    waypoint.type = AltitudeTurnWayPointInfo.WayPointType;
    waypoint.infos = altitudeTurn;

    this.addWaypoint(waypoint, index);
  }

  /**
   * Adds a radius about a reference fix to the flight plan.
   * @param {Number} radius The radius, in NM, around the reference fix. 
   * @param {WayPoint} waypoint The reference fix for this radius waypoint.
   * @param {Number} index The index to add the waypoint at. If ommitted or if larger than the
   * flight plan length, the waypoint will be appended to the end of the flight plan.
   */
  addRadius(radius, waypoint, index) {
    const radiusFix = new RadiusFixWayPointInfo();
    radiusFix.radius = radius;
    radiusFix.referenceFix = waypoint;

    const radiusWaypoint = new WayPoint(this._parentInstrument);
    waypoint.type = RadiusFixWayPointInfo.WayPointType;
    waypoint.infos = radiusFix;

    this.addWaypoint(radiusWaypoint, index);
  }

  

  /**
   * Copies a sanitized version of the flight plan for shared data storage.
   * @returns {ManagedFlightPlan} The sanitized flight plan.
   */
  copySanitized() {

    let sanitized = Object.assign({}, this);
    delete sanitized._parentInstrument;

    sanitized._waypoints = this._waypoints.map(waypoint => {
      let clone = Object.assign({}, waypoint);
      clone.infos = Object.assign({}, clone.infos);

      const visitObject = (obj) => {

        if (Array.isArray(obj)) {
          obj = [...obj];
        }
        else {
          obj = Object.assign({}, obj);
        }

        delete obj.instrument;
        delete obj._svgElements;

        for(var key in obj) {
          if (typeof obj[key] === 'object') {
            obj[key] = visitObject(obj[key]);
          }
        }

        return obj;
      };

      clone = visitObject(clone);
      return clone;
    });

    return sanitized;
  }

  /**
   * Copies the flight plan.
   * @returns {ManagedFlightPlan} The copied flight plan.
   */
  copy() {
    let newFlightPlan = Object.assign(new ManagedFlightPlan(), this);
    newFlightPlan._waypoints = [...this._waypoints];

    return newFlightPlan;
  }

  /**
   * Reverses the flight plan.
   */
  reverse() {
    //TODO: Fix flight plan indexes after reversal
    this._waypoints.reverse();
  }

  /**
   * Builds a departure into the flight plan from indexes in the departure airport information.
   */
  async buildDeparture() {
      const legs = [];
      const origin = this._waypoints[0];

      const departureIndex = this.procedureDetails.departureIndex;
      const runwayIndex = this.procedureDetails.departureRunwayIndex;
      const transitionIndex = this.procedureDetails.departureTransitionIndex;

      if (departureIndex !== -1 && runwayIndex !== -1) {
        const runwayTransition = origin.infos.departures[departureIndex].runwayTransitions[runwayIndex];
        legs.push(...runwayTransition.legs);
      }

      if (departureIndex !== -1) {
        legs.push(...origin.infos.departures[departureIndex].commonLegs);
      }

      if (transitionIndex !== -1) {
        const transition = origin.infos.enRouteTransitions[transitionIndex].legs;
        legs.push(...transition);
      }

      for (var i = this.departureStart; i < this.enrouteStart; i++) {
        await this.removeWaypoint(i);
      }

      const procedure = new LegsProcedure(legs, this._waypoints[0], this._parentInstrument);
      let waypointIndex = this.departureStart;
      while (procedure.hasNext()) {
        await this.addWaypoint(await procedure.getNext(), ++waypointIndex);
      }
  }

  /**
   * Builds an arrival into the flight plan from indexes in the arrival airport information.
   */
  async buildArrival() {
    const legs = [];
    const destination = this._waypoints[this._waypoints.length - 1];

    const arrivalIndex = this.procedureDetails.arrivalIndex;
    const arrivalRunwayIndex = this.procedureDetails.arrivalRunwayIndex;
    const arrivalTransitionIndex = this.procedureDetails.arrivalTransitionIndex;

    if (arrivalIndex !== -1 && arrivalTransitionIndex !== -1) {
      const transition = destination.infos.arrivals[arrivalIndex].enRouteTransitions[arrivalTransitionIndex].legs;
      legs.push(...transition);
    }

    if (arrivalIndex !== -1) {
      legs.push(...destination.infos.arrivals[arrivalIndex].commonLegs);
    }

    if (arrivalIndex !== -1 && arrivalRunwayIndex !== -1) {
      const runwayTransition = destination.infos.arrivals[arrivalIndex].runwayTransitions[arrivalRunwayIndex];
      legs.push(...runwayTransition.legs);
    }

    for (var i = this.arrivalStart; i < this.approachStart; i++) {
      await this.removeWaypoint(i);
    }

    const procedure = new LegsProcedure(legs, this._waypoints[0], this._parentInstrument);
    let waypointIndex = this.arrivalStart;

    while (procedure.hasNext()) {
      await this.addWaypoint(await procedure.getNext(), ++waypointIndex);
    }
  }

  /**
   * Builds an approach into the flight plan from indexes in the arrival airport information.
   */
  async buildApproach() {
    const legs = [];
    const destination = this._waypoints[this._waypoints.length - 1];

    const approachIndex = this.procedureDetails.approachIndex;
    const approachTransitionIndex = this.procedureDetails.approachTransitionIndex;

    if (approachIndex !== -1 && approachTransitionIndex !== -1) {
      const transition = destination.infos.approaches[approachIndex].transitions[approachTransitionIndex].legs;
      legs.push(...transition);
    }

    if (approachIndex !== -1) {
      legs.push(...destination.infos.approaches[approachIndex].finalLegs);
    }

    for (var i = this.approachStart; i < this._waypoints.length - 2; i++) {
      await this.removeWaypoint(i);
    }

    const procedure = new LegsProcedure(legs, this._waypoints[0], this._parentInstrument);
    let waypointIndex = this.approachStart;

    while (procedure.hasNext()) {
      await this.addWaypoint(await procedure.getNext(), ++waypointIndex);
    }
  }
}

/**
 * Converts a plain object into a ManagedFlightPlan.
 * @param {*} flightPlanObject The object to convert.
 * @param {BaseInstrument} parentInstrument The parent instrument attached to this flight plan.
 * @returns {ManagedFlightPlan} The converted ManagedFlightPlan.
 */
ManagedFlightPlan.fromObject = (flightPlanObject, parentInstrument) => {
  let plan = Object.assign(new ManagedFlightPlan(), flightPlanObject);
  plan.setParentInstrument(parentInstrument);

  plan.directTo = Object.assign(new DirectTo(), plan.directTo);


  const mapObject = (obj, parentType) => {
    if (obj&& obj.infos) {
      obj = Object.assign(new WayPoint(parentInstrument), obj);          
    }

    if(obj && obj.coordinates) {
      switch (parentType) {
        case 'A':
          obj = Object.assign(new AirportInfo(parentInstrument), obj);
          break;
        case 'W':
          obj = Object.assign(new IntersectionInfo(parentInstrument), obj);
          break;
        case 'V':
          obj = Object.assign(new VORInfo(parentInstrument), obj);
          break;
        case 'N':
          obj = Object.assign(new NDBInfo(parentInstrument), obj);
          break;
        default:
          obj = Object.assign(new WayPointInfo(parentInstrument), obj);
      }
      
      obj.coordinates = Object.assign(new LatLongAlt(), obj.coordinates);
    }

    return obj;
  };

  const visitObject = (obj) => {
    for(var key in obj) {
      if (typeof obj[key] === 'object' && obj[key] && obj[key].scroll === undefined) {
        if (Array.isArray(obj[key])) {
          visitArray(obj[key]);
        }
        else {  
          visitObject(obj[key]);
        }

        obj[key] = mapObject(obj[key], obj.type);
      }
    }
  };

  const visitArray = (array) => {
    array.forEach((item, index) => {
      if (Array.isArray(item)) {
        visitArray(item);      
      }
      else if (typeof item === 'object') {
        visitObject(item);
      }

      array[index] = mapObject(item);
    });
  };

  visitObject(plan);
  return plan;
};

/**
 * Methods for interacting with the FS9GPS subsystem.
 */
class GPS {

  /**
   * Clears the FS9GPS flight plan.
   */
  static async clearPlan() {
    const totalGpsWaypoints = SimVar.GetSimVarValue('C:fs9gps:FlightPlanWaypointsNumber', 'number');
    for (var i = 0; i < totalGpsWaypoints; i++) {

      //Always remove waypoint 0 here, which shifts the rest of the waypoints down one
      await GPS.deleteWaypoint(0);
    }
  }

  /**
   * Adds a waypoint to the FS9GPS flight plan by ICAO designation.
   * @param {String} icao The MSFS ICAO to add to the flight plan.
   * @param {Number} index The index of the waypoint to add in the flight plan.
   */
  static async addIcaoWaypoint(icao, index) {
    await SimVar.SetSimVarValue('C:fs9gps:FlightPlanNewWaypointICAO', 'string', icao);
    await SimVar.SetSimVarValue('C:fs9gps:FlightPlanAddWaypoint', 'number', index);
  }

  /**
   * Adds a user waypoint to the FS9GPS flight plan.
   * @param {Number} lat The latitude of the user waypoint.
   * @param {Number} lon The longitude of the user waypoint.
   * @param {Number} index The index of the waypoint to add in the flight plan.
   * @param {String} ident The ident of the waypoint.
   */
  static async addUserWaypoint(lat, lon, index, ident) {
    await SimVar.SetSimVarValue('C:fs9gps:FlightPlanNewWaypointLatitude', 'degrees', lat);
    await SimVar.SetSimVarValue('C:fs9gps:FlightPlanNewWaypointLongitude', 'degrees', lon);

    if (ident) {
      await SimVar.SetSimVarValue('C:fs9gps:FlightPlanNewWaypointIdent', 'string', ident);
    }

    await SimVar.SetSimVarValue('C:fs9gps:FlightPlanAddWaypoint', 'number', index); 
  }

  /**
   * Deletes a waypoint from the FS9GPS flight plan.
   * @param {Number} index The index of the waypoint in the flight plan to delete.
   */
  static async deleteWaypoint(index) {
    await SimVar.SetSimVarValue('C:fs9gps:FlightPlanDeleteWaypoint', 'number', index);
  }

  /**
   * Sets the active FS9GPS waypoint.
   * @param {Number} index The index of the waypoint to set active.
   */
  static async setActiveWaypoint(index) {
    await SimVar.SetSimVarValue('C:fs9gps:FlightPlanActiveWaypoint', 'number', index); 
  }

  /**
   * Gets the active FS9GPS waypoint.
   */
  static getActiveWaypoint() {
    return SimVar.GetSimVarValue('C:fs9gps:FlightPlanActiveWaypoint', 'number'); 
  }

  /**
   * Logs the current FS9GPS flight plan.
   */
  static async logCurrentPlan() {
    const waypointIdents = [];
    const totalGpsWaypoints = SimVar.GetSimVarValue('C:fs9gps:FlightPlanWaypointsNumber', 'number');

    for (var i = 0; i < totalGpsWaypoints; i++) {
      await SimVar.SetSimVarValue('C:fs9gps:FlightPlanWaypointIndex', 'number', i);
      waypointIdents.push(SimVar.GetSimVarValue('C:fs9gps:FlightPlanWaypointIdent', 'string'));
    }

    console.log(`GPS Plan: ${waypointIdents.join(' ')}`);
  }
}

/**
 * The details of procedures selected in the flight plan.
 */
class ProcedureDetails {

  constructor() {
    /** The index of the departure in the origin airport information. */
    this.departureIndex = -1;

    /** The index of the departure transition in the origin airport departure information. */
    this.departureTransitionIndex = -1;

    /** The index of the selected runway in the original airport departure information. */
    this.departureRunwayIndex = -1;

    /** The index of the arrival in the destination airport information. */
    this.arrivalIndex = -1;

    /** The index of the arrival transition in the destination airport arrival information. */
    this.arrivalTransitionIndex = -1;

    /** The index of the selected runway at the destination airport. */
    this.arrivalRunwayIndex = -1;

    /** The index of the apporach in the destination airport information.*/
    this.approachIndex = -1;

    /** The index of the approach transition in the destination airport approach information.*/
    this.approachTransitionIndex = -1;
  }
}

/**
 * Information about the current direct-to procedures in the flight plan.
 */
class DirectTo {
  constructor() {

    /** Whether or not the current direct-to is in the flight plan. */
    this.waypointIsInFlightPlan = false;

    /** Whether or not direct-to is active. */
    this.isActive = false;

    /**
     * The current direct-to waypoint, if not part of the flight plan.
     * @type {WayPoint}
     */
    this.waypoint = {};

    /** The current direct-to waypoint index, if part of the flight plan. */
    this.waypointIndex = 0;

    /**
     * The origin created when direct-to is activated.
     * @type {WayPoint}
     */
    this.origin = {}
  }

  /**
   * Activates direct-to with an external waypoint.
   * @param {WayPoint} waypoint The waypoint to fly direct-to.
   */
  activateFromWaypoint(waypoint) {
    this.isActive = true;
    this.waypoint = waypoint;
    this.waypointIsInFlightPlan = false;
  }

  /**
   * Cancels direct-to. 
   */
  cancel() {
    this.isActive = false;
    this.waypointIsInFlightPlan = false;

    this.waypoint = {};
    this.origin = {};
  }

  /**
   * Activates direct-to a waypoint already in the flight plan.
   * @param {Number} index The index of the waypoint in the flight plan.
   */
  activateFromIndex(index) {
    this.isActive = true;
    this.waypointIsInFlightPlan = true;
    this.waypointIndex = index;
  }
}

/**
 * A segment of a flight plan.
 */
class FlightPlanSegment {

  /**
   * Creates a new FlightPlanSegment.
   * @param {Number} offset The offset within the original flight plan that
   * the segment starts at.
   * @param {WayPoint[]} waypoints The waypoints in the flight plan segment. 
   */
  constructor(offset, waypoints) {

    /** The offset within the original flight plan that the segments starts at. */
    this.offset = offset;

    /** The waypoints in the flight plan segment. */
    this.waypoints = waypoints;
  }
}

/**
 * A waypoint that represents a flight plan discontinuity.
 */
class DiscontinuityWayPointInfo extends WayPointInfo {

  constructor() {
    super();

    /** Whether or not the waypoint is a discontinuity. */
    this.isDiscontinuity = true;
  }
  
}
DiscontinuityWayPointInfo.WayPointType = "D";

/**
 * A waypoint that represents a radius about a reference fix.
 */
class RadiusFixWayPointInfo extends WayPointInfo {
  
  constructor() {
    super();

    /** The radius, in NM, around the reference fix. */
    this.radius = 0;

    /**
     * The reference fix for this radius waypoint.
     * @type {WayPoint}
     */
    this.referenceFix = {};
  }
  
}
RadiusFixWayPointInfo.WayPointType = "R"

/**
 * A waypoint that represents a bearing and distance from a reference fix.
 */
class BearingDistanceWayPointInfo extends WayPointInfo {
  
  constructor() {
    super();

    /** The bearing, in degrees, from the reference fix. */
    this.bearing = 0;

    /** The distance, in NM, from the reference fix along the bearing. */
    this.distance = 0;

    /**
     * The reference fix for this bearing/distance waypoint.
     * @type {WayPoint}
     */
    this.referenceFix = {};
  }
  
}
BearingDistanceWayPointInfo.WayPointType = "BD";

/**
 * A waypoint that represents an altitude instruction with optional inbound
 * and outbound tracks.
 */
class AltitudeTurnWayPointInfo extends WayPointInfo {

  constructor() {
    super();

    /** Whether or not this waypoint has a specific inbound track. */
    this.hasInboundTrack = false;

    /** The bearing, in degress, of the inbound track. */
    this.inboundTrack = 0;

    /** Whether or not this waypoint has an outbound track. */
    this.hasOutboundTrack = false;

    /** The bearing, in degrees, of the outbound track. */
    this.outboundTrack = 0;
  }
  
}
AltitudeTurnWayPointInfo.WayPointType = "ALT";

/**
 * A waypoint that represents a vectors instruction.
 */
class VectorsWayPointInfo extends WayPointInfo {

  constructor() {
    super();

    /** Whether or not this waypoint is a vectors instruction. */
    this.isVectors = true;
  }

}
VectorsWayPointInfo.WayPointType = "VEC";

/** A class for mapping raw facility data to WayPoints. */
class RawDataMapper { }

/**
 * Maps a raw facility record to a WayPoint.
 * @param {*} facility The facility record to map.
 * @param {BaseInstrument} instrument The instrument to attach to the WayPoint.
 * @returns {WayPoint} The mapped waypoint.
 */
RawDataMapper.toWaypoint = (facility, instrument) => {
  const waypoint = new WayPoint(instrument);

  waypoint.ident = facility.icao.substring(7, 12).trim();
  waypoint.icao = facility.icao;
  waypoint.type = facility.icao[0];

  switch (waypoint.type) {
    case 'A':
      waypoint.infos = new AirportInfo(instrument);

      waypoint.infos.approaches = facility.approaches;
      waypoint.infos.approaches.forEach(approach => 
        approach.transitions.forEach(trans => trans.name = trans.legs[0].fixIcao.substring(7, 12).trim()));

      waypoint.infos.departures = facility.departures;
      waypoint.infos.departures.forEach(departure => 
        departure.runwayTransitions.forEach(trans => trans.name = RawDataMapper.generateRunwayTransitionName(trans)));

      waypoint.infos.arrivals = facility.arrivals;
      waypoint.infos.arrivals.forEach(arrival => 
        arrival.runwayTransitions.forEach(trans => trans.name = RawDataMapper.generateRunwayTransitionName(trans)));

      waypoint.infos.runways = facility.runways;

      waypoint.infos.oneWayRunways = [];
      facility.runways.forEach(runway => waypoint.infos.oneWayRunways.push(...Object.assign(new Runway(), runway).splitIfTwoWays()));

      waypoint.infos.oneWayRunways.sort(RawDataMapper.sortRunways);

      break;
    case 'V':
      waypoint.infos = new VORInfo(instrument);
      break;
    case 'N':
      waypoint.infos = new NDBInfo(instrument);
      break;
    case 'W':
      waypoint.infos = new IntersectionInfo(instrument);
      break;
    default:
      waypoint.infos = new WayPointInfo(instrument);
      break;
  }

  waypoint.infos.coordinates = new LatLongAlt(facility.lat, facility.lon);
  return waypoint;
};

/**
 * A comparer for sorting runways by number, and then by L, C, and R.
 * @param {*} r1 The first runway to compare.
 * @param {*} r2 The second runway to compare.
 * @returns {Number} -1 if the first is before, 0 if equal, 1 if the first is after.
 */
RawDataMapper.sortRunways = (r1, r2) => {
  if (parseInt(r1.designation) === parseInt(r2.designation)) {
    let v1 = 0;
    if (r1.designation.indexOf("L") != -1) {
        v1 = 1;
    }
    else if (r1.designation.indexOf("C") != -1) {
        v1 = 2;
    }
    else if (r1.designation.indexOf("R") != -1) {
        v1 = 3;
    }
    let v2 = 0;
    if (r2.designation.indexOf("L") != -1) {
        v2 = 1;
    }
    else if (r2.designation.indexOf("C") != -1) {
        v2 = 2;
    }
    else if (r2.designation.indexOf("R") != -1) {
        v2 = 3;
    }
    return v1 - v2;
  }
  return parseInt(r1.designation) - parseInt(r2.designation);
};

/**
 * Generates a runway transition name from the designated runway in the transition data.
 * @param {*} runwayTransition The runway transition to generate the name for.
 * @returns {String} The runway transition name.
 */
RawDataMapper.generateRunwayTransitionName = (runwayTransition) => {
  let name = `RW${runwayTransition.runwayNumber}`;

  switch (runwayTransition.runwayDesignation) {
      case 1:
          name += "L";
          break;
      case 2:
          name += "R";
          break;
      case 3:
          name += "C";
          break;
  }

  return name;
};

/**
 * Creates a collection of waypoints from a legs procedure.
 */
class LegsProcedure {
  /**
   * Creates an instance of a LegsProcedure.
   * @param {Array} legs The legs that are part of the procedure.
   * @param {WayPoint} startingPoint The starting point for the procedure.
   * @param {BaseInstrument} instrument The instrument that is attached to the flight plan.
   */
  constructor(legs, startingPoint, instrument) {
    /**
     * The legs that are part of this procedure.
     */
    this._legs = legs;

    /**
     * The starting point for the procedure.
     */
    this._previousFix = startingPoint;

    /**
     * The instrument that is attached to the flight plan.
     */
    this._instrument = instrument;

    /**
     * The current index in the procedure.
     */
    this._currentIndex = 0;
  }

  /**
   * Checks whether or not there are any legs remaining in the procedure.
   * @returns {Boolean} True if there is a next leg, false otherwise.
   */
  hasNext() {
    return this._currentIndex < this._legs.length;
  }

  /**
   * Gets the next mapped leg from the procedure.
   * @returns {WayPoint} The mapped waypoint from the leg of the procedure.
   */
  async getNext() {
    const currentLeg = this._legs[this._currentIndex];
    let isLegMappable = false;
    let mappedLeg;

    while (!isLegMappable) {
      isLegMappable = true;

      switch (currentLeg.type) {
        case 3:
          mappedLeg = await this.mapHeadingUntilDistanceFromOrigin(currentLeg, this._previousFix);
          break;
        case 4:
          mappedLeg = await this.mapOriginRadialForDistance(currentLeg, this._previousFix);
          break;
        case 5:
          mappedLeg = await this.mapHeadingToIntercept(currentLeg, this._previousFix, this._legs[this._currentIndex + 1]);
          break;
        case 9:
          mappedLeg = await this.mapBearingAndDistanceFromOrigin(currentLeg, this._previousFix);
          break;
        case 15:
        case 17:
        case 18:
          mappedLeg = await this.mapExactFix(currentLeg, this._previousFix);
          break;
        default:
          isLegMappable = false;
          break;
      }

      this._currentIndex++;
    }

    this._previousFix = mappedLeg;
    return mappedLeg;
  }

  /**
   * Maps a heading until distance from origin leg.
   * @param {*} leg The procedure leg to map. 
   * @param {WayPoint} prevLeg The previously mapped waypoint in the procedure.
   * @returns {WayPoint} The mapped leg.
   */
  async mapHeadingUntilDistanceFromOrigin(leg, prevLeg) {
    const origin = await this._instrument.facilityLoader.getFacilityRaw(leg.originIcao);
    const originIdent = origin.icao.substring(7, 12).trim();

    const bearingToOrigin = Avionics.Utils.computeGreatCircleHeading(prevLeg.infos.coordinates, new LatLongAlt(origin.lat, origin.lon));
    const distanceToOrigin = Avionics.Utils.computeGreatCircleDistance(prevLeg.infos.coordinates, new LatLongAlt(origin.lat, origin.lon));

    const distanceAngle = Math.asin((Math.sin(distanceToOrigin) * Math.sin(bearingToOrigin)) / Math.sin(leg.distance));
    const legDistance = 2 * Math.atan(Math.tan(0.5 * (leg.distance - distanceToOrigin)) * (Math.sin(0.5 * (bearingToOrigin + distanceAngle)) / Math.sin(0.5 * (bearingToOrigin - distanceAngle))));

    const coordinates = Avionics.Utils.bearingDistanceToCoordinates(leg.course, legDistance, prevLeg.infos.coordinates.lat, prevLeg.infos.coordinates.long);

    const waypoint = new WayPoint(this._instrument);
    waypoint.type = 'W';

    waypoint.infos = new IntersectionInfo(this._instrument);
    waypoint.infos.coordinates = coordinates;

    const ident = `${originIdent}${Math.trunc(legDistance)}`;
    waypoint.ident = ident;
    waypoint.infos.ident = ident;

    return waypoint;
  }

  /**
   * Maps a bearing/distance fix in the procedure.
   * @param {*} leg The procedure leg to map.
   * @returns {WayPoint} The mapped leg.
   */
  async mapBearingAndDistanceFromOrigin(leg) {
    const origin = await this._instrument.facilityLoader.getFacilityRaw(leg.originIcao);
    const originIdent = origin.icao.substring(7, 12).trim();
    const coordinates = Avionics.Utils.bearingDistanceToCoordinates(leg.course, leg.distance / 1852, origin.lat, origin.lon);

    const waypoint = new WayPoint(this._instrument);
    waypoint.type = 'W';

    waypoint.infos = new IntersectionInfo(this._instrument);
    waypoint.infos.coordinates = coordinates;

    const ident = `${originIdent}${Math.trunc(leg.distance / 1852)}`;
    waypoint.ident = ident;
    waypoint.infos.ident = ident;

    return waypoint;
  }

  /**
   * Maps a radial on the origin for a specified distance leg in the procedure.
   * @param {*} leg The procedure leg to map.
   * @param {WayPoint} prevLeg The previously mapped leg.
   * @returns {Waypoint} The mapped leg.
   */
  async mapOriginRadialForDistance(leg, prevLeg) {
    if (leg.fixIcao.trim() !== '') {
      return await this.mapExactFix(leg);
    }
    else {
      const origin = await this._instrument.facilityLoader.getFacilityRaw(leg.originIcao);
      const originIdent = origin.icao.substring(7, 12).trim();
      const coordinates = Avionics.Utils.bearingDistanceToCoordinates(leg.course, leg.distance / 1852, prevLeg.infos.coordinates.lat, prevLeg.infos.coordinates.long);

      const distanceFromOrigin = Avionics.Utils.computeGreatCircleDistance(new LatLongAlt(origin.lat, origin.lon), coordinates);

      const waypoint = new WayPoint(this._instrument);
      waypoint.type = 'W';

      waypoint.infos = new IntersectionInfo(this._instrument);
      waypoint.infos.coordinates = coordinates;

      const ident = `${originIdent}${Math.trunc(distanceFromOrigin / 1852)}`;
      waypoint.ident = ident;
      waypoint.infos.ident = ident;

      return waypoint;
    }
  }

  /**
   * Maps a heading turn to intercept leg in the procedure.
   * @param {*} leg The procedure leg to map. 
   * @param {WayPoint} prevLeg The previously mapped leg.
   * @param {*} nextLeg The next leg in the procedure to intercept.
   * @returns {WayPoint} The mapped leg.
   */
  async mapHeadingToIntercept(leg, prevLeg, nextLeg) {
    const nextOrigin = await this._instrument.facilityLoader.getFacilityRaw(nextLeg.originIcao);
    const nextOriginIdent = nextOrigin.icao.substring(7, 12).trim();
    
    const distanceFromOrigin = Avionics.Utils.computeGreatCircleDistance(prevLeg.infos.coordinates, new LatLongAlt(nextOrigin.lat, nextOrigin.lon));
    const bearingToOrigin = Avionics.Utils.computeGreatCircleHeading(prevLeg.infos.coordinates, new LatLongAlt(nextOrigin.lat, nextOrigin.lon));
    const bearingFromOrigin = Avionics.Utils.computeGreatCircleHeading(new LatLongAlt(nextOrigin.lat, nextOrigin.lon), prevLeg.infos.coordinates);

    let ang1 = bearingToOrigin - leg.course;
    let ang2 = bearingFromOrigin - nextLeg.course;
    let ang3 = Math.acos(Math.sin(ang1) * Math.sin(ang2) * Math.sin(distanceFromOrigin) - Math.cos(ang1) * Math.cos(ang2));

    let legDistance = Math.acos((Math.cos(ang1) + Math.cos(ang2) * Math.cos(ang3)) / Math.sin(ang1) * Math.sin(ang3));
    const coordinates = Avionics.Utils.bearingDistanceToCoordinates(leg.course, legDistance, prevLeg.infos.coordinates.lat, prevLeg.infos.coordinates.long);

    const waypoint = new WayPoint(this._instrument);
    waypoint.type = 'W';

    waypoint.infos = new IntersectionInfo(this._instrument);
    waypoint.infos.coordinates = coordinates;

    const ident = `T${leg.course}${nextOriginIdent}`;
    waypoint.ident = ident;
    waypoint.infos.ident = ident;

    return waypoint;
  }

  /**
   * Maps an exact fix leg in the procedure.
   * @param {*} leg The procedure leg to map.
   * @returns {WayPoint} The mapped leg.
   */
  async mapExactFix(leg) {
    const facility = await this._instrument.facilityLoader.getFacilityRaw(leg.fixIcao);
    if (facility) {
      return RawDataMapper.toWaypoint(facility, this._instrument);
    }
    else {
      const origin = await this._instrument.facilityLoader.getFacilityRaw(leg.originIcao);
      const originIdent = origin.icao.substring(7, 12).trim();

      const coordinates = Avionics.Utils.bearingDistanceToCoordinates(leg.theta, leg.rho / 1852, origin.lat, origin.lon);

      const waypoint = new WayPoint(this._instrument);
      waypoint.type = 'W';

      waypoint.infos = new IntersectionInfo(this._instrument);
      waypoint.infos.coordinates = coordinates;

      const ident = `${originIdent}${Math.trunc(leg.rho / 1852)}`;
      waypoint.ident = ident;
      waypoint.infos.ident = ident;

      return waypoint;
    }
  }
}