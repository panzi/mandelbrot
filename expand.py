#!/usr/bin/env python

import sys, os, re
from functools import wraps

def subst(pat):
	if isinstance(pat,str):
		pat = re.compile(pat)
	def _subst(f):
		@wraps(f)
		def _f(s,*args,**kwargs):
			i = 0
			buf = []
			while True:
				m = pat.search(s, i)
				if not m:
					buf.append(s[i:])
					break
				start = m.start()
				if start > i:
					buf.append(s[i:start])
				buf.append(f(m.group(0),*(m.groups()+args),**kwargs))
				i = m.end()
			return ''.join(buf)
		return _f
	return _subst

@subst(r'@(\w+)@')
def expand(_,key,variables):
	return variables.get(key,'')


def main(infile,outfile):
	with open(infile,"r") as fp:
		s = fp.read()

	s = expand(s,os.environ)

	with open(outfile,"w") as fp:
		fp.write(s)

if __name__ == '__main__':
	main(sys.argv[1],sys.argv[2])
