var get_header = function(filename, repo_path) {
	var headerfile = new BinaryFile(filename, BinaryFile.ReadOnly);
	var data = new Uint8Array(headerfile.readAll());
	headerfile.close();

	var fgtheme_id = data[2] & 0x3F;
	var bgtheme_id = data[3] & 0x0F;
	var fgtheme_kcthm = get_kcthm_from_id(repo_path, fgtheme_id);
	var bgtheme_kcthm = get_kcthm_from_id(repo_path, bgtheme_id);
	var xsize_screens = data[0];
	var ysize_screens = data[1] & 0x3F;
	var weather_flags = (data[3] & 0xF0) >> 4;
	if ((weather_flags & 2) && bgtheme_kcthm.bgtileset_storm) {
		// Weather flag values 2 and 3 are storm/storm+hail.
		// For some themes, it also implies a custom background.
		bgtheme_kcthm.bgtileset = bgtheme_kcthm.bgtileset_storm;
	}

	return {
		fgxsize_screens: xsize_screens,
		fgysize_screens: ysize_screens,
		fgxsize_blocks: xsize_screens * 20,
		fgysize_blocks: ysize_screens * 14,
		bgxsize_tiles: bgtheme_kcthm.bg_is_layered ? 64 : xsize_screens*10 + 30,
		bgysize_tiles: ysize_screens * 7 + 0x15,
		fgtheme_id: fgtheme_id,
		bgtheme_id: bgtheme_id,
		fgtheme: fgtheme_kcthm,
		bgtheme: bgtheme_kcthm,  // also contains information whether bg is layered
		kidx: (data[4]<<8) | data[5],
		kidy: (data[6]<<8) | data[7],
		flagx: (data[8]<<8) | data[9] - ((data[8]<<9)&0x10000),  // read as signed value
		flagy: (data[10]<<8) | data[11] - ((data[10]<<9)&0x10000),  // read as signed value
		murderwall_flags: (data[2] & 0xC0) >> 6,
		weather_flags: weather_flags,
		extra_blank_top_rows: (data[1] & 0xC0) >> 5
	}
}

var write_header = function(filename, header) {
	var headerfile = new BinaryFile(filename, BinaryFile.ReadWrite);
	var data = new Uint8Array(headerfile.readAll());
	if (![0,2,4,6].includes(header.extra_blank_top_rows)) {
		tiled.warn("extra_blank_top_rows must be 0, 2, 4 or 6. Setting to " + (header.extra_blank_top_rows & 0x06))
	}
	data[0] = header.fgxsize_screens;
	data[1] = header.fgysize_screens | ((header.extra_blank_top_rows & 0x06) << 5);
	data[2] = (header.fgtheme_id & 0x3F) | (header.murderwall_flags << 6);
	data[3] = (header.bgtheme_id & 0x0F) | (header.weather_flags << 4);
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