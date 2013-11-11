WIDTH=1920
HEIGHT=1280
TILE_SIZE=320
CC = gcc
CFLAGS = -lm -Wall -Werror -Wextra -pedantic -std=c99 -O3

.PHONY: all clean tiles html

all: mandelbrot

mandelbrot: mandelbrot.c
	$(CC) $(CFLAGS) -o $@ $<

tiles: tiles/Makefile mandelbrot
	$(MAKE) -C tiles

tiles/Makefile: ./tiles.sh
	./tiles.sh $(WIDTH) $(HEIGHT) $(TILE_SIZE)

clean:
	rm mandelbrot
	rm -r tiles
