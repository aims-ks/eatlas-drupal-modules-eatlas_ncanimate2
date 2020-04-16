var EATLAS_NCANIMATE2_MEDIA_MAX_HEIGHT = 800;

// Utility (static) function
function eatlas_ncanimate2_resize_videos(videos) {
    (function ($) {
        videos.each(function(index) {
            // Original size: $(this).get(0).width, $(this).get(0).height
            // Current size: $(this).width(), $(this).height()
            // NOTE:
            //   $(this) = The eReefs video for "index".
            //   $(this).get(0) = The video attributes.
            //   $(this).get(index) does not make any sense since $(this) is the element for "index".
            var orig_width = $(this).get(0).width,
                orig_height = $(this).get(0).height,
                current_width = $(this).width(),
                current_height = $(this).height();

            if (current_width && orig_width && orig_height) {
                current_height = Math.round(current_width * orig_height / orig_width);
                if (current_height > EATLAS_NCANIMATE2_MEDIA_MAX_HEIGHT) {
                    current_height = EATLAS_NCANIMATE2_MEDIA_MAX_HEIGHT;
                    current_width = Math.round(current_height * orig_width / orig_height);
                    $(this).width(current_width);
                }
                $(this).height(current_height);
            }
        });
    }(jQuery));
}

function eatlas_ncanimate2_numeric_sort_asc(a, b) {
    return a - b;
}
function eatlas_ncanimate2_parseFloat_sort_desc(a, b) {
    return parseFloat(b) - parseFloat(a);
}

// Class
function EAtlasNcAnimate2Widget(htmlBlockElement) {
    this.block = htmlBlockElement;

    // media_map[framePeriod][elevation][region][year]["metadata"]
    // media_map[framePeriod][elevation][region][year][month]["metadata"]
    this.media_map = null;

    this.selector_year = null;

    this.default_framePeriod = null;
    this.default_elevation = null;

    this.current_framePeriod = null;
    this.current_elevation = null;
    this.current_region = null;
    this.current_year = null;
    this.current_month = null;

    this.map_selector = new EAtlasNcAnimate2Map(this.block, this);

    this.tabsContainer = this.block.find('.tabs');
    this.tabsContainerUl = this.tabsContainer.find('ul');

    this.messageContainer = this.block.find('.message-container');
    this.messageContainerText = this.messageContainer.find('.text');

    this.imageContainer = this.block.find('.image-container');
    this.imageContainerImg = this.imageContainer.find('img');

    this.videoContainer = this.block.find('.video-container');
    this.videoContainerVideo = this.videoContainer.find('video');

    this.elevationContainer = this.block.find('.elevation');
    this.elevationContainerSelect = this.elevationContainer.find('select');

    this.downloadContainer = this.block.find('.downloads');
    this.downloadContainerList = this.downloadContainer.find('ul');
}

EAtlasNcAnimate2Widget.prototype.init = function() {
    this.initElevationSelector();
    this.load();
};

EAtlasNcAnimate2Widget.prototype.initTabs = function(framePeriodOrder, framePeriodSettings) {
    for (var i=0; i<framePeriodOrder.length; i++) {
        var framePeriod = framePeriodOrder[i];
        var settings = framePeriodSettings[framePeriod];

        var li = jQuery('<li/>')
            .addClass(framePeriod)
            .addClass(settings.type)
            .appendTo(this.tabsContainerUl);

        // The "href" is added by "setTabsHref".
        // NOTE: The link needs to be implemented using a "href" instead
        //    of"click" event to work with keyboard navigation
        //   and with "Right click > Open link in new tab".
        var link = jQuery('<a/>')
            .attr('framePeriod', framePeriod)
            .appendTo(li);

        var icon = jQuery('<span/>')
            .addClass('icon')
            .appendTo(link);

        var label = jQuery('<span/>')
            .addClass('tabLabel')
            .text(framePeriod)
            .appendTo(link);
    }

    // NOTE: "setTabsHref" is called by "loadMedia".
    //   It's required to call it here only for the case where
    //   there is no resource for the default tab.
    this.setTabsHref();
};

EAtlasNcAnimate2Widget.prototype.setTabsHref = function() {
    // Loop through the tabs, find the "A" links and alter the "href" property.
    this.tabsContainerUl.find('a').each(function(index) {
        var link = jQuery(this);
        var framePeriod = link.attr('framePeriod');
        link.attr('href', '#' + eatlas_ncanimate2_craft_anchor({"frame": framePeriod}));
    });
};

