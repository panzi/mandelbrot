#!/bin/bash

width=$1
height=$2
tile_size=$3
n=$(($width/$tile_size-1))
m=$(($height/$tile_size-1))

mkdir -p tiles

{
	printf 'TILE='
	for i in $(seq 0 $n); do
		for j in $(seq 0 $m); do
			printf ' tile-1-%d-%d' $i $j
		done
	done
	echo

	echo 'BMP=$(patsubst %,%.bmp,${TILE})'
	echo 'PNG=$(patsubst %,%.png,${TILE})'
	echo

	echo '.PHONY: all clean'
	echo

	echo 'all: ${PNG}'
	echo

	echo '${PNG}: %.png: %.bmp'
	echo '	convert $< $@'
	echo

	for i in $(seq 0 $n); do
		x=$(($i*$tile_size))
		for j in $(seq 0 $m); do
			y=$(($j*$tile_size))
			printf 'tile-1-%d-%d.bmp:\n\t../mandelbrot %d %d $@ %d %d %d %d\n\n' \
				$i $j $width $height $x $y $tile_size $tile_size
		done
	done

	echo 'clean:'
	printf '\trm -f'
	for i in $(seq 0 $n); do
		for j in $(seq 0 $m); do
			printf ' tile-1-%d-%d.png tile-1-%d-%d.bmp' $i $j $i $j
		done
	done
	echo
} > tiles/Makefile
