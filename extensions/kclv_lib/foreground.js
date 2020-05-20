// Take a layer encoding foreground and save it to the designated file.
// layer: Layer to read tiles from
// filename: File to save to
// fgtheme: foreground theme
// compression_path: path to the tiled/ subfolder of the disasm where
//                   temp files are stored during compression.
var save_foreground = function(layer, filename, fgtheme, compression_path) {
	if (!layer.isTileLayer) {
		tiled.warn("Invalid foreground format. Foreground not saved.");
		return false;
	}
	var fgdata = new Uint8Array(layer.width * layer.height);

	for (var y = 0; y < layer.height; ++y) {
		for (var x = 0; x < layer.width; ++x) {
			if (layer.tileAt(x, y) == null) {
				tiled.warn("Empty foreground tile at (" + x + ", " + y + "). Using ID 0.");
			} else {
				if (layer.tileAt(x, y).tileset.name == "foreground_" + fgtheme) {
					fgdata[x + layer.width*y] = layer.tileAt(x, y).id;
				} else {
					tiled.warn("Tile from invalid tileset at (" + x + ", " + y + "). Using ID 0.");
				}
			}
		}
	}

	fgdata = compress(fgdata, compression_path);
	var fgfile = new BinaryFile(filename, BinaryFile.ReadWrite);
	fgfile.resize(0);
	fgfile.write(fgdata.buffer);
	fgfile.commit();
	return true;
}

// Take a layer encoding foreground and save it to the designated file.
// filename: File to read from
// header: map header
// fgtileset: TileSet of the foreground.
// compression_path: path to the tiled/ subfolder of the disasm where
//                   temp files are stored during compression.
var load_foreground = function(filename, header, fgtileset, compression_path) {
	var fgfile = new BinaryFile(filename, BinaryFile.ReadOnly);
	var fgdata = new Uint8Array(fgfile.readAll());
	fgdata = decompress(fgdata, compression_path);

	var fglayer = new TileLayer("foreground");
	fglayer.width = header.fgxsize_blocks;
	fglayer.height = header.fgysize_blocks;

	// Get an editable version of the tile layer.
	var fgedit = fglayer.edit();
	for (var x = 0; x < header.fgxsize_blocks; ++x) {
		for (var y = 0; y < header.fgysize_blocks; ++y) {
			var id = fgdata[x + header.fgxsize_blocks*y];
			// TODO: error handling
			fgedit.setTile(x, y, fgtileset.tile(id));
		}
	}
	fgedit.apply();
	fgfile.close();
	return fglayer;
}