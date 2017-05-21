var width = 1000;
var height = 600;
var margin = 0;

var objectIdBusData = "id";

var color = d3.scaleLinear()
    .domain([0,1, 4000])
    .range(["#d9d9d9","#c6dbef","#08306b"]);

var sliderThresholds = d3.scaleQuantize()
    .domain([0,20])
    .range([9,10,11,12]);

var projection = d3.geoMercator()
    .scale(110000)
    .center([24.75,59.43])
    .translate([width / 2, height / 2])
    .clipExtent([[margin,margin],[width,height]])
    .precision(.1);

var path = d3.geoPath()
    .projection(projection);

var maxValues = {};

var stopSizeScale = d3.scaleLinear().range([1,10]).domain([0,220]);

var stopOpacity = d3.scaleLinear().range([0.7,0.7]).domain([0,220]);

d3.select("#slider")
    .on("input", sliderChange)
    .on("change", sliderChange);

d3.select("#drop-down")
    .on("change", dropDownChange);

//var populationScale = d3.scaleLi

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

svg.append("text").text("Smart mobility").attr("class","title")
    .attr("x",75).attr("y",50);

svg.append("text").text("9:00 - 10:00").attr("class","slider hidden")
    .style("font-size","20px")
    .attr("id","slider-text")
    .attr("x",600).attr("y",530);


var state = {
    type: "population",
    time: "",
    color: color
};

queue()
    .defer(d3.json,"data/Populatsioon_grid.geojson")
    .defer(d3.csv, "data/bus_stops_first.csv")
    .defer(d3.csv,"data/bus.csv")
    //.defer(d3.tsv, "world-country-names.tsv")
    .await(draw);

function draw(error,mapData,stops,busGridData){
    mapData = mapData.features;

    busGridData = tranformBusGridData(busGridData);

    stops = transformStopData(stops);

    var gridData = combineSources(mapData,busGridData);

    var polygons = svg.append("g").selectAll(".country")
        .data(mapData)
        .enter().insert("path", ".graticule")
        .attr("class", "area")
        .attr("d", function(d){return path(d)})
        .style("fill","#d9d9d9")
       /* .style("fill",function(d,i){
            return d3.interpolateBlues(d.properties.rahvaarv_e/5000+0.1);
            //return color(d.properties.rahvaarv_e);
            //return d3.interpolateBlues(1-d.distance/700);
        })*/
        .on("click",function(d){
            console.log(d);
        });
    /*polygons.append("title")
        .text(function(d){
            return d.properties.rahvaarv_e;
        });

    svg.selectAll(".stop").data(stops).enter()
        .append("circle").attr("class","stop")
        .attr("cx",function(d){ return d.values[0].x})
        .attr("cy",function(d){return d.values[0].y})
        .attr("r",function(d){return stopSizeScale(d.values[0].value)})
        .style("fill","#cc4c02")
        .style("opacity",function (d) {
            return stopOpacity(d.values[0].value)
        });*/

    change();
}

function change(dropdownChange){
    d3.selectAll(".area")
        .transition().duration(250)
        .delay(function(d){
            var lon = d.geometry.coordinates[0][0][0][0];
            return dropdownChange ? (lon-24.5)*1000 : 0;
        })
        .style("fill",function(d){
            if (state.type!="population"){
                var value = d[state.type] ? d[state.type][state.time] : 0;
                return state.color(value);
            } else {
                return state.color(d[state.type] || 0);
            }
        });
    
    d3.selectAll(".slider").classed("hidden", state.type=="population" );
    d3.select("#slider-text").text(
        state.time + ":00 - " + (state.time + 1) + ":00"
    );
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

function tranformBusGridData(data){
    var max = 0;
    data.forEach(function(row){
        Object.keys(row).forEach(function(key){
            if (key!=objectIdBusData){
                row[key] = +row[key];
                max = d3.max([max, +row[key]]);
            }
        })
    });
    maxValues.bus = max;
    return d3.map(data,function(d){return d[objectIdBusData]})
}

function combineSources(mapData,busGridData){

    mapData.forEach(function(row){
        var id = row.properties.OBJECTID;
        row.population = row.properties.rahvaarv_e;
        row.bus = busGridData.get(id);
    });

    maxValues.population = d3.max(mapData,function(d){return d.population});
}

function sliderChange(dropdownChange){
    var slider = d3.select("#slider");
    state.time = sliderThresholds(+slider.property("value"));
    change(dropdownChange);
}

function dropDownChange(){
    state.type = this.value;
    color.domain([0,1,maxValues[state.type]]);
    sliderChange(true);
}
