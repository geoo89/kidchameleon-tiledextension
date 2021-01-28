var load_bgscroll = function(filename, tileset, header) {
	var scrollfile = new BinaryFile(filename, BinaryFile.ReadOnly);
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
			tiled.warn("Replaced invalid scrolling layer (value: " + id + ") in layer " + y + "with no scrolling.");
			scrolledit.setTile(0, y, 2);  // no scrolling
		} else {
			scrolledit.setTile(0, y, tileset.tile(id>>3));
		}
	}
	scrolledit.apply();
	return scrolllayer;
}

var save_bgscroll = function(layer, filename) {
	if (!layer.isTileLayer) {
		tiled.warn("Invalid scrolling format. Background scrolling not saved.");
		return false;
	}
	scrdata = new Uint8Array(layer.height + 1);
	scrdata[layer.height] = 0xFF;

	for (var y = 0; y < layer.height; ++y) {
		if (layer.tileAt(0, y) == null) {
			tiled.warn("Empty scrolling tile in layer " + y + ". Using no scrolling.");
			scrdata[y] = 0x10;
		} else {
			if (layer.tileAt(0, y).tileset.name == "bgscroll") {
				scrdata[y] = layer.tileAt(0, y).id << 3;
			} else {
				tiled.warn("Tile from invalid tileset on bg_layered layer " + y + ". Using no scrolling.");
				scrdata[y] = 0x10;
			}
		}
	}

	var scrfile = new BinaryFile(filename, BinaryFile.ReadWrite);
	scrfile.resize(0);  // workaround...
	scrfile.write(scrdata.buffer);
	scrfile.commit();
	return true;
}
