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

	for (var i = 0; i < n_enemies; ++i) {
		var s = 14 + 8*i;
		var obj = new MapObject();
		var oid  = data[s+0];
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

// overwrites the header's kid/flag position
var save_enemies = function(layer, filename, header, kcmdata) {
	if (!layer.isObjectLayer) {
		tiled.warn("Invalid enemy/object layer format. Objects not saved.");
		return false;
	}

	var enemydata = new Uint8Array(14 + 8*layer.objectCount);
	var pos = 14;
	var kid_found = false;
	var flag_found = false;
	var n_enemies = 0;

	for (var i = 0; i < layer.objectCount; ++i) {
		var obj = layer.objectAt(i);
		if (obj.tile == null || obj.tile.tileset == null) {
			tiled.warn("Object " + obj.id + " has no tile. If template, please detach. Object not saved.");
		} else if (obj.property("objtype") == "enemy") {
			if (obj.tile.tileset.name != "objects") {
				tiled.warn("Object " + obj.id + " is not from object tileset. Ignoring.");
			} else if (obj.tile.id < 4) {
				tiled.warn("Object " + obj.id + " is enemy with invalid ID. Ignoring.");
			} else if (obj.x < 0 || obj.x >= header.fgxsize_blocks*16 || obj.y < 0 || obj.y >= header.fgysize_blocks*16) {
				tiled.warn("Object " + obj.id + " is enemy that is out of bounds. Ignoring.");
			} else {
				enemydata[pos] = obj.tile.id - 4;
				if (!obj.property("respawn")) {
					enemydata[pos+1] = 0xFF; // 0 for objects that do respawn
				}
				if (obj.property("level")) {
					enemydata[pos+2] = obj.property("level") >> 8;
					enemydata[pos+3] = obj.property("level") & 0xFF;
				}
				enemydata[pos+4] = obj.x >> 8;
				enemydata[pos+5] = obj.x & 0xFF;
				enemydata[pos+6] = obj.y >> 8;
				enemydata[pos+7] = obj.y & 0xFF;
				pos += 8;
				n_enemies += 1;
			}
		} else if (obj.property("objtype") == "kid") {
			if (kid_found) {
				tiled.warn("Multiple Kid objects found. Using first valid one.");
			} else if (obj.x >= header.fgxsize_blocks*16 || obj.y >= header.fgysize_blocks*16) {
				tiled.warn("Kid object is out of level bounds. Ignoring.");
			} else {
				header.kidx = obj.x;
				header.kidy = obj.y;
				kid_found = true;
			}
		} else if (obj.property("objtype") == "flag") {
			if (flag_found) {
				tiled.warn("Multiple Flag objects found. Using first valid one.");
			} else {
				header.flagx = obj.x-13;
				header.flagy = obj.y-16;
				flag_found = true;
			}
		} else if (obj.property("objtype") == "teleport") {
			var telex = (obj.x-16) >> 4;
			var teley = (obj.y-16) >> 4;
			if (telex < 0 || telex >= header.fgxsize_blocks || teley < 0 || teley >= header.fgysize_blocks) {
				tiled.warn("Teleporter object " + obj.id + " is out of bounds. Ignoring.");
			} else {
				var destmapid = obj.property("destmapid");
				var destx = obj.property("destx");
				var desty = obj.property("desty");
				if (destx == null || desty == null || destmapid == null) {
					tiled.warn("Teleporter object " + obj.id + " is missing properties. Ignoring.");
				} else {
					// TODO: check value bounds
					var pos = teley * header.fgxsize_blocks * 5 + telex*5 + 4;
					kcmdata[pos] = 0x84;
					kcmdata[pos+1] = destmapid;
					kcmdata[pos+2] = desty; // position in blocks
					kcmdata[pos+4] = destx >> 8; // position in blocks
					kcmdata[pos+3] = destx & 0xFF; // kcm endianness is different.
				}
			}
		} else if (obj.property("objtype") == "ghostblock") {
			var ghostx = (obj.x-8) >> 4;
			var ghosty = (obj.y-16) >> 4;
			if (ghostx < 0 || ghostx >= header.fgxsize_blocks || ghosty < 0 || ghosty >= header.fgysize_blocks) {
				tiled.warn("Ghost block object " + obj.id + " is out of bounds. Ignoring.");
			} else {
				var time_delay = obj.property("time_delay");
				var time_visible = obj.property("time_visible");
				var time_invisible = obj.property("time_invisible");
				if (time_delay == null || time_visible == null || time_invisible == null) {
					tiled.warn("Ghost block object " + obj.id + " is missing properties. Ignoring.");
				} else {
					// TODO: check value bounds. 0 for time_delay crashes the game
					var pos = ghosty * header.fgxsize_blocks * 5 + ghostx*5 + 4;
					kcmdata[pos] = 0x83;
					kcmdata[pos+1] = time_delay;
					kcmdata[pos+3] = time_visible >> 8;
					kcmdata[pos+2] = time_visible & 0xFF; // kcm endianness is different.
					kcmdata[pos+4] = time_invisible;
				}
			}
		}
	}

	if (!flag_found) {
		tiled.warn("No flag found. Using position from header file.")
	}
	if (!kid_found) {
		tiled.warn("No kid found. Using position from header file.")
	}

	// header
	enemydata[10] = 0x7D;
	enemydata[12] = n_enemies ? 0x80 : 0;
	enemydata[13] = n_enemies;
	// enemy types present on the map.
	for (var i = 0; i < 3; ++i) {
		var ei_pal = layer.property("enemy_palette" + (i+1));
		var ei_id = layer.property("enemy_type" + (i+1));
		if (ei_id == null || ei_id < 0 || ei_id > 36) {
			if (ei_id != -1) { // -1 indicates empty slot
				// User probably messed with the settings
				tiled.warn("Object layer has invalid enemy_type" + (i+1) + ". Ignoring.");
			}
			enemydata[4+2*i] = 0xFF;
			enemydata[5+2*i] = 0xFF;
		} else {
			// valid enemy
			if (ei_pal == null || ei_pal < 0 || ei_pal > 2) {
				// palette is invalid though
				ei_pal = 0;
				tiled.warn("Object layer has invalid enemy_palette" + (i+1) + ". Using palette 0.");
			}
			var ei = (ei_pal << 14) + ei_id;
			enemydata[4+2*i] = ei >> 8;
			enemydata[5+2*i] = ei & 0xFF;
		}
	}

	var file = new BinaryFile(filename, BinaryFile.ReadWrite);
	file.resize(0);  // workaround...
	file.write(enemydata.buffer.slice(0, 14 + 8*n_enemies));
	file.commit();
}