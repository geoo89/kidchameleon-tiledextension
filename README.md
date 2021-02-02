This is an extension for [Tiled](https://www.mapeditor.org/)
to support level editing in Kid Chameleon using its
[disassembly](https://github.com/sonicretro/kid-chameleon-disasm).

Block graphics courtesy of ZTarget.

# Setup

Install the latest snapshot or version 1.4 or later of
[Tiled](https://www.mapeditor.org/).

Assuming you have already set up the disassembly of Kid Chameleon,
create a _tiled_ subfolder inside the disassembly folder, and copy
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

# Version differences for map files

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

# Foreground editing

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

# Background editing

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

