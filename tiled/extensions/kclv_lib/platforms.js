var load_platforms = function(filename, tileset, header, objectlayer) {
	var file = new TextFile(filename, TextFile.ReadOnly);
	while (!file.atEof) {
		var line = file.readLine();
		var comment_pos = line.indexOf(";");
		if (comment_pos != -1) {
			line = line.slice(0, comment_pos); // remove comment from line
		}
		var is_end = /^\s+dc.w\s+(\$FFFF|-1)\s*$/.test(line);
		if (is_end) {
			break;  // line indicating end of platform layout
		}
		var tokens = line.split(/\s+ptfm\s+/);
		if (tokens.length > 1) {
			// ptfm macro found in this line
			var values = tokens[1].split(',');
			if (values.length != 11) {
				tiled.warn("Ignoring invalid line \"" + line + "\" in " + filename);
			} else {
				var numbers = values.slice(0,10).map(
					value => parseInt(value.trim().replace("$", "0x")));

				//    0,    1,     2,     3,     4,     5,              6,   7,     8,     9,          10
				// xpos, ypos, lload, rload, tload, bload, script/special, h/v, xsize, ysize, script/type
				var obj = new MapObject();
				obj.x = numbers[0] << 4;
				obj.y = numbers[1] << 4;
				obj.width = (numbers[8]+1)<<4;
				obj.height = (numbers[9]+1)<<4;
				if ((numbers[6] & 8) == 0) {
					obj.setProperty("script_offset", values[10].split("-")[0]);
					obj.tile = tileset.tile(2);
					obj.setProperty("touch_activated", (numbers[6] & 1) ? true : false);
				} else {
					var platform_type = parseInt(values[10].trim().replace("$", "0x"))>>2;
					if (platform_type >= tileset.tileCount - 1) {
						tiled.warn("Ignoring invalid platform \"" + line + "\" in " + filename);
						continue;
					}
					obj.tile = tileset.tile(3+platform_type);
					if (platform_type == 3) {
						obj.width *= 7;
						obj.height *= 4;
					}
				}
				obj.setProperty("fakesteel", (numbers[7] == 6) ? true : false);
				obj.setProperty("automatic_loading_zone", false);
				obj.setProperty("loadingzone_abs_left", numbers[2]<<1);
				obj.setProperty("loadingzone_abs_right", numbers[3]<<1);
				obj.setProperty("loadingzone_abs_top", numbers[4]<<1);
				obj.setProperty("loadingzone_abs_bottom", numbers[5]<<1);
				obj.setProperty("loadingzone_rel_left", numbers[2]*2 - numbers[0] <<0);
				obj.setProperty("loadingzone_rel_right", numbers[3]*2 - numbers[0] <<0);
				obj.setProperty("loadingzone_rel_top", numbers[4]*2 - numbers[1] <<0);
				obj.setProperty("loadingzone_rel_bottom", numbers[5]*2 - numbers[1] <<0);
				obj.setProperty("loadingzone_use_relative", true);
				obj.setProperty("objtype", "platform");
				obj.visible = true;
				if (numbers[7] != 0) {  // 0 is only used by dummy platform in empty layout.
					objectlayer.addObject(obj);
				}
			}
		} else if (!/^\s*$/.test(line)) {
			// line doesn't contain ptfm/dc.w macro, but also isn't blank
			tiled.warn("Ignoring invalid line \"" + line + "\" in " + filename);
		}
	}
	file.close();
}


