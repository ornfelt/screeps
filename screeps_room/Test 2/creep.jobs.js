var jobs = {};
var Transfer = require('action.transfer');
var Moveto = require('move.to');
var Mem = require('get.memory');

jobs.GatherEnergy = function(creep){ // first empty containers, then drops.
    var drops = creep.room.find(FIND_DROPPED_RESOURCES);
    if(!Transfer.from(creep,creep.room.name,"Containers",RESOURCE_ENERGY,'filled')){
      //console.log('Harvester '+creep.name+' is Transfering energy From Container');
    }
    else if(drops.length>0){
        Moveto.move(creep,drops[0]);
        creep.pickup(drops[0]);
    }else if(creep.memory.jobs[0] == 'GatherEnergy'){
      if(!Transfer.from(creep,creep.room.name,"Storages",RESOURCE_ENERGY,'zero')){
        //console.log('Harvester '+creep.name+' is Transfering energy From Container');
      }
    }
}

//_.filter(hostileBuildings, function(structure){return (structure.structureType == STRUCTURE_TOWER); });

jobs.FindHostile = function(room){
    var temp = Game.rooms[room].find(FIND_HOSTILE_CREEPS);
    if(Memory.Allies != undefined){
        for(var i in Memory.Allies){
            temp = _.filter(temp, function(creeps){return (creeps.owner.username != Memory.Allies[i]); });
        }
    }
    return temp;
}

jobs.FindHostileStructure = function(room){
    var temp = Game.rooms[room].find(FIND_HOSTILE_STRUCTURES);
    if(Memory.Allies != undefined){
        for(var i in Memory.Allies){
            temp = _.filter(temp, function(structure){return (structure.owner.username != Memory.Allies[i]); });
        }
    }
    return temp;
}

jobs.FillStructures = function(creep,buildInfra){ //fill structures

  if(!Transfer.to(creep,creep.room.name,"Spawns",RESOURCE_ENERGY,'unfilled')){
      //console.log('Harvester '+creep.name+' is Transfering energy to Spawn');
  }else if(!Transfer.to(creep,creep.room.name,"Extensions",RESOURCE_ENERGY,'unfilled')){
      //console.log('Harvester '+creep.name+' is Transfering energy to Extension');
  }else if(!Transfer.to(creep,creep.room.name,"Towers",RESOURCE_ENERGY,'unfilled') && creep.memory.jobs[0] != 'GetEnergy'){ //this replaces 50 lines of code :)
      //console.log('Harvester '+creep.name+' is Transfering energy to Tower');
  }else if(!Transfer.to(creep,creep.room.name,"Storages",RESOURCE_ENERGY,'unfilled')){ //this indicates the priority of filling. Undefineds are skipped automatically
      //console.log('Harvester '+creep.name+' is Transfering energy to Storage');
  }
  if(buildInfra){
      creep.room.createConstructionSite(creep.pos, STRUCTURE_ROAD);
  }
}

