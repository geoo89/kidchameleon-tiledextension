import numpy as np
import struct

from PIL import Image

# Read a Genesis palette file and return a numpy array with its colors.
# Each color is a vector with 3 BGR entries which are 8-bit integers.
def get_palette_from_file(filename):
    with open(filename, 'rb') as f:
        data = f.read()
        pal = np.array([[data[i+1]&0x0F, (data[i+1]&0xF0)>>4, data[i]&0xF] for i in range(0, len(data), 2)])
        pal = (pal + 1) * 16
        return pal

def write_palette_to_file(filename, pal):
    with open(filename, 'wb') as f:
        for color in pal:
            color_3bit = [(e >> 4) & 0xE for e in color]
            gen_color = sum(c << (4*i) for i,c in enumerate(color_3bit))
            f.write(struct.pack('>H', gen_color))  # 16 bit big endian

def color_3bitbgr_to_8bitrgb(color):
    return [(color[2] + 1) * 16, (color[1] + 1) * 16, (color[0] + 1) * 16]

# Takes an 8x8 numpy array of 8-bit integers and turns it into a byte sequence
# with 4 bits per pixel in the format used by the Genesis.
def np8bit8x8_to_tile(arr):
    tile = arr.reshape((64,))  # flatten
    tile = (tile[::2] << 4) | tile[1::2]  # convert to 4bit
    return tile.tobytes()

def blank_tile():
    nptile = np.zeros((8, 8), dtype=np.int8)
    return np8bit8x8_to_tile(nptile)

# Take an indexed image, change the palette, and save it.
def save_image_with_palette(filename, pal, debugimg_out):
    paldata = [component for color in pal for component in color]
    img = Image.open(filename)
    img.putpalette([0, 0, 0] + paldata + paldata[0:3] * (255 - len(pal)))
    img.save(debugimg_out, "PNG")

# Given a palette and image filename, get numpy pixel array indexed by palette entry.
def image_to_indexed_pixels(pal, filename, debugimg_out):
    paldata = [component for color in pal for component in color]
    palimage = Image.new('P', (16, 16))
    # pad palette to 256 colors by filling in first color
    palimage.putpalette(paldata + paldata[0:3] * (256 - len(pal)))

    mapimage = Image.open(filename)
    mapimage = mapimage.convert(mode="RGB")
    mapimage.load()
    mapimage_indexed = mapimage.im.convert("P", 0, palimage.im)  # 0 indicates no dithering
    mapimage._new(mapimage_indexed).save(debugimg_out)
    pixels = np.array(mapimage_indexed, dtype=np.int8).reshape(mapimage.size[::-1])
    return pixels


# Replace given color (8bit rgb) with transparency
def make_transparent(imfile, color):
    img = Image.open(imfile)
    img = img.convert("RGBA")

    outdata = []
    for pixel in img.getdata():
        if all(pixel[0:3] == color):
            outdata.append((255, 255, 255, 0))
        else:
            outdata.append(pixel)

    img.putdata(outdata)
    img.save(imfile, "PNG")

# The standard tile format is 2 bytes per tile, with the lowest 11 bits
# indicating the tile ID and bits 11 and 12 being x_flip/y_flip respectively.
# The maps of bg chunks use one byte per tile, where the top bit is an x_flip
# flag and the lower 7 bits are the tile ID.
# Note: if tiledict is provided, new tile entries will be added to it inplace.
def pixels_to_tiles(pixels, tiledict=None, is_bg_chunk=False):
    if tiledict is None:
        tiledict = dict()  # default: make new dict

    ysize, xsize = pixels.shape
    if xsize % 8 or ysize % 8:
        raise ValueError("Image dimension not divisible by 8. Dimensions: {} x {}".format(xsize, ysize))

    if is_bg_chunk:
        flipbit_shift = 7
        tilemap = np.empty((ysize//8, xsize//8), dtype=np.int8)
    else:
        flipbit_shift = 11
        tilemap = np.empty((ysize//8, xsize//8), dtype=np.int16)        

    for y in range(0, ysize, 8):
        for x in range(0, xsize, 8):
            # orientation of tiles: normal, x-flipped, y-flipped, x/y-flipped
            fliptiles = [
                    pixels[y  :                   y+8    ,x  :                   x+8    ], 
                    pixels[y  :                   y+8    ,x+7:(None if x==0 else x-1):-1], 
                    pixels[y+7:(None if y==0 else y-1):-1,x  :                   x+8    ], 
                    pixels[y+7:(None if y==0 else y-1):-1,x+7:(None if x==0 else x-1):-1]]
            if is_bg_chunk:
                del fliptiles[2:]  # only allow for xflip
            found = False
            for flipbits, tilef in enumerate(fliptiles):
                tile = np8bit8x8_to_tile(tilef)
                if tile in tiledict:
                    tilemap[y//8,x//8] = tiledict[tile] | (flipbits<<flipbit_shift)
                    found = True
                    break
            if not found:
                tile = np8bit8x8_to_tile(fliptiles[0])
                tilemap[y//8,x//8] = len(tiledict)
                tiledict[tile] = len(tiledict)

    return tilemap, tiledict

def save_unique_tiles(tiledict, filename):
    f = open(filename, 'wb')
    for tile, idx in sorted(tiledict.items(), key=lambda x: x[1]):
        f.write(tile)
    f.close()

def save_foreground_tilemap(tilemap, filename):
    ysize, xsize = tilemap.shape
    if xsize % 2 or ysize % 2:
        raise ValueError("Error: Foreground image dimension not divisible by 16. Dimensions: {} x {}".format(xsize*8, ysize*8))
    if (xsize // 2) * (ysize // 2) > 0x100:
        print("Warning: Only up to 256 foreground blocks (16x16 pixels each) are usable ingame. Actual number: " + str((xsize // 2) * (ysize // 2)))

    f = open(filename, 'wb')
    for y in range(ysize//2):
        for x in range(xsize//2):
            f.write(struct.pack('>H', tilemap[2*y  ,2*x  ]))  # 16 bit big endian
            f.write(struct.pack('>H', tilemap[2*y  ,2*x+1]))
            f.write(struct.pack('>H', tilemap[2*y+1,2*x  ]))
            f.write(struct.pack('>H', tilemap[2*y+1,2*x+1]))
    f.close()
    return xsize // 2, ysize // 2

def save_bgchunk_tilemap(tilemap, filename):
    ysize, xsize = tilemap.shape
    f = open(filename, 'wb')
    f.write(struct.pack('>H', xsize))  # 16 bit big endian
    f.write(struct.pack('>H', ysize))  # 16 bit big endian
    for y in range(ysize):
        for x in range(xsize):
            f.write(tilemap[y, x])
    f.close()

def save_plane_tilemap(tilemap, filename):
    ysize, xsize = tilemap.shape
    f = open(filename, 'wb')
    for y in range(ysize):
        for x in range(xsize):
            f.write(struct.pack('>H', tilemap[y,x]))  # 16 bit big endian
    f.close()
