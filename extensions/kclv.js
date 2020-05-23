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

		// BLOCK TILES
		var blocktileset_path = repo_path + "tiled/blocks.tsx";
		var blocktileset = tiled.tilesetFormat("tsx").read(blocktileset_path);
		if (blocktileset == null) {
			tiled.error("Tileset file " + blocktileset_path + " not found.");
			return;
		}

		// BLOCK LAYOUT
		var blocklayer = new TileLayer("blocks");
		blocklayer.width = header.fgxsize_blocks;
		blocklayer.height = header.fgysize_blocks;
		// Get an editable version of the tile layer.
		var blockedit = blocklayer.edit();
		var blockfilename = repo_path + kclv.block;
		var blockfile = new BinaryFile(blockfilename, BinaryFile.ReadOnly);
		var blockdata = new Uint8Array(blockfile.readAll());
		blocks_to_layer(blockdata, blockedit, blocktileset);
		blockedit.apply();

		tilemap.addTileset(fgtileset);
		tilemap.addTileset(blocktileset);
		tilemap.addLayer(fglayer);
		tilemap.addLayer(blocklayer);
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

		var fglayout_found = false;
		var blocklayout_found = false;

		for (var lid = 0; lid < map.layerCount; ++lid) {
			layer = map.layerAt(lid);
			if (layer.name == "foreground") {
				var fgfilename = repo_path + kclv.foreground;
				fglayout_found |= save_foreground(layer, fgfilename, header.fgtheme, compression_path);
			} else if (layer.name == "blocks") {
				var blockfilename = repo_path + kclv.block;
				var kcmdata = layer_to_kcm_blocks(layer);
				blocklayout_found |= save_blocks(kcmdata, blockfilename, compression_path);
			}
		}

		if (!fglayout_found) {
			tiled.warn("No valid foreground layer found. No foreground data saved.");
		}
		if (!blocklayout_found) {
			tiled.warn("No valid block layer found. No block data saved.");
		}

	}

}

tiled.registerMapFormat("kclv", kclvMapFormat)
