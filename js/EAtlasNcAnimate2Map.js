// Class
function EAtlasNcAnimate2Map(htmlBlockElement, videoSelector) {
    this.blk = htmlBlockElement;
    this.videoSelector = videoSelector;
    this.mapImg = null;
    this.canvas = null;
    this.htmlRegionList = null;
    this.context = null;
    this.width = null;
    this.height = null;
    this.hoverRegion = null;
    this.selectedRegion = null;

    this.orderedRegions = null;
    this.regionCache = {};

    this.mapBBox = null;

    this.regionCatalogue = null;
}

EAtlasNcAnimate2Map.prototype.selectRegion = function(region) {
    if (region && region !== this.selectedRegion) {
        this.selectedRegion = region;
        this.redraw();
    }
};

EAtlasNcAnimate2Map.prototype.load = function(regionCatalogue) {
    this.regionCatalogue = regionCatalogue;
    this.canvas = this.blk.find('.regionCanvas');
    this.htmlRegionList = this.blk.find('.regionList');
    this.context = null;
    if (this.canvas && this.canvas.get(0) && this.canvas.get(0).getContext) {
        this.context = this.canvas.get(0).getContext('2d');
    }

    var mapUrl = this.getMapURL();
    if (mapUrl) {
        this.mapImg = new Image();
        this.mapImg.onload = (function(that) {
            return function() {
                // Save the real image dimenssion as returned by the server.
                // NOTE: "this" refer to the loaded image.
                if (this.width && this.height) {
                    that.width = this.width;
                    that.height = this.height;
                }

                that.loadMap();
            }
        })(this);

        this.mapImg.src = mapUrl;
    } else {
        this.loadMap();
    }
};

EAtlasNcAnimate2Map.prototype.loadMap = function() {
    var width = this.getMapWidth(),
        height = this.getMapHeight();

    // Resize the canvas to match the image size (without stretching it)
    if (this.context) {
        this.context.canvas.width = width;
        this.context.canvas.height = height;
    }

    this.loadRegionCache();
    this.populateHTMLRegionList();
    this.redraw();

    this.canvas.mousemove((function(that) {
        return function(e) {
            var rect = this.getBoundingClientRect(),
                x = e.clientX - rect.left,
                y = e.clientY - rect.top;

            var hoverRegion = that.getRegionId(x, y);
            if (hoverRegion !== that.hoverRegion) {
                // Focusing on the text trigger the highlight on the corresponding map region
                if (hoverRegion) {
                    var x = window.scrollX, y = window.scrollY;
                    that.htmlRegionList.find("a." + hoverRegion).focus();

                    // Reset the page scroll to prevent "focus" from scrolling the page
                    // when the focused element is out of view.
                    // This might not work with all browsers (*cough* internet explorer *cough*)
                    // but it should work with all modern browsers.
                    // NOTE: IE do NOT support scrollX and scrollY.
                    if (!isNaN(x) && !isNaN(y)) {
                        window.scrollTo(x, y);
                    }
                } else {
                    that.htmlRegionList.find("a").focusout();
                }
            }
        };
    })(this));

    this.canvas.click((function(that) {
        return function(e) {
            var rect = this.getBoundingClientRect(),
                x = e.clientX - rect.left,
                y = e.clientY - rect.top;

            var clickedRegion = that.getRegionId(x, y);
            if (clickedRegion != null) {
                // Fix URL
                eatlas_ncanimate2_set_anchor(
                    eatlas_ncanimate2_craft_anchor({"region": clickedRegion})
                );
                // Highlight region in the map and the region list
                that.selectRegion(clickedRegion);
                // Load the video
                that.videoSelector.changeRegion(clickedRegion);
            }
        };
    })(this));

    this.canvas.mouseleave((function(that) {
        return function(e) {
            that.htmlRegionList.find("a").focusout();
        };
    })(this));
};

EAtlasNcAnimate2Map.prototype.mergeBBox = function(bbox1, bbox2) {
    if (bbox1 === null) {
        if (bbox2 === null) {
            return null;
        }
        return {
            'north': bbox2.north,
            'east':  bbox2.east,
            'south': bbox2.south,
            'west':  bbox2.west
        }
    }
    if (bbox2 === null) {
        return {
            'north': bbox1.north,
            'east':  bbox1.east,
            'south': bbox1.south,
            'west':  bbox1.west
        }
    }

    return {
        'north': Math.max(bbox1.north, bbox2.north),
        'east':  Math.max(bbox1.east, bbox2.east),
        'south': Math.min(bbox1.south, bbox2.south),
        'west':  Math.min(bbox1.west, bbox2.west)
    };
};