/**
 * Show a message
 */
EAtlasNcAnimate2Widget.prototype.showMessage = function(message) {
    this.showMessage(message, null, null);
};
EAtlasNcAnimate2Widget.prototype.showMessage = function(message, width, height) {
    // Resize the message window

    // If no dimensions is provided, use default
    if (jQuery.isNaN(width) || width <= 0) {
        width = 1300;
    }
    if (jQuery.isNaN(height) || height <= 0) {
        height = 600;
    }

    // Set the width
    this.messageContainer.width(width);

    // Keep the message window proportional when it is shrunk
    // I.E. The media might be shrunk due to "maxWidth:100%"
    var actualWidth = this.messageContainer.width();
    var calculatedHeight = height;
    if (actualWidth != width) {
        calculatedHeight = Math.round(actualWidth * height / width);
        if (calculatedHeight > EATLAS_NCANIMATE2_MEDIA_MAX_HEIGHT) {
            calculatedHeight = EATLAS_NCANIMATE2_MEDIA_MAX_HEIGHT
            var calculatedWidth = Math.round(calculatedHeight * width / height);
            this.messageContainer.width(calculatedWidth);
        }
    }

    // Set the height (and the line-height which is used to center the text)
    this.messageContainer.height(calculatedHeight);
    this.messageContainer.css("line-height", calculatedHeight + "px");

    this.messageContainer.show();
    this.imageContainer.hide();
    this.videoContainer.hide();

    this.messageContainerText.text(message);
};

/**
 * Show the image container
 */
EAtlasNcAnimate2Widget.prototype.showImageContainer = function(message) {
    this.messageContainer.hide();
    this.imageContainer.show();
    this.videoContainer.hide();
};

/**
 * Show the video container
 */
EAtlasNcAnimate2Widget.prototype.showVideoContainer = function(message) {
    this.messageContainer.hide();
    this.imageContainer.hide();
    this.videoContainer.show();

    eatlas_ncanimate2_resize_videos(this.videoContainerVideo);
};

/**
 * Load a video on the video player and adjust the month selector
 */
