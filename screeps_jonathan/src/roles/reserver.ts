import motion = require("../lib/motion")
import settings = require("../config/settings")
import { cN, BodyType } from "../lib/creepNames"

const rRr = {
    name: cN.RESERVER_NAME,
    type: BodyType.reserver,
   
    run: function(creep: Creep) {
        const targetRoom = creep.memory.flag
        if(Game.rooms[targetRoom]){
            if(Game.rooms[targetRoom].controller.pos.isNearTo(creep.pos)){
                if(Game.rooms[targetRoom].controller.reservation && Game.rooms[targetRoom].controller.reservation.username != settings.username){
                    creep.attackController(Game.rooms[targetRoom].controller)
                } else {
                    creep.reserveController(Game.rooms[targetRoom].controller)
                }
            } else{
                motion.newMove(creep, Game.rooms[targetRoom].controller.pos, 1)
            }
        } else {
            motion.newMove(creep, new RoomPosition(25, 25, targetRoom), 24)
        }
    }
}
export = rRr