jobs.MineEnergy = function(creep){ // mines the sourceID in-memory of creep. Will drop resources in link or container if possible
  var Containers = Mem.run(Memory.rooms[creep.memory.destRoom].RoomInfo.Containers);
  var containers = creep.pos.findClosestByRange(Containers);
  if(Containers[0] != undefined && creep.pos != containers.pos && Math.abs(creep.pos.x-containers.pos.x) < 3 && Math.abs(creep.pos.y-containers.pos.y) < 3){
      Moveto.move(creep,containers);
  }if(creep.harvest(Game.getObjectById(creep.memory.sourceID)) == ERR_NOT_IN_RANGE) {
          Moveto.move(creep,Game.getObjectById(creep.memory.sourceID));
          creep.memory.work += 1;
  }
  if(creep.memory.work > 30){
    delete creep.memory.sourceID;
    delete creep.memory.work;
    creep.say('Workless',true);
  }
  else {
    var Links = Mem.run(Memory.rooms[creep.memory.destRoom].RoomInfo.Links);
    var linkSend = creep.pos.findInRange(Links, 2)[0];
    if(linkSend != undefined && creep.carryCapacity != 0){
        if(creep.carry.energy == creep.carryCapacity){
            if(creep.transfer(linkSend, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            }else{
                Moveto.move(creep,linkSend);
            }
        }
    }else{
        creep.drop(RESOURCE_ENERGY);
        if((Game.time % 2)==0){
            creep.say('OM',true);
        }else{
            creep.say('NOM',true);
        }
    }
  }
}

jobs.Build = function(creep){
  var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
  if(targets.length > 0) {
      if(creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
          Moveto.move(creep,targets[0]);

      }
      return true;
  }else{
    return false;
  }
}

jobs.Repair = function(creep){
  var walls = Mem.run(Memory.rooms[creep.room.name].RoomInfo.Walls);
  var ramparts = Mem.run(Memory.rooms[creep.room.name].RoomInfo.Ramparts);
  var roads = Mem.run(Memory.rooms[creep.room.name].RoomInfo.Roads);
  var containers = Mem.run(Memory.rooms[creep.room.name].RoomInfo.Containers);
  var towers = Mem.run(Memory.rooms[creep.room.name].RoomInfo.Towers);
  var Spawns = Mem.run(Memory.rooms[creep.room.name].RoomInfo.Spawns);
  var damagedStructures = walls.concat(ramparts,containers);
  var structHp = Math.pow((12-creep.room.controller.level),(12-creep.room.controller.level)/2)
  var damagedStructures = _.filter(damagedStructures, function(structure){return (structure != null && structure.hits < 300000); });
  var damagedStructures = _.filter(damagedStructures.concat(roads,towers,Spawns,containers), function(structure){return (structure.hits != structure.hitsMax); });

  var numberDamaged = damagedStructures.length;
  var ClosestDamagedStructure = creep.pos.findClosestByRange(damagedStructures);

  var c = 0;
            for (i = 0; i < damagedStructures.length; i++){
                if(damagedStructures[i].hits < damagedStructures[c].hits){
                    c = i;
                }
            }
  if(numberDamaged > 0){
      if(damagedStructures[c].hits > 4500){
        if(creep.repair(damagedStructures[c])  == ERR_NOT_IN_RANGE) {
            Moveto.move(creep,damagedStructures[c]);
            creep.say(damagedStructures[c].hits, true);
        }
      }else{
        if(creep.repair(ClosestDamagedStructure)  == ERR_NOT_IN_RANGE) {
            Moveto.move(creep,ClosestDamagedStructure);
            creep.say(ClosestDamagedStructure.hitsMax/structHp, true);
        }
      }

      //console.log(damagedStructures[c].structureType+' Will be repaired to: '+(damagedStructures[c].hitsMax/structHp)+', current HP: '+damagedStructures[c].hits);
      //console.log(creep.repair(ClosestDamagedStructure));
      return true;
      }else{
        return false;
      }
}

jobs.Upgrade = function(creep){
    //console.log(creep);
  if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE){
      Moveto.move(creep,creep.room.controller);
  }
  return true;
}

jobs.Retreat = function(creep){
  creep.say('RETREAT!',true); //<- retreat code
  creep.memory.destRoom = Game.Flags[Warband.Flag2].roomName;//<- retreat code
}

jobs.Attack = function(creep){
  var hostiles = creep.pos.findClosestByRange(jobs.FindHostile(creep.room));
  var hostileBuildings = creep.pos.findClosestByRange(jobs.FindHostileStructure(creep.room));
  //console.log(hostileBuildings);
  if(creep.getActiveBodyparts(ATTACK) != 0){
    if(hostiles != undefined){
        creep.say('I see you ',true);
        if(creep.attack(hostiles) == ERR_NOT_IN_RANGE) {
            Moveto.move(creep,hostiles);
        }
    }
  }else if(creep.getActiveBodyparts(WORK) != 0){
    console.log(JSON.stringify(hostileBuildings));
    if(creep.dismantle(hostileBuildings) == ERR_NOT_IN_RANGE) {
        Moveto.move(creep,hostileBuildings);
    }
  }else if(creep.getActiveBodyparts(HEAL) != 0){
    var target = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
                 filter: function(object) {
                     return object.hits < object.hitsMax;
                 }
    });
    if(creep.heal(target) == ERR_NOT_IN_RANGE) {
        Moveto.move(creep,target);
    }
  }if(creep.getActiveBodyparts(RANGED_ATTACK) != 0){
    if(hostiles != undefined){
        creep.say('I see you ',true);
        if(creep.rangedAttack(hostiles) == ERR_NOT_IN_RANGE) {
            Moveto.move(creep,hostiles);
        }
    }else{
      if(creep.rangedAttack(hostileBuildings) == ERR_NOT_IN_RANGE) {
          Moveto.move(creep,hostileBuildings);
      }
    }
  }else{
    if(creep.attack(hostileBuildings) == ERR_NOT_IN_RANGE) {
        Moveto.move(creep,hostileBuildings);
    }
  }
}

