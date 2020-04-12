var message;
var timeoutTyping;
var escapeFrom = [];
var touchSupport = false;
var swipeData = [];
var PDV_expanded = false;
document.body.ontouchstart = function(event) {
	touchSupport = true;
	document.getElementById("infotext-swipe").style.display = "block";
}
document.getElementById("poimenu").ontouchstart = function(event) { swipeData.push(event.changedTouches[0].clientY) };
function swipeUp() {
	for (var elem of document.getElementsByClassName("tabcontent")) {
			elem.classList.add("tab-visible");
	}
	PDV_expanded = true;
}
function swipeDown() {
	for (var elem of document.getElementsByClassName("tabcontent")) {
			elem.classList.remove("tab-visible");
	}
	document.getElementsByClassName("tabcontent")[0].classList.add("tab-visible");
	PDV_expanded = false;
}
document.getElementById("infotext-swipe").onclick = function() { if (PDV_expanded) {swipeDown()} else {swipeUp()} }
document.getElementById("poimenu").ontouchend = function(event) {
	swipeData.push(event.changedTouches[0].clientY);
	if (swipeData[0] - swipeData[1] > 55) {
		swipeUp(); //swipe up
	} else if (swipeData[0] - swipeData[1] < -55){
		swipeDown(); //swipe down
	}
	swipeData = [];
};
function hideAll(classes) {
	for (var dropdown of document.getElementsByClassName("dropdown-menu")) {
		dropdown.classList.remove(classes[1]);
	}
	for (var menuitem of document.getElementsByClassName("bar-icon")) {
		menuitem.classList.remove(classes[0]);
	}
}
function intern_toggle(elem, mode, classes, menu=undefined) {
	mode = mode || "all";
	menu = ((menu == undefined) ? elem.nextElementSibling : document.getElementById(menu));
	var parent = elem.parentElement;
	var active = menu.classList.contains(classes[1]);
	if (mode == "all") {
		hideAll(classes);
	}
	if (mode == "justopen") {
		active = false;	
	}
	if (!active) {
		elem.classList.add(classes[0]); //Element the user clicked becomes active
		menu.classList.add(classes[1]); //The underlying menu of the element the user clicked becomes active
		escapeFrom.push(function() {
			elem.classList.remove(classes[0]);
			menu.classList.remove(classes[1]);
		});
	} else {
		elem.classList.remove(classes[0]); //The active element becomes inactive
		menu.classList.remove(classes[1]); //The underlying menu of the active element becomes inactive
	}
}
function toggleMenu(elem, mode) {
	intern_toggle(elem, mode, ["item-active", "dropdown-active"]);
}
function toggleTooltip(elem) {
	intern_toggle(elem, "all", ["tooltip-active", "tooltip-content-active"]);
}
function toggleTab(elem, menu) {
	intern_toggle(elem, "all", ["tab-active", "tab-content-active"], menu);
}
function spinner(value) { //Show/hide spinner
	var elem = document.getElementById("spinner");
	if (value) { //Show spinner
		elem.style.display = "flex";
	} else { //Hide spinner
		elem.style.display = "none";
	}
}
function showGlobalPopup(m) { // Triggers the orange rounded message popup
	message = m
	setTimeout(function() {
		document.getElementById("infoPopup").innerHTML = message;
		document.getElementsByClassName("info")[0].style.display = "block"; //Display the message
		setTimeout(function() {
			document.getElementsByClassName("info")[0].style.display = "none"; //Wait for 3sec and then close the popup
		}, 3000);
		}, 1000);
}
function jumpto(elem, lat, lon, poiid) { // Function which fires when user clicks on a search suggestion. Forcing Babykarte to jump to a new position (e.g. Berlin central station)
	if (elem.innerHTML) {
		hideAll(["dropdown-active", "item-active"])
		spinner(true);
		$("#autocomplete").hide(); // Hide the search suggestions
		map.on("moveend", function() {}); //Deactivate the dynamic loading of content
		map.setView([lat, lon]); //Set the view (e.g. Berlin central station)
		location.hash = String(map.getZoom()) + "&" + String(lat) + "&" + String(lon); //Set the url
		saved_lat = lat;
		saved_lon = lon;
		map.on("moveend", onMapMove); //Activate the dynamic loading of content
		setTimeout(function() {onMapMove();}, 300); //After 0.3sec trigger the dynamic loading of content manually without user action.
		showGlobalPopup(elem.innerHTML); //Show the message displaying the location is user is viewing
		setTimeout(function() {requestSinglePOI(poiid)}, 500);
		var crack = Object()
		crack.key = "Escape";
		crack.preventDefault = function() {return 1;}
		escapeFromFunc(crack);
	}
}
function sendAdvancedSearch() {
	var fltrList = [];
	var name = $("#searchbyname").val();
	var subcategory = $("#subcategoryselect").val();
	var filtersGround = document.getElementsByClassName("filter");
	var output = name;
	for (var i in getText().subcategories) {
		if (subcategory == getText().subcategories[i][0]) {
			subcategory = getText().subcategories[i][0];
			break;
		}
	}
	output += " | " + subcategory;
	for (var elem of filtersGround) {
		if (elem.checked) {
			fltrList.push(elem.getAttribute("value"));
		}
	}
	output += " | " + fltrList.join(",") + " | " + map.getBounds().getSouth() + "," + map.getBounds().getWest() + "," + map.getBounds().getNorth() + "," +  map.getBounds().getEast();
	var crack = Object()
	crack.key = "Escape";
	crack.preventDefault = function() {return 1;}
	escapeFromFunc(crack);
	loadPOIS("", output);
}
function geocode_intern() { // Function which powers the search suggestion list
	var searchword = $("#searchfield").val();
	if (searchword.length == 0) {
		$("#autocomplete").hide();
	}
	if(searchword.length > 3) { //Request and show search suggestions after the third char has been typed in by user
		spinner(true);
		$.getJSON("https://photon.komoot.de/api/", { //Sends user input to search suggestion provider komoot
			"q": searchword,
			"lat": map.getCenter()["lat"],
			"lon": map.getCenter()["lng"],
			"location_bias_scale": 10,
			"limit": 5,
			"lang": languageOfUser //Sends the determined language or the language set by user
		}, function(data) {
			var autocomplete_content = "";
			var intellij = {};
			for (var i in getText().subcategories) {
				for (var u of getText().subcategories[i][1]) {
					if (searchword.toLowerCase().indexOf(u.toLowerCase() + " ") > -1 || searchword.toLowerCase().indexOf(" " + u.toLowerCase()) > -1) {
						intellij[i] = true;
					} else if (searchword.split(" ").length == 1 && searchword.toLowerCase() == u.toLowerCase()) {
						intellij[i] = true
						break;
					}
				}
			}
			for (var i in intellij) {
				autocomplete_content += "<div class='entry' tabindex=0 style='border-bottom:5px solid white;padding:5px;' onclick='activateSubcategory(\"" + i + "\")'><span>" + getText().subcategories[i][0] + "</span><br/><address style='font-size:14px;'>" + getText().SEARCHRESULT_FLTR + "</address></div>";
			}
			
			$.each(data.features, function(number, feature) {
				var latlng = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]]; //Get the coordinates of the search suggestion entry
				var poiid = String(feature.properties.osm_type) + String(feature.properties.osm_id);
				var poitype = "";
				var keyvalue = feature.properties.osm_key + "=" + feature.properties.osm_value;
				if (getText().maintagtranslations[keyvalue]) {
					poitype = getText().maintagtranslations[keyvalue][0] + "&nbsp;&#8231;&nbsp;";
				}
				autocomplete_content += "<div class='entry' tabindex=0 style='border-bottom:5px solid white;padding:5px;' onclick='jumpto(this, " + latlng[0] + ", " + latlng[1] + ",\"" + poiid + "\")'><span>" + feature.properties.name + "</span><br/><address style='font-size:14px;'>" + poitype + ((feature.properties.street) ? feature.properties.street + ", " : "") + feature.properties.city + ", " + feature.properties.country + "</address></div>"; //Adds a entry in the search suggestion popup (e.g. Berlin central station)
			});
			if (autocomplete) {
				$("#autocomplete").html(autocomplete_content); //Add them all to the search suggestion popup
				$("#autocomplete").show(); //Display the suggestion popup to the user
			}
			spinner(false);
		});
	} else {
		$("#autocomplete").hide();
	}
};
function geocode() {
	clearTimeout(timeoutTyping);
	timeoutTyping = setTimeout(geocode_intern, 500);
}
// Makes the search happen directly after a char is typed in searchfield.
$("#searchfield").keyup(function() {
	geocode();
});
function searchwhentyping(e) {
	var searchfield = document.getElementById("searchfield");
	var btn_search = document.getElementById("btn_search");
	if (searchfield) {
		if (e.which != undefined) {
			if (btn_search) {
				btn_search.click();
				escapeFrom.push(function() {
					searchfield.blur();
					btn_search.click();
				});
			} else {
				searchfield.style.display = "block";
				setTimeout(function() {document.getElementById("searchfield").style = ""}, 1000);
			}
			searchfield.value = e.key;
		}
	}
}
function escapeFromFunc(e) {
	if (e.key == "Escape") {
		var len = escapeFrom.length;
		var lastItem = len -1;
		escapeFrom[lastItem]();
		escapeFrom.pop(lastItem);
		e.preventDefault();
	}
}
escapeFrom.push(function() {
	searchfield.blur();
	btn_search.click();
});
document.body.addEventListener("keypress", searchwhentyping);
document.body.addEventListener("keyup", escapeFromFunc);
for (elem of document.getElementsByTagName("input")) {
	if (elem.getAttribute("type") == "text") {
		elem.addEventListener("focus", function() {document.body.removeEventListener("keypress", searchwhentyping);});
		elem.addEventListener("focusout", function() {document.body.addEventListener("keypress", searchwhentyping);});
	}
}
/*document.getElementById("searchfield").addEventListener("focus", function() {document.body.removeEventListener("keypress", searchwhentyping);});
document.getElementById("searchfield").addEventListener("focusout", function() {document.body.addEventListener("keypress", searchwhentyping);});*/