/*
 * URL place holders:
 *   Bounding box, in degree
 *     - ${NORTH}
 *     - ${EAST}
 *     - ${SOUTH}
 *     - ${WEST}
 *   Image dimensions, in pixels
 *     - ${WIDTH}
 *     - ${HEIGHT}
 */
EAtlasNcAnimate2Map.prototype.getMapURL = function() {
    var mapBBox = this.getMapBBox(),
        width = this.getMapWidth(),
        height = this.getMapHeight();

    // Get the map URL as specified in the Drupal module configuration.
    var mapUrl = this.canvas.attr('mapurl');

    // Map URL used for debugging
    //mapUrl = "http://maps.eatlas.org.au/maps/wms?LAYERS=ea-be%3AWorld_Bright-Earth-e-Atlas-basemap_No-Labels-hillshading&TRANSPARENT=FALSE&VERSION=1.1.1&SERVICE=WMS&REQUEST=GetMap&STYLES=&FORMAT=image%2Fjpeg&SRS=EPSG%3A4326&BBOX=${WEST},${SOUTH},${EAST},${NORTH}&WIDTH=${WIDTH}&HEIGHT=${HEIGHT}";
    //mapUrl = "http://maps.eatlas.org.au/maps/ea/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&LAYERS=ea%3AGBR_GBRMPA_GBR-features,ea%3AGBR_e-Atlas-GBRMPA_GBRMP-bounds_Ocean-bounds,ea%3AGBR_NERP-TE-13-1_eAtlas_NRM-Regions-GBRMP-2012&STYLES=GBR-features_Outlook,Polygon_Outline-Red,GBR_NRM-Regions-GBRMP_Mainland-border&SRS=EPSG%3A4326&WIDTH=${WIDTH}&HEIGHT=${HEIGHT}&BBOX=${WEST},${SOUTH},${EAST},${NORTH}";

    if (!mapUrl || !mapBBox || !width || !height) {
        return null;
    }

    // Replace placeholders
    return mapUrl
        .replace('${NORTH}',  mapBBox.north)
        .replace('${EAST}',   mapBBox.east)
        .replace('${SOUTH}',  mapBBox.south)
        .replace('${WEST}',   mapBBox.west)
        .replace('${WIDTH}',  width)
        .replace('${HEIGHT}', height);
};

EAtlasNcAnimate2Map.prototype.getRegionId = function(x, y) {
    // When the image is resized (due to maxWidth: 100%),
    //   the coordinate needs to be stretch to represent
    //   the coordinate on the original sized image.
    var width = this.getMapWidth(),
        resizeRatio = width / this.canvas.width(),
        resizedX = x * resizeRatio,
        resizedY = y * resizeRatio;

    var orderedRegions = this.getOrderedRegions();
    for (var i=0; i<orderedRegions.length; i++) {
        var regionId = orderedRegions[i];
        var regionRect = this.regionCache[regionId];

        if (regionRect && resizedX >= regionRect.x && resizedX <= regionRect.x + regionRect.width &&
                resizedY >= regionRect.y && resizedY <= regionRect.y + regionRect.height) {
            return regionId;
        }
    }

    return null;
};

EAtlasNcAnimate2Map.prototype.loadRegionCache = function() {
    var orderedRegions = this.getOrderedRegions();
    if (this.regionCatalogue && orderedRegions) {
        for (var i=0; i<orderedRegions.length; i++) {
            var regionId = orderedRegions[i];

            var reprojectedBBox = this.reproject(this.regionCatalogue[regionId]['bbox']);
            if (reprojectedBBox !== null) {
                var regionLabel = this.regionCatalogue[regionId]['label'];
                var regionScale = this.regionCatalogue[regionId]['scale'] || -1;
                if (!regionLabel) {
                    regionLabel = regionId;
                }
                this.regionCache[regionId] = {
                    'label': regionLabel,
                    'scale': regionScale,
                    'x': reprojectedBBox.west,
                    'y': reprojectedBBox.north,
                    'width': reprojectedBBox.east - reprojectedBBox.west,
                    'height': reprojectedBBox.south - reprojectedBBox.north
                };
            }
        }
    }
};

