var Pan = (function (undefined) {
	"use strict";

	var on = document.addEventListener ?
		function (element, eventName, callback) {
			element.addEventListener(eventName, callback, false);
		} :
		function (element, eventName, callback) {
			if (!callback._eventHandlerWrapper) {
				callback._eventHandlerWrapper = function () {
					var evt = window.event;
					if (!evt.preventDefault) evt.preventDefault = function () {
						this.returnValue = false;
					};
					if (!evt.preventDefault) evt.stopPropagation = function () {
						this.cancelBubble = true;
					};
					callback(evt);
				};
			}
			elment.attachEvent('on'+eventName, callback._eventHandlerWrapper);
		};
	var off = document.removeEventListener ?
		function (element, eventName, callback) {
			element.removeEventListener(eventName, callback, false);
		} :
		function (element, eventName, callback) {
			elment.detachEvent('on'+eventName, callback._eventHandlerWrapper);
		};

	// TODO: support touch
	var elementEvents = {
		mousedown: function (event) {
			if (('buttons' in event && event.buttons !== 1) ||
				('which' in event && event.which !== 1) ||
				event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) {
				return;
			}
			this.classList.add('panning');
			var pos = Pan.position(this);
			this._panning.start = {x: pos.x + event.pageX, y: pos.y + event.pageY};

			if (this.requestPointerLock) {
				this.requestPointerLock();
			}
		},
		DOMScroll: function (event) {
			event.preventDefault();
			event.stopPropagation();
		},
		wheel: function (event) {
			event.preventDefault();
			event.stopPropagation();
		}
	};

	var windowEvents = {
		mousemove: function (event) {
			var active = false;
			var pointerLockElement =
				document.pointerLockElement ||
				document.webkitPointerLockElement ||
				document.mozPointerLockElement;

			for (var i = 0; i < viewers.length; ++ i) {
				var element = viewers[i];
				if (element.classList.contains('panning')) {
					active = true;
					var options = element._panning.options;
					if (element === pointerLockElement) {
						var pos = Pan.position(element);
						var dx = event.movementX || event.webkitMovementX || event.mozMovementX || 0;
						var dy = event.movementY || event.webkitMovementY || event.mozMovementY || 0;

						pan(element, {x: pos.x - dx, y: pos.y - dy}, options);
					}
					else {
						var start = element._panning.start;
						pan(element, {x: start.x - event.pageX, y: start.y - event.pageY}, options);
					}
				}
			}
			if (active) {
				event.preventDefault();
				event.stopPropagation();
			}
		},
		mouseup: function (event) {
			var pointerLockElement =
				document.pointerLockElement ||
				document.webkitPointerLockElement ||
				document.mozPointerLockElement;

			for (var i = 0; i < viewers.length; ++ i) {
				var element = viewers[i];
				element.classList.remove('panning');
				if (element === pointerLockElement) {
					document.exitPointerLock();
					pointerLockElement = null;
				}
			}
		},
		resize: function (event) {
			for (var i = 0; i < viewers.length; ++ i) {
				var element = viewers[i];
				var panner  = element.querySelector('.panner');
				var options = element._panning.options;
				var pos = Pan.position(element);
				element._panning.size = {width: element.offsetWidth, height: element.offsetHeight};
				pan(element, pos, options);
			}
		},
		hashchange: function (event) {
			for (var i = 0; i < viewers.length; ++ i) {
				var element = viewers[i];
				var options = element._panning.options;
				if (options.hash) {
					var pos = location.hash.replace(/^#?!/,'').split(',');
					var x = parseInt(pos[0],10);
					var y = parseInt(pos[1],10);

					if (isNaN(x) || isNaN(y)) return;

					var curr = Pan.position(element);
					if (curr.x === x && curr.y === y) return;

					pan(element, {x: x, y: y}, options);
				}
			}
		}
	};
			
	for (var eventName in windowEvents) {
		on(window, eventName, windowEvents[eventName]);
	}

	var pointerLocked = false;
	var viewers = [];

	function pointerLockChanged (event) {
		var element =
			document.pointerLockElement ||
			document.webkitPointerLockElement ||
			document.mozPointerLockElement;

		pointerLocked = false;
		for (var i = 0; i < viewers.length; ++ i) {
			if (viewer[i] === element) {
				pointerLocked = true;
				break;
			}
		}
	}

	document.exitPointerLock =
		document.exitPointerLock ||
		document.mozExitPointerLock ||
		document.webkitExitPointerLock;

	on(document, 'pointerlockchange', pointerLockChanged);
	on(document, 'webkitpointerlockchange', pointerLockChanged);
	on(document, 'mozpointerlockchange', pointerLockChanged);

	var Pan = {
		position: function (element) {
			if (typeof element === 'string') {
				element = document.querySelector(element);
			}
			var panner = element.querySelector('.panner');
			var size = element._panning.size;
			var x = -panner.offsetLeft + Math.round(size.width/2);
			var y = -panner.offsetTop  + Math.round(size.height/2);
			return {x: x, y: y};
		},
		create: function (element, options) {
			if (typeof element === 'string') {
				element = document.querySelector(element);
			}

			for (var eventName in elementEvents) {
				on(element, eventName, elementEvents[eventName]);
			}

			viewers.push(element);

			element._panning = {
				options: options,
				images:  {},
				size:    {width: element.offsetWidth, height: element.offsetHeight}
			};

			var panner = document.createElement('div');
			panner.className = 'panner';
			panner.style.position = 'absolute';
			panner.style.left = '0';
			panner.style.top = '0';
			element.appendChild(panner);
			var x = NaN, y = NaN;
			
			if (options.hash) {
				var pos = location.hash.replace(/^#?!/,'').split(',');
				x = parseInt(pos[0],10);
				y = parseInt(pos[1],10);
			}

			if (isNaN(x) || isNaN(y)) {
				x = Math.round(options.imageWidth/2);
				y = Math.round(options.imageHeight/2);
			}

			element.requestPointerLock =
				element.requestPointerLock ||
				element.webkitRequestPointerLock ||
				element.mozRequestPointerLock;

			pan(element, {x: x, y: y}, options);
		},
		destroy: function (element) {
			if (typeof element === 'string') {
				element = document.querySelector(element);
			}
			
			for (var eventName in elementEvents) {
				off(element, eventName, elementEvents[eventName]);
			}

			element.innerHTML = '';
			element._panning = null;

			var index = viewers.indexOf(element);
			if (index > -1) {
				viewers.splice(index, 1);
			}
		}
	};

	function format (fmt, map) {
		var args = arguments;
		var index = 1;
		return fmt.replace(/\{[^\{\}]*\}|\{\{|\}\}|\{|\}/g, function (found) {
			switch (found) {
				case '{{': return '{';
				case '}}': return '}';
				case '{': throw new SyntaxError("Single '{' encountered in format string");
				case '}': throw new SyntaxError("Single '}' encountered in format string");
				default:
					var key = found.slice(1,found.length-1);
					if (key) return map[key];
					return args[index ++];
			}
		});
	}

	function pan(element, offset, options) {
		var tileSize    = options.tileSize;
		var imageWidth  = options.imageWidth;
		var imageHeight = options.imageHeight;
		var pattern     = options.tilePattern;
		var size = element._panning.size;
		var w = size.width;
		var h = size.height;
		var panner = element.querySelector('.panner');

		var whalf = Math.round(w/2);
		var hhalf = Math.round(h/2);
		var xoff = whalf - offset.x;
		var yoff = hhalf - offset.y;

		xoff = w < imageWidth ?
			Math.min(Math.max(xoff, w - imageWidth), 0) :
			Math.min(Math.max(xoff, 0), w - imageWidth);
			
		yoff = h < imageHeight ?
			Math.min(Math.max(yoff, h - imageHeight), 0) :
			Math.min(Math.max(yoff, 0), h - imageHeight);

		panner.style.left = xoff + 'px';
		panner.style.top  = yoff + 'px';

		var x = -xoff;
		var y = -yoff;
		var xStart = x - x % tileSize;
		var yStart = y - y % tileSize;
		var xEnd = x + w;
		var yEnd = y + h;

		xEnd = xEnd - xEnd % tileSize + tileSize;
		yEnd = yEnd - yEnd % tileSize + tileSize;

		var i0 = Math.max(xStart / tileSize, 0);
		var j0 = Math.max(yStart / tileSize, 0);

		var n = Math.ceil(Math.min(xEnd,imageWidth)/tileSize);
		var m = Math.ceil(Math.min(yEnd,imageHeight)/tileSize);

		var imgs = element._panning.images;
		var tagged = {};

		for (var j = j0; j < m; ++ j) {
			var fmtargs = {y: j};
			for (var i = i0; i < n; ++ i) {
				fmtargs.x = i;
				var src = format(pattern, fmtargs);
				tagged[src] = true;
				if (!imgs.hasOwnProperty(src)) {
					var img  = new Image();
					var imgx = i*tileSize;
					var imgy = j*tileSize;
					img.src  = src;
					img.style.position = 'absolute';
					img.style.width  = Math.min(tileSize,imageWidth  - imgx)+'px';
					img.style.height = Math.min(tileSize,imageHeight - imgy)+'px';
					img.style.left   = imgx+'px';
					img.style.top    = imgy+'px';
					img.draggable    = false;
					panner.appendChild(img);
					imgs[src] = img;
				}
			}
		}

		var filtered = {};
		for (var src in imgs) {
			var img = imgs[src];
			if (tagged[src] !== true) {
				panner.removeChild(img);
			}
			else {
				filtered[src] = img;
			}
		}

		element._panning.images = filtered;

		if (options.hash) {
			location.hash = '#!'+(whalf+x)+','+(hhalf+y);
		}
	}

	return Pan;
})();

window.panCounter = 0;
