var load_enemies = function(filename, tileset, header) {
	var enemylayer = new ObjectGroup("objects");			
	var kidobj = new MapObject();
	var tkid = tileset.tile(0);
	kidobj.width = tkid.width;
	kidobj.height = tkid.height;
	kidobj.tile = tkid;
	kidobj.x = header.kidx;
	kidobj.y = header.kidy;
	kidobj.visible = true;
	kidobj.setProperty("objtype", "kid");
	enemylayer.addObject(kidobj);

	var flagobj = new MapObject();
	var tflag = tileset.tile(1);
	flagobj.width = tflag.width;
	flagobj.height = tflag.height;
	flagobj.tile = tflag;
	flagobj.x = header.flagx+13;
	flagobj.y = header.flagy+16;
	flagobj.visible = true;
	flagobj.setProperty("objtype", "flag");
	enemylayer.addObject(flagobj);

	var file = new BinaryFile(filename, BinaryFile.ReadOnly);
	var data = new Uint8Array(file.readAll());
	var n_enemies = data[13];
	for (var i = 0; i < 3; ++i) {
		var ei = (data[4+2*i] << 8) + data[5+2*i];
		if (ei == 0xFFFF) {
			var ei_pal = -1;
			var ei_id = -1;
		} else {
			var ei_pal = ei >> 14;
			var ei_id = ei & 0x3FFF;			
		}
		enemylayer.setProperty("enemy_palette" + (i+1), ei_pal);
		enemylayer.setProperty("enemy_type" + (i+1), ei_id);
	}
	enemylayer.setProperty("automatic_enemy_headers", true);

	for (var i = 0; i < n_enemies; ++i) {
		var s = 14 + 8*i;
		var obj = new MapObject();
		var oid  = data[s+0];
		if (oid + 4 >= tileset.tileCount) {
			tiled.warn("Ignoring enemy with invalid ID " + oid + ".");
			continue;
		}
		var tt = tileset.tile(oid+4); // first 4 are non-enemies
		obj.width = tt.width;
		obj.height = tt.height;
		obj.tile = tt;
		obj.setProperty("objtype", "enemy");
		// obj.setProperty("enemyid", oid);  // implicit in the tile id.
		obj.setProperty("respawn", data[s+1] == 0);
		obj.setProperty("level", (data[s+2]<<8) + data[s+3]);
		obj.x = (data[s+4]<<8) + data[s+5];
		obj.y = (data[s+6]<<8) + data[s+7];
		obj.visible = true;
		enemylayer.addObject(obj);
	}

	return enemylayer;
}

// It is possible to set default values for properties of tiles in a tileset.
// When a tile-based object overwrites the default value, the value is directly
// accessible. If it uses the default value, however, the value is undefined.
// Then we have to access it via the tileset.
var get_object_property = function(obj, property) {
	var value = obj.property(property);
	if (typeof value === 'undefined') {
		value = obj.tile.tileset.tile(obj.tile.id).property(property);
	}
	return value;
}

// overwrites the header's kid/flag position
var save_objects = function(layer, paths, header, kcmdata) {
	if (!layer.isObjectLayer) {
		tiled.warn("Invalid enemy/object layer format. Objects not saved.");
		return false;
	}

	var enemydata = new Uint8Array(14 + 8*layer.objectCount);
	var enemydata_pos = 14;
	var n_enemies = 0;
	var enemy_ids = new Set();

	var n_platforms = 0;
	var platform_loading_zones = parse_platform_scripts(paths.repo_path);
	var platform_output_lines = Array();

	var kidflag_found = {
		kid: false,
		flag: false
	}

	for (var oid = 0; oid < layer.objectCount; ++oid) {
		var obj = layer.objectAt(oid);
		if (obj.tile == null || obj.tile.tileset == null) {
			tiled.warn("Object " + obj.id + " has no tile. If template, please detach. Object not saved.");
			continue;
		}

		var objtype = get_object_property(obj, "objtype");
		if (obj.tile.tileset.name == "platforms") {
			if (objtype == "platform") {
				var success = place_platform(obj, platform_output_lines, platform_loading_zones, header);
				if (success) {
					n_platforms += 1;
				}
			} else if (["teleport", "ghostblock"].includes(objtype)) {
				place_block(obj, kcmdata, header);
			} else {
				tiled.warn("Object " + obj.id + " has unknown objtype " + objtype);
			}
		} else if (obj.tile.tileset.name == "objects") {
			if (objtype == "enemy") {
				var success = place_enemy(obj, enemydata, enemydata_pos, header);
				if (success) {
					enemy_ids.add(obj.tile.id - 4);
					enemydata_pos += 8;
					n_enemies += 1;
				}
			} else if (["kid", "flag"].includes(objtype)) {
				// this function updates the header and kidflag_found
				place_kidflag(obj, header, kidflag_found);
			} else {
				tiled.warn("Object " + obj.id + " has unknown objtype " + objtype);
			}
		} else {
			tiled.warn("Object " + obj.id + " is not from objects/platform tileset. Ignoring.");
		}
	}

	save_platforms(paths.platform, platform_output_lines, n_platforms);

	if (!kidflag_found.flag) {
		tiled.warn("No flag found. Using position from header file.")
	}
	if (!kidflag_found.kid) {
		tiled.warn("No kid found. Using position from header file.")
	}
	var blockRAMsize = header.blockbytype["ghost"]*16 + header.blockbytype["teleport"]*10 + header.blockbytype["prize"]*8;
	if (blockRAMsize > 2200) {
		tiled.warn("Possibly too many ghost/teleport/prize blocks.\n"
			+ "(number of ghost block groups) * 16 + (number of teleports) * 10 + (number of prize blocks) * 8\n"
			+ "must be less than 2200, but is " + blockRAMsize + " assuming ungrouped ghost blocks.\nNote: "
			+ header.blockbytype["ghost"] + " ghost blocks (ungrouped), "
			+ header.blockbytype["teleport"] + " teleports, "
			+ header.blockbytype["prize"] + " prize blocks.")
	}


	// header
	enemydata[10] = 0x7D;
	enemydata[12] = n_enemies ? 0x80 : 0;
	enemydata[13] = n_enemies;
	fill_enemy_header(enemydata, enemy_ids, layer, header);

	var enemyfile = new BinaryFile(paths.enemy, BinaryFile.ReadWrite);
	enemyfile.resize(0);  // workaround...
	enemyfile.write(enemydata.buffer.slice(0, 14 + 8*n_enemies));
	enemyfile.commit();
	return true;
}