EAtlasNcAnimate2Widget.prototype.loadMedia = function(framePeriod, elevation, region, year, month) {
    if (framePeriod === undefined || framePeriod === null) {
        framePeriod = this.default_framePeriod;
    }
    if (elevation === undefined || elevation === null) {
        elevation = this.default_elevation;
    }
    if (region === undefined || region === null) {
        region = this.default_region;
    }
    if (year === undefined) {
        year = null;
    }
    if (month === undefined) {
        month = null;
    }

    if (framePeriod !== this.current_framePeriod) {
        this.loadElevations(framePeriod);
    }


    var media_metadata = null;
    var periodType = "unknown";

    if (framePeriod !== null && elevation !== null && region !== null) {

        if ((framePeriod in this.media_map) &&
                (elevation in this.media_map[framePeriod]) &&
                (region in this.media_map[framePeriod][elevation])) {

            if (("metadata" in this.media_map[framePeriod][elevation][region]) &&
                    this.media_map[framePeriod][elevation][region]["metadata"] !== null) {

                // Selected "all time" media
                periodType = "all";
                media_metadata = this.media_map[framePeriod][elevation][region]["metadata"];

            } else if (year != null && year in this.media_map[framePeriod][elevation][region]) {
                if (("metadata" in this.media_map[framePeriod][elevation][region][year]) &&
                        this.media_map[framePeriod][elevation][region][year]["metadata"] !== null) {

                    // Selected a yearly media
                    periodType = "year";
                    media_metadata = this.media_map[framePeriod][elevation][region][year]["metadata"]; // TODO framePeriod!!!

                } else {
                    // If month is null (or not found in the map), find the first month for that year.
                    if (month === null || !(month in this.media_map[framePeriod][elevation][region][year])) {
                        for (month in this.media_map[framePeriod][elevation][region][year]) {
                            if (this.media_map[framePeriod][elevation][region][year].hasOwnProperty(month)) {
                                break;
                            }
                        }
                    }

                    if ((month in this.media_map[framePeriod][elevation][region][year]) &&
                        ("metadata" in this.media_map[framePeriod][elevation][region][year][month]) &&
                            this.media_map[framePeriod][elevation][region][year][month]["metadata"] !== null) {

                        // Selected a monthly media
                        periodType = "month";
                        media_metadata = this.media_map[framePeriod][elevation][region][year][month]["metadata"];
                    }
                }
            }
        }
    }

    this.selectMedia(framePeriod, elevation, region, year, month);

    if (media_metadata != null) {
        var lastModified = media_metadata["lastModified"];
        if ("outputFiles" in media_metadata) {
            var outputFiles = media_metadata['outputFiles'];
            if (outputFiles != null) {
                var videos_metadata = {};
                var images_metadata = {};

                jQuery.each(outputFiles, function(outputFileID, outputFile) {
                    if (outputFile['type'] === 'VIDEO') {
                        videos_metadata[outputFile['filetype']] = outputFile;
                    } else if (outputFile['type'] === 'MAP') {
                        images_metadata[outputFile['filetype']] = outputFile;
                    }
                });

                if ("MP4" in videos_metadata) {
                    var videoUrl = videos_metadata["MP4"]["fileURI"] + "?t=" + lastModified;
                    var videoPreview = null;
                    if ("preview" in media_metadata) {
                        videoPreview = media_metadata["preview"] + "?t=" + lastModified;
                    }

                    var videoSource = this.videoContainerVideo.find('.video_mp4');

                    var width = videos_metadata["MP4"]["width"];
                    var height = videos_metadata["MP4"]["height"];
                    if (width && height) {
                        if (height > EATLAS_NCANIMATE2_MEDIA_MAX_HEIGHT) {
                            width = Math.round(width * EATLAS_NCANIMATE2_MEDIA_MAX_HEIGHT / height);
                            height = EATLAS_NCANIMATE2_MEDIA_MAX_HEIGHT;
                        }

                        // The video preview will be loaded in the image container (it's easier to catch events on an img tag)
                        this.imageContainerImg.width(width);
                        this.imageContainerImg.height(height);

                        this.videoContainerVideo.attr('width', width);
                        this.videoContainerVideo.attr('height', height);
                    }

                    if (videoPreview) {
                        // Set video preview image (poster)
                        this.videoContainerVideo.attr('poster', videoPreview);

                        // Put the video preview in the image container to be able to check when it's loaded.
                        this.imageContainerImg.attr('src', videoPreview);

                        // Wait a 1/10 of a second before checking if the image is loaded.
                        // NOTE: Some browser will report the image as been "not completed"
                        //   immediately after setting it, even when it's in the cache,
                        //   causing a flickering effect when switching videos.
                        //   Waiting a small delay seems to fix that issue.
                        var previewLoader = window.setTimeout(
                            (function(that) {
                                return function() {
                                    if (that.imageIsLoaded(that.imageContainerImg)) {
                                        that.showVideoContainer();
                                    } else {
                                        that.showMessage("Loading...", width, height);
                                        that.imageContainerImg.load(
                                            (function(that) {
                                                return function() {
                                                    that.showVideoContainer();
                                                }
                                            })(that)
                                        );
                                    }
                                };
                            })(this),
                            100
                        );

                        // If the preview image is not found, show to the video player anyway.
                        this.imageContainerImg.error(
                            (function(that, previewLoader) {
                                return function() {
                                    window.clearTimeout(previewLoader);
                                    that.showVideoContainer();
                                }
                            })(this, previewLoader)
                        );

                    } else {
                        this.videoContainerVideo.removeAttr('poster');

                        // There is no video preview. Show the video player now.
                        this.showVideoContainer();
                    }

                    videoSource.attr('src', videoUrl);
                    this.videoContainerVideo[0].load();

                } else if ("PNG" in images_metadata) {
                    var imageUrl = images_metadata["PNG"]["fileURI"] + "?t=" + lastModified;

                    var width = images_metadata["PNG"]["width"];
                    var height = images_metadata["PNG"]["height"];
                    if (width && height) {
                        if (height > EATLAS_NCANIMATE2_MEDIA_MAX_HEIGHT) {
                            width = Math.round(width * EATLAS_NCANIMATE2_MEDIA_MAX_HEIGHT / height);
                            height = EATLAS_NCANIMATE2_MEDIA_MAX_HEIGHT;
                        }

                        this.imageContainerImg.width(width);
                        this.imageContainerImg.height(height);
                    }

                    this.imageContainerImg.attr('src', imageUrl);
                    // Wait a 1/10 of a second before checking if the image is loaded.
                    // NOTE: Some browser will report the image as been "not completed"
                    //   immediately after setting it, even when it's in the cache,
                    //   causing a flickering effect when switching images.
                    //   Waiting a small delay seems to fix that issue.
                    var imageLoader = window.setTimeout(
                        (function(that) {
                            return function() {
                                if (that.imageIsLoaded(that.imageContainerImg)) {
                                    that.showImageContainer();
                                } else {
                                    that.showMessage("Loading...", width, height);
                                    that.imageContainerImg.load(
                                        (function(that) {
                                            return function() {
                                                that.showImageContainer();
                                            }
                                        })(that)
                                    );
                                }
                            };
                        })(this),
                        100
                    );

                    // If the image is not found, show an error message.
                    this.imageContainerImg.error(
                        (function(that, imageLoader) {
                            return function() {
                                window.clearTimeout(imageLoader);
                                that.showMessage("Image not found", width, height);
                            }
                        })(this, imageLoader)
                    );

                } else {
                    // No MP4 video nor PNG map found in media_metadata["outputFiles"]
                    this.showMessage("Media not found");
                }
            }
        } else {
            // media_metadata["outputFiles"] doesn't exists
            this.showMessage("Media not found");
        }

    } else {
        // Media not found. Go to the latest media for current elevation / region

        // Find an alternative year and month (the latest media)
        var alt_year = null;
        var alt_month = null;

        if (elevation !== null &&
                region !== null &&
                (framePeriod in this.media_map) &&
                (elevation in this.media_map[framePeriod]) &&
                (region in this.media_map[framePeriod][elevation])) {

            var all_years = Object.keys(this.media_map[framePeriod][elevation][region]);
            all_years.sort(eatlas_ncanimate2_numeric_sort_asc);
            for (var i=all_years.length-1; i>=0 && alt_year===null; i--) {
                var _alt_year = all_years[i];
                if (_alt_year !== "metadata" && _alt_year in this.media_map[framePeriod][elevation][region]) {
                    // Try to find a monthly media for "_alt_year"
                    var all_months = Object.keys(this.media_map[framePeriod][elevation][region][_alt_year]);
                    all_months.sort(eatlas_ncanimate2_numeric_sort_asc);
                    for (var j=all_months.length-1; j>=0 && alt_year===null; j--) {
                        var _alt_month = all_months[j];
                        if (_alt_month !== "metadata" &&
                                (_alt_month in this.media_map[framePeriod][elevation][region][_alt_year]) &&
                                ("metadata" in this.media_map[framePeriod][elevation][region][_alt_year][_alt_month]) &&
                                this.media_map[framePeriod][elevation][region][_alt_year][_alt_month]["metadata"] !== null) {

                            media_metadata = this.media_map[framePeriod][elevation][region][_alt_year][_alt_month]["metadata"];

                            alt_year = _alt_year;
                            alt_month = _alt_month;
                        }
                    }

                    // Try to find a yearly media for "_alt_year"
                    if (("metadata" in this.media_map[framePeriod][elevation][region][_alt_year]) &&
                            this.media_map[framePeriod][elevation][region][_alt_year]["metadata"] !== null) {

                        media_metadata = this.media_map[framePeriod][elevation][region][_alt_year]["metadata"];

                        alt_year = _alt_year;
                        alt_month = null;
                    }
                }
            }

            // Try to find "all time" media
            if (("metadata" in this.media_map[framePeriod][elevation][region]) &&
                    this.media_map[framePeriod][elevation][region]["metadata"] !== null) {

                media_metadata = this.media_map[framePeriod][elevation][region]["metadata"];

                alt_year = null;
                alt_month = null;
            }
        }

        this.loadMedia(framePeriod, elevation, region, alt_year, alt_month);
    }

    this.setTabsHref();
    this.loadDownloads(media_metadata);
};

