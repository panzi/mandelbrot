#include <stdlib.h>
#include <stdio.h>
#include <stdio.h>
#include <complex.h>

double complex Y(double complex V, double complex B, double complex c) {
	return (cabs(V) < 6) ?
		(c ? Y(V*V + B, B, c-1) : c) :
		(2 + c - 4 * cpow(cabs(V), -0.4)) / 255;
}

int main(int argc, char *argv[]) {
	if (argc < 4) return 1;
	unsigned int w = strtoul(argv[1],NULL,10), h = strtoul(argv[2],NULL,10), X, A,
		x1 = 0, x2 = w, y1 = 0, y2 = h, x, y, iw = w, ih = h;
	if (!w || w >= 0xffff || w % 4 != 0) {
		fprintf(stderr,"illegal width: %s\n", argv[1]);
		return 1;
	}
	if (!h || h >= 0xffff) {
		fprintf(stderr,"illegal height: %s\n", argv[2]);
		return 1;
	}
	if (argc >= 8) {
		x1 = strtoul(argv[4],NULL,10);
		y1 = strtoul(argv[5],NULL,10);
		iw = strtoul(argv[6],NULL,10);
		ih = strtoul(argv[7],NULL,10);
		x2 = x1 + iw;
		y2 = y1 + ih;
	}
	unsigned int S = (iw*ih)*3+26;
	FILE *f = fopen(argv[3],"wb");
	if (!f) {
		perror(argv[3]);
		return 1;
	}
	char buf[] = {66,77,S&255,(S>>8)&255,(S>>16)&255,S>>24,0,0,0,0,26,0,0,0,12,0,0,0,iw&255,iw>>8,ih&255,ih>>8,1,0,24,0};
	fwrite(buf,26,1,f);
	for (y = y2; y > y1;) {
		-- y;
		for (x = x1; x < x2; ++ x) {
			X = (h - y - 1) * w + x;

			double complex T = 0, t;
			for (A = 0; A < 9; ++ A) {
				t = Y(0,(A % 3 / 3. + X % w + (X/w + A/3/3. - h/2) / 1*I) * 2.5 / h - 2.7, 255);
				T += t*t;
			}
			T /= 9;
			buf[0] = T * 80 + cpow(T,9) * 255 - 950 * cpow(T,99);
			buf[1] = T * 70 - 880 * cpow(T,18) + 701 * cpow(T,9);
			buf[2] = T * cpow(255,(1 - cpow(T,45) * 2));
			fwrite(buf,3,1,f);
		}
	}
	fclose(f);
	return 0;
}