var fill_enemy_header = function(enemydata, enemy_ids, layer, header) {
	header.murderwall_flags = (layer.property("murderwall_enabled") << 1) | layer.property("murderwall_goleft");
	if (header.murderwall_flags == 1) {
		header.murderwall_flags = 0;  // 1 crashes the game.
	}
	header.weather_flags = layer.property("weather_flags");
	if (header.weather_flags < 0 || header.weather_flags > 3) {  // 1=geyser, 2=storm, 3=hail storm
		header.weather_flags = 0;
		tiled.warn("Invalid weather_flags. Disabling weather effects.");
	}
	if (header.murderwall_flags && header.weather_flags) {
		tiled.warn("Cannot have both murder wall and weather effects.");
	}

	// For each enemy type, remember the user specified palette.
	var palette_by_type = new Object();
	for (var i = 1; i < 4; ++i) {
		var ei_pal = layer.property("enemy_palette" + i);
		var ei_id = layer.property("enemy_type" + i);
		if (ei_id >= 0) {
			palette_by_type[ei_id] = ei_pal;
		}
	}
	// Determine or simply get user specified enemy header.
	var auto_headers = layer.property("automatic_enemy_headers");
	if (auto_headers) {
		var slots = get_auto_enemy_headers(enemy_ids, header);
	} else {
		var slots = [1, 2, 3].map(j => layer.property("enemy_type" + j));
	}
	// Write enemy types present on the map + their palettes.
	for (var i = 0; i < 3; ++i) {
		var ei_id = slots[i];
		var ei_pal = (auto_headers ? palette_by_type[ei_id] : layer.property("enemy_palette" + (i+1)));
		if (ei_id == null || ei_id < 0 || ei_id > 36) {  // TODO: 36 should be ei_id + 4 >= tileset.tileCount
			enemydata[4+2*i] = 0xFF;
			enemydata[5+2*i] = 0xFF;
		} else {  // valid enemy
			if (ei_pal == null || ei_pal < 0 || ei_pal > 2) {
				ei_pal = 0;  // palette is invalid though --> set to 0
			}
			var ei = (ei_pal << 14) + ei_id;
			enemydata[4+2*i] = ei >> 8;
			enemydata[5+2*i] = ei & 0xFF;
		}
	}
}


var place_enemy = function(obj, enemydata, pos, header) {
	if (obj.tile.id < 4) {
		tiled.warn("Object " + obj.id + " is enemy with invalid ID. Ignoring.");
		return false;
	} else if (obj.x < 0 || obj.x >= header.fgxsize_blocks*16 || obj.y < 0 || obj.y >= header.fgysize_blocks*16) {
		tiled.warn("Object " + obj.id + " is enemy that is out of bounds. Ignoring.");
		return false;
	} else {
		enemydata[pos] = obj.tile.id - 4;
		if (!get_object_property(obj, "respawn")) {
			enemydata[pos+1] = 0xFF; // 0 for objects that do respawn
		}
		if (get_object_property(obj, "level")) {
			enemydata[pos+2] = get_object_property(obj, "level") >> 8;
			enemydata[pos+3] = get_object_property(obj, "level") & 0xFF;
		}
		enemydata[pos+4] = obj.x >> 8;
		enemydata[pos+5] = obj.x & 0xFF;
		enemydata[pos+6] = obj.y >> 8;
		enemydata[pos+7] = obj.y & 0xFF;
		return true;
	}
}


