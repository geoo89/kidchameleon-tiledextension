var kclvMapFormat = {
    name: "Kid Chameleon metamap",
    extension: "kclv",

	//Function for reading from a kclv file
	read: function(fileName) {
		var kclv = get_kclv(fileName);
		var repo_path = get_repo_path(fileName);
		if (repo_path == null) {
			return null;
		}

		var headerfilename = repo_path + kclv.header;
		var header = get_header(headerfilename);

		var tilemap = new TileMap();
		tilemap.setSize(header.fgxsize_blocks, header.fgysize_blocks);
		tilemap.setTileSize(16, 16);
		tilemap.setProperty("murderwall_flags", header.murderwall_flags);
		tilemap.setProperty("weather_flags", header.weather_flags);
		tilemap.setProperty("mode", "foreground");

		// FOREGROUND TILES
		var fgtileset_path = repo_path + "tiled/foreground/" + header.fgtheme + ".tsx";
		var fgtileset = tiled.tilesetFormat("tsx").read(fgtileset_path);
		if (fgtileset == null) {
			tiled.error("Tileset file " + fgtileset_path + " not found.");
			return;
		}

		// FOREGROUND LAYOUT
		var fgfilename = repo_path + kclv.foreground;
		var compression_path = repo_path + "tiled/";
		var fglayer = load_foreground(fgfilename, header, fgtileset, compression_path);


		// OBJECT TILES
		var enemytileset_path = repo_path + "tiled/objects.tsx";
		var enemytileset = tiled.tilesetFormat("tsx").read(enemytileset_path);
		if (enemytileset == null) {
			tiled.error("Tileset file " + enemytileset_path + " not found.");
			return;
		}

		// OBJECT LAYOUT
		var enemyfilename = repo_path + kclv.enemy;
		var enemylayer = load_enemies(enemyfilename, enemytileset, header);

		// BLOCK TILES
		var blocktileset_path = repo_path + "tiled/blocks.tsx";
		var blocktileset = tiled.tilesetFormat("tsx").read(blocktileset_path);
		if (blocktileset == null) {
			tiled.error("Tileset file " + blocktileset_path + " not found.");
			return;
		}

		// BLOCK LAYOUT
		var blockfilename = repo_path + kclv.block;
		// Ghost and teleport blocks have to be added to the enemy layer.
		var blocklayer = load_blocks(blockfilename, header, blocktileset, enemylayer, enemytileset);

		tilemap.addTileset(fgtileset);
		tilemap.addTileset(blocktileset);
		tilemap.addTileset(enemytileset);
		tilemap.addLayer(fglayer);
		tilemap.addLayer(blocklayer);
		tilemap.addLayer(enemylayer);
		return tilemap;

	},


	write: function(map, fileName) {
		var kclv = get_kclv(fileName);
		var repo_path = get_repo_path(fileName);
		if (repo_path == null) {
			return null;
		}

		var headerfilename = repo_path + kclv.header;
		var header = get_header(headerfilename);
		var compression_path = repo_path + "tiled/";

		// TODO: flag for enemies.
		var fglayout_found = false;
		var blocklayout_found = false;

		for (var lid = 0; lid < map.layerCount; ++lid) {
			layer = map.layerAt(lid);
			if (layer.name == "foreground") {
				var fgfilename = repo_path + kclv.foreground;
				fglayout_found |= save_foreground(layer, fgfilename, header.fgtheme, compression_path);
			} else if (layer.name == "blocks") {
				// TODO: layer_to_kcm_blocks uses layer dimensions to determine
				// size of kcm data; save_enemies uses dimension from the header instead.
				// Make this consistent.
				// TODO: check prize/ghost/teleport limit.
				var blockfilename = repo_path + kclv.block;
				var kcmdata = layer_to_kcm_blocks(layer);
				// look for the objects layer, so it can write telepads and ghost blocks
				// onto the kcmdata
				for (var lid2 = 0; lid2 < map.layerCount; ++lid2) {
					layer2 = map.layerAt(lid2);
					if (layer2.name == "objects") {
						var enemyfilename = repo_path + kclv.enemy;
						// modifies the header with the updated kid's and flag's position.
						save_enemies(layer2, enemyfilename, header, kcmdata);
					}
				}
				blocklayout_found |= save_blocks(kcmdata, blockfilename, compression_path);
			}
		}

		if (!fglayout_found) {
			tiled.warn("No valid foreground layer found. No foreground data saved.");
		}
		if (!blocklayout_found) {
			tiled.warn("No valid block layer found. No block data saved.");
		}

		// save_enemies modifies the header content to reflect kid's/flag's new position
		// We want to save these changes
		write_header(headerfilename, header);

	}

}

tiled.registerMapFormat("kclv", kclvMapFormat)
