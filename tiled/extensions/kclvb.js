var kclvbMapFormat = {
    name: "Kid Chameleon background metamap",
    extension: "kclvb",

	read: function(fileName) {
		var paths = get_kclv(fileName);
		if (paths == null) {
			return null;
		}

		var header = get_header(paths.header, paths.repo_path);
		var paths = add_theme_paths(paths, header);

		var tilemap = new TileMap();
		if (header.bgtheme.bg_is_layered) {
			tilemap.setSize(1, header.bgysize_tiles);
			tilemap.setTileSize(512, 8);
		} else {
			tilemap.setSize(header.bgxsize_tiles, header.bgysize_tiles);
			tilemap.setTileSize(8, 8);
		}
		// tilemap.setProperty("weather_flags", header.weather_flags);
		tilemap.setProperty("mode", "background");


		// SCROLLING TILESET
		var scrolltileset = tiled.tilesetFormat("tsx").read(paths.scrolltileset);
		if (scrolltileset == null) {
			tiled.error("Tileset file " + paths.scrolltileset + " not found.");
			return;
		}

		// SCROLLING LAYOUT
		var scrolllayer = load_bgscroll(paths.bgscroll, scrolltileset, header);

		// BACKGROUND CHUNKS TILESET
		var bgtileset = tiled.tilesetFormat("tsx").read(paths.bgtileset);
		if (bgtileset == null) {
			tiled.error("Tileset file " + bgtileset_path + " not found.");
			return;
		}

		// BACKGROUND LAYOUT
		if (header.bgtheme.bg_is_layered) {
			var bglayer = load_background_layered(paths.background, bgtileset, header);
		} else {
			var bglayer = load_background_chunked(paths.background, bgtileset, header);
		}

		tilemap.addTileset(bgtileset);
		tilemap.addTileset(scrolltileset);
		tilemap.addLayer(bglayer);
		tilemap.addLayer(scrolllayer);
		return tilemap;
	},


	write: function(map, fileName) {
		if (map.property("mode") != "background") {
			tiled.error("Map is not background map (mode=\"background\")?");
			return null;
		}

		var paths = get_kclv(fileName);
		if (paths == null) {
			return null;
		}

		var header = get_header(paths.header, paths.repo_path);
		var paths = add_theme_paths(paths, header);

		var scrolling_found = false;
		var bglayout_found = false;
		for (var lid = 0; lid < map.layerCount; ++lid) {
			layer = map.layerAt(lid);
			if (layer.name == "bg_layered") {
				bglayout_found |= save_background_layered(layer, paths.background, header);
			} else if (layer.name == "bg_chunked") {
				bglayout_found |= save_background_chunked(layer, paths.background, header);
			} else if (layer.name == "scrolling") {
				scrolling_found |= save_bgscroll(layer, paths.bgscroll);
			}
		}

		if (!scrolling_found) {
			tiled.warn("No valid scrolling layer found. No scrolling data saved.");
		}
		if (!bglayout_found) {
			tiled.warn("No valid background layer found. No background data saved.");
		}
	}

}

tiled.registerMapFormat("kclvb", kclvbMapFormat)
