import contextlib
import glob
import json
import numpy as np
import os
import re
from shutil import copyfile
import struct
import subprocess
import sys
from utils import tile

# Take a path string that uses '/' as delimiter
# and return the path string using the native delimiter.
def ppath(path):
    return os.path.join(*path.split('/'))

# The path is assumed to have '/' as delimiter. We split by this delimiter
# and use os.path.join to return a path that is platform independent.
def make_out_path(config, path):
    return os.path.join(ppath(config["output_folder"]), ppath(path.format(config["theme_name"])))

def make_in_path(config, path):
    return os.path.join(ppath(config["input_folder"]), ppath(path.format(config["theme_name"])))

def compress(in_filename, out_filename, config):
    with contextlib.suppress(FileNotFoundError):
        os.remove(out_filename)
    # result = subprocess.run([ppath(config["compress_tool"]), in_filename, out_filename], stdout=subprocess.DEVNULL)
    # if result.returncode != 0:
    success = True
    command = ppath(config["compress_tool"])
    try:
        return_code = subprocess.call([command, in_filename, out_filename], stdout=subprocess.DEVNULL)
        if return_code != 0:
            print("Warning: Compression of {} finished with error code {}.".format(out_filename, result.returncode))
    except FileNotFoundError:
        print("Error: Unable to run {} for compression.".format(command))
        success = False

    if not os.path.isfile(out_filename) or os.path.getsize(out_filename) == 0:
        print("Error: Compression of {} produced no/empty file.".format(out_filename))
        success = False
    if not success:
        print("IMPORTANT: Saving uncompressed file {}. You must compress manually.".format(out_filename))
        copyfile(in_filename, out_filename)
    with contextlib.suppress(FileNotFoundError):
        os.remove(in_filename)


