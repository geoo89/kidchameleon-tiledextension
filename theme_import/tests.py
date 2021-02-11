import unittest
import numpy as np
from numpy.testing import assert_array_equal
from utils import tile

class TestImport(unittest.TestCase):

    def get_pixels(self):
        return np.array([
            [0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0, ],
            [0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0, ],
            [0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0, ],
            [0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0, ],
            [0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0, ],
            [0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0, ],
            [0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0, ],
            [0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 1, 2, 3,   3, 2, 1, 0, 0, 0, 0, 0, ],
            
            [0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 1, 2, 3,   3, 2, 1, 0, 0, 0, 0, 0, ],
            [0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0, ],
            [0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0, ],
            [0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0, ],
            [0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0, ],
            [0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0, ],
            [0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0, ],
            [0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0, ],
            ], dtype=np.int8)

    def test_np8bit8x8_to_tile(self):
        nptile = np.array([
            [0, 1, 2, 3, 4, 5, 6, 7],
            [0, 1, 2, 3, 4, 5, 6, 7],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            ], dtype=np.int8)
        btile_expected = b'\x01\x23\x45\x67\x01\x23\x45\x67\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0'
        btile = tile.np8bit8x8_to_tile(nptile)
        self.assertEqual(btile, btile_expected)

    def test_pixels_to_tiles(self):
        pixels = self.get_pixels()
        tilemap_expected = np.array([
            [      0,      1,  0x801],
            [      0, 0x1001, 0x1801]
            ], dtype=np.int16)
        tilemap, tiledict = tile.pixels_to_tiles(pixels)
        assert_array_equal(tilemap, tilemap_expected)
        self.assertEqual(len(tiledict), 2)

    def test_pixels_to_tiles_bg(self):
        pixels = self.get_pixels()
        tilemap_expected = np.array([
            [ 0, 1, 0x81],
            [ 0, 2, 0x82]
            ], dtype=np.int8)
        tilemap, tiledict = tile.pixels_to_tiles(pixels, is_bg_chunk=True)
        assert_array_equal(tilemap, tilemap_expected)
        self.assertEqual(len(tiledict), 3)

    def test_image_to_indexed_pixels(self):
        pixels_expected = np.array([
            [  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7, ],
            [  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7, ],
            [  6,  6,  6,  6,  6,  6,  6,  6,  6,  6,  6,  6,  6,  6,  6,  6, ],
            [  6,  6,  6,  6,  6,  6,  6,  6,  6,  6,  6,  6,  6,  6,  6,  6, ],
            [  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5, ],
            [  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5, ],
            [  4,  4,  4,  4,  4,  4,  4,  4,  4,  4,  4,  4,  4,  4,  4,  4, ],
            [  4,  4,  4,  4,  4,  4,  4,  4,  4,  4,  4,  4,  4,  4,  4,  4, ],
            [  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3, ],
            [  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3, ],
            [  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2, ],
            [  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2, ],
            [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1, ],
            [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1, ],
            [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, ],
            [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, ],
            [0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF, ],
            [0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF,0xF, ],
            [0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE, ],
            [0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE,0xE, ],
            [0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD, ],
            [0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD,0xD, ],
            [0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC, ],
            [0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC,0xC, ],
            [0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB, ],
            [0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB,0xB, ],
            [0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA, ],
            [0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA,0xA, ],
            [  9,  9,  9,  9,  9,  9,  9,  9,  9,  9,  9,  9,  9,  9,  9,  9, ],
            [  9,  9,  9,  9,  9,  9,  9,  9,  9,  9,  9,  9,  9,  9,  9,  9, ],
            [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, ],
            [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, ],
            ], dtype=np.int8)
        pal = tile.get_palette_from_file("test_data/gradient_palette.bin")
        pixels = tile.image_to_indexed_pixels(pal, "test_data/gradient.png", "test_debug.png")
        assert_array_equal(pixels, pixels_expected)


if __name__ == '__main__':
    unittest.main()