EAtlasNcAnimate2Widget.prototype.imageIsLoaded = function(imageJQueryObject) {
    var loaded = true;
    imageJQueryObject.each(function() {
        if (!this.complete || this.naturalHeight === 0) {
            loaded = false;
            return false; // Exit the loop
        }
    });
    return loaded;
};

/**
 * Select the media (video or image) in the media selector (the calendar)
 */
EAtlasNcAnimate2Widget.prototype.selectMedia = function(framePeriod, elevation, region, year, month) {
    this.selector_year = year;
    this.current_year = year;
    this.current_month = month;

    if (framePeriod !== this.current_framePeriod) {
        this.current_framePeriod = framePeriod;
        this.changeFramePeriod(framePeriod);
    }
    if (elevation !== this.current_elevation) {
        this.current_elevation = elevation;
        this.changeElevation(elevation);
    }
    if (region !== this.current_region) {
        this.current_region = region;
        this.map_selector.selectRegion(region);
    }

    this.redrawCalendar();
};

EAtlasNcAnimate2Widget.prototype.redrawCalendar = function() {
    if (this.current_framePeriod !== null &&
            this.current_elevation !== null &&
            this.current_region != null) {

        // Fix classes in the video selector
        var year = this.selector_year;
        var dateSelector = this.block.find('.date-selector');
        var yearSelector = dateSelector.find('.year-selector');

        var previousYearCell = yearSelector.find('.year_previous');
        var previousYearLink = previousYearCell.find('a');
        var nextYearCell = yearSelector.find('.year_next');
        var nextYearLink = nextYearCell.find('a');
        var yearCell = yearSelector.find('.year');
        var yearLink = yearCell.find('a');

        // Set calendar year
        yearLink.html(year == null ? "----" : year);

        // Remove selected class
        dateSelector.find('td').removeClass('selected');
        dateSelector.find('td').removeClass('selectable');
        dateSelector.find('th').removeClass('selected');
        dateSelector.find('th').removeClass('selectable');

        // Remove old "onClick" event listeners and "href" attribute.
        previousYearCell.unbind('click');
        previousYearLink.removeAttr('href');

        nextYearCell.unbind('click');
        nextYearLink.removeAttr('href');

        yearCell.unbind('click');
        yearLink.removeAttr('href');

        for (var month=1; month<=12; month++) {
            var monthCell = dateSelector.find('.month_' + month);
            var monthLink = monthCell.find('a');
            monthCell.unbind('click');
            monthLink.removeAttr('href');
        }

        // Add the "onClick" event and the "selectable" CSS class on the year arrows.
        if (year !== null &&
                this.media_map !== null &&
                (this.current_framePeriod in this.media_map) &&
                (this.current_elevation in this.media_map[this.current_framePeriod]) &&
                (this.current_region in this.media_map[this.current_framePeriod][this.current_elevation]) &&
                this.media_map[this.current_framePeriod][this.current_elevation][this.current_region] !== null) {

            var video_region_map = this.media_map[this.current_framePeriod][this.current_elevation][this.current_region];

            var years = Object.keys(video_region_map);
            years.sort(eatlas_ncanimate2_numeric_sort_asc);

            var yearIndex;
            // Find year index (empty "for" loop)
            for (yearIndex = 0; yearIndex < years.length && years[yearIndex] != year; yearIndex++);
            if (years[yearIndex] == year) {
                var previousYear = (yearIndex <= 0 ? null : years[yearIndex-1]);
                var nextYear = (yearIndex >= (years.length - 1) ? null : years[yearIndex+1]);

                if (previousYear !== null) {
                    previousYearCell.addClass('selectable');
                    previousYearLink.attr('href', '#');
                    previousYearCell.click(
                        function(that, _previousYear) {
                            return function() {
                                that.selector_year = _previousYear;
                                that.redrawCalendar();
                                return false; // Prevent default
                            }
                        }(this, previousYear)
                    );
                }

                if (nextYear !== null) {
                    nextYearCell.addClass('selectable');
                    nextYearLink.attr('href', '#');
                    nextYearCell.click(
                        function(that, _nextYear) {
                            return function() {
                                that.selector_year = _nextYear;
                                that.redrawCalendar();
                                return false; // Prevent default
                            }
                        }(this, nextYear)
                    );
                }
            }

            // Add fresh "onClick" event listeners and the "selectable" CSS class on the selectable months.
            if ((year in video_region_map) &&
                    video_region_map[year] !== null) {

                var video_year_map = video_region_map[year];

                // Add event listeners on the year
                if ("metadata" in video_year_map) {
                    yearCell.addClass('selectable');
                    yearLink.attr('href', '#' + eatlas_ncanimate2_craft_anchor({"year": year}));

                    yearCell.click(
                        // Return a parameter less function which contains a copy of year and month
                        function(that, _year) {
                            return function() {
                                eatlas_ncanimate2_set_anchor(
                                    eatlas_ncanimate2_craft_anchor({
                                        "year": _year,
                                        "month": null
                                    })
                                );
                            }
                        }(this, year)
                    );

                    if (year == this.current_year && this.current_month === null) {
                        yearCell.addClass('selected');
                    }
                }

                for (var month=1; month<=12; month++) {
                    if ((month in video_year_map) &&
                            ("metadata" in video_year_map[month]) &&
                            video_year_map[month]["metadata"] != null) {

                        var monthCell = dateSelector.find('.month_' + month);
                        var monthLink = monthCell.find('a');
                        monthCell.addClass('selectable');
                        monthLink.attr('href', '#' + eatlas_ncanimate2_craft_anchor({"year": year, "month": month}));

                        monthCell.click(
                            // Return a parameter less function which contains a copy of year and month
                            function(that, _year, _month) {
                                return function() {
                                    eatlas_ncanimate2_set_anchor(
                                        eatlas_ncanimate2_craft_anchor({
                                            "year": _year,
                                            "month": _month
                                        })
                                    );
                                }
                            }(this, year, month)
                        );

                        if (year == this.current_year && month == this.current_month) {
                            monthCell.addClass('selected');
                        }
                    }
                }
            }
        }
    }
};

