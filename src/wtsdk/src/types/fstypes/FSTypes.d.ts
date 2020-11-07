declare module "MSFS" {
  export class WayPoint {
    constructor(_baseInstrument: BaseInstrument);
    icao: string;
    ident: string;
    endsInDiscontinuity?: boolean;
    isVectors?: boolean;
    infos: WayPointInfo;
    type: string;
    bearingInFP: number;
    distanceInFP: number;
    cumulativeDistanceInFP: number;
    instrument: BaseInstrument;
  }

  export class BaseInstrument {
    facilityLoader: FacilityLoader;
  }
  
  export class FacilityLoader {
    getFacilityRaw: (icao: string, timeout?: number) => Promise<any>;
  }

  export class WayPointInfo {
    constructor(_instrument: BaseInstrument);
    coordinates: LatLongAlt;
    ident: string;
    instrument: BaseInstrument;
    _svgElements: any;
  }

  export class AirportInfo extends WayPointInfo {
    constructor(_instrument: BaseInstrument);
    departures: any[];
    approaches: any[];
    arrivals: any[];
    runways: any[];
    oneWayRunways: OneWayRunway[];
  }

  export class IntersectionInfo extends WayPointInfo { 
    constructor(_instrument: BaseInstrument);
  }

  export class VORInfo extends WayPointInfo { 
    constructor(_instrument: BaseInstrument);
  }

  export class NDBInfo extends WayPointInfo { 
    constructor(_instrument: BaseInstrument);
  }

  export interface OneWayRunway {
    designation: string;
  }

  export interface RunwayTransition {
    runwayNumber: number;
    runwayDesignation: number;
  }

  export interface EnrouteTransition {
    legs: ProcedureLeg[];
  }

  export class Runway {}

  export class Avionics {
    static Utils: Utils;
  }

  export class Utils {
    computeGreatCircleHeading(coords1: LatLongAlt, coords2: LatLongAlt): number;
    computeGreatCircleDistance(coords1: LatLongAlt, coords2: LatLongAlt): number;
    bearingDistanceToCoordinates(bearing: number, distanceInNM: number, lat: number, long: number): LatLongAlt;
    fmod(value: number, moduloBy: number): number;
    DEG2RAD: number;
  }

  export interface ProcedureLeg {
    type: number;
    fixIcao: string;
    originIcao: string;
    altDesc: number;
    altitude1: number;
    altitude2: number;
    course: number;
    distance: number;
    rho: number;
    theta: number;
  }

  export class LatLongAlt {
    constructor(lat?: number, long?: number, alt?: number);
    lat: number;
    long: number;
  }

  export class SimVar {
    static GetSimVarValue(name: string, unit: string): any;
    static SetSimVarValue(name: string, unit: string, value: any): Promise<void>;
  }
}
