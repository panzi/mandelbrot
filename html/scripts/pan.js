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
			this.classList.add('panning');
			var panner = this.querySelector('.panner');
			this._panningStart = {x: event.pageX - panner.offsetLeft, y: event.pageY - panner.offsetTop};
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
			for (var i = 0; i < viewers.length; ++ i) {
				var element = viewers[i];
				if (element.classList.contains('panning')) {
					active = true;
					var options = element._panningOptions;
					var start = element._panningStart;
					pan(element, {x: event.pageX - start.x, y: event.pageY - start.y}, options);
				}
			}
			if (active) {
				event.preventDefault();
				event.stopPropagation();
			}
		},
		mouseup: function (event) {
			for (var i = 0; i < viewers.length; ++ i) {
				var element = viewers[i];
				element.classList.remove('panning');
			}
		},
		resize: function (event) {
			for (var i = 0; i < viewers.length; ++ i) {
				var element = viewers[i];
				var panner = element.querySelector('.panner');
				var options = element._panningOptions;
				pan(element, {x: panner.offsetLeft, y: panner.offsetTop}, options);
			}
		}
	};
			
	for (var eventName in windowEvents) {
		on(window, eventName, windowEvents[eventName]);
	}

	var viewers = [];

	var Pan = {
		create: function (element, options) {
			if (typeof element === 'string') {
				element = document.querySelector(element);
			}

			for (var eventName in elementEvents) {
				on(element, eventName, elementEvents[eventName]);
			}

			viewers.push(element);

			element._panningOptions = options;

			var panner = document.createElement('div');
			panner.className = 'panner';
			panner.style.position = 'absolute';
			panner.style.left = '0';
			panner.style.top = '0';
			element.appendChild(panner);
			element._panningImages = {};

			pan(element, {x: 0, y: 0}, options);
		},
		destroy: function (element) {
			if (typeof element === 'string') {
				element = document.querySelector(element);
			}
			
			for (var eventName in elementEvents) {
				off(element, eventName, elementEvents[eventName]);
			}

			element.innerHTML = '';
			element._panningImages = null;
			element._panningOptions = null;
			element._panningStart = null;

			var index = viewers.indexOf(element);
			if (index > -1) {
				viewers.splice(index, 1);
			}
		}
	};

	function pan(element, offset, options) {
		var tileSize    = options.tileSize;
		var imageWidth  = options.imageWidth;
		var imageHeight = options.imageHeight;
		var pattern     = options.tilePattern;
		var w = element.offsetWidth;
		var h = element.offsetHeight;
		var panner = element.querySelector('.panner');

		var xoff = w < imageWidth ? 
			Math.min(Math.max(offset.x, w - imageWidth), 0) :
			Math.min(Math.max(offset.x, 0), w - imageWidth);
			
		var yoff = h < imageHeight ? 
			Math.min(Math.max(offset.y, h - imageHeight), 0) :
			Math.min(Math.max(offset.y, 0), h - imageHeight);

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

		var n = Math.min(xEnd,imageWidth)/tileSize;
		var m = Math.min(yEnd,imageHeight)/tileSize;

		var imgs = element._panningImages;
		var tagged = {};

		for (var j = j0; j < m; ++ j) {
			for (var i = i0; i < n; ++ i) {
				var src = pattern.replace('{x}',i).replace('{y}',j);
				tagged[src] = true;
				if (!imgs.hasOwnProperty(src)) {
					var img = new Image();
					img.src = src;
					img.style.position = 'absolute';
					img.style.width  = tileSize+'px';
					img.style.height = tileSize+'px';
					img.style.left   = (i*tileSize)+'px';
					img.style.top    = (j*tileSize)+'px';
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

		element._panningImages = filtered;
	}

	return Pan;
})();

window.panCounter = 0;
