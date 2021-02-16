// This whole scheme is a horrible hack. Ideally, there should be a simple
// invocation of a synchronous call to the compressor/decompressor.
// Instead, currently the user has to set up a custom commands (see below),
// and we have to poll to see whether the compression is finished because
// the call is asynchronous.

// Setting up the custom command:
//
// File -> Commands -> Edit Commands
//
// Add the following command:
// Name: kc_decompress
// Command: /path/to/tiled-config/extensions/decompress tmpin.bin tmpout.bin
// Working directory: path/to/kidc-repository/tiled/
//
// Name: kc_compress
// Command: /path/to/tiled-config/extensions/compress tmpin.bin tmpout.bin
// Working directory: path/to/kidc-repository/tiled/
// 
// IMPORTANT: For both, uncheck "Save map before executing".
// If you don't, Tiled will go into an endless loop, because the command is
// invoked when trying to save the map.
//
// In order to work, the custom command needs the compression tools to reside
// in Tiled's extension folder. You can find these tools here:
// https://github.com/sonicretro/kid-chameleon-disasm/tree/master/tools



// Decompress data using the KC compression format.
// indata: Uint8Array containing the data
// paths: object with paths to compression tmpin/tmpout files.
// @returns: a Uint8Array containing the decompressed data.
var decompress = function(indata, paths) {
	return run_compression_command(indata, paths, "kc_decompress", 2000);
}

// Compress data using the KC compression format.
// indata: Uint8Array containing the data
// paths: object with paths to compression tmpin/tmpout files.
// @returns: a Uint8Array containing the decompressed data.
var compress = function(indata, paths) {
	return run_compression_command(indata, paths, "kc_compress", 20000);
}

// Compress block data provided in expanded .kcm format into the format
// internally used by the game.
// indata: Uint8Array containing the data
// paths: object with paths to compression tmpin/tmpout files.
// @returns: a Uint8Array containing the decompressed data.
var compress_blocks = function(indata, paths) {
	return run_compression_command(indata, paths, "kc_compress_blocks", 2000);
}

// Compress data using the KC compression format.
// indata: Uint8Array containing the data
// paths: object with paths to compression tmpin/tmpout files.
// @returns: a Uint8Array containing the compressed data.
var run_compression_command = function(indata, paths, command, timeout) {
	var tmpin = new BinaryFile(paths.compression_tmpin, BinaryFile.ReadWrite);
	tmpin.resize(0);
	tmpin.write(indata.buffer);
	tmpin.commit();
	// Erase the output file.
	var tmpout = new BinaryFile(paths.compression_tmpout, BinaryFile.ReadWrite);
	tmpout.resize(0);
	tmpout.commit();
	// do the compression. This is asynchronous, so we have to poll for the
	// result to be ready.
	tiled.executeCommand(command, false);
	// poll for the result to be ready.
	var success = wait_until_file_written(timeout, 150, paths.compression_tmpout);
	if (success) {
		// load (de)compressed file.
		tmpout = new BinaryFile(paths.compression_tmpout, BinaryFile.ReadOnly);
		var outdata = new Uint8Array(tmpout.readAll());
		tmpout.close();
		return outdata;		
	} else {
		return null;
	}
}

var wait_until_file_written = function(timeout, interval, filename) {
	var total_time = 0;
	var success = false;
	while (total_time < timeout) {
		// wait for interval milliseconds
		var currentTime = new Date().getTime();
		while (currentTime + interval >= new Date().getTime()) {}
		// check if file exists and has non-zero size
		var file = new BinaryFile(filename, BinaryFile.ReadOnly);
		if (!file.atEof) {
			// if yes, we're done
			file.close();
			success = true;
			break;
		}
		file.close();
		total_time += interval;
	}
	if (!success) {
		tiled.error("Compression timed out.\nCheck the compression commands, and/or" +
			"increase the timeout value (currently " + timeout + "ms) passed to wait_until_file_written " +
			"in .../lib_kclv/compression.js in the tiled extensions folder and try again.");
	}
	return success;
}