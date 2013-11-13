SIZES=960,540 1920,1080 3840,2160 7680,4320 15360,8640 30720,17280
TILE_SIZE=320
CC=gcc
CFLAGS=-lm -Wall -Werror -Wextra -pedantic -std=c99 -O3

.PHONY: all clean tiles viewer

all: mandelbrot

mandelbrot: mandelbrot.c
	$(CC) $(CFLAGS) -o $@ $<

tiles: tiles/Makefile mandelbrot
	$(MAKE) -C tiles

# TODO: make this more precise
viewer: viewer/index.html tiles
	cp -r html/styles html/scripts viewer
	mkdir -p viewer/tiles
	cp tiles/*.png viewer/tiles

viewer/index.html: html/index.html.in Makefile
	mkdir -p viewer
	SIZES="$(SIZES)" TILE_SIZE="$(TILE_SIZE)" ./expand.py html/index.html.in viewer/index.html

tiles/Makefile: ./tiles.py
	./tiles.py $(TILE_SIZE) $(SIZES)

clean:
	rm mandelbrot
	rm -r tiles
	rm -r viewer
