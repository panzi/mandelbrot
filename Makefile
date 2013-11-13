SIZES=960,540 1920,1080 3840,2160 7680,4320 15360,8640 30720,17280 61440,34560
TILE_SIZE=320
CC=gcc
CFLAGS=-lm -Wall -Werror -Wextra -pedantic -std=c99 -O3
JAVASCRIPT=viewer/scripts/polyfill.js viewer/scripts/pan.js

.PHONY: all clean tiles viewer

all: mandelbrot

mandelbrot: mandelbrot.c
	$(CC) $(CFLAGS) -o $@ $<

tiles: tiles/Makefile mandelbrot
	$(MAKE) -C tiles

viewer: viewer/index.html viewer/styles/pan.css $(JAVASCRIPT) tiles
	mkdir -p viewer/tiles
	$(MAKE) -C tiles viewer

viewer/styles/pan.css: html/styles/pan.css
	mkdir -p viewer/styles
	cp html/styles/pan.css viewer/styles/pan.css

$(JAVASCRIPT): viewer/scripts/%: html/scripts/%
	mkdir -p viewer/scripts
	cp $< $@

viewer/index.html: html/index.html.in Makefile
	mkdir -p viewer
	SIZES="$(SIZES)" TILE_SIZE="$(TILE_SIZE)" ./expand.py html/index.html.in viewer/index.html

tiles/Makefile: ./tiles.py
	./tiles.py $(TILE_SIZE) $(SIZES)

clean:
	rm mandelbrot
	rm -r tiles
	rm -r viewer
