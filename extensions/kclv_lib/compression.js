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
// path: location for temp files, must have write access.
//       by convention, this should be the tiled/ subfolder of the disasm.
// @returns: a Uint8Array containing the decompressed data.
var decompress = function(indata, path) {
	return run_compression_command(indata, path, "kc_decompress");
}

var compress = function(indata, path) {
	return run_compression_command(indata, path, "kc_compress");
}

// Compress data using the KC compression format.
// indata: Uint8Array containing the data
// path: location for temp files, must have write access
//       by convention, this should be the tiled/ subfolder of the disasm.
// @returns: a Uint8Array containing the compressed data.
var run_compression_command = function(indata, path, command) {
	var tmpin = new BinaryFile(path + "tmpin.bin", BinaryFile.ReadWrite);
	tmpin.resize(0);
	tmpin.write(indata.buffer);
	tmpin.commit();
	tmpin.close();
	// Erase the output file.
	var tmpout = new BinaryFile(path + "tmpout.bin", BinaryFile.ReadWrite);
	tmpout.resize(0);
	tmpout.commit();
	tmpout.close();
	// do the compression. This is asynchronous, so we have to poll for the
	// result to be ready.
	tiled.executeCommand(command);
	// poll for the result to be ready.
	wait_until_file_written(2000, 150, path + "tmpout.bin");
	// load compressed file.
	tmpout = new BinaryFile(path + "tmpout.bin", BinaryFile.ReadOnly);
	var outdata = new Uint8Array(tmpout.readAll());
	tmpout.close();
	return outdata;
}

var wait_until_file_written = function(timeout, interval, filename) {
	var total_time = 0;
	while (total_time < timeout) {
		// wait for interval milliseconds
		var currentTime = new Date().getTime();
		while (currentTime + interval >= new Date().getTime()) {}
		// check if file exists and has non-zero size
		var file = new BinaryFile(filename, BinaryFile.ReadOnly);
		if (!file.atEof) {
			// if yes, we're done
			file.close();
			break;
		}
		file.close();
		total_time += interval;
	}

}