var kclvMapFormat = {
    name: "Kid Chameleon foreground metamap",
    extension: "kclv",

	//Function for reading from a kclv file
	read: function(fileName) {
		var paths = get_kclv(fileName);
		if (paths == null) {
			return null;
		}

		var header = get_header(paths.header, paths.repo_path);
		var paths = add_theme_paths(paths, header);

		var tilemap = new TileMap();
		tilemap.setSize(header.fgxsize_blocks, header.fgysize_blocks);
		tilemap.setTileSize(16, 16);
		tilemap.setProperty("fgtheme_id", header.fgtheme_id);
		tilemap.setProperty("bgtheme_id", header.bgtheme_id);
		tilemap.setProperty("extra_blank_top_rows", header.extra_blank_top_rows);
		tilemap.setProperty("mode", "foreground");

		// FOREGROUND TILES
		// FileFormat.supportsFile(fileName : string) : bool
		var fgtileset = tiled.tilesetFormat("tsx").read(paths.fgtileset);
		if (fgtileset == null) {
			tiled.error("Tileset file " + paths.fgtileset + " not found.");
			return;
		}

		// FOREGROUND LAYOUT
		var fglayer = load_foreground(paths.foreground, header, fgtileset, paths);

		// OBJECT TILES
		var enemytileset = tiled.tilesetFormat("tsx").read(paths.enemytileset);
		if (enemytileset == null) {
			tiled.error("Tileset file " + paths.enemytileset + " not found.");
			return null;
		}

		// OBJECT LAYOUT
		var objectlayer = load_enemies(paths.enemy, enemytileset, header);
		objectlayer.setProperty("murderwall_enabled", !!(header.murderwall_flags & 2));
		objectlayer.setProperty("murderwall_goleft", !!(header.murderwall_flags & 1));
		objectlayer.setProperty("weather_flags", header.weather_flags);

		// PLATFORM TILES
		var platformtileset = tiled.tilesetFormat("tsx").read(paths.platformtileset);
		if (platformtileset == null) {
			tiled.error("Tileset file " + paths.platformtileset + " not found.");
			return null;
		}

		// PLATFORM LAYOUT
		// Platforms are added to the object layer
		load_platforms(paths.platform, platformtileset, null, objectlayer);

		// BLOCK TILES
		var blocktileset = tiled.tilesetFormat("tsx").read(paths.blocktileset);
		if (blocktileset == null) {
			tiled.error("Tileset file " + paths.blocktileset + " not found.");
			return null;
		}

		// BLOCK LAYOUT
		// We need the objectlayer/enemytileset here because
		// ghost and teleport blocks have to be added to the enemy layer.
		var blocklayer = load_blocks(paths.block, header, blocktileset, objectlayer, platformtileset);

		tilemap.addTileset(fgtileset);
		tilemap.addTileset(blocktileset);
		tilemap.addTileset(enemytileset);
		tilemap.addTileset(platformtileset);
		tilemap.addLayer(fglayer);
		tilemap.addLayer(blocklayer);
		tilemap.addLayer(objectlayer);
		// tilemap.addLayer(platformlayer);
		return tilemap;

	},


	write: function(map, fileName) {
		var paths = get_kclv(fileName);
		if (paths == null) {
			return null;
		}
		var header = get_header(paths.header, paths.repo_path);
		header.extra_blank_top_rows = map.property("extra_blank_top_rows");
		// Update dimensions, in case user resized map.
		header.fgxsize_screens = ((map.width + 19) / 20) << 0;  // round up to integer
		header.fgysize_screens = ((map.height + 13) / 14) << 0;  // round up to integer
		header.fgxsize_blocks = header.fgxsize_screens * 20;
		header.fgysize_blocks = header.fgysize_screens * 14;

		if (map.width % 20) {
			tiled.warn("Map width not multiple of 20. Padding with empty tiles.");
		}
		if (map.height % 14) {
			tiled.warn("Map height not multiple of 14. Padding with empty tiles.");
		}
		if (header.fgxsize_screens * header.fgysize_screens > 30) {
			tiled.warn("Map too large. Limit is 30 screens (8400 blocks), but is "
			 + header.fgxsize_screens * header.fgysize_screens + " screens ("
			 + header.fgxsize_screens * header.fgysize_screens * 20 * 14 + " blocks).");
		}

		var change_bgtheme = false;
		if (map.property("bgtheme_id") != null && map.property("bgtheme_id") != header.bgtheme_id) {
			change_bgtheme = tiled.confirm("Background theme was changed. This will erase the background layout. Proceed?");
			if (change_bgtheme) {
				header.bgtheme_id = map.property("bgtheme_id");
				header.bgtheme = get_kcthm_from_id(paths.repo_path, header.bgtheme_id);
				if (header.bgtheme == null) {
					tiled.warn("New specified background theme is invalid. Skipping theme change.");
				} else {
					save_blank_background(paths.background, header, paths);
				}
			}
		}
		var change_fgtheme = false;
		if (map.property("fgtheme_id") != null && map.property("fgtheme_id") != header.fgtheme_id) {
			change_fgtheme = tiled.confirm("Foreground theme was changed. This will erase the foreground layout. Proceed?");
			if (change_fgtheme) {
				header.fgtheme_id = map.property("fgtheme_id");
				header.fgtheme = get_kcthm_from_id(paths.repo_path, header.fgtheme_id);
				if (header.bgtheme == null) {
					tiled.warn("New specified foreground theme is invalid. Skipping theme change.");
				} else {
					save_blank_foreground(paths.foreground, header, paths);
					tiled.alert("Please close and reopen map for theme change to take effect.");
				}
			}
		}

		var objectlayout_found = false;
		var fglayout_found = change_fgtheme;
		var blocklayout_found = false;

		for (var lid = 0; lid < map.layerCount; ++lid) {
			layer = map.layerAt(lid);
			if (layer.name == "foreground" && !change_fgtheme) {
				fglayout_found |= save_foreground(layer, paths.foreground, header, paths);
			} else if (layer.name == "blocks") {
				var kcmdata = layer_to_kcm_blocks(layer, header);
				// look for the objects layer, so it can write telepads and ghost blocks
				// onto the kcmdata
				for (var lid2 = 0; lid2 < map.layerCount; ++lid2) {
					layer2 = map.layerAt(lid2);
					if (layer2.name == "objects") {
						// Saves objects, i.e. enemies and platforms.
						// Modifies the header with the updated kid's and flag's position.
						// Updates kcmdata with positions of teleports and ghost blocks.
						objectlayout_found |= save_objects(layer2, paths, header, kcmdata);
					}
				}
				blocklayout_found |= save_blocks(kcmdata, paths.block, paths);
			}
		}

		if (!fglayout_found) {
			tiled.warn("No valid foreground layer found. No foreground data saved.");
		}
		if (!blocklayout_found) {
			tiled.warn("No valid block layer found. No block data saved.");
		}
		if (!objectlayout_found) {
			tiled.warn("No valid object layer found. No object data saved.");
		}

		// save_enemies modifies the header content to reflect kid's/flag's new position,
		// and the map might have been resized. We want to save these changes.
		write_header(paths.header, header);
	}

}

tiled.registerMapFormat("kclv", kclvMapFormat)
