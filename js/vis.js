var width = 1000;
var height = 600;
var margin = 0;

var color = d3.scaleLinear()
    .domain([1, 10, 50, 200, 500, 1000, 2000, 4000])
    .range(d3.schemeOrRd[9]);

var projection = d3.geoMercator()
    .scale(110000)
    .center([24.75,59.43])
    .translate([width / 2, height / 2])
    .clipExtent([[margin,margin],[width,height]])
    .precision(.1);

var path = d3.geoPath()
    .projection(projection);

var stopSizeScale = d3.scaleLinear().range([1,10]).domain([0,220]);

var stopOpacity = d3.scaleLinear().range([0.7,0.7]).domain([0,220]);

//var populationScale = d3.scaleLi

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

queue()
    .defer(d3.json,"data/Populatsioon_grid.geojson")
    .defer(d3.csv, "data/bus_stops_first.csv")
   // .defer(d3.json,"uk.json")
    //.defer(d3.tsv, "world-country-names.tsv")
    .await(draw);

function draw(error,mapData,stops){

    mapData = mapData.features;

    stops = transformStopData(stops);

    var polygons = svg.append("g").selectAll(".country")
        .data(mapData)
        .enter().insert("path", ".graticule")
        .attr("class", "area")
        .attr("d", function(d){return path(d)})
        .style("fill",function(d,i){debugger;
            return d3.interpolateBlues(d.properties.rahvaarv_e/5000+0.1);
            //return color(d.properties.rahvaarv_e);
            //return d3.interpolateBlues(1-d.distance/700);
        })
        .on("click",function(d){
            console.log(d);
        });

    /*polygons.append("title")
        .text(function(d){
            return d.properties.rahvaarv_e;
        });*/

    svg.selectAll(".stop").data(stops).enter()
        .append("circle").attr("class","stop")
        .attr("cx",function(d){ return d.values[0].x})
        .attr("cy",function(d){return d.values[0].y})
        .attr("r",function(d){return stopSizeScale(d.values[0].value)})
        .style("fill","#cc4c02")
        .style("opacity",function (d) {
            return stopOpacity(d.values[0].value)
        });
}

function transformStopData(data){
    data.forEach(function(row){
        row.value = +row["Count of real_date"];
        row.id = row.stop_lon + row.stop_lat;
        row.time_slot = row.time_slot.slice(11,16);
        row.stop_lon = +row.stop_lon;
        row.stop_lat = +row.stop_lat;
        row.location = projection([row.stop_lon,row.stop_lat]);
        row.x = row.location[0];
        row.y = row.location[1];
    });

    data = d3.nest()
        .key(function(d){return d.id})
        .entries(data);

    return data;
}
