// Take KC block layout and its blocks onto an editable layer. 
// data: Uint8Array containing block data
// layer: EditableLayer to place the blocks on
// tileset: Tileset containing the block tiles.
var blocks_to_layer = function(data, layer, tileset) {
	var bs = new Bitstream(data);
	var trash = bs.read(8);
	var xbits = bs.read(4);
	var ybits = bs.read(4);
	var hidden_flag = bs.read(1);
	var block_type = bs.read(5);
	var baseids = [1, 0x10, 4, -1, -1, 2, 3, 5, -1, 6, 0x30, 7, 0x40, -1 , -1, -1, 8];
	while (bs.getpos() < 10000 && (((hidden_flag<<5) | block_type) != 0x3F)) {
		var baseid = baseids[block_type] + 0x50*hidden_flag; 
		var xpos = bs.read(xbits);
		while (bs.getpos() < 10000 && xpos != (1<<xbits) - 1) {
			var ypos = bs.read(ybits);
			if (block_type != 3 && block_type != 11 && block_type != 4) {
				// Up to 16 blocks in a row/column
				var nblocks = bs.read(4) + 1;
				var direction = bs.read(1) + 1;
				var xd = direction & 1;
				var yd = (direction & 2) >> 1;
				for (var nb = 0; nb < nblocks; ++nb) {
					if (block_type == 1) {
						// Prize block
						var disguised = bs.read(1);
						var prize = bs.read(4);
						layer.setTile(xpos, ypos, tileset.tile(baseid+0x10*disguised+prize));
					} else if (block_type == 10 | block_type == 12) {
						// Shooter block / drill block
						var spikebits = bs.read(4);
						layer.setTile(xpos, ypos, tileset.tile(baseid+spikebits));
					} else if (block_type == 16) {
						// Collision mod
						var coltype = bs.read(3);
						layer.setTile(xpos, ypos, tileset.tile(baseid+coltype));
					} else {
						// rock, ice, iron, rubber, shifting, mushroom
						layer.setTile(xpos, ypos, tileset.tile(baseid));
					}
					xpos += xd;	
					ypos += yd;	
				}
			} else if (block_type == 3) {
				// Ghost block
				trash = bs.read(31);
			} else if (block_type == 4) {
				// Telepad
				trash = bs.read(25);
			} else if (block_type == 11) {
				// Elevator
				layer.setTile(xpos, ypos, tileset.tile(baseid));
			}

			xpos = bs.read(xbits);
		}

		hidden_flag = bs.read(1);
		block_type = bs.read(5);
	}

}


var layer_to_kcm_blocks = function(layer) {
	if (!layer.isTileLayer) {
		tiled.warn("Invalid block layer format. Block data not saved.");
		return null;
	}
	var basic_block_ids = [0x00, 0x80, 0x85, 0x86, 0x82, 0x87, 0x89, 0x8B];
	var data = new Uint8Array(layer.width * layer.height * 5 + 4);
	var pos = 0;
	data[pos++] = (layer.width & 0xFF00) >> 8;
	data[pos++] = (layer.width & 0xFF);
	data[pos++] = (layer.height & 0xFF00) >> 8;
	data[pos++] = (layer.height & 0xFF);
	// TODO: give warning if too many prize blocks

	for (var y = 0; y < layer.height; ++y) {
		for (var x = 0; x < layer.width; ++x) {
			if (layer.tileAt(x, y) != null) {
				if (layer.tileAt(x, y).tileset.name != "blocks") {
					tiled.warn("Block from invalid tileset at (" + x + ", " + y + "). Skipping.");
				} else {
					var id = layer.tileAt(x, y).id;
					var hidden = 0;
					if (id >= 0x50) {
						id -= 0x50;
						hidden = 0x20;
					}
					if (id >= 0x40) {
						// drill block
						data[pos] = 0x8C;
						data[pos+1] = id & 0x0F;
					} else if (id >= 0x30) {
						// evanescent block
						data[pos] = 0x8A;
						data[pos+1] = id & 0x0F;
					} else if (id >= 0x10) {
						// prize block
						data[pos] = 0x81;
						data[pos+1] = id - 0x10;
					} else if (id >= 0x8) {
						// collision modifier
						data[pos] = 0x90;
						data[pos+1] = id & 0x07;
					} else {
						data[pos] = basic_block_ids[id];
					}
					if (id != 0) {
						data[pos] += hidden;
					}
				}
			}
			pos += 5;
		}
	}

	return data;
}


var save_blocks = function(kcmdata, filename, compression_path) {
	var data = compress_blocks(kcmdata, compression_path);
	var file = new BinaryFile(filename, BinaryFile.ReadWrite);
	file.resize(0);
	file.write(data.buffer);
	file.commit();
	return true;
}
