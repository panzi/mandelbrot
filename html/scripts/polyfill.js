(function (undefined) {
	"use strict";

	function shim (dst, src) {
		for (var name in src) {
			if (!(name in dst)) {
				dst[name] = src[name];
			}
		}
		return dst;
	}

	shim(String.prototype, {
		trim: function () {
			return this.replace(/^\s+/,'').replace(/\s+$/,'');
		}
	});

	shim(Array.prototype, {
		map: function (f) {
			var list = new Array(this.length);
			for (var i = 0; i < this.length; ++ i) {
				if (i in this) {
					list[i] = f.call(this, this[i], i, this);
				}
			}
			return list;
		}
	});
})();
