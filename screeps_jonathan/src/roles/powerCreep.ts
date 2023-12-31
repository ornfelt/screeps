import a = require("../lib/actions")
import u = require("../lib/utils")
import roomU = require("../lib/roomUtils")
import rU = require("./upgrader")

const CreepState = {
    START: 1,
    SPAWN: 2,
    ENABLE_POWER: 3,
    WORK_SOURCE: 4,
    WORK_GENERATE_OPS: 5,
    WORK_RENEW: 6,
    WORK_DECIDE: 7,
    WORK_FACTORY: 8,
    WORK_BALANCE_OPS: 9,
    SLEEP: 10,
    WORK_OBSERVER: 11,
    WORK_EXTENSION: 12,
    WORK_SPAWN: 13,
    WORK_CONTROLLER: 14,
    WORK_MINERAL: 15
}
const CS = CreepState

const rPC = {

    run: function(creep: PowerCreep) {
        if(creep.shard)
            creep.memory.shard = creep.shard
        if(creep.memory.shard && creep.memory.shard != Game.shard.name){
            return
        }
        if(creep.ticksToLive == 1){
            Game.notify(`PC ${creep.name} died in ${creep.room.name}. Last state: ${creep.memory.state}`)
        }
        if(creep.hits < creep.hitsMax && creep.memory.city){
            creep.moveTo(Game.rooms[creep.memory.city].storage)
            return
        }
        if (!rPC.hasValidState(creep)) {
            if (creep.ticksToLive > 0) {
                // disabled suicide bc 8 hour delay. creep.suicide()
                return
            }
            creep.memory.state = CS.START
        }
        switch (creep.memory.state) {
        case CS.START:
            rPC.initializePowerCreep(creep)
            break
        case CS.SPAWN:
            rPC.spawnPowerCreep(creep)
            break
        case CS.ENABLE_POWER:
            a.enablePower(creep)
            break
        case CS.WORK_SOURCE:
            if(a.usePower(creep, Game.getObjectById(creep.memory.target), PWR_REGEN_SOURCE) == ERR_INVALID_ARGS){
                creep.memory.state = CS.ENABLE_POWER
            }
            break
        case CS.WORK_GENERATE_OPS:
            creep.usePower(PWR_GENERATE_OPS)
            break
        case CS.WORK_DECIDE:
            break
        case CS.WORK_RENEW:
            a.renewPowerCreep(creep, Game.getObjectById(creep.memory.powerSpawn))
            break
        case CS.WORK_FACTORY:
            a.usePower(creep, Game.getObjectById(creep.memory.target), PWR_OPERATE_FACTORY)
            break
        case CS.WORK_BALANCE_OPS:
            if (creep.store[RESOURCE_OPS] > POWER_INFO[PWR_OPERATE_FACTORY].ops) {
                a.charge(creep, creep.room.terminal)
            } {
                a.withdraw(creep, creep.room.terminal, RESOURCE_OPS)
            }
            break
        case CS.SLEEP:
            break
        case CS.WORK_OBSERVER:
            a.usePower(creep, Game.getObjectById(creep.memory.target), PWR_OPERATE_OBSERVER)
            break
        case CS.WORK_EXTENSION:
            a.usePower(creep, Game.getObjectById(creep.memory.target), PWR_OPERATE_EXTENSION)
            break
        case CS.WORK_SPAWN:
            a.usePower(creep, Game.getObjectById(creep.memory.target), PWR_OPERATE_SPAWN)
            break
        case CS.WORK_CONTROLLER:
            a.usePower(creep, creep.room.controller, PWR_OPERATE_CONTROLLER)
            break
        case CS.WORK_MINERAL:
            a.usePower(creep, Game.getObjectById(creep.memory.target), PWR_REGEN_MINERAL)
        }
        creep.memory.state = rPC.getNextState(creep)
    },

    getNextState: function(creep) {
        switch (creep.memory.state) {
        case CS.START: 
            return creep.memory.city ? CS.SPAWN : CS.START
        case CS.SPAWN: 
            return (creep.spawnCooldownTime > Date.now()) ? CS.SPAWN : rPC.isPowerEnabled(creep)
                ? rPC.getNextWork(creep) : CS.ENABLE_POWER
        case CS.WORK_GENERATE_OPS:
        case CS.WORK_DECIDE:
            return rPC.getNextWork(creep)
        case CS.WORK_BALANCE_OPS: 
            return rPC.atTarget(creep) ? CS.SLEEP : CS.WORK_BALANCE_OPS
        case CS.WORK_RENEW:
        case CS.ENABLE_POWER:
        case CS.WORK_SOURCE:
        case CS.WORK_FACTORY:
        case CS.WORK_OBSERVER:
        case CS.WORK_EXTENSION:
        case CS.WORK_SPAWN:
        case CS.WORK_CONTROLLER:
        case CS.WORK_MINERAL: 
            return rPC.atTarget(creep) ? rPC.getNextWork(creep) : creep.memory.state
        case CS.SLEEP:
            return Game.time % 10 == 0 ? rPC.getNextWork(creep) : CS.SLEEP
        }
        // If state is unknown then restart
        return CS.START
    },

    initializePowerCreep: function(creep) {
        if(Game.time % 500 != 0) return
        if (!creep.memory.city) {
            const cities = u.getMyCities()
            const usedRooms = _(Game.powerCreeps)
                .map(pc => pc.memory.city)
                .value()
            const citiesWithoutAnyPC = _.filter(cities, city => city.controller.level == 8
                && roomU.getFactory(city) && !(roomU.getFactory(city) as StructureFactory).level
                && !usedRooms.includes(city.name))
            Log.warning(`PowerCreep ${creep.name} is unassigned, please assign using PCAssign(name, city). Available cities on this shard are ${citiesWithoutAnyPC}`)
        }
    },

    spawnPowerCreep: function(creep) {
        // spawn creep
        if(!Game.rooms[creep.memory.city]){
            Log.error(`PC ${creep.name} is unable to spawn`)
            return
        }
        const structures = Game.rooms[creep.memory.city].find(FIND_MY_STRUCTURES)
        const powerSpawn = _.find(structures, structure => structure.structureType === STRUCTURE_POWER_SPAWN)
        if(!powerSpawn){
            return
        }
        creep.spawn(powerSpawn)
        creep.memory.powerSpawn = powerSpawn.id
    },

    hasValidState: function(creep) { // TODO. false if creep spawns in city with no power spawn
        const validSpawn = creep.memory.state == CS.START || 
                         creep.memory.state == CS.SPAWN || (creep.room && creep.room.controller)
        const initialized = creep.memory.state && creep.memory.city
        return initialized && validSpawn
    },

    atTarget: function(creep) {
        let target
        let distance = 1
        switch (creep.memory.state) {
        case CS.WORK_SOURCE:
        case CS.WORK_FACTORY:
        case CS.WORK_OBSERVER:
        case CS.WORK_EXTENSION:
        case CS.WORK_SPAWN:
        case CS.WORK_CONTROLLER:
        case CS.WORK_MINERAL:
            target = Game.getObjectById(creep.memory.target)
            distance = 3
            break
        case CS.WORK_BALANCE_OPS:
            target = creep.room.terminal
            break
        case CS.ENABLE_POWER:
            target = creep.room.controller
            break
        case CS.WORK_RENEW:
            target = Game.getObjectById(creep.memory.powerSpawn)
            break
        }
        return target && creep.pos.inRangeTo(target, distance)
    },

    /*
     * Get next job. Priorities:
     * 1. Renew (extend life if time to live is low)
     * 2. Generate Ops (generate additional ops to spend on other work)
     * 3. Power sources (power up any source that requires it. Cost 0)
     * 4. Power factories (power a factor. cost 100)
     */
    getNextWork: function(creep) {
        if (creep.ticksToLive < 300) return CS.WORK_RENEW
        if (rPC.canGenerateOps(creep)) return CS.WORK_GENERATE_OPS
        if (rPC.hasMineralUpdate(creep)) return CS.WORK_MINERAL
        if (rPC.hasSourceUpdate(creep)) return CS.WORK_SOURCE
        if (rPC.canOperateFactory(creep)) return rPC.getOpsJob(creep, PWR_OPERATE_FACTORY, CS.WORK_FACTORY)
        //if (rPC.canOperateObserver(creep)) return rPC.getOpsJob(creep, PWR_OPERATE_OBSERVER, CS.WORK_OBSERVER)
        if (rPC.canOperateExtension(creep)) return rPC.getOpsJob(creep, PWR_OPERATE_EXTENSION, CS.WORK_EXTENSION)
        if (rPC.canOperateSpawn(creep)) return rPC.getOpsJob(creep, PWR_OPERATE_SPAWN, CS.WORK_SPAWN)
        if (rPC.canOperateController(creep)) return rPC.getOpsJob(creep, PWR_OPERATE_CONTROLLER, CS.WORK_CONTROLLER)
        if (rPC.hasExtraOps(creep)) return CS.WORK_BALANCE_OPS
        return CS.SLEEP
    },

    isPowerEnabled: function(creep) {
        const room = Game.rooms[creep.memory.city]
        return (room && room.controller && room.controller.isPowerEnabled)
    },

    canGenerateOps: function(creep) {
        return creep.powers[PWR_GENERATE_OPS] &&
            creep.powers[PWR_GENERATE_OPS].cooldown == 0 &&
            _.sum(creep.store) < creep.store.getCapacity()
    },

    hasMineralUpdate: function(creep) {
        // powerup runs out every 100 ticks
        // if there is no effect on mineral OR effect is running low then choose it
        if(!creep.powers[PWR_REGEN_MINERAL]){
            return false
        }
        const mineral = _.find(creep.room.find(FIND_MINERALS) as Mineral[])

        if (mineral && (!mineral.effects 
                        || mineral.effects.length == 0
                        || mineral.effects[0].ticksRemaining < 5)) {
            creep.memory.target = mineral.id
            return true
        }
        return false
    },

    hasSourceUpdate: function(creep) {
        const city = creep.memory.city + "0"
        // powerup runs out every 300 ticks
        // get all sources
        // if there is no effect on source then choose it
        if(!creep.powers[PWR_REGEN_SOURCE]){
            return false
        }
        const sourceIds = Object.keys(_.filter(Game.spawns[city].memory.sources, s => s.roomName == creep.memory.city)) as Id<Source>[]
        for (const sourceId of sourceIds) {
            const source = Game.getObjectById(sourceId)
            if (source && (!source.effects 
                           || source.effects.length == 0
                           || source.effects[0].ticksRemaining < 30)) {
                creep.memory.target = sourceId
                return true
            }
        }
        return false
    },

    canOperateFactory: function(creep: Creep) {
        const city = creep.memory.city + "0"
        const spawn = Game.spawns[city]
        const isRunning = spawn && spawn.memory.ferryInfo.factoryInfo.produce !== "dormant"
        const factory = _.find(spawn.room.find(FIND_MY_STRUCTURES), struct => struct.structureType == STRUCTURE_FACTORY) as StructureFactory
        const isNew = factory && !factory.level
        const needsBoost = (factory && factory.cooldown < 30 && isRunning) || isNew
        return rPC.canOperate(creep, factory, PWR_OPERATE_FACTORY, needsBoost)
    },

    canOperateObserver: function(creep: Creep) {
        const city = creep.memory.city + "0"
        const spawn = Game.spawns[city]
        if(!spawn) return false
        const observer = _.find(spawn.room.find(FIND_MY_STRUCTURES), struct => struct.structureType == STRUCTURE_OBSERVER)
        return rPC.canOperate(creep, observer, PWR_OPERATE_OBSERVER, true)
    },

    canOperateExtension: function(creep: Creep) {
        const city = creep.memory.city + "0"
        const spawn = Game.spawns[city]
        if(!spawn) return false
        return rPC.canOperate(creep, spawn.room.storage, PWR_OPERATE_EXTENSION,
            spawn.room.energyAvailable < 0.6 * spawn.room.energyCapacityAvailable)
    },

    canOperateSpawn: function(creep: Creep) {
        const spawn = Game.spawns[creep.memory.city + "0"]
        const spawns = spawn && spawn.room.find(FIND_MY_SPAWNS) || []
        if(spawn && spawn.memory.sq.length > 3 && _.every(spawns, s => s.spawning)){
            const slowSpawn = _.find(spawns, s => !s.effects || s.effects.length == 0)
            if(slowSpawn){
                return rPC.canOperate(creep, slowSpawn, PWR_OPERATE_SPAWN, true)
            }
        }
        return false
    },

    canOperateController: function(creep) {
        if(Game.spawns[creep.memory.city + "0"].memory[rU.name] > 0){
            return rPC.canOperate(creep, Game.spawns[creep.memory.city + "0"].room.controller, PWR_OPERATE_CONTROLLER, true)
        } else {
            return false
        }
    },

    canOperate: function(creep, target, power, extraRequirements) {
        if (target &&
            (!target.effects || target.effects.length == 0) &&
            creep.powers[power] &&
            creep.powers[power].cooldown == 0 && extraRequirements) {
            creep.memory.target = target.id
            return true
        }
        return false
    },

    hasExtraOps: function(creep) {
        return creep.store[RESOURCE_OPS] == creep.store.getCapacity()
    },

    getOpsJob: function(creep, jobName, jobState) {
        return creep.store[RESOURCE_OPS] >= POWER_INFO[jobName].ops ?
            jobState : CS.WORK_BALANCE_OPS
    }
}
export = rPC
