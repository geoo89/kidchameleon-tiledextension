var get_repo_path = function(fileName) {
	var file_path = fileName.replace(/[\\\/][^\\\/]*$/, '/'); // path of the opened file
	var paths_json_name = file_path + "resource_paths.json";
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

	var repo_path;
	if (resource_paths.kidc_repo_dir[0] == '.') {
		repo_path = file_path + resource_paths.kidc_repo_dir; // relative path
	} else {
		repo_path = resource_paths.kidc_repo_dir; // absolute path
	}
	// make sure it ends with / or \
	if (repo_path[repo_path.length-1] != '/' && repo_path[repo_path.length-1] != '\\') {
		repo_path += '/';
	}

	return repo_path;
}


var get_kclv = function(fileName) {
	var kcfile = new TextFile(fileName, TextFile.ReadOnly);
	var kclv = JSON.parse(kcfile.readAll());
	kcfile.close();
	return kclv;
}
