import rDM = require("../roles/depositMiner")
import rMM = require("../roles/mineralMiner")
import u = require("../lib/utils")
import rr = require("../roles/roles")
import settings = require("../config/settings")
import profiler = require("./screeps-profiler")

const statsLib = {
    cityCpuMap: {},

    benchmark: function(myCities: Room[]){
        if(!Memory.benchmark){
            Memory.benchmark = {}
        }
        if(!myCities.length) return
        const maxRcl = _.max(myCities, city => city.controller.level).controller.level
        const gcl = Game.gcl.level
        if(!Memory.benchmark["rcl"+maxRcl] && maxRcl > 1)
            Memory.benchmark["rcl"+maxRcl] = Game.time - Memory.startTick
        if(!Memory.benchmark["gcl"+gcl] && gcl > 1)
            Memory.benchmark["gcl"+gcl] = Game.time - Memory.startTick

    },

    collectStats: function(myCities: Room[]) {
        for (const creep of Object.values(Game.creeps)) {
            const ccache = u.getCreepCache(creep.id)
            const rcache = u.getRoomCache(creep.room.name)
            if (u.getsetd(ccache, "lastHits", creep.hits) > creep.hits) {
                ccache.attacks = u.getsetd(ccache, "attacks", 0) + 1
                rcache.attacks = u.getsetd(rcache, "attacks", 0) + 1
            }
            ccache.lastHits = creep.hits
        }

        //stats
        if (Game.time % settings.statTime == 1 && Game.time - Memory.data.lastReset > 5){
            const stats = {}
            stats["cpu.getUsed"] = Memory.avgCpu
            stats["cpu.bucket"] = Game.cpu.bucket
            stats["gcl.progress"] = Game.gcl.progress
            stats["gcl.progressTotal"] = Game.gcl.progressTotal
            stats["gcl.level"] = Game.gcl.level
            stats["gcl.total"] =
                GCL_MULTIPLY * Math.pow(Game.gcl.level, GCL_POW) + Game.gcl.progress
            stats["gpl.progress"] = Game.gpl.progress
            stats["gpl.progressTotal"] = Game.gpl.progressTotal
            stats["gpl.level"] = Game.gpl.level
            stats["gpl.total"] =
                POWER_LEVEL_MULTIPLY * Math.pow(Game.gpl.level, POWER_LEVEL_POW) + Game.gpl.progress
            stats["energy"] = u.getDropTotals()

            const heapStats = Game.cpu.getHeapStatistics()
            stats["heap.available"] = heapStats["total_available_size"]

            const cities = []
            _.forEach(Object.keys(Game.rooms), function(roomName){
                const room = Game.rooms[roomName]
                const city = Game.rooms[roomName].memory.city
                cities.push(city)

                if(room.controller && room.controller.my){
                    stats["cities." + city + ".rcl.level"] = room.controller.level
                    stats["cities." + city + ".rcl.progress"] = room.controller.progress
                    stats["cities." + city + ".rcl.progressTotal"] = room.controller.progressTotal

                    stats["cities." + city + ".spawn.energy"] = room.energyAvailable
                    stats["cities." + city + ".spawn.energyTotal"] = room.energyCapacityAvailable

                    if(room.storage){
                        stats["cities." + city + ".storage.energy"] = room.storage.store.energy
                        const factory = _.find(room.find(FIND_MY_STRUCTURES), s => s.structureType == STRUCTURE_FACTORY) as StructureFactory
                        if(factory){
                            stats["cities." + city + ".factory.level"] = factory.level
                            stats["cities." + city + ".factory.cooldown"] = factory.cooldown
                        }
                    }
                    stats["cities." + city + ".cpu"] = statsLib.cityCpuMap[city]

                    // Record construction progress in the city
                    const sites = room.find(FIND_CONSTRUCTION_SITES)
                    stats[`cities.${city}.sites.progress`] =
                        _.reduce(sites, (sum, site) => sum + site.progress, 0)
                    stats[`cities.${city}.sites.progressTotal`] =
                        _.reduce(sites, (sum, site) => sum + site.progressTotal, 0)

                    // observer scans
                    const rcache = u.getRoomCache(room.name)
                    stats[`cities.${city}.scans`] = rcache.scans || 0
                    rcache.scans = 0
                }

                const rcache = u.getRoomCache(roomName)
                stats[`rooms.${roomName}.attacks`] = rcache.attacks
                rcache.attacks = 0
            })
            const counts = _.countBy(Game.creeps, creep => creep.memory.role)
            const creepsByRole = _.groupBy(Game.creeps, creep => creep.memory.role)
            const roles = rr.getRoles()
            _.forEach(roles, function(role){
                if (counts[role.name]){
                    stats[`creeps.${role.name}.count`] = counts[role.name]
                } else {
                    stats[`creeps.${role.name}.count`] = 0
                }

                const creeps = creepsByRole[role.name] || []
                const attackList = _.map(creeps, creep => u.getCreepCache(creep.id).attacks)
                stats[`creeps.${role.name}.attacks`] = _.sum(attackList)
                for (const creep of creeps) {
                    const ccache = u.getCreepCache(creep.id)
                    ccache.attacks = 0
                }
            })

            // City level stats
            const cityCounts = _.countBy(Game.creeps, creep => creep.memory.city)
            _.forEach(cities, function(city){
                if (!city) {
                    return
                }
                if (cityCounts[city]){
                    stats["cities." + city + ".count"] = cityCounts[city]
                } else {
                    stats["cities." + city + ".count"] = 0
                }
                stats["cities." + city + ".deposits"] = 0
                stats["cities." + city + ".minerals"] = 0

                const spawn = Game.spawns[city]
                if(spawn){
                    // Record the weakest wall in each city
                    const buildings = spawn.room.find(FIND_STRUCTURES)
                    const walls = _.filter(buildings, building => building.structureType == STRUCTURE_WALL)
                    const minWall = _.min(_.toArray(_.map(walls, wall => wall.hits)))
                    stats["cities." + city + ".wall"] = walls.length  > 0 ? minWall : 0
                }
            })

            // Mining stats
            _.forEach(Game.creeps, creep => {
                const city = creep.memory.city
                if (creep.memory.role == rDM.name) {
                    stats["cities." + city + ".deposits"] += creep.memory.mined
                    creep.memory.mined = 0
                } else if (creep.memory.role == rMM.name) {
                    stats[`cities.${city}.minerals`] += creep.memory.mined
                    creep.memory.mined = 0
                }
            })

            stats["market.credits"] = Game.market.credits

            if (profiler.results && profiler.results.stats) {
                const pstats = profiler.results.stats
                const profileSize = Math.min(settings.profileResultsLength, pstats.length)
                for (let i = 0; i < profileSize; i++) {
                    const result = pstats[i]
                    stats[`profiler.${result.name}.calls`] = result.calls
                    stats[`profiler.${result.name}.time`] = result.totalTime.toFixed(1)
                }
            }
            if(Cache.bucket){
                stats["cpu.bucketfillRateMax"] = Cache.bucket.fillRate
                stats["cpu.waste"] = Cache.bucket.waste
                Cache.bucket.waste = 0
            }

            // Resources
            if (Game.time % settings.resourceStatTime == 1) {
                const citiesWithTerminals = _.filter(myCities, c => c.terminal)
                const empireStore = u.empireStore(citiesWithTerminals)
                for (const resource of RESOURCES_ALL) {
                    stats[`resource.${resource}`] = empireStore[resource]
                }
            }

            // Enemies
            for (const enemy in Cache.enemies) {
                stats[`enemies.${enemy}`] = Cache.enemies[enemy]
                Cache.enemies[enemy] = 0
            }

            RawMemory.segments[0] = JSON.stringify(stats)
        }
    }
}

export = statsLib
