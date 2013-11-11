/*

The MIT License (MIT)

Copyright (c) 2013 went.out

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

var render = (function () {

	var helpers = {
		upper: function (str) {
			return str.toUpperCase();
		},
		lower: function (str) {
			return str.toLowerCase();
		},
		escape: function (str) {
			return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
		},
		trim: (function () {
			if (String.prototype.trim) {
				return function (str) {
					return str.trim ();
				};
			} else {
				return function (str) {
					return str.replace(/^\s+|\s+$/g, '');
				};
			}
		}()),
		capitalize: function (str) {
			var split = str.split(' ');
			var len = split.length;
			var arr = [];
			for (var i = 0; i < len; i++) {
				var el = split[i];
				if (el[0]) {
					arr.push ( el[0].toUpperCase() + el.slice(1) );
				} else {
					arr.push ('');
				}
			}
			return arr.join(' ');
		}
	},
	deeps = function (obj, val) {
		var hs = val.split('.');
		var len = hs.length;
		var deep;
		var num = 0;
		for (var i = 0; i < len; i++) {
			var el = hs[i];
			if (deep) {
				if (deep[el]) {
					deep = deep[el];
					num++;
				}
			} else {
				if (obj[el]) {
					deep = obj[el];
					num++;
				}
			}
		}
		if (num == len) {
			return deep;
		} else {
			return undefined;
		}
	},
	parseStar = function ( part, current, obj ) {

		var str = '';

		// FIX: Quantificator is too greedy
		var ptn = /\{\{\s*.+?\s*\}\}/g;

		var parts = part.split (ptn);
		var matches = part.match (ptn);

		str += parts[0];

		if (matches) {
			var len = matches.length;
			for (var i = 0; i < len; i++) {
				var match = matches [i];
				var elem = match.replace(/^\{\{\s*|\s*\}\}$/g, '').split(':');
				var el = elem[0];
				var strel = '';

				if (el[0] == '.') {
					if (el.length > 1) {
						strel += deeps( current, el.slice(1) );
					} else {
						strel += current;
					}
				} else {
					var deep = deeps( current, el );
					if ( (typeof deep) == 'function' ){
						strel += deep (obj, current);
					} else {
						deep && ( strel += deep );
					}
				}
				if ( (strel == '') && (match.indexOf ('default') > (-1)) ) {
					strel = match.replace (/^[^]*\(\s*|\s*\)[^]*$/g, '');
				}
				var eln = elem.length;
				if (eln > 1) {
					for (var k = 1; k < eln; k++) {
						var fn = elem[k];
						if (helpers[fn]) {
							strel = helpers[fn] (strel);
						} else {
							continue;
						}
					}
				}

				str += strel;

			}
			if (len > 0) {
				str += parts[ len ];
			}
		}

		return str;
	},

	parseBlocks = function ( blocks, stars, currt, obj ) {

		var len = blocks.length;
		for (var i = 0; i < len; i++) {
			
			var block = blocks [i];

			if (block.cnt) {
				var current = block.cnt;
				if (block.sub) {
					current = currt || block.cnt;
				}

				switch ( Object.prototype.toString.call( current ) ) {
					case '[object Array]':
						var len1 = current.length;
						for ( var k = 0; k < len1; k++ ) {
							stars.push ( [ block.be4e, current[k] ] );
							parseBlocks( block.nest, stars, current[k], obj );
						}
						break;
					case '[object Object]':
						for (var k in current) {
							if (current.hasOwnProperty(k)) {
								stars.push ( [ block.be4e, current[k] ] );
								parseBlocks( block.nest, stars, current[k], obj );
							}
						}
						break;
					default:
						if ( (typeof current) == 'function' ){
							stars.push ( [ block.be4e, maker ] );
							var maker = current (block, obj, blocks, stars, currt);
							if (maker !== undefined) {
								parseBlocks( block.nest, stars, maker, obj );
							}
						} else {
							stars.push ( [ block.be4e, current ] );
							parseBlocks( block.nest, stars, undefined, obj );
						}
				}

				stars.push ( [ block.af3e.str, block.af3e.cnt ] );
			}

		}

	};


	return function (tpl, obj) {

		// to  cut the comments
		tpl = tpl.replace ( /\{#[^]*#\}/g, '' );
		
		// split & blocks
		// FIX: Quantificator is too greedy
		var ptn = /\{\%\s*[a-zA-Z0-9._/:-]+?\s*\%\}/g;
		var parts = tpl.split (ptn);
		var matches = tpl.match (ptn);

		// statring
		var stars = [ [ parts[0], obj ] ];

		var blocks = [];
		var curnt = [];
		var pstr = [];
		
		if( matches ){

			var len = matches.length;
			for ( var i = 0; i < len; i++ ) {

				var str = matches[i].replace (/^\{\%\s*|\s*\%\}$/g, '');

				var cln = curnt.length;
				
				if (str === '/') {

					curnt [cln - 1].af3e = {
						cnt: ( curnt [ cln - 2 ] ?  curnt [ cln - 2 ].cnt : obj ),
						str: parts[ i + 1 ]
					};
					curnt.pop();

				} else {

					var currt = obj;
					var sub = false;

					if (str === '.') {
						sub = true;
						if (cln > 0) {
							currt = curnt[cln - 1].cnt;
						} else {
							/// wow wow wow, bad bad bad ! 
							currt = obj;
						}
					} else {
						currt = deeps( obj, str );
					}

					var struct = {

						cnt: currt,
						sub: sub,
						nest: [],
						be4e: parts[ i + 1 ],
						af3e: {
							cnt: null,
							str: ''
						}

					};

					if (cln == 0) {
						
						blocks.push ( struct );
						curnt.push ( struct );

					} else {

						curnt[cln - 1].nest.push ( struct );
						var last = curnt[cln - 1].nest.length - 1;
						curnt.push ( curnt[cln - 1].nest [ last ] );

					}

				}

			};

			parseBlocks( blocks, stars, undefined, obj );

			var len = stars.length;
			for ( var i = 0; i < len; i++ ) {
				pstr.push( parseStar ( stars[i][0], stars[i][1], obj ) );
			}

		} else {
			
			pstr.push( parseStar ( tpl, obj, obj ) );

		}

		return pstr.join('');

	};

})();