EAtlasNcAnimate2Map.prototype.populateHTMLRegionList = function() {
    var that = this;

    if (this.regionCache) {
        // Order regions from North to South,
        //   because that's what feels the most natural
        //   while using the navigation list
        var geographicallyOrderedRegions = [];

        // Get a list of all the region IDs
        for (var regionId in this.regionCache) {
            if (this.regionCache.hasOwnProperty(regionId)) {
                geographicallyOrderedRegions.push(regionId);
            }
        }

        // Sort the list of region ID by region BBox / Label
        geographicallyOrderedRegions.sort(function(id1, id2) {
            var region1 = that.regionCache[id1],
                region2 = that.regionCache[id2];

            var scale1 = region1['scale'] || -1;
            var scale2 = region2['scale'] || -1;
            var scaleDiff = scale1 - scale2;

            if (scaleDiff !== 0) {
                return scaleDiff;
            }

            // Place the North most first
            var yCmp = region1['y'] - region2['y'];
            if (yCmp !== 0) {
                return yCmp;
            }

            // If they are on the same parallel, return the West most first
            var xCmp = region1['x'] - region2['x'];
            if (xCmp !== 0) {
                return xCmp;
            }

            // If the top-left corner is at the same location, compare labels
            return region1['label'].localeCompare(region2['label']);
        });

        // Create the bullet list
        this.htmlRegionList.empty();
        var lastRegionScale = null;
        var currentUl = null;
        for (var i=0; i<geographicallyOrderedRegions.length; i++) {
            var regionId = geographicallyOrderedRegions[i];
            var region = this.regionCache[regionId];

            if (currentUl === null || region['scale'] !== lastRegionScale) {
                var scaleGroup = jQuery('<div class="regionScaleGroup"></div>')
                this.htmlRegionList.append(scaleGroup);

                var label = (region['scale'] === -1) ? 'Legacy regions' : 'Scale: ' + region['scale'];
                scaleGroup.append(jQuery('<div class="region-scale-label">' + label + '</div>'));
                currentUl = jQuery('<ul></ul>');
                scaleGroup.append(currentUl);
            }

            currentUl.append(
                jQuery(regionId === this.selectedRegion ? '<li class="selected"></li>' : '<li></li>').append(
                    // NOTE: The anchor is to actually have a link (for keyboard navigation) and the value of the anchor is to create a pretty URL in the browser status when doing a mouse over.
                    jQuery('<a class="' + regionId + '" href="#' + eatlas_ncanimate2_craft_anchor({"region": regionId}) + '">' + region['label'] + '</a>')
                        // MouseEnter / MouseLeave are triggered with the mouse
                        // NOTE: We manually call focus / blur to trigger the respective event (avoid code duplication)
                        .mouseenter(function() { jQuery(this).focus(); } )
                        .mouseleave(function() { jQuery(this).focusout(); } )
                        // Focus / Blur (aka focusout) are triggered with the keyboard
                        .focus(
                            function() {
                                that.hoverRegion = jQuery(this).attr("class");
                                that.redraw();
                            })
                        .focusout(
                            function() {
                                jQuery(this).blur();
                                that.hoverRegion = null;
                                that.redraw();
                            })
                        .click(
                            function() {
                                var clickedRegion = jQuery(this).attr("class");
                                eatlas_ncanimate2_set_anchor(
                                    eatlas_ncanimate2_craft_anchor({
                                        "region": clickedRegion
                                    })
                                );
                            })
                )
            );

            lastRegionScale = region['scale'];
        }
    }
};

// Sort the regions according to area
//   Smallest on top, to simplify selection when using the navigation map
EAtlasNcAnimate2Map.prototype.getOrderedRegions = function() {
    if (this.orderedRegions === null) {
        this.orderedRegions = [];
        if (this.regionCatalogue) {
            for (var regionId in this.regionCatalogue) {
                if (this.regionCatalogue.hasOwnProperty(regionId)) {
                    this.orderedRegions.push(regionId);
                }
            }

            // Sort regions
            this.orderedRegions.sort(
                (function(that) {
                    function getRegionArea(bbox) {
                        return (bbox.east - bbox.west) * (bbox.north - bbox.south);
                    }
                    return function(id1, id2) {
                        var bbox1 = that.regionCatalogue[id1]['bbox'],
                            bbox2 = that.regionCatalogue[id2]['bbox'],
                            epsilon = 0.000000001;

                        // Area comparison (smaller on top)
                        var areaCmp = getRegionArea(bbox1) -
                                getRegionArea(bbox2);
                        if (areaCmp > epsilon || areaCmp < -epsilon) {
                            return areaCmp;
                        }

                        // Same area - latitude comparison (northest on top)
                        var latCmp = bbox2.north - bbox1.north;
                        if (latCmp > epsilon || latCmp < -epsilon) {
                            return latCmp;
                        }

                        // Same latitude - longitude comparison (eastest on top)
                        return bbox2.west - bbox1.west;
                    };
                })(this)
            );
        }
    }
    return this.orderedRegions;
};

