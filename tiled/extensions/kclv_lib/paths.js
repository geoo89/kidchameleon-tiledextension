var get_repo_path = function(fileName) {
	var file_path = FileInfo.path(FileInfo.fromNativeSeparators(fileName));
	var paths_json_name = FileInfo.joinPaths(file_path, "resource_paths.json");
	var paths_json = new TextFile(paths_json_name, TextFile.ReadOnly);
	if (paths_json.atEof) {
		tiled.error("resource_paths.json in folder " + file_path + " not found.");
		return null;		
	}
	var resource_paths;
	try {
		resource_paths = JSON.parse(paths_json.readAll());
	} catch (e) {
		tiled.error(file_path + "resource_paths.json has invalid format.");
		return null;		
	}
	paths_json.close();
	if (resource_paths.kidc_repo_dir == null) {
		tiled.error(file_path + "resource_paths.json missing kidc_repo_dir field.");
		return null;
	}

	var repo_path = FileInfo.fromNativeSeparators(resource_paths.kidc_repo_dir);
	if (!FileInfo.isAbsolutePath(repo_path)) {
		repo_path = FileInfo.joinPaths(file_path, repo_path); // relative path
	}

	return FileInfo.cleanPath(repo_path);
}

var add_theme_paths = function(paths, header) {
	paths.fgtileset = header.fgtheme.fgtileset;
	paths.bgtileset = header.bgtheme.bgtileset;
	return paths;
}


var get_full_path = function(repo_path, path) {
	var full_path = FileInfo.joinPaths(repo_path, FileInfo.fromNativeSeparators(path));
    return FileInfo.toNativeSeparators(FileInfo.cleanPath(full_path));
}


var get_kcthm_from_id = function(repo_path, theme_id) {
    var kcthm_path = get_full_path(repo_path, FileInfo.joinPaths("tiled/themes/", theme_id + ".kcthm"));
    return get_kcthm_with_full_paths(kcthm_path, repo_path);
}

var get_kcthm = function(fileName) {
	var repo_path = get_repo_path(fileName);
	if (repo_path == null) {
		return null;
	}

	kcthm = get_kcthm_with_full_paths(fileName, repo_path);
	kcthm.collision_tileset = get_full_path(repo_path, "tiled/collision.tsx");
	return kcthm;
}

var get_kcthm_with_full_paths = function(fileName, repo_path) {
    var kcthm_file = new TextFile(fileName, TextFile.ReadOnly);
    var kcthm = JSON.parse(kcthm_file.readAll());

	for (var key in kcthm) {
	    // Make all paths full paths.
	    if (!["name", "bg_is_layered"].includes(key)) {
 	        kcthm[key] = get_full_path(repo_path, kcthm[key]);
	    }
	}
	kcthm_file.close();
	return kcthm;
}


var get_kclv = function(fileName) {
	var repo_path = get_repo_path(fileName);
	if (repo_path == null) {
		return null;
	}

	var kcfile = new TextFile(fileName, TextFile.ReadOnly);
	var paths = JSON.parse(kcfile.readAll());
	// tmp files use in compression/decompression steps
	paths.compression_tmpin = "tiled/compression/tmpin.bin";
	paths.compression_tmpout = "tiled/compression/tmpout.bin";
	paths.enemytileset = "tiled/objects.tsx";
	paths.platformtileset = "tiled/platforms.tsx";
	paths.blocktileset = "tiled/blocks.tsx";
	paths.scrolltileset = "tiled/bgscroll.tsx";
	paths.platformscripts = "level/platform_scripts.asm";

	var full_paths = new Object();
	for (var key in paths) {
	    // check if the property/key is defined in the object itself, not in parent
	    if (paths.hasOwnProperty(key)) {
	        full_paths[key] = get_full_path(repo_path, paths[key]);
	    }
	}
	kcfile.close();
	full_paths.repo_path = repo_path;
	return full_paths;
}
