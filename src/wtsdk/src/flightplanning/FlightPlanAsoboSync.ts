import { Coherent, RegisterViewListener } from "MSFS"
import { ManagedFlightPlan } from "../wtsdk";
import { FlightPlanManager } from "./FlightPlanManager";

/** A class for syncing a flight plan with the game */
export class FlightPlanAsoboSync {
  public static async LoadFromGame(fpln: FlightPlanManager): Promise<void> {
    return new Promise((resolve, reject) => {
      RegisterViewListener("JS_LISTENER_FLIGHTPLAN");
      setTimeout(() => {
        Coherent.call("LOAD_CURRENT_GAME_FLIGHT");
        Coherent.call("LOAD_CURRENT_ATC_FLIGHTPLAN");
        setTimeout(() => {
          Coherent.call("GET_FLIGHTPLAN").then(async (data) => {
            console.log("COHERENT GET_FLIGHTPLAN received");
            const isDirectTo = data.isDirectTo;

            // TODO: talk to matt about dirto
            if (!isDirectTo) {
              if (data.waypoints.length === 0) {
                resolve();
                return;
              }

              await fpln._parentInstrument.facilityLoader.getFacilityRaw(data.waypoints[0].icao, 10000);

              // set origin
              await fpln.setOrigin(data.waypoints[0].icao);

              // set dest
              await fpln.setDestination(data.waypoints[data.waypoints.length - 1].icao);

              // set route
              const enrouteStart = (data.departureWaypointsSize == -1) ? 1 : data.departureWaypointsSize
              const enroute = data.waypoints.slice(enrouteStart);
              for (let i = 0; i < enroute.length - 1; i++) {
                const wpt = enroute[i];
                console.log(wpt.icao);
                await fpln.addWaypoint(wpt.icao);
              }

              // set departure
              //  rwy index
              await fpln.setOriginRunwayIndex(data.originRunwayIndex);
              await fpln.setDepartureRunwayIndex(data.departureRunwayIndex);
              //  proc index
              await fpln.setDepartureProcIndex(data.departureProcIndex);
              //  enroutetrans index
              await fpln.setDepartureEnRouteTransitionIndex(data.departureEnRouteTransitionIndex);

              // set arrival
              //  arrivalproc index
              await fpln.setArrivalProcIndex(data.arrivalProcIndex);
              //  arrivaltrans index
              await fpln.setArrivalEnRouteTransitionIndex(data.arrivalEnRouteTransitionIndex);

              // set approach
              //  approach index
              await fpln.setApproachIndex(data.approachIndex);
              //  approachtrans index
              await fpln.setApproachTransitionIndex(data.approachTransitionIndex);
            }

          });
        }, 500);
      }, 200);
    });
  }

  public static async SaveToGame(fpln: FlightPlanManager): Promise<void> {
    return new Promise(async (resolve, reject) => {
      await Coherent.call("CREATE_NEW_FLIGHTPLAN");
      await Coherent.call("SET_CURRENT_FLIGHTPLAN_INDEX", 0).catch(console.log);
      await Coherent.call("CLEAR_CURRENT_FLIGHT_PLAN");

      const plan = fpln.getCurrentFlightPlan();

      if (plan.hasOrigin && plan.hasDestination) {
        if (plan.hasOrigin) {
          await Coherent.call("SET_ORIGIN", plan.originAirfield.icao);
        }

        if (plan.hasDestination) {
          await Coherent.call("SET_DESTINATION", plan.originAirfield.icao);
        }

        for (let i = 0; i < plan.enroute.waypoints.length; i++) {
          const wpt = plan.enroute.waypoints[i];
          if (wpt.icao.trim() !== "") {
            await Coherent.call("ADD_WAYPOINT", wpt.icao, i, false);
          }
        }

        await Coherent.call("SET_ORIGIN_RUNWAY_INDEX", plan.procedureDetails.originRunwayIndex).catch(console.log);
        await Coherent.call("SET_DEPARTURE_RUNWAY_INDEX", plan.procedureDetails.departureRunwayIndex);
        await Coherent.call("SET_DEPARTURE_PROC_INDEX", plan.procedureDetails.departureIndex);
        await Coherent.call("SET_DEPARTURE_ENROUTE_TRANSITION_INDEX", plan.procedureDetails.departureTransitionIndex);

        await Coherent.call("SET_ARRIVAL_PROC_INDEX", plan.procedureDetails.arrivalIndex);
        await Coherent.call("SET_ARRIVAL_ENROUTE_TRANSITION_INDEX", plan.procedureDetails.arrivalTransitionIndex);
        await Coherent.call("SET_ARRIVAL_RUNWAY_INDEX", plan.procedureDetails.arrivalRunwayIndex);

        await Coherent.call("SET_APPROACH_INDEX", plan.procedureDetails.approachIndex).then(() => {
          Coherent.call("SET_APPROACH_TRANSITION_INDEX", plan.procedureDetails.approachTransitionIndex);
        });
      }

      // await Coherent.call("COPY_CURRENT_FLIGHTPLAN_TO", 0).catch(console.log);
      // await Coherent.call("SET_CURRENT_FLIGHTPLAN_INDEX", 0).catch(console.log);
    });
  }
}