// Add event listeners to the elevation dropdown (depth selector)
EAtlasNcAnimate2Widget.prototype.initElevationSelector = function() {
    this.elevationContainerSelect.change(
        (function(that) {
            return function() {
                jQuery(this).find("option:selected").each(function() {
                    var elevation = jQuery(this).text();
                    eatlas_ncanimate2_set_anchor(
                        eatlas_ncanimate2_craft_anchor({"elevation": elevation})
                    );
                });
            }
        })(this)
    );
};

EAtlasNcAnimate2Widget.prototype.changeFramePeriod = function(framePeriod) {
    if (framePeriod in this.media_map) {
        // Select tab (visually)
        this.tabsContainerUl.find('li').removeClass('active');
        this.tabsContainerUl.find('li.' + framePeriod).addClass('active');
    }
};

EAtlasNcAnimate2Widget.prototype.changeElevation = function(elevation) {
    if (elevation in this.media_map[this.current_framePeriod]) {
        this.elevationContainerSelect.val(elevation);
    }
};

// Called from EAtlasNcAnimate2Map instance
EAtlasNcAnimate2Widget.prototype.changeRegion = function(region) {
    this.current_region = region;
    this.loadMedia(this.current_framePeriod, this.current_elevation, region, this.current_year, this.current_month);
};

