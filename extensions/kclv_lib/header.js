var get_header = function(filename) {

    var themes = ["hex", "sky", "ice", "hill", "island", "desert", "swamp", "mountain", "cave", "forest", "city"];
    var thchunks = [0, 32, 36, 56, 13, 56, 27, 56, 21, 56, 14];
    var layered_bgs = [3, 5, 7, 9];
    // var bgformats = [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0];  // 1 = layered, 0 = chunked

	var headerfile = new BinaryFile(filename, BinaryFile.ReadOnly);
	var data = new Uint8Array(headerfile.readAll());
	headerfile.close();

	var fgtheme_id = data[2] & 0x0F;
	var bgtheme_id = data[3] & 0x0F;
	var xsize_screens = data[0];
	var ysize_screens = data[1] & 0x3F;
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
		kidx: (data[4]<<8) | data[5],
		kidy: (data[6]<<8) | data[7],
		flagx: (data[8]<<8) | data[9] - ((data[8]<<9)&0x10000),  // read as signed value
		flagy: (data[10]<<8) | data[11] - ((data[10]<<9)&0x10000),  // read as signed value
		murderwall_flags: (data[2] & 0xC0) >> 6,
		weather_flags: (data[3] & 0xF0) >> 4
	}
}

var write_header = function(filename, header) {
	var headerfile = new BinaryFile(filename, BinaryFile.ReadWrite);
	var data = new Uint8Array(headerfile.readAll());
	data[4] = header.kidx >> 8;
	data[5] = header.kidx & 0xFF;
	data[6] = header.kidy >> 8;
	data[7] = header.kidy & 0xFF;
	data[8] = header.flagx >> 8;
	data[9] = header.flagx & 0xFF;
	data[10] = header.flagy >> 8;
	data[11] = header.flagy & 0xFF;
	headerfile.seek(0);
	headerfile.write(data.buffer);
	headerfile.close();	
}