if __name__ == "__main__":
    with contextlib.suppress(FileNotFoundError):
        os.remove('log.txt')
    sys.stdout = open('log.txt', 'w')
    # sys.stderr = sys.stdout

    # Foreground
    with open("config.json", "r") as f:
        config = json.load(f)

    os.makedirs(make_out_path(config, "tiled/background/{}"), exist_ok=True)
    os.makedirs(make_out_path(config, "tiled/foreground"), exist_ok=True)
    os.makedirs(make_out_path(config, "tiled/themes"), exist_ok=True)
    os.makedirs(make_out_path(config, "theme/artcomp_bg"), exist_ok=True)
    os.makedirs(make_out_path(config, "theme/artcomp_fg"), exist_ok=True)
    os.makedirs(make_out_path(config, "theme/bg_chunks"), exist_ok=True)
    os.makedirs(make_out_path(config, "theme/collision"), exist_ok=True)
    os.makedirs(make_out_path(config, "theme/mappings"), exist_ok=True)
    os.makedirs(make_out_path(config, "theme/palette_bg"), exist_ok=True)
    os.makedirs(make_out_path(config, "theme/palette_fg"), exist_ok=True)
    os.makedirs(make_out_path(config, "theme/titlecard/artcomp"), exist_ok=True)
    os.makedirs(make_out_path(config, "theme/titlecard/mapeni"), exist_ok=True)
    os.makedirs(make_out_path(config, "theme/titlecard/palette"), exist_ok=True)
    os.makedirs(os.path.join("debug", "bg_chunks"), exist_ok=True)

    fgpal_path = make_in_path(config, "foreground_palette.bin")
    fgimg_path = make_in_path(config, "foreground.png")
    process_foreground = True
    if not os.path.isfile(fgimg_path):
        process_foreground = False
        print("Error: File not found: " + str(fgimg_path))
    if not os.path.isfile(fgpal_path):
        print("Error: File not found: " + str(fgpal_path))
        process_foreground = False
    else:
        fgpal = tile.get_palette_from_file(fgpal_path)
        if len(fgpal) != 16:
            print("Error: Foreground palette must have 16 colors, but has " + str(len(fgpal)))
            process_foreground = False

    if not process_foreground:
        print("Skipping foreground processing.")
    else:
        fgpal_path_out = make_out_path(config, "theme/palette_fg/{}.bin")
        tile.write_palette_to_file(fgpal_path_out, fgpal[1:])
        tile.save_image_with_palette(os.path.join("templates", "blocks.png"), fgpal, os.path.join("debug", "blocks.png"))

        fg_debugimg = os.path.join("debug", "foreground.png")
        pixels = tile.image_to_indexed_pixels(fgpal, fgimg_path, fg_debugimg)
        np.savetxt(os.path.join("debug", "foreground_pixels.txt"), pixels, fmt='%X')
        tile.make_transparent(fg_debugimg, fgpal[0])
        copyfile(fg_debugimg, make_out_path(config, "tiled/foreground/{}.png"))

        tilemap, tiledict = tile.pixels_to_tiles(pixels)
        tilemap += 0xBC  # Tile offset for foreground
        np.savetxt(os.path.join("debug", "foreground_mappings.txt"), tilemap, fmt='%4X')
        fgmappings_path = make_out_path(config, "theme/mappings/{}.bin")
        xblocks, yblocks = tile.save_foreground_tilemap(tilemap, fgmappings_path)
        n_blocks = xblocks * yblocks
        fgcollision_path = make_out_path(config, "theme/collision/{}.bin")
        with open(fgcollision_path, "wb") as f:
            f.write(b'\0'*n_blocks)
        with open(os.path.join("templates", "foreground.tsx"), "r") as f:
            content = f.read().replace("themename", config["theme_name"]) \
                              .replace("ntiles", str(n_blocks)) \
                              .replace("imagewidth", str(xblocks*16)) \
                              .replace("imageheight", str(yblocks*16)) \
                              .replace("ncolumns", str(xblocks))
            fout = open(make_out_path(config, "tiled/foreground/{}.tsx".format(config["theme_name"])), "w")
            fout.write(content)
            fout.close()

        print("Number of unique foreground tiles: " + str(len(tiledict)))
        if (len(tiledict) > 356):
            print("Warning: This is more than the allowed maximum of 356.")
        fgart_path = make_out_path(config, "theme/artcomp_fg/{}.bin")
        fgart_tmp_path = os.path.join("debug", "tmp.bin")
        tile.save_unique_tiles(tiledict, fgart_tmp_path)
        compress(fgart_tmp_path, fgart_path, config)


    # Background
    bgpal_path = make_in_path(config, "background_palette.bin")
    process_background = True
    if not os.path.isfile(bgpal_path):
        print("Error: File not found: " + str(bgpal_path))
        process_background = False
    else:
        bgpal = tile.get_palette_from_file(bgpal_path)
        if len(bgpal) != 8:
            print("Error: Palette must have 8 colors, but has " + str(len(bgpal)))
            process_background = False

    if not process_background:
        print("Skipping background processing.")
    else:
        bgchunk_filenames = []
        bgpal = np.array([list(bgpal[0])]*8 + [tile.color_3bitbgr_to_8bitrgb(config["extra_bg_color"])] + list(bgpal[1:8]))
        bgpal_path_out = make_out_path(config, "theme/palette_bg/{}.bin")
        copyfile(bgpal_path, bgpal_path_out)

        # Init for Tiled background file
        bgchunks_tiled = ""
        with open(os.path.join("templates", "bgchunk.txt"), "r") as f:
            bgchunk_template = f.read()
        xmax, ymax = 0, 0
        chunk_id = 0 
        # Chunk init
        tiledict = dict()
        bgimg_path = make_in_path(config, "bg_chunks/*.png")
        bgart_path = make_out_path(config, "theme/bg_chunks")
        for f_img in glob.glob(bgimg_path):
            # process chunk
            bg_debugimg = os.path.join("debug", "bg_chunks", os.path.basename(str(f_img)))
            pixels = tile.image_to_indexed_pixels(bgpal, f_img, bg_debugimg)
            copyfile(bg_debugimg, os.path.join(make_out_path(config, "tiled/background/{}"), os.path.basename(str(f_img))))
            tilemap, tiledict = tile.pixels_to_tiles(pixels, tiledict=tiledict, is_bg_chunk=True)
            bgart_basename = config["theme_name"] + "_" + re.sub('png$', 'bin', os.path.basename(str(f_img)))
            tile.save_bgchunk_tilemap(tilemap, os.path.join(bgart_path, bgart_basename))
            bgchunk_filenames.append(os.path.join("theme", "bg_chunks", bgart_basename))
            # Tiled XML for chunk
            xsize, ysize = pixels.shape
            bgchunks_tiled += bgchunk_template.replace("chunkid", str(chunk_id)) \
                                         .replace("chunkwidth", str(xsize)) \
                                         .replace("chunkheight", str(ysize)) \
                                         .replace("filename", os.path.join(config["theme_name"], os.path.basename(str(f_img))))
            xmax, ymax = max(xmax, xsize), max(ymax, ysize)
            chunk_id += 1
        # Write Tiled background file
        with open(os.path.join("templates", "background.tsx"), "r") as f:
            content = f.read().replace("themename", config["theme_name"]) \
                                     .replace("chunkwidth", str(xmax)) \
                                     .replace("chunkheight", str(ymax)) \
                                     .replace("ntiles", str(chunk_id)) \
                                     .replace("chunk_listing", str(bgchunks_tiled))
            fout = open(make_out_path(config, "tiled/background/{}.tsx".format(config["theme_name"])), "w")
            fout.write(content)
            fout.close()
        # Save tiles
        print("Number of unique background tiles: " + str(len(tiledict)))
        if (len(tiledict) > 80):
            print("Warning: This is more than the allowed maximum of 80.")
        bgart_path = make_out_path(config, "theme/artcomp_bg/{}.bin")
        bgart_tmp_path = os.path.join("debug", "tmp.bin")
        tile.save_unique_tiles(tiledict, bgart_tmp_path)
        compress(bgart_tmp_path, bgart_path, config)


    # Title
    titlepal_path = make_in_path(config, "title_palette.bin")
    titleimg_path = make_in_path(config, "title.png")
    process_title = True
    if not os.path.isfile(titleimg_path):
        process_title = False
        print("Error: File not found: " + str(titleimg_path))
    if not os.path.isfile(titlepal_path):
        print("Error: File not found: " + str(titlepal_path))
        process_title = False
    else:
        titlepal = tile.get_palette_from_file(titlepal_path)
        if len(titlepal) != 16:
            print("Error: Palette must have 16 colors, but has " + str(len(titlepal)))
            print("Skipping title processing.")
            process_title = False

    if not process_title:
        print("Skipping titlecard processing.")
    else:
        titlepal_path_out = make_out_path(config, "theme/titlecard/palette/{}.bin")
        copyfile(titlepal_path, titlepal_path_out)

        title_debugimg = os.path.join("debug", "title.png")
        pixels = tile.image_to_indexed_pixels(titlepal, titleimg_path, title_debugimg)
        np.savetxt(os.path.join("debug", "title_pixels.txt"), pixels, fmt='%X')

        tilemap, tiledict = tile.pixels_to_tiles(pixels)
        np.savetxt(os.path.join("debug", "title_mappings.txt"), tilemap, fmt='%4X')
        titlepath_out = make_out_path(config, "theme/titlecard/mapeni/{}.bin")
        tile.save_plane_tilemap(tilemap, titlepath_out)
        print("IMPORTANT: You must manually compress " + titlepath_out + " using the Enigma compression.\n"
            "    Use a tool such as https://segaretro.org/The_Sega_Data_Compressor to do this.")

        print("Number of unique titlecard tiles: " + str(len(tiledict)))
        if (len(tiledict) > 267):
            print("Warning: This is more than the allowed maximum of 267.")
        titleart_path = make_out_path(config, "theme/titlecard/artcomp/{}.bin")
        titleart_tmp_path = os.path.join("debug", "tmp.bin")
        tile.save_unique_tiles(tiledict, titleart_tmp_path)
        compress(titleart_tmp_path, titleart_path, config)

    
    # Tiled files
    with open(os.path.join("templates", "id.kcthm"), "r") as f:
        content = f.read().replace("themename", config["theme_name"])
        fout = open(make_out_path(config, "tiled/themes/{}.kcthm".format(config["theme_id"])), "w")
        fout.write(content)
        fout.close()

    if process_foreground and process_title and process_background:
        # Make the diff
        diff_bgchunk_index = "".join("+\tdc.l BGChunks_Example_Chunk{}\n".format(i) for i in range(len(bgchunk_filenames)))
        diff_bgchunks = "".join("+BGChunks_Example_Chunk{}:  binclude \"{}\"\n+\talign\t2\n".format(i, f) for i, f in enumerate(bgchunk_filenames))
        diff_path_out = "kid_asm_{}.diff".format(config["theme_name"])
        with open(os.path.join("templates", "kid_asm.diff"), "r") as f:
            content = f.read().replace("+\tdc.l BGChunks_Example_Chunk0\n", diff_bgchunk_index) \
                              .replace("+BGChunks_Example_Chunk0:  binclude\t\"theme/bg_chunks/example_00.bin\"\n+\talign\t2\n", diff_bgchunks) \
                              .replace("example", config["theme_name"]) \
                              .replace("Example", config["theme_name"].title())
            fout = open(diff_path_out, "w")
            fout.write(content)
            fout.close()
        print("SUCCESS!")
        print("Perform the compression step(s) mentioned above and "
              "copy the contents of the {} folder into your disassembly folder.".format(config["output_folder"]))
        print("See {} for the changes needed to be done in kid.asm to support the new theme.".format(diff_path_out))
        print("    If this is not your first (ID 11) new theme, the locations for changes in kid.asm are the same\n"
              "    but the surrounding lines might look different due to previously inserted themes.")
    else:
        print("Some parts of the theme creation (foreground, background, title) failed.")
