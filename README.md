This is an extension for [Tiled](https://www.mapeditor.org/)
to support level editing in Kid Chameleon using its
[disassembly](https://github.com/sonicretro/kid-chameleon-disasm).

# Setup

Install a recent version of [Tiled](https://www.mapeditor.org/).
Locate its _extensions_ folder. This should be as described in the
[documentation](https://doc.mapeditor.org/en/latest/reference/scripting/#scripted-extensions),
or alternatively open Tiled, and in the menu select _Edit -> Preferences -> Plugins_;
the extensions directory is displayed at the bottom.
Copy the contents of the _extensions_ folder from this repository
into Tiled's _extensions_ folder.

Assuming you have already set up the disassembly of Kid Chameleon,
create a _tiled_ subfolder inside the disassembly folder, and copy
the contents of the _tiled_ folder from this repository into there.
You should now be able to open the example `.kclv` file from the
_tiled_ folder.

# General notes

Currently, only background editing is supported. For each level,
create an appropriate `.kclv` file in order to be able to open it
in Tiled. (Future versions of the disassembly's `split.py` will create
these automatically.) In order to open a `.kclv` file, the folder
containing it has to contain a file called `resource_paths.json` which
contains the path (absolute or relative) to the disassembly folder.
The individual data files referenced in the `.kclv` file are relative
to the disassembly folder.

# Background editing

When opening a level in Tiled, on the right-hand side a _Tilesets_ tab
and a _Layers_ tab will appear. Each contains a tileset and layer for
the background layout and the background scrolling data.
When placing or modifying objects, only the currently selected layer is
affected. Make sure to only place scrolling tiles in the scrolling layer
and layout tiles in the layout layer.

Depending on the theme of the level, background come in two formats:
layered and chunked. Layered backgrounds consist of one column of
tiles that are 512 pixels wide. When selecting the `bg_layered` layer,
on the left the _Properties_ tab will list an entry `ripple_effect_layer`.
This is only relevant for levels in the Forest and Desert theme and
determines the layer in which the visual rippling effect is applied.
Chunked background consist of background chunks that can be freely placed.
In practice, their coordinates need to be divisible by 8, thus it is
recommended to enable the grid in Tiled: _View -> Snapping -> Snap To Grid_.
To add new chunks, select the `bg_chunked` layer and at the top press
the button _Insert Tile_, which will allow you to insert the currently
selected tile from the tileset. When modifying scrolling data, note
that unlike in the layered format, due to the different grid size you
have to click within the leftmost 8 pixels of the background layout
to modify it.