// append data of this platform to the list of output lines
var place_platform = function(obj, lines, zones, header) {
	if (obj.x < 0 || obj.x >= header.fgxsize_blocks*16 || obj.y < 0 || obj.y >= header.fgysize_blocks*16) {
		tiled.warn("Platform " + obj.id + " is out of bounds. Ignoring.");
		return false;
	}
	if (obj.tile.id < 2) {
		tiled.warn("Platform " + obj.id + " has invalid tile id. Ignoring.");
		return false;
	}

	// compute 11 parameters that define a platform
	numbers = Array(11);
	numbers[0] = (obj.x + 8) >> 4;
	numbers[1] = (obj.y + 8) >> 4;
	numbers[8] = ((obj.width + 8) >> 4) - 1;
	numbers[9] = ((obj.height + 8) >> 4) - 1;
	if (obj.tile.id == 2) {  // scripted platform
		numbers[6] = get_object_property(obj, "touch_activated") ? 1 : 0;
		var script = get_object_property(obj, "script_offset");
		numbers[10] = script + "-PlatformScript_BaseAddress";
		if (!zones[script]) {
			tiled.warn("Platform " + obj.id + " might have no/invalid platform script " + script);
		}
	} else {  // non-scripted
		numbers[6] = 8;
		numbers[10] = (obj.tile.id - 3) << 2;
		if (obj.tile.id == 6) {  // platform chain
			numbers[8] = ((obj.width / 7) >> 4) - 1;
			numbers[9] = (obj.height >> 6) - 1;
		}
	}
	if (numbers[8] > 15) {
		numbers[8] = 15;
		tiled.warn("Platform " + obj.id + " is too wide. Trimmed to 16 blocks.");
	}
	if (numbers[9] > 15) {
		numbers[9] = 15;
		tiled.warn("Platform " + obj.id + " is too tall. Trimmed to 16 blocks.");
	}
	if (get_object_property(obj, "fakesteel") || (numbers[8] > 0 && numbers[9] > 0) || (numbers[8] == 0 && numbers[9] == 0)) {
		numbers[7] = 6;  // height and width both == 0 or both > 0
	} else if (numbers[8] == 0) {
		numbers[7] = 4;  // width = 0 and height > 0, no fake steel flag
	} else {
		numbers[7] = 2;  // height = 0 and width > 0, no fake steel flag
	}
	if (get_object_property(obj, "automatic_loading_zone")) {
		var movement = (obj.tile.id == 2 ? get_object_property(obj, "script_offset") : "normal");
		var extend_above_top = (obj.tile.id == 6 ? 1 : 0);  // chain can go above its position
		var zone = zones[movement];
		if (!zone) {  // Script not found. We already warned the player about this earlier.
			zone = zones["normal"];
		}
		// Boundary is x/y pos + relative box from movement + width/height.
		// Shifted >> by 1 because value should be in multiples of 32, not 16.
		numbers[2] = (numbers[0] + zone.min_x) >> 1;
		numbers[3] = (numbers[0] + zone.max_x + (obj.width>>4) + 1) >> 1;
		numbers[4] = (numbers[1] + zone.min_y - (obj.height>>4)*extend_above_top) >> 1;
		numbers[5] = (numbers[1] + zone.max_y + (obj.height>>4) + 1) >> 1;
	} else if (get_object_property(obj, "loadingzone_use_relative")) {
		numbers[2] = (get_object_property(obj, "loadingzone_rel_left") + numbers[0]) >> 1;
		numbers[3] = (get_object_property(obj, "loadingzone_rel_right") + numbers[0] + 1) >> 1;
		numbers[4] = (get_object_property(obj, "loadingzone_rel_top") + numbers[1]) >> 1;
		numbers[5] = (get_object_property(obj, "loadingzone_rel_bottom") + numbers[1] + 1) >> 1;
	} else {
		numbers[2] = get_object_property(obj, "loadingzone_abs_left") >> 1;
		numbers[3] = (get_object_property(obj, "loadingzone_abs_right") + 1) >> 1;  // +1 for round up
		numbers[4] = get_object_property(obj, "loadingzone_abs_top") >> 1;
		numbers[5] = (get_object_property(obj, "loadingzone_abs_bottom") + 1) >> 1;  // +1 for round up
	}
	// Ensure loading zones are between 0 and 255.
	// Warn user if it isn't (unless zone was determined automatically)
	var boundaries = ["", "", "left", "right", "top", "bottom"]
	for (var i = 2; i < 6; ++i) {
		if (numbers[i] < 0) {
			numbers[i] = 0;
			if (!get_object_property(obj, "automatic_loading_zone")) {
				tiled.warn("Platform " + obj.id + " " + boundaries[i] + " loading zone negative. Set to 0.");
			}
		}
		if (numbers[i] > 255) {
			numbers[i] = 255;
			if (!get_object_property(obj, "automatic_loading_zone")) {
				tiled.warn("Platform " + obj.id + " " + boundaries[i] + " loading zone too big. Set to 255.");
			}
		}
	}
	// Add platform to output
	lines.push("\tptfm\t" + numbers.join());
	return true;
}