EAtlasNcAnimate2Widget.prototype.load = function() {
    // Send a JSONP query to the server
    //$.getJSON("http://aims.ereefs.org.au/videos.php?id=temperature-wind-salinity&region="+region+"&callback=?", function(data) {
    var serviceUrl = this.block.attr('serviceurl');
    var productId = this.block.attr('productid');

    // Replace placeholders ${productid}
    serviceUrl = serviceUrl.replace("${productid}", productId);

    // JQuery doesn't handle error with JSONP
    //   http://designwithpc.com/post/11989720389/jsonp-error-handling-with-jqueryajax
    jQuery.ajax({
        url: serviceUrl + "?callback=?",
        dataType: "jsonp",

        // 10 seconds timeout
        // NOTE: Despite what the JQuery API doc says, the "timeout" option
        //   doesn't work with JQuery 1.4.4 (it works with 1.5+)
        timeout: 10000,

        success: (function(that) {
            return function(data, status, xhr) {
                that.media_map = {};

                var framePeriods = [];
                var framePeriodSettings = {};
                var elevations = [];

                var regions = {};

                // NOTE: mediaID is just it's index in the JSONArray
                jQuery.each(data, function(mediaID, mediaMetadata) {
                    var dateRange = mediaMetadata['dateRange'];
                    var startDateStr = null;
                    var endDateStr = null;
                    var startDate = null;
                    var endDate = null;
                    if (dateRange != null) {
                        startDateStr = dateRange['startDate'];
                        if (startDateStr != null) {
                            startDate = that.parseDate(startDateStr);
                        }

                        endDateStr = dateRange['endDate'];
                        if (endDateStr != null) {
                            endDate = that.parseDate(endDateStr);
                        }
                    }

                    var videoTimeIncrement = mediaMetadata['videoTimeIncrement'];
                    var mapTimeIncrement = mediaMetadata['mapTimeIncrement'];

                    var periodType = null; // example: MONTH
                    var mediaType = null;
                    if (videoTimeIncrement != null) {
                        periodType = videoTimeIncrement['unit'];
                        mediaType = 'videos';
                    } else if (mapTimeIncrement != null) {
                        periodType = mapTimeIncrement['unit'];
                        mediaType = 'images';
                    }


                    var startYear = null;
                    var startMonth = null;
                    if (startDate != null) {
                        // Month is 0 indexed [0 - 11]. Add +1 to get [1 - 12].
                        startYear = startDate.year();
                        startMonth = startDate.month() + 1;
                    }

                    var endYear = null;
                    var endMonth = null;
                    if (endDate != null) {
                        // Month is 0 indexed [0 - 11]. Add +1 to get [1 - 12].
                        endYear = endDate.year();
                        endMonth = endDate.month() + 1;
                    }

                    // Default values for product which doesn't define elevation or region.
                    // I.E. If a product doesn't define the "elevation" variable, its elevation will be set to "na"
                    var framePeriod = 'na';
                    var elevation = 'na';
                    if ('properties' in mediaMetadata) {
                        if ('framePeriod' in mediaMetadata['properties']) {
                            framePeriod = mediaMetadata['properties']['framePeriod'];
                        }
                        if ('targetHeight' in mediaMetadata['properties']) {
                            elevation = mediaMetadata['properties']['targetHeight'];
                        }
                    }

                    var region = mediaMetadata['region'];
                    var regionId = region['id'];

                    if (!regions[regionId]) {
                        regions[regionId] = region;
                    }

                    if (!(framePeriod in that.media_map)) {
                        that.media_map[framePeriod] = {};
                    }

                    if (!(framePeriod in framePeriodSettings)) {
                        framePeriods.push(framePeriod);
                        framePeriodSettings[framePeriod] = {
                            'type': mediaType
                        };
                    }



                    if (!(elevation in that.media_map[framePeriod])) {
                        elevations.push(elevation);
                        that.media_map[framePeriod][elevation] = {};
                    }
                    if (!(regionId in that.media_map[framePeriod][elevation])) {
                        that.media_map[framePeriod][elevation][regionId] = {};
                    }

                    if (startYear == null) {
                        if (periodType === "ETERNITY") {
                            that.media_map[framePeriod][elevation][regionId]["metadata"] = mediaMetadata;
                        }
                    } else {
                        if (!(startYear in that.media_map[framePeriod][elevation][regionId])) {
                            that.media_map[framePeriod][elevation][regionId][startYear] = {};
                        }

                        if (periodType === "YEAR") {
                            that.media_map[framePeriod][elevation][regionId][startYear]["metadata"] = mediaMetadata;
                        } else if (periodType === "MONTH") {
                            if (!(startMonth in that.media_map[framePeriod][elevation][regionId][startYear])) {
                                that.media_map[framePeriod][elevation][regionId][startYear][startMonth] = {};
                            }

                            that.media_map[framePeriod][elevation][regionId][startYear][startMonth]["metadata"] = mediaMetadata;
                        }
                    }
                });

                // Sort tab in period length order
                framePeriods.sort(function(a, b) {
                    var sortValue = function(str) {
                        switch(str.toLowerCase()) {
                            case 'hourly':
                                return 1;
                            case 'daily':
                                return 2;
                            case 'monthly':
                                return 3;
                            case 'seasonal':
                                return 4;
                            case 'yearly':
                                return 5;
                            case 'all':
                            case 'overall':
                                return 6;
                            default:
                                return 7;
                        }
                    };

                    return sortValue(a) - sortValue(b);
                });
                that.default_framePeriod = framePeriods[0];
                that.initTabs(framePeriods, framePeriodSettings);

                that.default_elevation = elevations[0];

                that.map_selector.load(regions);
                that.default_region = "qld";

                anchorValues = eatlas_ncanimate2_get_anchor_values();
                that.loadMedia(
                        anchorValues["frame"],
                        anchorValues["elevation"],
                        anchorValues["region"],
                        anchorValues["year"],
                        anchorValues["month"]
                );
            }
        })(this),

        // NOTE: "error" is ignored with JSONP, JQuery 1.4.4
        error: (function(that) {
            return function(data, status, xhr) {
                that.showMessage("Error occurred while loading the data.");
            }
        })(this)
    });

    // Update links when the hash is modified (example, when a new media is loaded).
    // I.E. If a media for date 2017-01 is loaded, all the links on the navigation map needs to be updated for 2017-01.
    jQuery(window).bind(
        'hashchange',
        (function(that) {
            return function(event) {
                // Load the media (video or map)
                var anchorValues = eatlas_ncanimate2_get_anchor_values();
                that.loadMedia(
                        anchorValues["frame"],
                        anchorValues["elevation"],
                        anchorValues["region"],
                        anchorValues["year"],
                        anchorValues["month"]
                );

                // Adjust links (href, onClick, etc)
                that.redrawCalendar();
                that.map_selector.populateHTMLRegionList();
                that.map_selector.redraw();
            }
        })(this)
    );
};

