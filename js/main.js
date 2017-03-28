window.onload = setMap();

//set up choropleth map
function setMap(){
	//map frame dimensions
    var width = 960,
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
        .scale(150)
		    .translate([width / 2, height / 2])

	  var path = d3.geoPath()
        .projection(projection);

    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/incomeElasticities.csv") //load attributes from csv
		    .defer(d3.json, "data/therealcountries.topojson") //load background spatial data

        .await(callback);

	function callback(error, csvData, theCountries){

        var worldCountries = topojson.feature(theCountries, theCountries.objects.countries5000);
        console.log(worldCountries);

        //place graticule lines based on lat / long
		    var graticule = d3.geoGraticule()
              .step([15, 15]);

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

		   var Countries1 = map.append("path")
            .datum(worldCountries)
            .attr("class", "Countries1")
            .attr("d", path);

    };
};
