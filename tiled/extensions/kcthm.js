var kcthmMapFormat = {
    name: "Kid Chameleon theme",
    extension: "kcthm",

	//Function for reading from a kclv file
	read: function(fileName) {
		var kcthm = get_kcthm(fileName)

		var fgtileset = tiled.tilesetFormat("tsx").read(kcthm.fgtileset);
		if (fgtileset == null) {
			tiled.error("Tileset file " + kcthm.fgtileset + " not found.");
			return;
		}
		var collisiontileset = tiled.tilesetFormat("tsx").read(kcthm.collision_tileset);
		
		var xsize = fgtileset.imageWidth >> 4;
		var ysize = fgtileset.imageHeight >> 4;

		var tilemap = new TileMap();  // TODO: check fgtileset.image != null?
		tilemap.setSize(xsize, ysize);
		tilemap.setTileSize(16, 16);
		tilemap.setProperty("mode", "collision");

		// var fglayer = new ImageLayer("foreground");
		// fglayer.imageSource = fgtileset.image;
		var fglayer = new TileLayer("foreground");
		fglayer.width = xsize;
		fglayer.height = ysize;
		var id = 0;
		var fgedit = fglayer.edit();
		for (var y = 0; y < ysize; ++y) {
			for (var x = 0; x < xsize; ++x) {
				fgedit.setTile(x, y, fgtileset.tile(id++));
			}
		}
		fgedit.apply();


		// tiled.FileInfo.joinPaths(repo_path, kcthm["collision"])
		var collisionfile = new BinaryFile(kcthm.collision, BinaryFile.ReadOnly);
		var collisiondata = new Uint8Array(collisionfile.readAll());
		var collisionlayer = new TileLayer("collision");
		collisionlayer.width = xsize;
		collisionlayer.height = ysize;
		// Get an editable version of the tile layer.
		var collisionedit = collisionlayer.edit();
		for (var x = 0; x < xsize; ++x) {
			for (var y = 0; y < ysize; ++y) {
				if (x + xsize*y < collisiondata.length) {
					// TODO: full error handling
					var id = collisiondata[x + xsize*y];
					collisionedit.setTile(x, y, collisiontileset.tile(id));					
				}
			}
		}
		collisionedit.apply();
		collisionfile.close();

		tilemap.addTileset(fgtileset);
		tilemap.addTileset(collisiontileset);
		tilemap.addLayer(fglayer);
		tilemap.addLayer(collisionlayer);
		return tilemap;

	},


	write: function(map, fileName) {
		var kcthm = get_kcthm(fileName)

		// var repo_path = get_repo_path(fileName);
		// if (repo_path == null) {
		// 	return false;
		// }

		// var kcfile = new TextFile(fileName, TextFile.ReadOnly);
		// var kcthm = JSON.parse(kcfile.readAll());
		// kcfile.close();
		// var collision_path = repo_path + kcthm["collision"]

		for (var lid = 0; lid < map.layerCount; ++lid) {
			layer = map.layerAt(lid);
			if (layer.name == "collision") {
				if (!layer.isTileLayer) {
					tiled.warn("Invalid collision format. Collision not saved.");
					return false;
				}

				var collisiondata = new Uint8Array(layer.width * layer.height);
				for (var y = 0; y < layer.height; ++y) {
					for (var x = 0; x < layer.width; ++x) {
						if (layer.tileAt(x, y) != null && layer.tileAt(x, y).tileset != null) {
							if (layer.tileAt(x, y).tileset.name == "collision" && layer.tileAt(x, y).id < 8) {
								collisiondata[x + layer.width*y] = layer.tileAt(x, y).id;
							} else {
								tiled.warn("Invalid tile at (" + x + ", " + y + "). Using ID 0.");
								collisiondata[x + layer.width*y] = 0;
							}
						} else {
							collisiondata[x + layer.width*y] = 0;
						}
					}
				}

				var collisionfile = new BinaryFile(kcthm.collision, BinaryFile.ReadWrite);
				collisionfile.resize(0);
				collisionfile.write(collisiondata.buffer);
				collisionfile.commit();
				return true;
			}
		}
	}

}

tiled.registerMapFormat("kcthm", kcthmMapFormat)
