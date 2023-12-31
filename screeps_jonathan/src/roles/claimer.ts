import motion = require("../lib/motion")
import { cN, BodyType } from "../lib/creepNames"

const rC = {
    name: cN.CLAIMER_NAME,
    type: BodyType.claimer,

    /** @param {Creep} creep **/
    run: function(creep) {
        return rC.claimRally(creep, Memory.flags.claimRally) ||
                rC.runClaimer(creep, Memory.flags.claim, rC.claim)
    },

    claimRally: function(creep, flag) {
        if (!flag || creep.memory.rally) {
            return false
        }

        motion.newMove(creep, new RoomPosition(flag.x, flag.y, flag.roomName))
        if (flag.x == creep.pos.x && flag.y == creep.pos.y) {
            creep.memory.rally = true
        }
        return true
    },

    runClaimer: function(creep, flag, actionFn) {
        if (!flag) {
            return false
        }

        if (flag.roomName != creep.pos.roomName) {
            motion.newMove(creep, new RoomPosition(flag.x, flag.y, flag.roomName), 5)
        } else if (!creep.pos.isNearTo(creep.room.controller.pos)) {
            motion.newMove(creep, creep.room.controller.pos, 1)
        } else { 
            actionFn(creep)
        }
        return true
    },

    claim: function(creep) {
        const newCity = creep.room.name + "0"
        creep.signController(creep.room.controller, "Piky")
        creep.room.memory.city = newCity
        if(creep.claimController(creep.room.controller) == ERR_INVALID_TARGET && !creep.room.controller.my){
            creep.attackController(creep.room.controller)
        }
    }    
}
export = rC
