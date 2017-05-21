var width = 1000;
var height = 600;
var margin = 0;

var objectIdBusData = "id";

var color = d3.scaleLinear()
    .domain([0,1, 5000])
    .range(["#d9d9d9","#c6dbef","#08306b"]);

var projection = d3.geoMercator()
    .scale(110000)
    .center([24.75,59.43])
    .translate([width / 2, height / 2])
    .clipExtent([[margin,margin],[width,height]])
    .precision(.1);

var path = d3.geoPath()
    .projection(projection);

var maxValues = {};
var timeKeys = {};

var slider = d3.select("#slider")
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

var toolTip = d3.tip()
      .attr("class", "d3-tip")
      .offset([-8, 0])
      .html(function(d) { return Math.round(d.tooltipValue); });

svg.call(toolTip);


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
        .on("mouseover",toolTip.show)
        .on("mouseout",toolTip.hide)
        .on("click",function(d){
            console.log(d);
        });

    change();
}

function change(dropdownChange){
    d3.selectAll(".area")
        .transition().duration(250)
        .delay(function(d){
            var lon = d.geometry.coordinates[0][0][0][0];
            return dropdownChange ? (lon-24.5)*1000 + Math.random()*100 : 0;
        })
        .style("fill",function(d){
            var value;
            if (state.type!="population"){
                value = d[state.type] ? d[state.type][state.time] : 0;
            } else {
                value = d[state.type] || 0;
            }
            d.tooltipValue = value;
            return state.color(value);
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
    timeKeys.bus = Object.keys(data[0])
        .filter(function(d){return d!="id"})
        .sort(function(a,b){return a-b});
    data.forEach(function(row){
        timeKeys.bus.forEach(function(key){
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
    state.time = +slider.property("value");
    change(dropdownChange);
}

function dropDownChange(){
    state.type = this.value;
    color.domain([0,1,maxValues[state.type]]);
    slider.attr("min",d3.min(timeKeys[state.type],function(d){return +d}))
        .attr("max",d3.max(timeKeys[state.type],function(d){return +d}));
    sliderChange(true);
}
