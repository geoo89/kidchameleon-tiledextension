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

		var bgfilename = repo_path + kclv.background;
		var scrollfilename = repo_path + kclv.bgscroll;
		var headerfilename = repo_path + kclv.header;
		var header = get_header(headerfilename);

		var tilemap = new TileMap();
		if (header.bg_is_layered) {
			tilemap.setSize(1, header.bgysize_tiles);
			tilemap.setTileSize(512, 8);
		} else {
			tilemap.setSize(header.bgxsize_tiles, header.bgysize_tiles);
			tilemap.setTileSize(8, 8);
		}
		tilemap.setProperty("weather_flags", header.weather_flags);
		tilemap.setProperty("mode", "background");


		// SCROLLING TILES

		var scrolltileset = new Tileset("bgscroll");
		scrolltileset.image = repo_path + "tiled/bgscroll.png";
		scrolltileset.tileWidth = 512;
		scrolltileset.tileHeight = 8;


		// SCROLLING LAYOUT

		var scrollfile = new BinaryFile(scrollfilename, BinaryFile.ReadOnly);
		var scrolldata = new Uint8Array(scrollfile.readAll());
		scrollfile.close();

		var scrolllayer = new TileLayer("scrolling");
		scrolllayer.width = 1;
		scrolllayer.height = header.bgysize_tiles;

		if (scrolldata.length-1 > header.bgysize_tiles) {
			tiled.warn("More scrolling layers (" + (scrolldata.length-1) + ") than background height (" + header.bgysize_tiles + "). Data truncated.");
		} else if (scrolldata.length-1 < header.bgysize_tiles) {
			tiled.warn("Fewer scrolling layers (" + (scrolldata.length-1) + ") than background height (" + header.bgysize_tiles + "). Filling in with blanks.");
		}

		// Get an editable version of the scroll layer.
		var scrolledit = scrolllayer.edit();
		for (var y = 0; y < header.bgysize_tiles; ++y) {
			if (y >= scrolldata.length-1) {
				var id = 0x10; // fill in missing layers with non-scrolling layer
			} else {
				var id = scrolldata[y];
			}

			if (id > 0x88 || id & 7) {
				// var tile = scrolltileset.tile(18);
				// tile.setProperty("invalid_id", id);
				// scrolledit.setTile(0, y, tile);
				tiled.warn("Replaced invalid scrolling layer (value: " + id + ") in layer " + y + "with no scrolling.");
				scrolledit.setTile(0, y, 2);  // no scrolling
			} else {
				scrolledit.setTile(0, y, scrolltileset.tile(id>>3));
			}
		}
		scrolledit.apply();


		if (header.bg_is_layered) {

			// BACKGROUND CHUNKS (layered)

			var bgtileset = new Tileset("bgchunks_layered");
			if (header.bgtheme == "mountain" && header.weather_flags) {
				bgtileset.image = repo_path + "tiled/bgchunks/" + header.bgtheme + "_storm.png";
			} else {
				bgtileset.image = repo_path + "tiled/bgchunks/" + header.bgtheme + ".png";
			}
			bgtileset.tileWidth = 512;
			bgtileset.tileHeight = 8;

			// BACKGROUND LAYOUT (layered)

			var bgfile = new BinaryFile(bgfilename, BinaryFile.ReadOnly);
			var bgdata = new Uint8Array(bgfile.readAll());
			bgfile.close();

			var bglayer = new TileLayer("bg_layered");
			bglayer.width = 1;
			bglayer.height = header.bgysize_tiles;

			bglayer.setProperty("ripple_effect_layer", bgdata[0]);
			if (header.bgtheme == "desert") {
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

				if (id >= header.n_bgchunks) {
					tiled.warn("Erased invalid background tile with ID " + id + " in layer " + y);
				} else if (id != -1) {
					// a valid tile
					bgedit.setTile(0, y, bgtileset.tile(id));
				}
			}
			bgedit.apply();

		} else {

		    // BACKGROUND CHUNKS (chunked)

			var bgtileset = new Tileset("bgchunks_chunked");
			bgimg_path = repo_path + "tiled/bgchunks/" + header.bgtheme + "/";
			for (var i = 0; i < header.n_bgchunks; ++i) { // TODO: Infer number of bg chunks
				str_i = i.toString(16).toUpperCase();
				if (i < 16) {
					str_i = '0' + str_i;
				}
				var imgfile = bgimg_path + str_i + ".png";
				var t = bgtileset.addTile();
				t.imageFileName = imgfile;
			}
			bgtileset.objectAlignment = Tileset.TopLeft;

			// BACKGROUND LAYOUT (chunked)

			var bgfile = new BinaryFile(bgfilename, BinaryFile.ReadOnly);
			var n_objects = Math.floor(bgfile.size / 6);
			var bgdata = new Uint8Array(bgfile.readAll());

			var bglayer = new ObjectGroup("bg_chunked");

			for (var i = 0; i < n_objects; ++i) {
				var oid  = (bgdata[6*i    ]<<8) + bgdata[6*i + 1];
				var xpos = (bgdata[6*i + 2]<<8) + bgdata[6*i + 3];
				var ypos = (bgdata[6*i + 4]<<8) + bgdata[6*i + 5];
				var obj = new MapObject();
				var tt = bgtileset.tile(oid);
				obj.width = tt.width;
				obj.height = tt.height;
				obj.tile = tt;
				obj.x = xpos*8;
				obj.y = ypos*8;
				obj.visible = true;
				bglayer.addObject(obj);
			}
			bgfile.close();
		}

		tilemap.addTileset(bgtileset);
		tilemap.addTileset(scrolltileset);
		tilemap.addLayer(bglayer);
		tilemap.addLayer(scrolllayer);
		return tilemap;

	},


	write: function(map, fileName) {
		var kclv = get_kclv(fileName);
		var repo_path = get_repo_path(fileName);
		if (repo_path == null) {
			return null;
		}

		var bgfilename = repo_path + kclv.background;
		var scrollfilename = repo_path + kclv.bgscroll;
		var headerfilename = repo_path + kclv.header;
		var header = get_header(headerfilename);

		var scrolling_found = false;
		var bglayout_found = false;

		if (map.property("mode") != "background") {
			tiled.warn("Saving foreground currently not supported.");
			return "Saving foreground currently not supported.";
		} else {
			for (var lid = 0; lid < map.layerCount; ++lid) {
				layer = map.layerAt(lid);
				if (layer.name == "bg_layered") {
					if (!layer.isTileLayer) {
						tiled.warn("Invalid background format. Background not saved.");
						continue;
					}
					bglayout_found = true;
					if (header.bgtheme == "desert") {
						var hdsize = 2;  // header size. 2 for desert
					} else {
						var hdsize = 1;  // header size. 1 for everything else.
					}
					bgdata = Uint8Array(layer.height + hdsize);
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
							if (layer.tileAt(0, y).tileset.name == "bgchunks_layered") {
								bgdata[hdsize+y] = layer.tileAt(0, y).id;
							} else {
								tiled.warn("Tile from invalid tileset on bg_layered layer. Using ID 0.");
							}
						}
					}

					var bgfile = new BinaryFile(bgfilename, BinaryFile.WriteOnly);
					bgfile.write(bgdata.buffer);
					bgfile.commit();  // Gives QFileDevice::seek: IODevice is not open
				} else if (layer.name == "bg_chunked") {
					if (!layer.isObjectLayer) {
						tiled.warn("Invalid background format. Background not saved.");
						continue;
					}
					bglayout_found = true;
					bgdata = Uint8Array(6*layer.objectCount+2);
					badobjects = 0;
					for (var i = 0; i < layer.objectCount; ++i) {
						var obj = layer.objectAt(i);
						if (obj.tile == null || obj.tile.tileset.name != "bgchunks_chunked") {
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

					var bgfile = new BinaryFile(bgfilename, BinaryFile.WriteOnly);
					bgfile.write(bgdata.buffer.slice(0, 6*(layer.objectCount-badobjects)+2));
					bgfile.commit();  // Gives QFileDevice::seek: IODevice is not open
				} else if (layer.name == "scrolling") {
					if (!layer.isTileLayer) {
						tiled.warn("Invalid scrolling format. Background scrolling not saved.");
						continue;
					}
					scrolling_found = true;
					scrdata = Uint8Array(layer.height + 1);
					scrdata[layer.height] = 0xFF;

					for (var y = 0; y < layer.height; ++y) {
						if (layer.tileAt(0, y) == null) {
							tiled.warn("Empty scrolling tile in layer " + y + ". Using no scrolling.");
							scrdata[y] = 0x10;
						} else {
							if (layer.tileAt(0, y).tileset.name == "bgscroll") {
								scrdata[y] = layer.tileAt(0, y).id << 3;
							} else {
								tiled.warn("Tile from invalid tileset on bg_layered layer. Using no scrolling.");
								scrdata[y] = 0x10;
							}
						}
					}

					var scrfile = new BinaryFile(scrollfilename, BinaryFile.WriteOnly);
					scrfile.write(scrdata.buffer);
					scrfile.commit();  // Gives QFileDevice::seek: IODevice is not open
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

}

tiled.registerMapFormat("kclv", kclvMapFormat)
