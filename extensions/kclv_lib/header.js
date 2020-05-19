var get_header = function(filename) {

    var themes = ["hex", "sky", "ice", "hill", "island", "desert", "swamp", "mountain", "cave", "forest", "city"];
    var thchunks = [0, 32, 36, 56, 12, 56, 27, 56, 21, 56, 12];
    var layered_bgs = [3, 5, 7, 9];
    // var bgformats = [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0];  // 1 = layered, 0 = chunked

	var headerfile = new BinaryFile(filename, BinaryFile.ReadOnly);
	var header = new Uint8Array(headerfile.readAll());
	headerfile.close();

	var fgtheme_id = header[2] & 0x0F;
	var bgtheme_id = header[3] & 0x0F;
	var xsize_screens = header[0];
	var ysize_screens = header[1] & 0x3F;
	var is_layered = layered_bgs.indexOf(bgtheme_id) >= 0;

	return {
		fgxsize_screens: xsize_screens,
		fgysize_screens: ysize_screens,
		fgxsize_blocks: xsize_screens * 20,
		fgysize_blocks: ysize_screens * 14,
		bgxsize_tiles: is_layered ? 64 : xsize_screens*10 + 30,
		bgysize_tiles: ysize_screens * 7 + 0x15,
		fgtheme_id: fgtheme_id,
		bgtheme_id: bgtheme_id,
		fgtheme: themes[fgtheme_id],
		bgtheme: themes[bgtheme_id],
		bg_is_layered: is_layered,
		n_bgchunks: thchunks[bgtheme_id],
		kidx: (header[4]<<8) | header[5],
		kidy: (header[6]<<8) | header[7],
		flagx: (header[8]<<8) | header[9],
		flagy: (header[10]<<8) | header[11],
		murderwall_flags: (header[2] & 0xC0) >> 6,
		weather_flags: (header[3] & 0xF0) >> 4
	}
}