var save_platforms = function(filename, lines, n_platforms) {
	var file = new TextFile(filename, TextFile.WriteOnly);
	if (n_platforms == 0) {
		// dummy platform
		file.writeLine("\tptfm\t0,0,0,0,0,0,0,0,0,0,PlatformScript_Nothing-PlatformScript_BaseAddress");
	} else {
		for (const line of lines) {
			file.writeLine(line);
		}
	}
	file.writeLine("\tdc.w\t\$FFFF");
	file.close();
}


var parse_platform_scripts = function(repo_path) {
	var filename = FileInfo.joinPaths(repo_path, "level/platform_scripts.asm");
	var file = new TextFile(filename, TextFile.ReadOnly);
	var zones = Object();
	var end_found = false;
	var label_found = false;
	while (!file.atEof) {
		var line = file.readLine();
		var comment_pos = line.indexOf(";");
		if (comment_pos != -1) {
			line = line.slice(0, comment_pos); // remove comment from line
		}
		var is_label = /^[A-Za-z0-9_]+:\s*$/.test(line);
		var is_end = /^\s+dc.w\s+(\$FFFF|-1)\s*$/.test(line);
		var is_loop_label = /^\s+dc.l\s+[A-Za-z0-9_]+\s*$/.test(line);

		if (is_label) {
			// cur/max/min position of the platform since the start of the script.
			var cur_x = 0;
			var cur_y = 0;
			var max_x = 0;
			var min_x = 0;
			var max_y = 0;
			var min_y = 0;
			var label = line.trim().slice(0, -1);
			end_found = false;
			label_found = true;
		} else if (is_end) {
			end_found = true;
		} else if (is_loop_label) {
			if (end_found && label_found) {
				loop_label = line.match(/^\s+dc.l\s+([A-Za-z0-9_]+)\s*$/)[1];
				zones[label] = {
					min_x: min_x,
					max_x: max_x,
					min_y: min_y,
					max_y: max_y,
					end_x: cur_x,  // for a looping script, end should be (0, 0)
					end_y: cur_y,
					next_script: loop_label
				};
				if (cur_x != 0 || cur_y != 0) {
					tiled.warn("platform_scripts.asm: Movement does not form loop for " + label);
				}
				if (label != loop_label) {
					tiled.warn("platform_scripts.asm: Non-looping platform script: " + label);
				}
				label_found = false;  // Done with this label.
			} else {
				label_found = false;  // This script was invalid. Reset, find new label.
			}
		} else {
			var tokens = line.split(/\s+ptfm_move\s+/);
			if (tokens.length > 1) {
				// ptfm_move macro found in this line
				var values = tokens[1].split(',');
				if (values.length != 3) {
					tiled.warn("platform_scripts.asm: Ignoring invalid line \"" + line + "\"");
					label_found = false;  // This script was invalid. Reset, find new label.
				} else {
					var numbers = values.slice(0,10).map(
						value => parseInt(value.trim().replace("$", "0x")));
					cur_x += numbers[0] * numbers[1];
					cur_y += numbers[0] * numbers[2];
					max_x = Math.max(max_x, cur_x);
					max_y = Math.max(max_y, cur_y);
					min_x = Math.min(min_x, cur_x);
					min_y = Math.min(min_y, cur_y);
				}
			} else if (!/^\s*$/.test(line) && !(/^[A-Za-z0-9_]+\s*=/.test(line))) {
				// line doesn't contain label or data, nor variable assignment, but also isn't blank
				tiled.warn("platform_scripts.asm: Ignoring invalid line \"" + line + "\"");
				label_found = false;  // This script was invalid. Reset, find new label.
			}
		}
	}

	// TODO: Detect and support cycles of multiple joint
	// platform scripts forming a loop.
	var final_zones = Object();
	for (label in zones) {
		final_zones[label] = {
			min_x: (zones[label].min_x>>20)-21,
			max_x: (zones[label].max_x>>20)+21,
			min_y: (zones[label].min_y>>20)-15,
			max_y: (zones[label].max_y>>20)+15
		}
	}

	final_zones["normal"] = {
		min_x: -20,
		max_x: 20,
		min_y: -14,
		max_y: 14
	}

	return final_zones;
}