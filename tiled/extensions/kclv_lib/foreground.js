// Take a layer encoding foreground and save it to the designated file.
// layer: Layer to read tiles from
// filename: File to save to
// fgtheme: foreground theme
// paths: object with paths to compression tmpin/tmpout files.
var save_foreground = function(layer, filename, header, paths) {
	if (!layer.isTileLayer) {
		tiled.warn("Invalid foreground format. Foreground not saved.");
		return false;
	}
	var fgdata = new Uint8Array(header.fgxsize_blocks * header.fgysize_blocks);

	for (var y = 0; y < layer.height; ++y) {
		for (var x = 0; x < layer.width; ++x) {
			if (layer.tileAt(x, y) != null && layer.tileAt(x, y).tileset != null) {
				if (layer.tileAt(x, y).tileset.name == "foreground_" + header.fgtheme.name) {
					fgdata[x + header.fgxsize_blocks*y] = layer.tileAt(x, y).id;
				} else {
					tiled.warn("Foreground tile from invalid tileset at (" + x + ", " + y + "). Using ID 0.");
				}
			}
		}
	}

	fgdata = compress(fgdata, paths);
	if (fgdata == null) {
		tiled.error("Foreground compression failed. Foreground NOT saved.");
		return false;
	}

	var fgfile = new BinaryFile(filename, BinaryFile.ReadWrite);
	fgfile.resize(0);
	fgfile.write(fgdata.buffer);
	fgfile.commit();
	return true;
}

var save_blank_foreground = function(filename, header, paths) {
	var fgdata = new Uint8Array(header.fgxsize_blocks * header.fgysize_blocks);
	fgdata = compress(fgdata, paths);
	if (fgdata == null) {
		tiled.error("Foreground compression failed. New blank foreground NOT saved.");
		return false;
	}

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
// paths: object with paths to compression tmpin/tmpout files.
var load_foreground = function(filename, header, fgtileset, paths) {
	var fglayer = new TileLayer("foreground");
	fglayer.width = header.fgxsize_blocks;
	fglayer.height = header.fgysize_blocks;

	var fgfile = new BinaryFile(filename, BinaryFile.ReadOnly);
	var fgdata = new Uint8Array(fgfile.readAll());
	fgfile.close();
	fgdata = decompress(fgdata, paths);
	if (fgdata == null) {
		tiled.error("Foreground compression failed. Blank foreground loaded.");
		return fglayer;
	}

	// Get an editable version of the tile layer.
	var fgedit = fglayer.edit();
	for (var x = 0; x < header.fgxsize_blocks; ++x) {
		for (var y = 0; y < header.fgysize_blocks; ++y) {
			var id = fgdata[x + header.fgxsize_blocks*y];
			if (id < fgtileset.tileCount) {
				fgedit.setTile(x, y, fgtileset.tile(id));
			} else {
				tiled.warn("Invalid foreground tile at (" + x + ", " + y + ").");
				fgedit.setTile(x, y, fgtileset.tile(0));
			}
		}
	}
	fgedit.apply();
	return fglayer;
}