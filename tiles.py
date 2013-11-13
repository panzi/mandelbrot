#!/usr/bin/env python

import sys, os

def tiles(fp,tile_size,sizes):
	tiles = []

	for zoom, (width, height) in enumerate(sizes):
		n = 1 + (width  - 1) // tile_size
		m = 1 + (height - 1) // tile_size

		for i in xrange(n):
			for j in xrange(m):
				tiles.append("tile-%d-%d-%d" % (zoom, j, i))

	fp.write("""\
TILE=%s
BMP=$(patsubst %%,%%.bmp,$(TILE))
PNG=$(patsubst %%,%%.png,$(TILE))

.PHONY: all clean viewer

all: $(PNG)

viewer: $(patsubst %%,../viewer/tiles/%%,$(PNG))

$(PNG): %%.png: %%.bmp
	convert $< $@
""" % ' '.join(tiles))

	for zoom, (width, height) in enumerate(sizes):
		n = 1 + (width  - 1) // tile_size
		m = 1 + (height - 1) // tile_size
				
		for i in xrange(n):
			x = i * tile_size
			for j in xrange(m):
				y = j * tile_size
				fp.write("""
tile-%d-%d-%d.bmp:
	../mandelbrot %d %d $@ %d %d %d %d
""" % (zoom, j, i, width, height, x, y, tile_size, tile_size))

	fp.write("""
clean:
	rm -f %s
""" % ' '.join("%s.bmp %s.png" % (tile, tile) for tile in tiles))


def main(args):
	tile_size = int(args[0])
	sizes = [tuple(map(int,arg.split(','))) for arg in args[1:]]
	if not os.path.exists("tiles"):
		os.mkdir("tiles")
	with open("tiles/Makefile","w") as fp:
		tiles(fp,tile_size,sizes)

if __name__ == '__main__':
	main(sys.argv[1:])
