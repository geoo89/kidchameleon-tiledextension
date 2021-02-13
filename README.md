This is an extension for [Tiled](https://www.mapeditor.org/)
to support level editing in Kid Chameleon using its
[disassembly](https://github.com/sonicretro/kid-chameleon-disasm).
It comes with a python tool to create new themes for Kid Chameleon.

Block graphics courtesy of ZTarget.

# Tiled extension

## Setup

Install the latest snapshot or version 1.4 or later of
[Tiled](https://www.mapeditor.org/).

Follow the instructions to set up the
[disassembly](https://github.com/sonicretro/kid-chameleon-disasm),
if you haven't already.

Now create a _tiled_ subfolder inside the disassembly folder, and copy
the contents of the _tiled_ folder from this repository into there.
(If using a version of the disasm from 2020-05-21 or newer, after
setup it will already contain a _tiled/maps_ folder. In that case,
do not copy over the maps from _tiled/maps_ in this repository as
you already have the map files. Please also note that some map files
provided in this repository might need to be modified depending
on which version of the disassembly you are using, see next section.)

This Tiled extension uses external compression tools which need to
be set up. Launch Tiled, and open the project `kidchameleon.tiled-project`
using _Project -> Open Project_ from the menu.
Now from the menu choose _File -> Commands -> Edit Commands_. Navigate
to the tab _Project commands_, and you will see a pre-populated list of three
compression commands: `kc_compress`, `kc_compress_blocks`, `kc_decompress`.
For each of these, select it and proceed with the following steps:
- The field _Executable:_ contains an invalid path. To fix it, press the
_Browse_ button and select the executable corresponding to the command
(`compress`, `decompress` or `compress_blocks`) and your operating system
(`compress.exe` etc for Windows, `compress` etc for Linux, `compress_osx`
etc for MacOS) from the `tiled/compression` folder.
- Furthermore press the _Browse_ button next to the _Working Directory:_
field and select the folder `tiled/compression`.
(Note: The source of these compression tools is available at
https://github.com/sonicretro/kid-chameleon-disasm/tree/master/tools
if you need to compile them from source for your platform of choice.)

Assuming you have set up the disassembly so that all the individual
levels have been split from the ROM into separate files, you should
now be able to open the `.kclv` and `.kclvb` files from the
_tiled/maps_ folder.

I strongly recommend enabling _View -> Snapping -> Snap to Grid_.
After opening a map, in the _View -> Views and Toolbars_ menu I recommend to
enable (at least) _Project, Issues, Properties, Tilesets, Tile stamps_
and _Tools_.

## Version differences for map files

For each map, the _tiled/maps_ folder contains two files. One with `.kclv`
extension for the foreground level layout, and one with `.kclvb` for
the background layout. The contents of these two files are identical,
however the file extension is used to determine whether to open the
foreground or background of the level. Each of these files is a text
file in JSON format, pointing to the individual resources belonging
to the map from the disassembly, and thus can easily be modified as
needed.

If `split.py` and/or `split_hack.py` produced maps in the _tiled/maps_
folder back when setting up the disasm, use these. (However, if they
are missing, and you have modified any levels, __do not rerun `split.py`
or `split_hack.py`__ as that will overwrite your modifications.)

That the files shipping with this repository assume that
each map has its own platform and background layout file, as you get
when running `split_hack.py` in addition to `split.py` from the disassembly
repository as of 2021-01-29. (If you only run `split.py`, some platform
and background layouts will be shared between levels; in that case you
should use the `.kclv`/`.kclvb` files produced by `split.py`.)

If you are using a disassembly from before 2021-01-29, some levels
share background layouts (see `level/background_includes.asm`) which
is not reflected in the `.kclvb` files shipping with this Tiled extension
thus the `.kclvb` will need to be modified accordingly for those levels.
Furthermore, if you are using a disassembly from before 2020-03-06,
background layout file names distinguish between the chunked
and layered background format (e.g. `31.bin` but `30_layered.bin` in
_level/background_). In that case you will have to adjust the `.kclvb`
files of those maps that use a layered background format to point to
the correct background filename as well.

Note that the paths in the `.kclv`/`.kclvb` files are relative to the
disassembly folder. In order for tiled to open such a file, it looks in
a file `resource_paths.json` in the same folder as the `.kclv`/`.kclvb`
to determine where to find the disassembly. Thus you can reorganize your
maps into subfolders, as long as you provide `resource_paths.json` with
the appropriate path to the disassembly in each of these subfolders.

## Foreground editing

Terrain, blocks, enemies and platforms are supported. All of these
are available in the _Tilesets_ panel.

Each level has three layers (see _Layers_ panel): a terrain layer, block
layer (both tile layers) and an object layer with enemies, platforms,
teleporters, ghost blocks, the kid and the flag. The object layer and each
object have custom properties that appear in the properties panel when the
layer or object is selected. For enemies this includes e.g. the level
(which determines its speed and hitpoints), for teleporters the
destination, and for the object layer the palette used by its enemies
and murder wall and weather effects parameters (1=lava, 2=storm, 3=hail).
Note that only up to 3 different enemy types are supported per map,
possibly less depending on the enemies and murder wall/weather effects.
This tiled extension will automatically try to infer the set of enemies
used, and warn you if you're using too many different tiles.

Platforms are the only objects that can be meaningfully resized so that
their size will be reflected ingame. In game, platforms only get loaded
once the kid is within a certain region around the platform. If the
`automatic_loading_zone` property is enabled, a sensible loading zone
will automatically be chosen depending on the platform type and its script.
Otherwise, the loading zone can also be specified manually in absolute or
relative coordinates.

Tiled allows you to add any kind of tiles to any layer, so it is easy to
accidentally add blocks to the terrain layer or vice versa. Upon saving
a level a warning will appear in the _Issues_ panel in that case.
The _Highlight current layer_ feature in the bottom right of the
_Layers_ tab should help you avoid placing tiles on the wrong layer.

To resize a map, use _Map -> Resize Map_. Note that the width should be
a multiple of 20 and the height a multiple of 14. To change the theme
of a map select _Map -> Map Properties_ and modify the corresponding
custom properties. The theme change only takes effect after closing
and reopening the map. 
Note that size and theme changes also implicity affect the corresponding
background map.

## Background editing

Each background has two layers: One for the actual layout, and one
for its scrolling rows.

Depending on the theme of the level, the background layout comes in one of two
formats: layered and chunked. Layered backgrounds consist of one column of
tiles that are 512 pixels wide. When selecting the `bg_layered` layer,
on the left the _Properties_ tab will list an entry `ripple_effect_layer`.
This is only relevant for levels in the Forest and Desert theme and
determines the layer in which the visual rippling effect is applied.
Chunked backgrounds consist of background chunks that can be freely placed.
In practice, their coordinates need to be divisible by 8, thus it is
recommended to enable the grid in Tiled: _View -> Snapping -> Snap To Grid_.
To add new chunks, select the `bg_chunked` layer and at the top press
the button _Insert Tile_, which will allow you to insert the currently
selected tile from the tileset.

When modifying scrolling data, note that unlike in the layered format,
due to the different grid size you have to click within the leftmost
8 pixels of the background layout to modify it.

# Theme importer

The theme importer allows to convert images into a format used by
Kid Chameleon.

## Set up

Follow the instructions to set up the
[disassembly](https://github.com/sonicretro/kid-chameleon-disasm),
if you haven't already.
If you're using a version older than 2021-02-11, please manually
add [these changes](https://github.com/sonicretro/kid-chameleon-disasm/commit/2f0cceca8ee3e3a88c66d983f366ed66b2d82d5c)
to `kid.asm`.

To set up the tool, copy the `theme_import` folder into your disasm folder.
To run the importer, you'll need to have [python 3](https://www.python.org/)
installed, and in addition (numpy)[https://numpy.org/] and the
[PIL library](https://pillow.readthedocs.io/en/stable/) for python.

## Preparing the images

A theme in Kid Chameleon consists of foreground blocks (16x16 pixels)
that the level layouts are made of, pieces of background (variable size)
that the background layouts are composed of, and an image that appears
on the title card before the start of a levels.

Thus the input folder (see `theme_import/example`) must contain graphics
for each of these components, as follows:

* `bg_chunks`: Subfolder with images of background chunks.
* `background_palette.bin`: Sega Genesis palette with 8 colors.
* `foreground_palette.bin`: Sega Genesis palette with 16 colors.
* `foreground.png`: Image with all foreground blocks.
* `title_palette.bin`: Sega Genesis palette with 16 colors.
* `title.png`: Image to appear on the theme's title card.

The dimensions of each background chunk and `title.png` must be divisible
by 8, the dimensions of `foreground.png` must be divisible by 16.
Each image should only use colors from the corresponding palette; the
palettes are in the [Genesis palette format](https://segaretro.org/Sega_Mega_Drive/Palettes_and_CRAM)
and can be modified e.g. using [HivePal](https://segaretro.org/HivePal) or a hex editor.
(If a color in the image is not present in the palette, the closest color
from the palette will be used instead.)
The only exception is for background chunks: In addition to the specified
palette, black can be used (this is hard-coded in the game) for a total
of 9 colors. The first color of the background palette will determine the
ingame background color, and the first color of the foreground palette
will indicate transparency for foreground blocks.

Internally, graphics on the Genesis consist of 8x8 pixel tiles that are
arranged on screen (e.g. as background chunks or foreground blocks).
This yields more constraints to keep in mind:
The foreground image must not consist of more than 356 unique 8x8 tiles,
the title image must not have more than 267 unique 8x8 tiles, and the background
chunks (taken together) must not have more than 128 unique 8x8 tiles.
For foreground and title, a horizontally/vertically flipped version of another
tile is not considered unique; for background, vertically flipped versions
are considered unique but horizontally flipped versions are not.
Furthermore, the game can only use 256 unique 16x16 foreground blocks.

Finally, note that the foreground palette is shared with various block
and item graphics in the game (see `templates/blocks.png`). After the
transparent color, the next 5 colors should be a gradient from dark to bright
used by most blocks and platforms, followed by another color that appears
on the flag, inside explosions and on the teleporter and should ideally
blend with the brighter shades of the previous gradient. The next 4 colors
should be another gradient from dark to bright and determines the 4 shades
used by the diamonds in the game. The next 4 colors are not shared, but
the last color should bright (usually white) as it is used in the HUD and
for the clock.

## Configuring

Before importing, you might want to change some configuration by editing
`config.json`. It contains the following parameters:

* `theme_id`: Number of the new theme. Should be 11 and increase from there with each new theme (original themes are 1-10). Maximum is 15.
* `theme_name`: Name of theme (all lowercase letters)
* `input_folder`: Folder containing the images and palettes for import.
* `output_folder`: Folder for the output files resulting from the import.
* `compress_tool`: Path to the _compress_ tool (the tools are in this repository in `tiled/compression/`, choose one according to your operating system; default value points to Windows binary)
* `extra_bg_color`: The 9th color the background chunks may use (three 3 bit Genesis color components, in order BGR). Ingame hardcoded to be black.

**Note:** If you need to use a backslash `\` anywhere in `config.json`,
you will need to escape it by typing `\\`.

## Running the import

Run `import.py`. The tool will produce a file `log.txt` where you can
check whether everything worked. If yes, it will in particular contain
a line "SUCCESS!" and give you _further instructions that you should follow_.
(In particular, you will need to _manually compress_ the title card mappings
using e.g. use [TDSC](https://segaretro.org/The_Sega_Data_Compressor).)
If successful, all output files will be in the output folder specified in
`config.json`, and a file `kid_asm_[theme_name].diff` will be created.
Note that `log.txt` will also warn you if you exceeded the number of allowed
tiles or blocks.

Furthermore the tool creates a `debug` folder with debug information.
You can check the images to make sure all pixels got assigned the correct
colors from the palette. Of particular interest is `debug/blocks.png`,
which shows how the block graphics will look like with your foreground palette.

## Using the theme in Tiled and ingame

These instructions are also mentioned in `log.txt` after a successful import:

Copy all the contents of the output folder that you specified in `config.json`
into the disassembly folder (the output uses the same folder structure and
the content should merge into the respective folders). Now you're set to
use the theme in Tiled: Change the foreground/background theme ID of a map
to the new ID that you assigned to the theme in `config.json` to use the theme.
You'll want to edit the collision of each foreground block of the new theme.
For that purpose, open `tiled/themes/11.kcthm` (or whichever number you
assigned to the theme) and edit and save the theme's collision.

To support the theme in the game, you will need to modify `kid.asm` in the
disassembly folder. You will see all the required changes in the file
`kid_asm_[theme_name].diff`. Each _section_ starts with a line beginning with
`@@`, followed by line numbers, another `@@`, and a starting line (that
usually contains a label). While the line numbers might differ in your
disassembly, the starting line/label should allow you to find the relevant
part of the code in `kid.asm`. The first and last three lines of a _section_
of `kid_asm_[theme_name].diff` are the three lines directly preceding/succeeding
the location in `kid.asm` where you should insert a change. In between them
are lines starting with `+`: These are the lines you should insert in this
location in `kid.asm` (remove the leading `+`).

## Updating themes

You might want to extend your theme over time. In that case, run `import.py`
on the updated input images/palettes. If you've already created levels with
the older version of your theme, you should avoid reordering or removing
foreground blocks or background chunks as then levels using these pieces will
get messed up. Unless you're adding background chunks, no changes to `kid.asm`
are necessary when updating. You only have to copy over the `theme` and `tiled`
subfolders from the output folder into your disasm, except for
`theme/collision/[theme_name].bin`: The collision file generated by `import.py`
is blank and would overwrite your custom collision you edited in Tiled.

You only need to make additional changes to `kid.asm` if you add new
background chunks. Note that background chunks are indexed in lexicographical
order of their filename, so in order to be compatible with background layouts
that were made with a previous version of your theme, only add background
chunks whose filenames come lexicographically _after_ the filenames of the old
chunks.
