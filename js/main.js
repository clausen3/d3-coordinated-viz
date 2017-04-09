(function(){

//Global variables
var attrArray = ["Per capita Income", "Food, beverages & tobacco", "Clothing & footwear", "Housing",
 "House furnishing", "Transport & communication", "Recreation", "Education", "Other"];
var expressed = attrArray[0]; //initial attribute


var chartWidth = window.innerWidth * 0.85,
    chartHeight = 473,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 1.01]);


//Script starts when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
	//map frame dimensions
  var width = window.innerWidth * .6,
      height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Projection
	 	var projection = d3.geoRobinson()
		    .center([0, 0])
        .scale(120)
		    .translate([width / 2, height / 2])

	  var path = d3.geoPath()
        .projection(projection);

    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/IncomeElastic.csv") //load attributes from csv
		    .defer(d3.json, "data/countries5.topojson") //load background spatial data

        .await(callback);

  	function callback(error, csvData, world){

        var allCountries = topojson.feature(world, world.objects.collection).features;
        console.log(allCountries);

        joinData(allCountries, csvData);

        setGraticule(map, path);

        //create the color scale
        var colorScale = makeColorScale(csvData);

        setEnumerationUnits(allCountries, map, path, colorScale);

        //add coordinated visualization to the map
        setChart(csvData, colorScale);

        createDropdown(csvData);

        changeAttribute(expressed, csvData);

    };
};//End of setMap

//joins the data of the topofile and csvfile
function joinData(allCountries, csvData){

	//loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i<csvData.length; i++){

        var csvCountry = csvData[i]; //the current region
        var csvKey = csvCountry.name; //the CSV primary key

        //loop through geojson regions to find correct region
        for (var a=0; a<allCountries.length; a++){

            var geojsonProps = allCountries[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.name; //the geojson primary key

            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){

                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvCountry[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };
    return allCountries;
};

//place graticule on the map
function setGraticule(map, path){
  //place graticule lines based on lat / long
  var graticule = d3.geoGraticule()
        .step([30, 30]);

  //create graticule background
  var gratBackground = map.append("path")
      .datum(graticule.outline()) //bind graticule background
      .attr("class", "gratBackground") //assign class for styling
      .attr("d", path) //project graticule

  //create graticule lines
  var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
      .data(graticule.lines()) //bind graticule lines to each element to be created
      .enter() //create an element for each datum
      .append("path") //append each element to the svg as a path element
      .attr("class", "gratLines") //assign class for styling
      .attr("d", path); //project graticule lines
}

//function to class data into 5 natural breaks classes each with different color
function makeColorScale(data){
    var colorClasses = [
        "#edf8e9",
        "#bae4b3",
        "#74c476",
        "#31a354",
        "#006d2c"
    ];

    //create color scale generator
    var colorScale = d3.scaleThreshold()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    //reset domain array to cluster minimums
    domainArray = clusters.map(function(d){
        return d3.min(d);
    });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();

    //assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);

    return colorScale;
};

//function to draw individual countries and style them according to data values
function setEnumerationUnits(allCountries, map, path, colorScale){
    //add countries
    var countries = map.selectAll(".countries")
        .data(allCountries)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "countries " + d.properties.name;
         })
        .attr("d", path)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        })

        .on("mouseover", function(d){
    highlight(d.properties);
})

.on("mouseout", function(d){
    dehighlight(d.properties);
})

.on("mousemove", moveLabel)


        var desc = countries.append("desc")
        .text('{"stroke": "#000", "stroke-width": "0.5px"}')



};

//function to return gray color to empty data values
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (val && val != NaN){
    	return colorScale(val);
    } else {
    	return "#CCC";
    };
};

//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //chart frame dimensions

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);


    //set bars for each province
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.name;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)

        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel)

        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');





    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 600)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text( attrArray[0] + expressed[3] + " in each country");

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    updateChart(bars, csvData.length, colorScale);
};

//function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
    changeAttribute(this.value, csvData)
});

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};

//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var regions = d3.selectAll(".countries")
    .transition()
.duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });

        //re-sort, resize, and recolor bars
var bars = d3.selectAll(".bar")
    //re-sort bars
    .sort(function(a, b){
        return b[expressed] - a[expressed];
    })
    .transition() //add animation
.delay(function(d, i){
    return i * 20
})
.duration(500);

  updateChart(bars, csvData.length, colorScale);

};

//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });

        var chartTitle = d3.select(".chartTitle")
    .text("Number of Variable " + expressed[3] + " in each country");
};


//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.name)
        .style("stroke", "blue")
        .style("stroke-width", "2")
        setLabel(props);
};

function dehighlight(props){
    var selected = d3.selectAll("." + props.name)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
    d3.select(".infolabel")
    .remove();
};

function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.name + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.name);
};

function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1;

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};

})(); //last line of main.js
