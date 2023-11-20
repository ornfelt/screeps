var BaseManager = require('../src/manager.base');
var assert = require('assert');

var constants = require('../src/main.constants');
var MainUtil = require('../src/main.util');
var info = require('../src/main.info');

var MemoryManager = require('../src/manager.memory');

var Creep = require('./mock/creep-mock');
var Room = require('./mock/room-mock');
var Spawn = require('./mock/spawn-mock');

// All methods tested.

describe('manager.base', () => {
	before(() => {
	    global.Game = require('./mock/game-mock').Game;
	    constants.DEBUG_ROLES = false;
	});
	
	beforeEach(() => {
		Game.clearAll();
	});
	
	it('exists', () => {
		var startsWith = 'class BaseManager';
		assert.equal(startsWith, BaseManager.toString().substring(0, startsWith.length));
	});

	describe('#fetchFreeSpawn', () => {
		it('exists', () => {
			
			var room = new Room();
			room.memory.base = { name : 'Dresden' };
			
			var spawn1 = new Spawn(room);
			spawn1.spawning = true;
			spawn1.memory.home = 'Dresden';
			
			var spawn2 = new Spawn(room);
			spawn2.spawning = false;
			spawn2.memory.home = 'Dresden';
			
			var spawn3 = new Spawn(room);
			spawn3.spawning = true;
			spawn3.memory.home = 'Dresden';

			var manager = new BaseManager(room);
			
			assert.deepEqual(spawn2, manager._fetchFreeSpawn('Dresden'));
		});

		it('empty list', () => {
			var room = new Room();
			room.memory.base = 'Dresden'; // a room without base will never be run
			
			MemoryManager._initSpawns();
			var manager = new BaseManager(room);
			
			assert.deepEqual(null, manager._fetchFreeSpawn('Dresden'));
		});

		it('none free exists', () => {

			var room = new Room();
			room.memory.base = { name : 'Dresden' };
			
			var spawn1 = new Spawn(room);
			spawn1.spawning = true;
			
			var spawn2 = new Spawn(room);
			spawn2.spawning = true;
			
			var spawn3 = new Spawn(room);
			spawn3.spawning = true;

			MemoryManager._initSpawns();
			var manager = new BaseManager(spawn1.room);
			
			assert.deepEqual(null, manager._fetchFreeSpawn('Dresden'));
		});

		it('only specific base', () => {
			
			var room = new Room();
			room.memory.base = { name : 'Dresden' };
			
			var spawn1 = new Spawn(room);
			spawn1.spawning = true;
			spawn1.memory.home = 'Chemnitz';
			
			var spawn2 = new Spawn(room);
			spawn2.spawning = true;
			spawn2.memory.home = 'Dresden';
			
			var spawn3 = new Spawn(room);
			spawn3.spawning = false;
			spawn3.memory.home = 'Dresden';

			var manager = new BaseManager(room);
			
			assert.deepEqual(spawn3, manager._fetchFreeSpawn('Dresden'));
		});

		it('all bases', () => {
			
			var room = new Room();
			room.memory.base = { name : 'Dresden' };
			
			var spawn1 = new Spawn(room);
			spawn1.spawning = false;
			spawn1.memory.home = 'Chemnitz';
			
			var spawn2 = new Spawn(room);
			spawn2.spawning = true;
			spawn2.memory.home = 'Dresden';
			
			var spawn3 = new Spawn(room);
			spawn3.spawning = false;
			spawn3.memory.home = 'Dresden';

			var manager = new BaseManager(room);
			
			assert.deepEqual(spawn1, manager._fetchFreeSpawn(null));
		});
	});

	describe('#spawnCreepForRole', () => {
		it('spawn', () => {
			
			var role = {};
			role.symbol = '!';
			role.roleName = 'Role';

			var spawn = new Spawn();
			
			var creep = new Creep('spawnCreepForRole', [ MOVE ]);
			
			role.spawnCreep = freeSpawn => {
				assert.deepEqual(freeSpawn, spawn);
				return creep;
			};
			
			MemoryManager._initSpawns();
			info.clearLines();
			
			var manager = new BaseManager(spawn.room);
			
			var spawnedCreep = manager._spawnCreepForRole(role);
			assert.deepEqual(creep, spawnedCreep);

			assert.equal(0, info.getLines().length);
		});

		it('spawn with debug', () => {
			
			var role = {};
			role.symbol = '!';
			role.roleName = 'Role';

			var spawn = new Spawn();
			spawn.memory.debug = true;
			
			var creep = new Creep('spawnCreepForRole', [ MOVE ]);
			
			role.spawnCreep = freeSpawn => {
				assert.deepEqual(freeSpawn, spawn);
				return creep;
			};
			
			MemoryManager._initSpawns();
			info.clearLines();
			
			var manager = new BaseManager(spawn.room);
			
			var spawnedCreep = manager._spawnCreepForRole(role);
			assert.deepEqual(creep, spawnedCreep);

			assert.equal(1, info.getLines().length);
			assert.equal('! Spawning new Role (1p)', info.getLine(0));
		});
		
		it('no free spawn', () => {
			
			var role = {};

			var creep = new Creep('spawnCreepForRole', [ MOVE ]);
			
			role.spawnCreep = freeSpawn =>  assert.fail('Where did the spawn come from: ' + freeSpawn);

			var room = new Room();
			room.memory.base = 'Dresden'; // a room without base will never be run
			
			MemoryManager._initSpawns();
			info.clearLines();
			
			var manager = new BaseManager(room);
			
			var spawnedCreep = manager._spawnCreepForRole(role);
			assert.equal(false, spawnedCreep);

			assert.equal(0, info.getLines().length);
		});

		it('error while spawning', () => {
			
			var role = {};
			role.symbol = '!';
			role.roleName = 'Role';

			var spawn = new Spawn();
			
			role.spawnCreep = freeSpawn => {
				assert.deepEqual(freeSpawn, spawn);
				return false;
			};
			
			MemoryManager._initSpawns();
			info.clearLines();
			
			var manager = new BaseManager(spawn.room);
			
			var spawnedCreep = manager._spawnCreepForRole(role);
			assert.equal(false, spawnedCreep);

			assert.equal(0, info.getLines().length);
		});

		it('no free spawn use other base', () => {
			var role = {};
			role.symbol = '!';
			role.roleName = 'Role';

			var spawn = new Spawn();
			spawn.room.memory.base = { name : 'A' };
			
			var creep = new Creep('spawnCreepForRole', [ MOVE ]);
			
			role.spawnCreep = freeSpawn => {
				assert.deepEqual(freeSpawn, spawn);
				return creep;
			};
			
			var otherRoom = new Room();
			otherRoom.memory.base = { 
					name : 'B', 
					outsourceSpawn : true,
			};
			
			var manager = new BaseManager(otherRoom);
			
			var spawnedCreep = manager._spawnCreepForRole(role);
			assert.deepEqual(creep, spawnedCreep);

			assert.equal(0, info.getLines().length);
		});

		it('no free spawn use other base with debug', () => {
			var role = {};
			role.symbol = '!';
			role.roleName = 'Role';

			var spawn = new Spawn();
			spawn.room.memory.base = { name : 'A' };
			spawn.memory.debug = true;
			
			var creep = new Creep('spawnCreepForRole', [ MOVE ]);
			
			role.spawnCreep = freeSpawn => {
				assert.deepEqual(freeSpawn, spawn);
				return creep;
			};
			
			var otherRoom = new Room();
			otherRoom.memory.base = { 
					name : 'B', 
					outsourceSpawn : true,
			};
			
			var manager = new BaseManager(otherRoom);
			
			var spawnedCreep = manager._spawnCreepForRole(role);
			assert.deepEqual(creep, spawnedCreep);

			assert.equal(1, info.getLines().length);
			assert.equal('! Spawning new Role (1p)', info.getLine(0));
		});
	});
	
	describe('#repopulateCreeps', () => {
		it('spawn', () => {

			var role = {};
			role.symbol = '!';
			role.roleName = 'Role';

			var spawn = new Spawn();
			
			var spawnCreepCalled = false;
			role.spawnCreep = freeSpawn => {
				spawnCreepCalled = true;
				assert.deepEqual(freeSpawn, spawn);
				return new Creep('repopulateCreeps', [ MOVE ]);
			};

			MemoryManager._initSpawns();
			info.clearLines();

			spawn.room.memory.base.roleConfig = { Role :  { requiredNumber : 1 } };

			var manager = new BaseManager(spawn.room);
			manager._allRoles = [role];
			manager._repopulateCreeps();
			
			assert.equal(true, spawnCreepCalled);
			assert.equal(0, info.getLines().length);
		});

		it('spawn with debug', () => {

			var role = {};
			role.symbol = '!';
			role.roleName = 'Role';

			var spawn = new Spawn();
			spawn.memory.debug = true;
			
			var spawnCreepCalled = false;
			role.spawnCreep = freeSpawn => {
				spawnCreepCalled = true;
				assert.deepEqual(freeSpawn, spawn);
				return new Creep('repopulateCreeps', [ MOVE ]);
			};

			MemoryManager._initSpawns();
			info.clearLines();

			spawn.room.memory.base.roleConfig = { Role :  { requiredNumber : 1 } };

			var manager = new BaseManager(spawn.room);
			manager._allRoles = [role];
			manager._repopulateCreeps();
			
			assert.equal(true, spawnCreepCalled);

			assert.equal(1, info.getLines().length);
			assert.equal('! Spawning new Role (1p)', info.getLine(0));
		});

		it('no spawn necessary', () => {

			var role = {};
			role.symbol = '!';
			role.roleName = 'Role';

			var spawn = new Spawn();
			
			var spawnCreepCalled = false;
			role.spawnCreep = freeSpawn => {
				spawnCreepCalled = true;
				return new Creep('repopulateCreeps', [ MOVE ]);
			};

			
			MemoryManager._initSpawns();
			info.clearLines();

			spawn.room.memory.base.roleConfig = { Role :  { requiredNumber : 0 } };

			var manager = new BaseManager(spawn.room);
			manager._allRoles = [role];
			manager._repopulateCreeps();
			
			assert.equal(false, spawnCreepCalled);
			assert.equal(0, info.getLines().length);
		});

		it('do not spawn two per round', () => {

			var role1 = {};
			role1.symbol = '&';
			role1.roleName = 'Role1';

			var role2 = {};
			role2.symbol = '$';
			role2.roleName = 'Role2';

			var spawn = new Spawn();
			
			var spawnCreepCalled = 0;
			role1.spawnCreep = freeSpawn => {
				spawnCreepCalled++;
				assert.deepEqual(freeSpawn, spawn);
				return new Creep('repopulateCreeps', [ MOVE ]);
			};
			role2.spawnCreep = role1.spawnCreep;

			MemoryManager._initSpawns();
			info.clearLines();

			spawn.room.memory.base.roleConfig = { 
					Role1 :  { requiredNumber : 1 },   
					Role2 :  { requiredNumber : 1 }, 
			};

			var manager = new BaseManager(spawn.room);
			manager._allRoles = [role1, role2];
			manager._repopulateCreeps();
			
			assert.equal(1, spawnCreepCalled);
			assert.equal(0, info.getLines().length);
		});


		it('do not spawn two per round with debug', () => {

			var role1 = {};
			role1.symbol = '&';
			role1.roleName = 'Role1';

			var role2 = {};
			role2.symbol = '$';
			role2.roleName = 'Role2';

			var spawn = new Spawn();
			spawn.memory.debug = true;
			
			var spawnCreepCalled = 0;
			role1.spawnCreep = freeSpawn => {
				spawnCreepCalled++;
				assert.deepEqual(freeSpawn, spawn);
				return new Creep('repopulateCreeps', [ MOVE ]);
			};
			role2.spawnCreep = role1.spawnCreep;

			MemoryManager._initSpawns();
			info.clearLines();

			spawn.room.memory.base.roleConfig = { 
					Role1 :  { requiredNumber : 1 },   
					Role2 :  { requiredNumber : 1 }, 
			};

			var manager = new BaseManager(spawn.room);
			manager._allRoles = [role1, role2];
			manager._repopulateCreeps();
			
			assert.equal(1, spawnCreepCalled);

			assert.equal(1, info.getLines().length);
			assert.equal('& Spawning new Role1 (1p)', info.getLine(0));
		});
	});

	describe('#spawnCreepForRoleName', () => {
		it('spawn', () => {
			
			var role = {};
			role.symbol = '!';
			role.roleName = 'RoleName';

			var spawn = new Spawn();
			
			var creep = new Creep('spawnCreepForRoleName', [ MOVE ]);
			
			role.spawnCreep = freeSpawn => {
				assert.deepEqual(freeSpawn, spawn);
				return creep;
			};
			
			MemoryManager._initSpawns();
			info.clearLines();
			
			var manager = new BaseManager(spawn.room);
			manager._allRoles = [ role ];
			
			var spawnedCreep = manager.spawnCreepForRoleName(role.roleName);
			assert.deepEqual(creep, spawnedCreep);

			assert.equal(0, info.getLines().length);
		});

		it('spawn with debug', () => {
			
			var role = {};
			role.symbol = '!';
			role.roleName = 'RoleName';

			var spawn = new Spawn();
			spawn.memory.debug = true;
			
			var creep = new Creep('spawnCreepForRoleName', [ MOVE ]);
			
			role.spawnCreep = freeSpawn => {
				assert.deepEqual(freeSpawn, spawn);
				return creep;
			};
			
			MemoryManager._initSpawns();
			info.clearLines();
			
			var manager = new BaseManager(spawn.room);
			manager._allRoles = [ role ];
			
			var spawnedCreep = manager.spawnCreepForRoleName(role.roleName);
			assert.deepEqual(creep, spawnedCreep);

			assert.equal(1, info.getLines().length);
			assert.equal('! Spawning new RoleName (1p)', info.getLine(0));
		});

		it('no free spawn', () => {
			
			var role = {};

			var creep = new Creep('spawnCreepForRoleName', [ MOVE ]);
			
			role.spawnCreep = freeSpawn =>  assert.fail('Where did the spawn come from: ' + freeSpawn);

			var room = new Room();
			room.memory.base = 'Dresden'; // a room without base will never be run
			
			MemoryManager._initSpawns();
			info.clearLines();
			
			var manager = new BaseManager(room);
			manager._allRoles = [ role ];
			
			var spawnedCreep = manager.spawnCreepForRoleName(role.roleName);
			assert.equal(false, spawnedCreep);

			assert.equal(0, info.getLines().length);
		});

		it('error while spawning', () => {
			
			var role = {};
			role.symbol = '!';
			role.roleName = 'RoleName';

			var spawn = new Spawn();
			
			role.spawnCreep = freeSpawn => {
				assert.deepEqual(freeSpawn, spawn);
				return false;
			};
			
			MemoryManager._initSpawns();
			info.clearLines();
			
			var manager = new BaseManager(spawn.room);
			manager._allRoles = [ role ];
			
			var spawnedCreep = manager.spawnCreepForRoleName(role.roleName);
			assert.equal(false, spawnedCreep);

			assert.equal(0, info.getLines().length);
		});

		it('no free spawn use other base', () => {
			var role = {};
			role.symbol = '!';
			role.roleName = 'RoleName';

			var spawn = new Spawn();
			spawn.room.memory.base = { name : 'A' };
			
			var creep = new Creep('spawnCreepForRoleName', [ MOVE ]);
			
			role.spawnCreep = freeSpawn => {
				assert.deepEqual(freeSpawn, spawn);
				return creep;
			};
			
			var otherRoom = new Room();
			otherRoom.memory.base = { 
					name : 'B', 
					outsourceSpawn : true,
			};
			
			var manager = new BaseManager(otherRoom);
			manager._allRoles = [ role ];
			
			var spawnedCreep = manager.spawnCreepForRoleName(role.roleName);
			assert.deepEqual(creep, spawnedCreep);
			assert.equal(0, info.getLines().length);
		});

		it('no free spawn use other base with debug', () => {
			var role = {};
			role.symbol = '!';
			role.roleName = 'RoleName';

			var spawn = new Spawn();
			spawn.room.memory.base = { name : 'A' };
			spawn.memory.debug = true;
			
			var creep = new Creep('spawnCreepForRoleName', [ MOVE ]);
			
			role.spawnCreep = freeSpawn => {
				assert.deepEqual(freeSpawn, spawn);
				return creep;
			};
			
			var otherRoom = new Room();
			otherRoom.memory.base = { 
					name : 'B', 
					outsourceSpawn : true,
			};
			
			var manager = new BaseManager(otherRoom);
			manager._allRoles = [ role ];
			
			var spawnedCreep = manager.spawnCreepForRoleName(role.roleName);
			assert.deepEqual(creep, spawnedCreep);

			assert.equal(1, info.getLines().length);
			assert.equal('! Spawning new RoleName (1p)', info.getLine(0));
		});

		it('no role found', () => {

			var spawn = new Spawn();
			
			MemoryManager._initSpawns();
			info.clearLines();
			
			var manager = new BaseManager(spawn.room);
			manager._allRoles = [ ];
			
			var spawnedCreep = manager.spawnCreepForRoleName('Other');
			assert.deepEqual(false, spawnedCreep);

			assert.equal(1, info.getLines().length);
			assert.equal('🛑 Could not find role: Other', info.getLine(0));
		});
	});

	describe('#showSpawningAnimation', () => {
		// this is much easier tested in the game
	});

	describe('#runBase', () => {
		it('no base', () => {
			
			var room = new Room();
			
			var manager = new BaseManager(room);
			
			var repopulateCreeps = false;
			manager._repopulateCreeps = () => repopulateCreeps = true;

			var showSpawningAnimation = false;
			manager._showSpawningAnimation = () => showSpawningAnimation = true;

			var moveCreeps = false;
			manager._moveCreeps = () => moveCreeps = true;
			
			manager.runBase();
			
			assert.equal(false, repopulateCreeps);
			assert.equal(false, showSpawningAnimation);
			assert.equal(false, moveCreeps);
		});

		it('with base', () => {

			var spawn = new Spawn();
			var room = spawn.room;
			
			MemoryManager._initSpawns();
			info.clearLines();
			
			var manager = new BaseManager(room);
			
			var repopulateCreeps = false;
			manager._repopulateCreeps = () => repopulateCreeps = true;

			var showSpawningAnimation = false;
			manager._showSpawningAnimation = () => showSpawningAnimation = true;

			var moveCreeps = false;
			manager._moveCreeps = () => moveCreeps = true;
			
			manager.runBase();
			
			assert.equal(true, repopulateCreeps);
			assert.equal(true, showSpawningAnimation);
			assert.equal(true, moveCreeps);
		});
	});

	describe('#findMandatoryRole', () => {
		it('find', () => {
			var role = {};
			role.symbol = '!';
			role.roleName = 'Role';
			
			var manager = new BaseManager(new Room());
			manager._allRoles = [ role ];

			assert.deepEqual(role, manager._findMandatoryRole('Role'));
			assert.equal(0, info.getLines().length);
		});

		it('find default', () => {
			var defaultRole = {};
			defaultRole.symbol = '?';
			defaultRole.roleName = 'Other';
			
			var role = {};
			role.symbol = '!';
			role.roleName = 'Role';
			
			var manager = new BaseManager(new Room());
			manager._allRoles = [ role ];
			manager._defaultRole = defaultRole;

			assert.deepEqual(defaultRole, manager._findMandatoryRole('Rolo'));

			assert.equal(1, info.getLines().length);
			assert.equal('🛑 COULD NOT FIND ROLE: Rolo 🛑', info.getLine(0));
		});
	});

	describe('#findNecessaryMandatoryRole', () => {
		it('find directly', () => {
			
			var role1 = {};
			role1.symbol = '!';
			role1.roleName = 'First';
			role1.isNecessary = room => true;

			var role2 = {};
			role2.symbol = '.';
			role2.roleName = 'Second';
			role2.isNecessary = room => true;

			var defaultRole = {};
			defaultRole.symbol = '?';
			defaultRole.roleName = 'Default';
			defaultRole.isNecessary = room => true;

			var spawn = new Spawn();
			var room = spawn.room;

			MemoryManager._initSpawns();
			info.clearLines();
			
			var manager = new BaseManager(room);
			manager._allRoles = [ role1, role2 ];
			manager._defaultRole = defaultRole;
			MemoryManager._clearRoomRoleInfo(room, manager._allRoles);

			assert.deepEqual(role1, manager._findNecessaryMandatoryRole('First'));
			assert.deepEqual(role2, manager._findNecessaryMandatoryRole('Second'));
			assert.equal(0, info.getLines().length);
		});

		it('do not find', () => {
			
			var role1 = {};
			role1.symbol = '!';
			role1.roleName = 'First';
			role1.isNecessary = room => true;

			var role2 = {};
			role2.symbol = '.';
			role2.roleName = 'Second';
			role2.isNecessary = room => true;

			var defaultRole = {};
			defaultRole.symbol = '?';
			defaultRole.roleName = 'Default';
			defaultRole.isNecessary = room => true;

			var spawn = new Spawn();
			var room = spawn.room;

			MemoryManager._initSpawns();
			info.clearLines();
			
			var manager = new BaseManager(room);
			manager._allRoles = [ role1, role2 ];
			manager._defaultRole = defaultRole;
			MemoryManager._clearRoomRoleInfo(room, manager._allRoles);

			assert.deepEqual(defaultRole, manager._findNecessaryMandatoryRole('Third'));
			assert.equal(1, info.getLines().length);
			assert.equal('🛑 COULD NOT FIND ROLE: Third 🛑', info.getLine(0));
		});
		
		it('find necessary', () => {
			
			var role1 = {};
			role1.symbol = '!';
			role1.roleName = 'First';
			role1.isNecessary = room => false;

			var role2 = {};
			role2.symbol = '.';
			role2.roleName = 'Second';
			role2.isNecessary = room => true;

			var defaultRole = {};
			defaultRole.symbol = '?';
			defaultRole.roleName = 'Default';
			defaultRole.isNecessary = room => true;

			var spawn = new Spawn();
			var room = spawn.room;

			MemoryManager._initSpawns();
			info.clearLines();
			
			var manager = new BaseManager(room);
			manager._allRoles = [ role1, role2 ];
			manager._defaultRole = defaultRole;
			MemoryManager._clearRoomRoleInfo(room, manager._allRoles);
			
			assert.deepEqual(role2, manager._findNecessaryMandatoryRole('First'));
			assert.deepEqual(role2, manager._findNecessaryMandatoryRole('Second'));
			assert.equal(0, info.getLines().length);
		});

		it('find default necessary', () => {
			
			var role1 = {};
			role1.symbol = '!';
			role1.roleName = 'First';
			role1.isNecessary = room => false;

			var role2 = {};
			role2.symbol = '.';
			role2.roleName = 'Second';
			role2.isNecessary = room => true;

			var defaultRole = {};
			defaultRole.symbol = '?';
			defaultRole.roleName = 'Default';
			defaultRole.isNecessary = room => false;

			var spawn = new Spawn();
			var room = spawn.room;

			MemoryManager._initSpawns();
			info.clearLines();
			
			var manager = new BaseManager(room);
			manager._allRoles = [ role1, role2 ];
			manager._defaultRole = defaultRole;
			MemoryManager._clearRoomRoleInfo(room, manager._allRoles);
			
			assert.deepEqual(role2, manager._findNecessaryMandatoryRole('Third'));
			assert.equal(1, info.getLines().length);
			assert.equal('🛑 COULD NOT FIND ROLE: Third 🛑', info.getLine(0));
		});
	});

	describe('#moveCreeps', () => {
		it('move creeps', () => {
			var role1 = {};
			role1.roleName = 'First';
			role1.isNecessary = room => false;
			
			var creep1 = new Creep();
			creep1.memory.role = role1.roleName;
			
			var run1Called = false;
			role1.run = creep =>  {
				run1Called = true;
				assert.deepEqual(creep1, creep);
			};

			var role2 = {};
			role2.roleName = 'Second';
			role2.isNecessary = room => true;

			var creep2 = new Creep();
			creep2.memory.role = role2.roleName;

			var run2Called = false;
			role2.run = creep =>  {
				run2Called = true;
				assert.deepEqual(creep2, creep);
			};

			var spawn = new Spawn();
			spawn.name = 'My first base';
			var room = spawn.room;

			MemoryManager._initSpawns();
			info.clearLines();

			assert.equal('My first base', room.memory.base.name);
			creep1.memory.home = room.memory.base.name;
			creep2.memory.home = room.memory.base.name;
			
			var manager = new BaseManager(room);
			manager._allRoles = [ role1, role2 ];
			MainUtil.findAllCreeps = () => [creep1, creep2];
			
			MemoryManager._clearRoomRoleInfo(room, manager._allRoles);
			manager._moveCreeps();

			assert.equal(false, run1Called);
			assert.equal(true, run2Called);
		});

		it('catch exception', () => {
			var role = {};
			role.roleName = 'First';
			role.isNecessary = room => false;
			
			var creep = new Creep();
			creep.memory.role = role.roleName;
			
			var runCalled = false;
			role.run = creep =>  {
				runCalled = true;
				throw 'Ignore me, please!';
			};

			var spawn = new Spawn();
			spawn.name = 'My Base';
			var room = spawn.room;

			MemoryManager._initSpawns();
			info.clearLines();

			assert.equal('My Base', room.memory.base.name);
			creep.memory.home = room.memory.base.name;
			
			var manager = new BaseManager(room);
			manager._allRoles = [ role ];
			MainUtil.findAllCreeps = () => [creep];
			
			MemoryManager._clearRoomRoleInfo(room, manager._allRoles);
			manager._moveCreeps();

			assert.equal(true, runCalled);
		});

		it('ignore spawning', () => {
			var role = {};
			role.roleName = 'First';
			role.isNecessary = room => false;
			
			var creep = new Creep();
			creep.memory.role = role.roleName;
			creep.spawning = true;
			
			var runCalled = false;
			role.run = creep =>  {
				runCalled = true;
			};

			var spawn = new Spawn();
			spawn.name = 'A Base';
			var room = spawn.room;

			MemoryManager._initSpawns();
			info.clearLines();

			assert.equal('A Base', room.memory.base.name);
			creep.memory.home = room.memory.base.name;
			
			var manager = new BaseManager(room);
			manager._allRoles = [ role ];
			MainUtil.findAllCreeps = () => [creep];
			
			MemoryManager._clearRoomRoleInfo(room, manager._allRoles);
			manager._moveCreeps();

			assert.equal(false, runCalled);
		});

		it('ignore other bases', () => {
			var role = {};
			role.roleName = 'First';
			role.isNecessary = room => false;
			
			var creep = new Creep();
			creep.memory.role = role.roleName;
			creep.spawning = true;
			
			var runCalled = false;
			role.run = creep =>  {
				runCalled = true;
			};

			var spawn = new Spawn();
			spawn.name = 'Leipzig';
			var room = spawn.room;

			MemoryManager._initSpawns();
			info.clearLines();

			assert.equal('Leipzig', room.memory.base.name);
			creep.memory.home = 'Chemnitz'; // we don't associate with these guys
			
			var manager = new BaseManager(room);
			manager._allRoles = [ role ];
			MainUtil.findAllCreeps = () => [creep];
			
			MemoryManager._clearRoomRoleInfo(room, manager._allRoles);
			manager._moveCreeps();

			assert.equal(false, runCalled);
		});
	});
});