var place_kidflag = function(obj, header, kidflag_found) {
	if (get_object_property(obj, "objtype") == "kid") {
		if (kidflag_found.kid) {
			tiled.warn("Multiple Kid objects found. Using first valid one.");
		} else if (obj.x >= header.fgxsize_blocks*16 || obj.y >= header.fgysize_blocks*16) {
			tiled.warn("Kid object is out of level bounds. Ignoring.");
		} else {
			header.kidx = obj.x;
			header.kidy = obj.y;
			kidflag_found.kid = true;
		}
	} else if (get_object_property(obj, "objtype") == "flag") {
		if (kidflag_found.flag) {
			tiled.warn("Multiple Flag objects found. Using first valid one.");
		} else {
			header.flagx = obj.x-13;
			header.flagy = obj.y-16;
			kidflag_found.flag = true;
		}
	}
}


var get_auto_enemy_headers = function(enemy_ids, header) {
	var slots = [-1, -1, -1]; // -1 free, -2 reserved, >=0 used
	if (header.murderwall_flags || header.weather_flags) {
		slots[0] = -2;
	}
	if (enemy_ids.has(0x12)) {  // Lion: takes up 3 art slots
		if (slots[0] != -1) {
			tiled.warn("Cannot allocate enemy header slot for enemy type \"lion\" (id 18).");
		} else {
			slots[0] = 0x12;
			slots[1] = -2;
			slots[2] = -2;
		}
		enemy_ids.delete(0x12);
	}
	for (boss_id of [0x20, 0x22, 0x23, 0x24]) {  // Bosses take up 3 slots
		if (enemy_ids.has(boss_id)) {
			if (slots[0] != -1) {
				tiled.warn("Cannot allocate enemy header slot for enemy type \"boss\" (id " + boss_id + ").");
			} else {
				slots[0] = 0x21;  // eyes
				slots[1] = boss_id;
				slots[2] = -2;
			}
			enemy_ids.delete(boss_id);
		}
	}
	if (enemy_ids.has(0x0C) || enemy_ids.has(0x0D)) {  // Dragons take up 1-2 slots
		if (slots[0] != -1) {
			if (slots[1] != -1) {
				tiled.warn("Cannot allocate enemy header slot for enemy type \"dragon\" (ids 12/13)");
			} else {
				slots[1] = 0x0C;  // walking dragon
				if (enemy_ids.has(0x0C)) {
					slots[2] = -2;  // reserve next slot if we have flying dragon
				}				
			}
		} else {
			slots[0] = 0x0C;  // walking dragon
			if (enemy_ids.has(0x0C)) {
				slots[1] = -2;  // reserve next slot if we have flying dragon
			}
		}
		enemy_ids.delete(0x0C);
		enemy_ids.delete(0x0D);
	}
	if (enemy_ids.has(0x0F)) {  // UFO takes up slots 2 and 3
		if (slots[1] != -1) {
			tiled.warn("Cannot allocate enemy header slot for enemy type \"UFO\" (id 15).");
		} else {
			slots[1] = 0x0F;
			slots[2] = -2;
		}
		enemy_ids.delete(0x0F);
	}
	if (enemy_ids.has(0x03)) {  // Robot takes up one slot, but uses palette slots 2 and 3 (shared with UFO)
		if (slots[1] == 0x0F && slots[0] == -1) {  // UFO present
			if (slots[0] != -1) {  // Robot must go into slot 1
				tiled.warn("Cannot allocate enemy header slot for enemy type \"Robot\" (id 3).");
			} else {
				slots[0] = 0x03;
			}
		} else {  // UFO not present
			if (slots[2] != -1) {  // we can keep slot 1 available
				tiled.warn("Cannot allocate enemy header slot for enemy type \"Robot\" (id 3).");
			} else {
				slots[2] = 0x03;
				slots[1] = -2;  // art slot is free, but palette slot is used.
				                // Thus no conflict in having Robot and flying dragon.
			}			
		}
		enemy_ids.delete(0x03);
	}
	if (enemy_ids.has(0x0B)) {  // the two types of rock tank share one slot
		enemy_ids.delete(0x0B);
		enemy_ids.add(0x0A);  // Use 0x0A as representative
	}
	enemy_ids = Array.from(enemy_ids).sort();  // Make sure slots always get filled up in same order.
	                                           // It's alphabetic, but whatever as long as it's consistent.
	for (eid of enemy_ids) {
		var good = false;
		for (var i = 0; i < 3; ++i) {
			if (slots[i] == -1) {
				slots[i] = eid;
				good = true;
				break;
			}
		}
		if (!good) {
			tiled.warn("Cannot allocate enemy header slot for enemy type " + eid);
		}
	}
	return slots;
}