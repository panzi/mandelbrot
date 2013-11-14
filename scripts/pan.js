var Pan = (function (undefined) {
	"use strict";

	var ANIM_DELAY = 30/1000;
	var HAS_TOUCH = 'ontouchstart' in window && 'createTouch' in document;

	function touchCenter (event) {
		var x = 0;
		var y = 0;
		var touches = event.touches;
		var n = touches.length;
		for (var i = 0; i < n; ++ i) {
			var touch = touches[i];
			x += touch.clientX;
			y += touch.clientY;
		}
		return {clientX: x/n, clientY: y/n};
	}

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
					if (!evt.stopPropagation) evt.stopPropagation = function () {
						this.cancelBubble = true;
					};
					callback.call(element,evt);
				};
			}
			element.attachEvent('on'+eventName, callback._eventHandlerWrapper);
		};
	var off = document.removeEventListener ?
		function (element, eventName, callback) {
			element.removeEventListener(eventName, callback, false);
		} :
		function (element, eventName, callback) {
			element.detachEvent('on'+eventName, callback._eventHandlerWrapper);
		};

	var hasClass, addClass, removeClass;
	if (document.documentElement.classList) {
		hasClass = function (element, className) {
			return element.classList.contains(className);
		};

		addClass = function (element, className) {
			return element.classList.add(className);
		};

		removeClass = function (element, className) {
			return element.classList.remove(className);
		};
	}
	else {
		hasClass = function (element, className) {
			var classNames = element.className.trim().split(/\s+/);
			for (var i = 0; i < classNames.length; ++ i) {
				if (classNames[i] === className) return true;
			}
			return false;
		};

		addClass = function (element, className) {
			element.className += ' '+className;
		};

		removeClass = function (element, className) {
			var classNames = element.className.trim().split(/\s+/);
			var removed = [];
			for (var i = 0; i < classNames.length; ++ i) {
				var thisClassName = classNames[i];
				if (thisClassName !== className) removed.push(thisClassName);
			}
			element.className = removed.join(' ');
		};
	}

	var elementEvents = {
		mousedown: function (event) {
			if (('buttons' in event ?
					!(event.buttons & 1) :
					'which' in event ?
						event.which !== 1 :
						'button' in event ?
							event.button !== 1 :
							false) ||
				event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) {
				return;
			}
			addClass(this,'panning');
			var pos = Pan.position(this);
			var options = this._panning.options;
			var z       = this._panning.zoom;
			var scale   = options.imageSizes[options.imageSizes.length - 1][0] / options.imageSizes[z][0];
			this._panning.start = {x: pos.x + event.clientX*scale, y: pos.y + event.clientY*scale, z: z};

			if (this.requestPointerLock) {
				this.requestPointerLock();
			}
		}
	};

	if (HAS_TOUCH) {
		elementEvents.touchstart = function (event) {
			if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) {
				return;
			}

			addClass(this,'panning');
			var pos = Pan.position(this);
			var options = this._panning.options;
			var z       = this._panning.zoom;
			var scale   = options.imageSizes[options.imageSizes.length - 1][0] / options.imageSizes[z][0];
			var touch   = touchCenter(event);
			this._panning.start = {x: pos.x + touch.clientX*scale, y: pos.y + touch.clientY*scale, z: z};
			this._panning.click = touch;
		};
	}

	if (HAS_TOUCH) {
		/* can't get this to work, so use taps instead
		elementEvents.touchmove = function (event) {
			var zoom = Math.round(Math.log(event.scale) / Math.LN2);
			if (isNaN(zoom) || zoom < 0) {
				zoom = 0;
			}
			else if (zoom >= this._panning.imageSizes.length) {
				zoom = this._panning.imageSizes.length - 1;
			}

			if (event.scale !== 1.0) alert(event.scale);

			var pos = Pan.eventPosition(this,touchCenter(event),zoom);
			pan(this, pos);

			event.preventDefault();
		};
		*/
	}
	else if ('onwheel' in document) {
		elementEvents.wheel = function (event) {
			if (event.deltaY > 0) {
				zoomOut(this,event);
			}
			else if (event.deltaY < 0) {
				zoomIn(this,event);
			}
			event.preventDefault();
			event.stopPropagation();
		};
	}
	else if ('onmousewheel' in document) {
		elementEvents.mousewheel = function (event) {
			var delta = 'wheelDeltaY' in event ? event.wheelDeltaY : event.wheelDelta;
			if (delta < 0) {
				zoomOut(this,event);
			}
			else if (delta > 0) {
				zoomIn(this,event);
			}
			event.preventDefault();
			event.stopPropagation();
		};
	}
	else {
		elementEvents.DOMMouseScroll = function (event) {
			if (event.detail > 0) {
				zoomOut(this,event);
			}
			else if (event.detail < 0) {
				zoomIn(this,event);
			}
			event.preventDefault();
			event.stopPropagation();
		};
	}


	var windowEvents = {
		resize: function (event) {
			for (var i = 0; i < viewers.length; ++ i) {
				var element = viewers[i];
				var panner  = element.querySelector('.panner');
				var pos = Pan.position(element);
				element._panning.size = {width: element.offsetWidth, height: element.offsetHeight};
				pan(element, pos);
			}
		},
		hashchange: function (event) {
			for (var i = 0; i < viewers.length; ++ i) {
				var element = viewers[i];
				var options = element._panning.options;
				if (options.hash) {
					var pos = location.hash.replace(/^#?!/,'').split(',');
					var x = Number(pos[0]);
					var y = Number(pos[1]);
					var z = Math.round(Number(pos[2]));

					if (isNaN(z) || z < 0) {
						z = 0;
					}
					else if (z >= options.imageSizes.length) {
						z = options.imageSizes.length - 1;
					}

					if (isNaN(x) || isNaN(y)) return;

					var curr = Pan.position(element);
					if (curr.x === x && curr.y === y && curr.z === z) return;

					pan(element, {x: x, y: y, z: z});
				}
			}
		}
	};

	if (HAS_TOUCH) {
		windowEvents.touchmove = function (event) {
			var touch = touchCenter(event);
			for (var i = 0; i < viewers.length; ++ i) {
				var element = viewers[i];
				var pos = null;
				if (hasClass(element,'panning')) {
					var options = element._panning.options;
					var z       = element._panning.zoom;
					var scale   = options.imageSizes[options.imageSizes.length - 1][0] / options.imageSizes[z][0];
					var start   = element._panning.start;
					pos = {x: start.x - touch.clientX*scale, y: start.y - touch.clientY*scale, z: z};
				}
				element._panning.moveTo = pos;
				element._panning.click  = null;
			}
			if (moveTimer === null) {
				moveTimer = setTimeout(moveCallback, ANIM_DELAY);
			}
			event.preventDefault();
			event.stopPropagation();
		};

		windowEvents.touchend = function (event) {
			for (var i = 0; i < viewers.length; ++ i) {
				var element = viewers[i];
				removeClass(element,'panning');
				element._panning.start = null;
				if (element._panning.click) {
					var zoom = element._panning.zoom + 1;
					if (zoom >= element._panning.options.imageSizes.length) {
						zoom = 0;
					}
					var pos = Pan.eventPosition(element,element._panning.click,zoom);
					pan(element, pos);
					element._panning.click = null;
				}
			}
			event.preventDefault();
			event.stopPropagation();
		};

		windowEvents.touchcancel = function (event) {
			for (var i = 0; i < viewers.length; ++ i) {
				var element = viewers[i];
				removeClass(element,'panning');
				element._panning.start = null;
				element._panning.click = null;
			}
			event.preventDefault();
			event.stopPropagation();
		};
	}

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
	
	var moveTimer = null;

	function moveCallback () {
		moveTimer = null;
		for (var i = 0; i < viewers.length; ++ i) {
			var element = viewers[i];
			var pos = element._panning.moveTo;
			if (pos) {
				pan(element, pos);
				element._panning.moveTo = null;
			}
		}
	}

	if (!HAS_TOUCH) {
		var documentEvents = {
			mousemove: function (event) {
				var active = false;
				var pointerLockElement =
					document.pointerLockElement ||
					document.webkitPointerLockElement ||
					document.mozPointerLockElement;

				for (var i = 0; i < viewers.length; ++ i) {
					var element = viewers[i];
					var pos = null;
					if (hasClass(element,'panning')) {
						active = true;
						var options = element._panning.options;
						var z       = element._panning.zoom;
						var scale   = options.imageSizes[options.imageSizes.length - 1][0] / options.imageSizes[z][0];
						if (element === pointerLockElement) {
							pos = Pan.position(element);
							pos.x -= (event.movementX || event.webkitMovementX || event.mozMovementX || 0)*scale;
							pos.y -= (event.movementY || event.webkitMovementY || event.mozMovementY || 0)*scale;
						}
						else {
							var start = element._panning.start;
							pos = {x: start.x - event.clientX*scale, y: start.y - event.clientY*scale, z: z};
						}
					}
					element._panning.moveTo = pos;
				}
				if (moveTimer === null) {
					moveTimer = setTimeout(moveCallback, ANIM_DELAY);
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
					removeClass(element,'panning');
					if (element === pointerLockElement) {
						document.exitPointerLock();
						pointerLockElement = null;
					}
					element._panning.start = null;
				}
			},
			pointerlockchange: pointerLockChanged,
			webkitpointerlockchange: pointerLockChanged,
			mozpointerlockchange: pointerLockChanged
		};

		for (var eventName in documentEvents) {
			on(document, eventName, documentEvents[eventName]);
		}
	}

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

	function zoomIn (element,event) {
		var options = element._panning.options;
		var maxZ = options.imageSizes.length - 1;
		if (element._panning.zoom >= maxZ) return;
		var pos = Pan.eventPosition(element,event,element._panning.zoom + 1);
		pan(element, pos);
	}
	
	function zoomOut (element,event) {
		if (element._panning.zoom <= 0) return;
		var pos = Pan.eventPosition(element,event,element._panning.zoom - 1);
		pan(element, pos);
	}

	function pan (element, offset) {
		var options = element._panning.options;
		var z = offset.z;
		if (isNaN(z) || z < 0) {
			z = 0;
		}
		else if (z >= options.imageSizes.length) {
			z = options.imageSizes.length - 1;
		}
		element._panning.zoom = z;
		var tileSize    = options.tileSize;
		var size        = options.imageSizes[z];
		var imageWidth  = size[0];
		var imageHeight = size[1];
		var scale       = options.imageSizes[options.imageSizes.length - 1][0] / imageWidth;
		var pattern     = options.tilePattern;
		var elementSize = element._panning.size;
		var w = elementSize.width;
		var h = elementSize.height;
		var panner = element.querySelector('.panner');

		var whalf = Math.round(w/2);
		var hhalf = Math.round(h/2);
		var xoff = whalf - Math.round(offset.x/scale);
		var yoff = hhalf - Math.round(offset.y/scale);

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

		var fmtargs = {zoom: z};
		for (var j = j0; j < m; ++ j) {
			fmtargs.y = j;
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
			location.hash = '#!'+Math.round((whalf+x)*scale)+','+Math.round((hhalf+y)*scale)+','+z;
		}
	}
	
	var Pan = {
		position: function (element) {
			if (typeof element === 'string') {
				element = document.querySelector(element);
			}
			var panner = element.querySelector('.panner');
			var size = element._panning.size;
			var z = element._panning.zoom;
			var options = element._panning.options;
			var scale = options.imageSizes[options.imageSizes.length - 1][0] / options.imageSizes[z][0];
			var x = (size.width/2  - panner.offsetLeft) * scale;
			var y = (size.height/2 - panner.offsetTop)  * scale;
			return {x: x, y: y, z: z};
		},
		eventPosition: function (element, event, zoom) {
			var rect = element.getBoundingClientRect();
			var x = event.clientX - rect.left;
			var y = event.clientY - rect.top;
			var panner = element.querySelector('.panner');
			var size = element._panning.size;
			var z = element._panning.zoom;
			var options = element._panning.options;
			var imageWidth = options.imageSizes[options.imageSizes.length - 1][0];
			var scale = imageWidth / options.imageSizes[z][0];
			if (x >= 0 && x < element.offsetWidth && y >= 0 && y < element.offsetHeight) {
				var scale2 = imageWidth / options.imageSizes[zoom][0];
				var x2 = (x - panner.offsetLeft) * scale;
				var y2 = (y - panner.offsetTop)  * scale;
				x = x2 + (size.width/2  - x) * scale2;
				y = y2 + (size.height/2 - y) * scale2;
			}
			else {
				x = (size.width/2  - panner.offsetLeft) * scale;
				y = (size.height/2 - panner.offsetTop)  * scale;
			}
			return {x: x, y: y, z: zoom};
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
				size:    {width: element.offsetWidth, height: element.offsetHeight},
				zoom:    0,
				moveTo:  null
			};

			var panner = document.createElement('div');
			panner.className = 'panner';
			panner.style.position = 'absolute';
			panner.style.left = '0';
			panner.style.top = '0';
			element.appendChild(panner);
			var x = NaN, y = NaN, z = 0;
			
			if (options.hash) {
				var pos = location.hash.replace(/^#?!/,'').split(',');
				x = Number(pos[0]);
				y = Number(pos[1]);
				z = Math.round(Number(pos[2]));
			}

			if (isNaN(z) || z < 0) {
				z = 0;
			}
			else if (z >= options.imageSizes.length) {
				z = options.imageSizes.length - 1;
			}

			if (isNaN(x) || isNaN(y)) {
				var size = options.imageSizes[options.imageSizes.length - 1];
				x = Math.round(size[0]/2);
				y = Math.round(size[1]/2);
			}

			element.requestPointerLock =
				element.requestPointerLock ||
				element.webkitRequestPointerLock ||
				element.mozRequestPointerLock;

			pan(element, {x: x, y: y, z: z});
		},
		move: pan,
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

	return Pan;
})();
