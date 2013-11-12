WIDTH=30720
HEIGHT=17280
#SIZES=30720 17280
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

viewer/index.html: html/index.html.in
	mkdir -p viewer
	cat $< | \
		replace @TILE_SIZE@ $(TILE_SIZE) | \
		replace @WIDTH@ $(WIDTH) | \
		replace @HEIGHT@ $(HEIGHT) > $@

tiles/Makefile: ./tiles.sh
	./tiles.sh $(WIDTH) $(HEIGHT) $(TILE_SIZE)

clean:
	rm mandelbrot
	rm -r tiles
	rm -r viewer
