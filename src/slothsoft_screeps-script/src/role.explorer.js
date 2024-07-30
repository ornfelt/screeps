/*
 * An explorer goes straight to the next flag, conquers it and starts
 * a new base there.
 */
 
var constants = require('./main.constants');
var info = require('./main.info');
var MainUtil = require('./main.util');

var MemoryManager = require('./manager.memory');

var Builder = require('./role.builder');
var RolePrototype = require('./role.prototype');

const PHASE_GOTO_FLAG_ROOM = 'gotoFlagRoom';
const PHASE_CLAIM_FLAG_ROOM = 'claimFlagRoom';
const PHASE_CREATE_SPAWN = 'createSpawn';
const PHASE_BUILD_SPAWN = 'buildSpawn';
const PHASE_RETIRE = 'retire';

class Explorer extends RolePrototype {
	
	constructor() {
		super('Explorer', '#cccccc', '🏴');

	    this._targetMode = RolePrototype.TARGET_MODE_USE_OR_ERROR;
	}

	_findTargets(room) {
	    return MainUtil.findAllFlags();
	}

	/*
	 * This method is called by the framework, so we need to find an open
	 * flag for the creep to attach to.
	 */
	
	spawnCreep(spawn) {
		var claimedFlags = MainUtil.findAllCreeps().filter(creep => creep.memory.target).map(creep => creep.memory.target);
		var allFlags = MainUtil.findAllFlags().filter(flag => !claimedFlags.includes(flag.name));
		if (allFlags.length > 0)
			return this._spawnCreepFromSpawn(spawn, allFlags[0].name);
		return false;
	}

	spawnCreepFromSpawnName(spawnName, flagName) {
	    var spawns = MainUtil.findAllSpawns().filter(spawn => spawn.name == spawnName);
	    if (spawns.length == 0) {
	        info.error('Could not find spawn: ' + spawnName);
	        return false;
	    }
	    var spawn = spawns[0];
	    var resultingCreep = this._spawnCreepFromSpawn(spawn, flagName);
	    if (resultingCreep) {
	        info.log(this.symbol + ' Spawning new ' + this.roleName + ' (' + resultingCreep.body.length + 'p)');
	        return resultingCreep;
	    }
	    return resultingCreep;
	}

	_spawnCreepFromSpawn(spawn, flagName) {
	    var resultingCreep = this._spawnCreepWithParts(spawn, [WORK, MOVE, CARRY, MOVE], [ CLAIM, MOVE ]);
	    if (resultingCreep) {
	        resultingCreep.memory.target = flagName;
	        return resultingCreep;
	    }
	    return resultingCreep;
	}

	_work(creep) {
		if (!creep.memory.phase) {
			creep.memory.phase = PHASE_GOTO_FLAG_ROOM;
	    }
    
	    switch (creep.memory.phase) {
	        case PHASE_GOTO_FLAG_ROOM:
	            this._goToFlagRoom(creep);
	            break;
	        case PHASE_CLAIM_FLAG_ROOM:
	            this._claimFlagRoom(creep);
	            break;
	        case PHASE_CREATE_SPAWN:
	            this._createSpawn(creep);
	            break;
	        case PHASE_BUILD_SPAWN:
	            this._buildSpawn(creep);
	            break;
	        case PHASE_RETIREMENT:
	            this._retire(creep);
	            break;
	        default:
	    	    info.error(MainUtil.getDisplayName(creep) + ' has no recognized phase: ' + creep.memory.phase);
	            break;
	    }
	}

	/*
	 * Find the correct flag to go to
	 */
	 
	_goToFlagRoom(creep) {
	    var targetFlag;
	    if (creep.memory.target) {
	        var creepTarget = this._findTargets(creep.room).filter(target => target.name == creep.memory.target);
	        if (creepTarget.length > 0) {
	            targetFlag = creepTarget[0];
	        }
	    }
	    if (!targetFlag) {
	        targetFlag = this._findClosestTarget(creep);
	        creep.memory.target = targetFlag.name;
    	    info.log(this.symbol + ' ' + MainUtil.getDisplayName(creep) + ' travels to ' + targetFlag.name);
      		creep.memory.home = targetFlag.name;
	    }
	    
	    // walk towards my flag
	    
	    this._moveToLocation(creep, targetFlag);
	    
	    if (creep.room == targetFlag.room) {
	    	var hasRoomAlready = creep.room.controller.my;
	        creep.memory.phase = hasRoomAlready ? PHASE_CREATE_SPAWN : PHASE_CLAIM_FLAG_ROOM;
	        info.log(this.symbol + ' ' + MainUtil.getDisplayName(creep) + ' claims the room of ' + targetFlag.name);
	    }
	}