// NOTE: JavaScript date parsing is browser specific... We had to try different date format and choose the most well supported one.
EAtlasNcAnimate2Widget.prototype.parseDate = function(dateStr) {
    if (dateStr === null || dateStr === "") {
        return null;
    }

    var date = moment(dateStr);
    if (date.isValid()) {
        return date;
    }

    return null;
};

EAtlasNcAnimate2Widget.prototype.loadElevations = function(framePeriod) {
    // Remove elevations from the select dropdown field
    this.elevationContainerSelect.find('option').remove();

    // Get the list of elevations for the given frame period
    var elevations = [];
    if (framePeriod in this.media_map) {
        for (var elevation in this.media_map[framePeriod]) {
            if (this.media_map[framePeriod].hasOwnProperty(elevation)) {
                elevations.push(elevation);
            }
        }
    }

    var nbElevation = elevations.length;
    if (nbElevation > 1) {
        elevations.sort(eatlas_ncanimate2_parseFloat_sort_desc);

        for (var i=0; i<nbElevation; i++) {
            var elevation = elevations[i];
            this.elevationContainerSelect.append(jQuery('<option/>', {
                value: elevation,
                text: elevation
            }));
        }

        this.elevationContainer.show();
    } else {
        this.elevationContainer.hide();
    }
};