// Calculate map bounding box
EAtlasNcAnimate2Map.prototype.getMapBBox = function() {
    if (this.mapBBox === null && this.regionCatalogue) {
        for (var regionId in this.regionCatalogue) {
            if (this.regionCatalogue.hasOwnProperty(regionId)) {
                this.mapBBox = this.mergeBBox(this.mapBBox, this.regionCatalogue[regionId]['bbox']);
            }
        }

        // Add padding
        if (this.mapBBox) {
            var mapWidthDegree = this.mapBBox.east - this.mapBBox.west,
                mapWidthPixel = this.getMapWidth();

            var degreePerPixel = mapWidthDegree / mapWidthPixel,
                degreePadding = 20 * degreePerPixel;

            this.mapBBox.north += degreePadding;
            this.mapBBox.south -= degreePadding;

            this.mapBBox.east += degreePadding;
            this.mapBBox.west -= degreePadding;

            // Adjustment
            if (this.mapBBox.north > 90) { this.mapBBox.north = 90; }
            if (this.mapBBox.south < -90) { this.mapBBox.south = -90; }

            if (this.mapBBox.east > 180) { this.mapBBox.east = 180; }
            if (this.mapBBox.west < -180) { this.mapBBox.west = -180; }
        }
    }
    return this.mapBBox;
};

EAtlasNcAnimate2Map.prototype.getMapWidth = function() {
    if (this.width === null) {
        this.computeMapWidthHeight();
    }
    return this.width;
};

EAtlasNcAnimate2Map.prototype.getMapHeight = function() {
    if (this.height === null) {
        this.computeMapWidthHeight();
    }
    return this.height;
};

// Calculate the image desired dimensions.
// NOTE: They will be adjusted after the map is loaded.
EAtlasNcAnimate2Map.prototype.computeMapWidthHeight = function() {
    var mapBBox = this.getMapBBox();

    // Get the map width x height as specified in the Drupal module configuration.
    var desiredWidth = this.canvas.attr('mapwidth'),
        desiredHeight = this.canvas.attr('mapheight');

    var mapWidth = mapBBox.east - mapBBox.west,
        mapHeight = mapBBox.north - mapBBox.south;

    if (desiredWidth && desiredHeight) {
        // Both width and height is set
        this.width = desiredWidth;
        this.height = desiredHeight;

    } else if (desiredHeight) {
        // Only height is set
        this.height = desiredHeight;

        // Calculate the map width, in pixels
        this.width = Math.round(this.height * mapWidth / mapHeight);
    } else {
        // Only width is set (or neither)
        this.width = desiredWidth ? desiredWidth : 200;

        // Calculate the map height, in pixels
        this.height = Math.round(this.width * mapHeight / mapWidth);
    }
};

EAtlasNcAnimate2Map.prototype.redraw = function() {
    var width = this.getMapWidth(),
        height = this.getMapHeight();

    // Flush canvas before redrawing
    if (this.context) {
        this.context.clearRect(0, 0, width, height);

        // Draw the image
        if (this.mapImg !== null) {
            this.context.drawImage(this.mapImg, 0, 0, width, height);
        }

        this.context.strokeStyle = "rgba(0, 0, 0, 0.8)";
        this.context.fillStyle = "rgba(0, 0, 255, 0.2)";

        var orderedRegions = this.getOrderedRegions();
        if (orderedRegions) {
            for (var i=0; i<orderedRegions.length; i++) {
                this.drawRegion(orderedRegions[i]);
            }
        }
    }
};

EAtlasNcAnimate2Map.prototype.drawRegion = function(regionId) {
    // Get the region rectangle from the cache.
    var rect = this.regionCache[regionId];
    if (this.context && rect) {
        if (regionId === this.selectedRegion) {
            this.context.fillRect(rect.x, rect.y, rect.width, rect.height);
        }

        if (regionId === this.hoverRegion) {
            this.context.lineWidth = 3;
        } else {
            this.context.lineWidth = 1.5;
        }

        this.context.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
};

EAtlasNcAnimate2Map.prototype.reproject = function(bbox) {
    var mapBBox = this.getMapBBox(),
        width = this.getMapWidth(),
        height = this.getMapHeight();

    if (!mapBBox || !bbox || !width || !height) {
        return null;
    }

    // Calculate the width and height of the map, in degrees
    var geoWidth = mapBBox.east - mapBBox.west;
    var geoHeight = mapBBox.north - mapBBox.south;

    // Calculate the ratio used to reproject from degrees to pixels.
    var widthRatio = width / geoWidth;
    var heightRatio = height / geoHeight;

    // NOTE: North / South are inverted:
    //   (0,0) is bottom left corner in degrees,
    //   (0,0) is top left corner in pixels.
    return {
        'north': height - ((bbox.north - mapBBox.south) * heightRatio),
        'east':  (bbox.east  - mapBBox.west ) * widthRatio ,
        'south': height - ((bbox.south - mapBBox.south) * heightRatio),
        'west':  (bbox.west  - mapBBox.west ) * widthRatio
    };
};