	/*
	 * Claim the flag's room
	 */
	 
	_claimFlagRoom(creep) {
        var targetFlag = this._findTargets(creep.room).filter(target => target.name == creep.memory.target)[0];
      	var answer = creep.claimController(targetFlag.room.controller);
      	if (answer == ERR_NOT_IN_RANGE) {
      		creep.moveTo(targetFlag.room.controller);
      		creep.memory.moving = true;
      	} else if (answer == OK) {
      		creep.memory.phase = PHASE_CREATE_SPAWN;
      	} else {
      		info.log(this.symbol + ' ' + MainUtil.getDisplayName(creep) + ' cannot claim: ' + answer);
      	}

	    if (creep.room.controller.my) {
	    	var hasSpawnAlready = this._findSpawns(creep.room).length > 0;
	        creep.memory.phase = hasSpawnAlready ? PHASE_BUILD_SPAWN : PHASE_CREATE_SPAWN;
	        info.log(this.symbol + ' ' + MainUtil.getDisplayName(creep) + ' builds a spawn on ' + targetFlag.name);
	    }
	}

    _findSpawns(room) {
    	if (!room) {
    		room = this._findTargets(creep.room).filter(target => target.name == creep.memory.target)[0].room;
    	}
        return room.find(FIND_MY_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType == STRUCTURE_EXTENSION ||
                            structure.structureType == STRUCTURE_SPAWN ||
                            (structure.structureType == STRUCTURE_LINK && structure.memory && structure.memory.type == 'source') ||
                            structure.structureType == STRUCTURE_TOWER) && 
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
        });
    }
	
	_createSpawn(creep) {
    	var hasSpawnAlready = this._findSpawns(creep.room).length > 0;
    	if (hasSpawnAlready) {
	        creep.memory.phase = PHASE_RETIRE;
	        this._retire(creep);
	        return;
    	}
    	
    	var hasSpawnConstructionSiteAlready = creep.room.find(FIND_CONSTRUCTION_SITES, { filter: site => site.structureType == STRUCTURE_SPAWN }).length > 0;
    	if (hasSpawnConstructionSiteAlready) {
	        info.log(this.symbol + ' ' + MainUtil.getDisplayName(creep) + ' is a Builder now.');
	        creep.memory.phase = PHASE_BUILD_SPAWN;
	        return;
    	}
    	
        var targetFlag = this._findTargets(creep.room).filter(target => target.name == creep.memory.target)[0];
        var createResult = targetFlag.pos.createConstructionSite(STRUCTURE_SPAWN, targetFlag.name) ;
        if (createResult == OK) {
	        info.log(this.symbol + ' ' + MainUtil.getDisplayName(creep) + ' is a Builder now.');
	        creep.memory.phase = PHASE_BUILD_SPAWN;
        } else  {
	        info.error(this.symbol + ' ' + MainUtil.getDisplayName(creep) + ' could not create spawn: ' + createResult);
        }
	}
	
	_buildSpawn(creep) {
		new Builder().run(creep, this._baseRoom);
		
		if (this._findSpawns(creep.room).length > 0) {
	        creep.memory.phase = PHASE_RETIRE;
	        this._retire(creep);
		} 
	}
	
	_retire(creep) {
        var targetFlag = this._findTargets(creep.room).filter(target => target.name == creep.memory.target)[0];
        info.log(this.symbol + ' ' + MainUtil.getDisplayName(creep) + ' has finished ' + targetFlag.name);
        
        // create base
        MemoryManager.fetchRoomBase(creep.room, targetFlag.name);

        // remove flag
        targetFlag.remove();
        
        // we do not need this creep anymore
    	creep.memory.home = targetFlag.name;
    	creep.memory.role = 'Harvester';
	}
}

module.exports = Explorer;