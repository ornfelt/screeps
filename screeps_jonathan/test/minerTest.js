const assert = require("assert")
require("./lib")

function normalRoom(numSources) {
    const room = new Room("test")
    const city = `${room.name}0`
    const spawn = new StructureSpawn(room, city)
    spawn.memory.sources = {}
    for (let i = 0; i < numSources; i++) {
        const source = new Source(room)
        spawn.memory.sources[source.id] = source.pos
    }
    return room
}

function roleCreep(room, name, role) {
    const creep = new Creep(room, name)
    creep.memory.role = role
    const city = `${room.name}0`
    creep.memory.city = city
    creep.body = [WORK, CARRY, MOVE]
    creep.ticksToLive = CREEP_LIFE_TIME
    return creep
}


describe("remoteMiner", function () {
    beforeEach(function() {
        Game.reset()
        Memory.reset()
    })
    const rM = require("../built/roles/remoteMiner")
    describe("#run()", function () {

        // it("should move to the source", function () {
        //     const room = normalRoom(3)
        //     const miner = roleCreep(room, "1", rM.name)
        //     // run once to get a source
        //     rM.run(miner)
        //     // run again to try harvest
        //     rM.run(miner)
        // })
    })
})