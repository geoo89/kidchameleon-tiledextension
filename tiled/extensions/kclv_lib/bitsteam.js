// Read-only bitstream initialized from a Uint8Array

// data should be an Uint8Array
var Bitstream = function(data) {
	// TODO: check type
	this.data = data;
	this.bitpos = 0;
}

// Set the position to read from/write to
Bitstream.prototype.setpos = function(pos) {
	// TODO: check boundaries
	this.bitpos = pos;
}

// Get the position to read from/write to
Bitstream.prototype.getpos = function() {
	return this.bitpos;
}

// Read the next n bits from the stream
Bitstream.prototype.read = function(nbits) {
	// TODO: check boundaries
	var bytepos = this.bitpos >> 3;
	var offset = this.bitpos & 7;
	this.bitpos += nbits;
	var mask = 0xFF >> offset;
	var output = mask & this.data[bytepos++];
	nbits -= 8-offset;
	while (nbits > 0) {
		output = (output << 8) | this.data[bytepos++];
		nbits -= 8;
	}
	output >>= -nbits;

	return output;
}