jobs.brickwall = function(creep){
  var hostiles = creep.pos.findClosestByRange(jobs.FindHostile(creep.room));
  var hostileBuildings = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_WALL}});
  //console.log(hostileBuildings);
  if(creep.getActiveBodyparts(ATTACK) != 0){
    if(creep.attack(hostileBuildings) == ERR_NOT_IN_RANGE) {
        Moveto.move(creep,hostileBuildings);
    }
  }else if(creep.getActiveBodyparts(WORK) != 0){
    //console.log(JSON.stringify(hostileBuildings));
    if(creep.dismantle(hostileBuildings) == ERR_NOT_IN_RANGE) {
        Moveto.move(creep,hostileBuildings);
    }
  }else if(creep.getActiveBodyparts(HEAL) != 0){
    var target = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
                 filter: function(object) {
                     return object.hits < object.hitsMax;
                 }
    });
    if(creep.heal(target) == ERR_NOT_IN_RANGE) {
        Moveto.move(creep,target);
    }
  }if(creep.getActiveBodyparts(RANGED_ATTACK) != 0){
    if(hostiles != undefined){
        if(creep.rangedAttack(hostiles) == ERR_NOT_IN_RANGE) {
            Moveto.move(creep,hostiles, {reusePath: 50});
        }
      }
  }
}

jobs.War = function(creep){ //All different strategie/tactics should be included here.
  var hostiles = creep.pos.findClosestByRange(jobs.FindHostile(creep.room));
  var hostileBuildings = creep.pos.findClosestByRange(jobs.FindHostileStructure(creep.room));
  if(creep.getActiveBodyparts(ATTACK) != 0){
    if(hostiles != undefined){
        creep.say('I see you ',true);
        if(creep.attack(hostiles) == ERR_NOT_IN_RANGE) {
            Moveto.move(creep,hostiles, {reusePath: 50});
        }
    }
  }else if(creep.getActiveBodyparts(WORK) != 0){
    if(creep.dismantle(hostileBuildings) == ERR_NOT_IN_RANGE) {
        Moveto.move(creep,hostileBuildings);
    }
  }else if(creep.getActiveBodyparts(HEAL) != 0){
    if(creep.heal(target) == ERR_NOT_IN_RANGE) {
        Moveto.move(creep,target);
    }
  }else if(creep.getActiveBodyparts(RANGED_ATTACK) != 0){
      //jobranger
  }else if(creep.getActiveBodyparts(CLAIM) != 0){
      //jobclaimer
  }else if(creep.getActiveBodyparts(TOUGH) != 0 && (creep.getActiveBodyparts(ATTACK) == 0 && creep.getActiveBodyparts(RANGED_ATTACK) == 0)){
      //jobtoughguy
  }
}

jobs.GetEnergy = function(creep){ //get energy at storage first, then at extensions+spawns. Needs conditional to block picking up.
  var storages = creep.room.storage;

  var extensions = Mem.run(Memory.rooms[creep.room.name].RoomInfo.Extensions);
  var spawns = Mem.run(Memory.rooms[creep.room.name].RoomInfo.Spawns);

  var Sources = extensions.concat(spawns,extensions);
  var amountFull = extensions.concat(spawns,extensions).length;
  Sources = _.filter(Sources, function(structure){return (structure.energy != 0); });
  var Source = creep.pos.findClosestByRange(Sources);
    if(storages != undefined && storages.store[RESOURCE_ENERGY] != 0){
            if(amountFull != Sources.length || creep.memory.role == 'worker'){
                if(storages.transfer(creep,RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) { //withdraw @ storage
                    Moveto.move(creep,storages);
               }
            }
        else{
            jobs.EmptyLink(creep);

        }
    }else if(Memory.WithdrawLight == true && (creep.room.energyAvailable > creep.room.energyCapacityAvailable*0.3)){
        if(Source.transferEnergy(creep) == ERR_NOT_IN_RANGE) { //withdraw @ extensions, spawns
            Moveto.move(creep,Source);
        }
    }
}

jobs.EmptyLink = function(creep){
  var Links = Mem.run(Memory.rooms[creep.memory.destRoom].RoomInfo.Links);
  //console.log(Game.rooms[creep.memory.destRoom].storage.pos);
  var link = Game.rooms[creep.memory.destRoom].storage.pos.findInRange(Links, 6)[0];
    if(Links.length > 1){
      //var link = linkSend.pos.findInRange(FIND_MY_STRUCTURES, 2)[0]
      if(link != undefined && link.energy > 0){
          if(creep.carry.energy != creep.carryCapacity){ // if creep is empty
              //creep.say('The egg is cracked',true);
              if(link.transferEnergy(creep) == ERR_NOT_IN_RANGE) { //withdraw @ storage
                  Moveto.move(creep,link);
              }
          }/*else{
            if(creep.transfer(Target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) { //deposit @ storage
                Moveto.move(creep,Target);
            }
          }*/
        }else{
          jobs.GatherEnergy(creep);
        }
    }
}


module.exports = jobs;
