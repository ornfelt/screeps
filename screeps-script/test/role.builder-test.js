var Builder = require('../src/role.builder');
var assert = require('assert');

var constants = require('../src/main.constants');
var info = require('../src/main.info');

var Creep = require('./mock/creep-mock');
var Room = require('./mock/room-mock');
var Spawn = require('./mock/spawn-mock');
var Store = require('./mock/store-mock');

// All methods tested.

describe('role.builder', () => {
	before(() => {
	    global.Game = require('./mock/game-mock').Game;
	});
	
	beforeEach(() => {
		Game.clearAll();
		info.clearLines();
	});
	
	it('constructor', () => {
		var startsWith = 'class Builder';
		assert.equal(startsWith, Builder.toString().substring(0, startsWith.length));
		
		var object = new Builder();
		assert.equal('Builder', object.roleName);
		assert.equal('#ffff00', object.color);
		assert.equal('🔨', object.symbol);
		assert.equal(70, object.priority);
	});

	describe('#findTargets', () => {
		it('find correct structures', () => {
			
			var room = new Room();
			var findWasCalled = false;
			room.find = (type, opt) => {
				findWasCalled = true;
				assert.equal(FIND_MY_CONSTRUCTION_SITES, type);
			};

			var object = new Builder();
			object._findTargets(room);
			
			assert.equal(true, findWasCalled);
		});
	});
	
	describe('#work (via run)', () => {
		it('lifecycle', () => {
			
			var creep = new Creep('work', [CARRY, CARRY]);
			creep.store.usedCapacity = 50;
			creep.store[RESOURCE_ENERGY] = creep.store;
			
			var source = new Spawn();
			source.pos.x = 13;
			source.pos.y = 42;
	
			var target = new Spawn();
			target.pos.x = 23;
			target.pos.y = 6;
			
			var object = new Builder();
			object._findSources = room => [ source ];
			object._findTargets = room => [ target ];
			
			// store is half full, so first travel to source
			object.run(creep);
	
			assert.equal(50, creep.store[RESOURCE_ENERGY].getUsedCapacity());
			assert.equal(100, creep.store[RESOURCE_ENERGY].getCapacity());
			assert.equal(source.pos.x, creep.pos.x);
			assert.equal(source.pos.y, creep.pos.y);
	
			// store is still half full, so harvest source
			object.run(creep);
	
			assert.equal(100, creep.store[RESOURCE_ENERGY].getUsedCapacity());
			assert.equal(100, creep.store[RESOURCE_ENERGY].getCapacity());
			assert.equal(source.pos.x, creep.pos.x);
			assert.equal(source.pos.y, creep.pos.y);
	
			// store is full, target is out of range, so move to target
			object.run(creep);
	
			assert.equal(100, creep.store[RESOURCE_ENERGY].getUsedCapacity());
			assert.equal(100, creep.store[RESOURCE_ENERGY].getCapacity());
			assert.equal(target.pos.x, creep.pos.x);
			assert.equal(target.pos.y, creep.pos.y);
	
			// store is full, target is in range, so work
			object.run(creep);
	
			assert.equal(true, target.memory.wasBuilt);
			assert.equal(0, creep.store.getUsedCapacity());
			assert.equal(100, creep.store.getCapacity());
			assert.equal(target.pos.x, creep.pos.x);
			assert.equal(target.pos.y, creep.pos.y);
	
			// 2) store is empty, so first travel to source
			object.run(creep);

			assert.equal(true, target.memory.wasBuilt);
			assert.equal(0, creep.store.getUsedCapacity());
			assert.equal(100, creep.store.getCapacity());
			assert.equal(source.pos.x, creep.pos.x);
			assert.equal(source.pos.y, creep.pos.y);
		});
		
		it('self-destruct', () => {
			info.clearLines();
			
			var creep = new Creep('run');
			creep.memory.selfdestruct = true;

			var spawn = new Spawn();
			spawn.pos.x = 13;
			spawn.pos.y = 42;
			creep.pos.findClosestByPath = type => spawn;
			
			var object = new Builder();
			
			// spawn is far away, so go there
			object.run(creep);

			assert.equal(spawn.pos.x, creep.pos.x);
			assert.equal(spawn.pos.y, creep.pos.y);
			assert.equal(creep, Game.creeps['run']);

			// spawn is now close, so self-destruct
			object.run(creep);

			assert.equal(spawn.pos.x, creep.pos.x);
			assert.equal(spawn.pos.y, creep.pos.y);
			assert.equal(null, Game.creeps['run']);
		});

		it('pickup energy', () => {
			info.clearLines();

			var droppedEnergy = new Spawn();
			droppedEnergy.resourceType = RESOURCE_ENERGY;
			droppedEnergy.pos.x = 12;
			droppedEnergy.pos.y = 13;
			
			var creep = new Creep('run');
			creep.store = new Store(100);
			creep.pos.findInRange = (type) => (type == FIND_DROPPED_RESOURCES) ? [ droppedEnergy ] : [];
			
			var object = new Builder();
			
			// dropped energy is far away, so go there
			creep.pickup = resource => (resource == droppedEnergy) ? ERR_NOT_IN_RANGE : -1;
			object._work = (workingCreep) => assert.fail('Creep cannot work while moving!');
			
			object.run(creep);

			assert.equal(12, creep.pos.x);
			assert.equal(13, creep.pos.y);
			
			// dropped energy is close, so pickup
			creep.pickup = resource => (resource == droppedEnergy) ? OK : -1;
			
			var workCalled = false; 
			object._work = (workingCreep) => workCalled = true;
			
			object.run(creep);

			assert.equal(12, creep.pos.x);
			assert.equal(13, creep.pos.y);
			assert.equal(true, workCalled);
		});

		it('loot tombstone', () => {
			var tombstone = { 
				pos: new RoomPosition(),
			};
			tombstone.pos.x = 12;
			tombstone.pos.y = 13;
			tombstone.store = new Store(100);
			tombstone.store.usedCapacity = 50;
			
			var creep = new Creep('run');
			creep.store = new Store(100);
			creep.pos.findInRange = (type) => (type == FIND_TOMBSTONES) ? [ tombstone ] : [];
			
			var object = new Builder();
			
			// tombstone is far away, so go there
			creep.pickup = resource => (resource == tombstone) ? ERR_NOT_IN_RANGE : -1;
			object._work = (workingCreep) => assert.fail('Creep cannot work while looting!');
			
			object.run(creep);

			assert.equal(12, creep.pos.x);
			assert.equal(13, creep.pos.y);
			
			// tombstone is close, so pickup
			creep.pickup = resource => (resource == tombstone) ? OK : -1;
			
			object.run(creep);

			assert.equal(12, creep.pos.x);
			assert.equal(13, creep.pos.y);
		});

		it('moveToGameObject', () => {
			
			var creep = new Creep('run');

			var gameObject = new Spawn();
			gameObject.pos.x = 13;
			gameObject.pos.y = 42;

			Game.getObjectById = id => id == gameObject.id ? gameObject : null;
			creep.memory.moveToGameObject = gameObject.id;
			
			var object = new Builder();
			object.run(creep);

			// game object is far away, so go there
			assert.equal(gameObject.pos.x, creep.pos.x);
			assert.equal(gameObject.pos.y, creep.pos.y);
			assert.equal(gameObject.id, creep.memory.moveToGameObject);

			// game object is now close, so remove game objects from memory and do normal work
			var workCalled = false;
			object._work = () => workCalled = true;
			object.run(creep);

			assert.equal(gameObject.pos.x, creep.pos.x);
			assert.equal(gameObject.pos.y, creep.pos.y);
			assert.equal(null, creep.memory.moveToGameObject);
			assert.equal(true, workCalled);
		});
	});

	describe('#sortTargetForClosest', () => {
		it('sort by range', () => {
			
			var creep = new Creep('sortTargetForClosest', [CARRY, CARRY]);
			
			var target1 = new Spawn();
			target1.progressTotal = 1000; 
			target1.progress = 500;
			
			var target2 = new Spawn();
			target2.progressTotal = 1000; 
			target2.progress = 500;

			creep.pos.getRangeTo = t => t == target1 ? 3 : 7;

			var object = new Builder();
			
			assert.deepEqual([target1, target2], object._sortTargetForClosest([target1, target2], creep));
		});

		it('sort by progress', () => {
			
			var creep = new Creep('sortTargetForClosest', [CARRY, CARRY]);
			creep.pos.getRangeTo = t => 5;
			
			var target1 = new Spawn();
			
			var target2 = new Spawn();

			var object = new Builder();
			
			// sort with same total
			
			target1.progressTotal = 1000; 
			target1.progress = 500;
			
			target2.progressTotal = 1000; 
			target2.progress = 700;
			
			assert.deepEqual([target2, target1], object._sortTargetForClosest([target1, target2], creep));
			
			// sort with different total
			
			target1.progressTotal = 700; 
			target1.progress = 500;
			
			target2.progressTotal = 1000; 
			target2.progress = 700;

			assert.deepEqual([target1, target2], object._sortTargetForClosest([target1, target2], creep));
		});


		it('sort by both', () => {
			
			var creep = new Creep('sortTargetForClosest', [CARRY, CARRY]);
			creep.pos.getRangeTo = t => 5;
			
			var target1 = new Spawn();
			target1.progressTotal = 1000; 
			
			var target2 = new Spawn();
			target2.progressTotal = 1000; 

			var object = new Builder();

			// both targets are on top of each other, sort by progress
			target1.progress = 700;
			target2.progress = 500;
			creep.pos.getRangeTo = t => t == target1 ? 3 : 3;
			
			assert.deepEqual([target1, target2], object._sortTargetForClosest([target1, target2], creep));
			
			// both targets are close together, sort by progress
			target1.progress = 500;
			target2.progress = 700;
			creep.pos.getRangeTo = t => t == target1 ? 3 : 4;
			
			assert.deepEqual([target2, target1], object._sortTargetForClosest([target1, target2], creep));

			// both targets are far apart, sort by range
			target1.progress = 500;
			target2.progress = 700;
			creep.pos.getRangeTo = t => t == target1 ? 4 : 14;
			
			assert.deepEqual([target1, target2], object._sortTargetForClosest([target1, target2], creep));
		});
	});

	describe('TARGET_MODE_USE_IF_VALID', () => {
		var setupBuilder = function() {
			
			// this is the default set up (see #findClosestTarget)
	
			var targetA = new Spawn(null, 'A');
			targetA.pos.x = 4;
			targetA.progressTotal = 1000; 
			targetA.progress = 600;
	
			var targetB = new Spawn(null, 'B');
			targetB.pos.x = 1;
			targetB.progressTotal = 1000; 
			targetB.progress = 900;
	
			var targetC = new Spawn(null, 'C');
			targetC.pos.x = 10;
			targetC.progressTotal = 1000; 
			targetC.progress = 0;
	
			var targetD = new Spawn(null, 'D');
			targetD.pos.x = 11;
			targetD.progressTotal = 1000; 
			targetD.progress = 0;
			
			var targets = [];
			targets[targetA.id] = targetA;
			targets[targetB.id] = targetB;
			targets[targetC.id] = targetC;
			targets[targetD.id] = targetD;
			Game.getObjectById = id => targets[id];
			
			var object = new Builder();
			object._findTargets = room => [ targetA, targetB, targetC ];

			assert.equal(targetB, object._findClosestTarget(new Creep('Builder')));
			return object;
		}
		
		describe('#findClosestTarget', () => {
			it('target found', () => {
				var creep = new Creep('Builder');
				creep.memory.target = 'C';

				var object = setupBuilder();
				
				assert.equal('C', object._findClosestTarget(creep).id);
				assert.equal(0, info.getLines().length);
			});

			it('target not valid', () => {
				// if it was not found in "findTargets()", the target is not valid -> use other
				var creep = new Creep('Builder');
				creep.memory.target = 'D';

				var object = setupBuilder();
				
				assert.equal('B', object._findClosestTarget(creep).id);
				assert.equal(0, info.getLines().length);
			});
			
			it('target not found', () => {
				// target is not even a game object -> error and use other
				var creep = new Creep('Builder');
				creep.memory.target = 'E';

				var object = setupBuilder();
				
				assert.equal('B', object._findClosestTarget(creep).id);
				assert.equal(1, info.getLines().length);
				assert.equal('🛑 Builder could not find target: E', info.getLine(0));
			});
		});
	});

	describe('SOURCE_MODE_USE_OR_WAIT', () => {
		var setupBuilder = function() {
			
			// this is the default set up (see #findClosestSource)
	
			var sourceA = new Spawn(null, 'A');
			sourceA.pos.x = 4;
	
			var sourceB = new Spawn(null, 'B');
			sourceB.pos.x = 1;
	
			var sourceC = new Spawn(null, 'C');
			sourceC.pos.x = 10;
	
			var sourceD = new Spawn(null, 'D');
			sourceD.pos.x = 11;
			
			var sources = [];
			sources[sourceA.id] = sourceA;
			sources[sourceB.id] = sourceB;
			sources[sourceC.id] = sourceC;
			sources[sourceD.id] = sourceD;
			Game.getObjectById = id => sources[id];
			
			var object = new Builder();
			object._findSources = room => [ sourceA, sourceB, sourceC ];

			assert.equal(sourceB, object._findClosestSource(new Creep('SOURCE_MODE_X')));
			return object;
		}
		
		describe('#findClosestSource', () => {
			it('source found', () => {
				var creep = new Creep('Builder');
				creep.memory.source = 'C';

				var object = setupBuilder();
				
				assert.equal('C', object._findClosestSource(creep).id);
				assert.equal(0, info.getLines().length, info.getLines().toString());
			});
			
			it('source not valid', () => {
				// if it was not found in "findSources()", the source is not valid -> use anyway
				var creep = new Creep('Builder');
				creep.memory.source = 'D';

				var object = setupBuilder();
				
				assert.equal('D', object._findClosestSource(creep).id);
				assert.equal(0, info.getLines().length, info.getLines().toString());
			});

			it('source not found', () => {
				// source is not even a game object -> error and wait
				var creep = new Creep('Builder');
				creep.memory.source = 'E';

				var object = setupBuilder();
				
				assert.equal(null, object._findClosestSource(creep));
				assert.equal(1, info.getLines().length);
				assert.equal('🛑 Builder could not find source: E', info.getLine(0));
			});
		});
	});
});
