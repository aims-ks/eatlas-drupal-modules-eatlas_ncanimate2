// NOTE: "const" doesn't work in IE
var EATLAS_NCANIMATE2_ANCHOR_PAIR_SEPARATOR = ';';
var EATLAS_NCANIMATE2_ANCHOR_VALUE_SEPARATOR = '=';

(function ($) {
	// Initialise the EAtlasNcAnimate2Widgets when the page is ready
	$(document).ready(function() {
		$(".eatlas_ncanimate2_block").each(function(index) {
			var videoSelector = new EAtlasNcAnimate2Widget($(this));
			videoSelector.init();
		});
	});
}(jQuery));

// Allowed characters in anchors:
//   http://tools.ietf.org/html/rfc3986#section-3.5
// Basically, anchors cannot contain #, %, ^, [, ], {, }, \, ", < and >
function eatlas_ncanimate2_craft_anchor(values) {
	var actualValues = eatlas_ncanimate2_get_anchor_values();
	for (var key in values) {
		if (values.hasOwnProperty(key)) {
			actualValues[key] = values[key];
		}
	}

	var anchorArray = [];
	for (var key in actualValues) {
		if (actualValues.hasOwnProperty(key) && actualValues[key] !== null && actualValues[key] !== "") {
			anchorArray.push(
				encodeURIComponent(key) +
				EATLAS_NCANIMATE2_ANCHOR_VALUE_SEPARATOR +
				encodeURIComponent(actualValues[key])
			);
		}
	}

	return anchorArray.join(EATLAS_NCANIMATE2_ANCHOR_PAIR_SEPARATOR);
}

function eatlas_ncanimate2_set_anchor(anchorStr) {
	window.location.hash = '#' + anchorStr;
}

function eatlas_ncanimate2_get_anchor_values() {
	var values = {};

	var hash = window.location.hash;
	if (hash) {
		var anchor = hash.substr(1);
		if (anchor) {
			var keyValuePairs = anchor.split(EATLAS_NCANIMATE2_ANCHOR_PAIR_SEPARATOR);
			for (var i=0; i<keyValuePairs.length; i++) {
				var splitIndex = keyValuePairs[i].indexOf(EATLAS_NCANIMATE2_ANCHOR_VALUE_SEPARATOR);
				if (splitIndex > 1) {
					values[decodeURIComponent(keyValuePairs[i].substring(0, splitIndex))] =
							decodeURIComponent(keyValuePairs[i].substring(splitIndex + 1));
				}
			}
		}
	}

	return values;
}
