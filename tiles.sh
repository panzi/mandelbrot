#!/bin/bash

tile_size=$1

shift

tiles=""
targets=""

mkdir -p tiles

zoom=0
while [ $# -gt 0 ]; do
	declare -a size=($(echo "$1"|tr ',' ' '))
	width=${size[0]}
	height=${size[1]}
	n=$(((width-1)/tile_size))
	m=$(((height-1)/tile_size))

	for i in $(seq 0 $n); do
		for j in $(seq 0 $m); do
			tiles="$tiles tile-$zoom-$j-$i"
		done
	done
	
	for i in $(seq 0 $n); do
		x=$(($i*$tile_size))
		for j in $(seq 0 $m); do
			y=$(($j*$tile_size))

			targets="$targets"$'\n'"tile-$zoom-$j-$i.bmp:"$'\n\t'"../madelbrot $width $height $x $y $tile_size $tile_size"$'\n'
		done
	done

	shift
	zoom=$((zoom+1))
done

cat > tiles/Makefile <<EOF
TILE=$tiles
BMP=\$(patsubst %,%.bmp,\${TILE})
PNG=\$(patsubst %,%.png,\${TILE})

.PHONY: all clean

all: \${PNG}

\${PNG}: %.png: %.bmp
	convert \$< \$@
$targets
clean:
	rm -f$(for tile in $tiles; do printf %s " $tile.bmp $tile.png"; done)
EOF
