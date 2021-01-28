var load_background_layered = function(filename, tileset, header) {
	var bgfile = new BinaryFile(filename, BinaryFile.ReadOnly);
	var bgdata = new Uint8Array(bgfile.readAll());
	bgfile.close();

	var bglayer = new TileLayer("bg_layered");
	bglayer.width = 1;
	bglayer.height = header.bgysize_tiles;

	bglayer.setProperty("ripple_effect_layer", bgdata[0]);
	if (header.bgtheme.name == "desert") {
		bglayer.setProperty("desert_unused_value", bgdata[1]);
		bgdata = new Uint8Array(bgdata.buffer, 2);  // remove first two elements
	} else {
		bgdata = new Uint8Array(bgdata.buffer, 1);
	}

	if (bgdata.length > header.bgysize_tiles) {
		tiled.warn("More background layers (" + bgdata.length + ") than background height (" + header.bgysize_tiles + "). Data truncated.");
	} else if (bgdata.length < header.bgysize_tiles) {
		tiled.warn("Fewer background layers (" + bgdata.length + ") than background height (" + header.bgysize_tiles + "). Filling in with blanks.");
	}

	// Get an editable version of the bg layer.
	var bgedit = bglayer.edit();
	for (var y = 0; y < header.bgysize_tiles; ++y) {
		if (y >= bgdata.length) {
			var id = -1; // invalid
		} else {
			var id = bgdata[y];
		}

		if (id >= tileset.tileCount) {
			tiled.warn("Erased invalid background tile with ID " + id + " in layer " + y);
		} else if (id != -1) {
			// a valid tile
			bgedit.setTile(0, y, tileset.tile(id));
		}
	}
	bgedit.apply();
	return bglayer;
}

var save_background_layered = function(layer, filename, header) {
	if (!layer.isTileLayer) {
		tiled.warn("Invalid background format. Background not saved.");
		return false;
	}
	bglayout_found = true;
	if (header.bgtheme.name == "desert") {
		var hdsize = 2;  // header size. 2 for desert
	} else {
		var hdsize = 1;  // header size. 1 for everything else.
	}
	bgdata = new Uint8Array(layer.height + hdsize);
	if (layer.property("desert_unused_value") != null) { //undefined
		bgdata[1] = layer.property("desert_unused_value");
	}
	if (layer.property("ripple_effect_layer") == null) { //undefined
		tiled.warn("ripple_effect_layer undefined. Using 0.");
	} else {
		bgdata[0] = layer.property("ripple_effect_layer");
	}

	for (var y = 0; y < layer.height; ++y) {
		if (layer.tileAt(0, y) == null) {
			tiled.warn("Empty background tile in layer " + y + ". Using ID 0.");
		} else {
			if (layer.tileAt(0, y).tileset.name == "bgchunks_layered_" + header.bgtheme.name) {
				bgdata[hdsize+y] = layer.tileAt(0, y).id;
			} else {
				tiled.warn("Tile from invalid tileset on bg_layered layer " + y + ". Using ID 0.");
			}
		}
	}

	var bgfile = new BinaryFile(filename, BinaryFile.ReadWrite);
	bgfile.resize(0);  // workaround...
	bgfile.write(bgdata.buffer);
	bgfile.commit();
	return true;
}

var load_background_chunked = function(filename, tileset, header) {
	var bgfile = new BinaryFile(filename, BinaryFile.ReadOnly);
	var n_objects = Math.floor(bgfile.size / 6);
	var bgdata = new Uint8Array(bgfile.readAll());

	var bglayer = new ObjectGroup("bg_chunked");

	for (var i = 0; i < n_objects; ++i) {
		var oid  = (bgdata[6*i    ]<<8) + bgdata[6*i + 1];
		var xpos = (bgdata[6*i + 2]<<8) + bgdata[6*i + 3];
		var ypos = (bgdata[6*i + 4]<<8) + bgdata[6*i + 5];
		var obj = new MapObject();
		if (oid >= tileset.tileCount) {
			tiled.warn("Background chunk with invalid chunk id " + oid + " ignored.");
		}
		var tt = tileset.tile(oid);
		obj.width = tt.width;
		obj.height = tt.height;
		obj.tile = tt;
		obj.x = xpos*8;
		obj.y = ypos*8;
		obj.visible = true;
		bglayer.addObject(obj);
	}
	bgfile.close();

	return bglayer;
}

var save_background_chunked = function(layer, filename, header) {
	if (!layer.isObjectLayer) {
		tiled.warn("Invalid background format. Background not saved.");
		return false;
	}
	bglayout_found = true;
	bgdata = new Uint8Array(6*layer.objectCount+2);
	badobjects = 0;
	for (var i = 0; i < layer.objectCount; ++i) {
		var obj = layer.objectAt(i);
		if (obj.tile == null || obj.tile.tileset.name != "bgchunks_chunked_" + header.bgtheme.name) {
			tiled.warn("Chunk with object ID " + obj.id + " is invalid. Chunk not saved.");
			badobjects += 1;
			continue;
		}
		var oid = obj.tile.id;
		var xpos = obj.x / 8;
		var ypos = obj.y / 8;
		if (xpos < 0 || ypos < 0) {
			tiled.warn("Chunk with object ID " + obj.id + " has negative position. Chunk not saved.");
			badobjects += 1;
			continue;
		}
		bgdata[6*(i-badobjects)    ] = oid >> 8;
		bgdata[6*(i-badobjects) + 1] = oid & 0xFF;
		bgdata[6*(i-badobjects) + 2] = xpos >> 8;
		bgdata[6*(i-badobjects) + 3] = xpos & 0xFF;
		bgdata[6*(i-badobjects) + 4] = ypos >> 8;
		bgdata[6*(i-badobjects) + 5] = ypos & 0xFF;
	}

	bgdata[6*(layer.objectCount-badobjects)] = 0xFF;
	bgdata[6*(layer.objectCount-badobjects)+1] = 0xFF;
	bgdata = bgdata.subarray(0, 6*(layer.objectCount-badobjects)+2); // drop last bytes if there are invalid objects

	var bgfile = new BinaryFile(filename, BinaryFile.ReadWrite);
	bgfile.resize(0);  // workaround...
	bgfile.write(bgdata.buffer.slice(0, 6*(layer.objectCount-badobjects)+2));
	bgfile.commit();

	return true;
}


var save_blank_background = function(filename, header) {
	if (header.bgtheme.bg_is_layered) {
		var hdsize = (header.bgtheme.name == "desert") ? 2 : 1;
		bgdata = new Uint8Array(header.bgysize_tiles + hdsize);
	} else {
		bgdata = new Uint8Array(6+2);
		bgdata[6] = 0xFF;
		bgdata[7] = 0xFF;
	}

	var bgfile = new BinaryFile(filename, BinaryFile.ReadWrite);
	bgfile.resize(0);  // workaround...
	bgfile.write(bgdata.buffer);
	bgfile.commit();
	return true;
}