EAtlasNcAnimate2Widget.prototype.loadDownloads = function(media_metadata) {
    var downloads = {};

    // keys is used to sort the "downloads" object
    // NOTE: Objects in javascript should be considered as HashMaps.
    var keys = [];

    var lastModified = 0;
    if (media_metadata != null) {
        lastModified = media_metadata["lastModified"];
        if ("outputFiles" in media_metadata) {
            var outputFiles = media_metadata['outputFiles'];

            if (outputFiles != null) {
                jQuery.each(outputFiles, function(outputFileID, outputFile) {
                    var key = outputFile['filetype'].toLowerCase();
                    keys.push(key);
                    downloads[key] = outputFile;
                });
            }
        }
    }

    // Remove old download links
    this.downloadContainerList.find('li').remove();
    if (keys.length > 0) {
        // Add new download links
        keys.sort();
        var that = this;
        jQuery.each(keys, function(index, key) {
            var value = downloads[key];
            var url = value["fileURI"];

            // Get the last part of the URL (the part after the last "/")
            var lastSlashIndex = url.lastIndexOf('/');
            var longFilename = lastSlashIndex >= 0 ? url.substring(lastSlashIndex + 1) : url;

            // Attempt to remove unnecessary context (that Aaron added to every IDs in the system)
            // to make the filename somewhat usable. Jira issue [EREEFS-400]
            var lastDoubleUnderscoreIndex = longFilename.lastIndexOf("__");
            var filename = lastDoubleUnderscoreIndex >= 0 ? longFilename.substring(lastDoubleUnderscoreIndex + 2) : longFilename;

            // Craft a nice title (mouse over hint), displaying the file name and dimensions
            var title = filename;
            if (value["width"] && value["height"]) {
                title += ' [' + value["width"] + ' x ' + value["height"] + ']';
            }

            // Add the file last modified to the URL to prevent the browser (or other part of the system)
            // from caching an old request response
            url += "?t=" + lastModified;
            that.downloadContainerList.append('<li class="'+key+'"><a href="'+url+'" title="'+title+'" download="'+filename+'">'+key+'</a></li>');
        });

        // Show the downloads
        this.downloadContainer.show();
    } else {
        // Hide the downloads (there is no download)
        // NOTE: This will only happen when there is no media at all.
        this.downloadContainer.hide();
    }
};

EAtlasNcAnimate2Widget.prototype.warning = function(message) {
    if ((typeof console) === 'object' && (typeof console.log) === 'function') {
        // Every browsers in the universe but IE
        console.log(message);
    } else {
        // Internet Explorer...
        // NOTE: Alert popups are annoying, but if you are using IE, you deserve it...
        alert(message);
    }
};

(function ($) {
    // Adjust the video size when the page is resized
    $(window).resize(function() {
        eatlas_ncanimate2_resize_videos($('.video-container video'));
    });
}(jQuery));
