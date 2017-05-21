var width = 1000;
var height = 600;
var margin = 0;

var objectIdBusData = "id";

var color = d3.scaleLinear()
    .domain([0,1, 5000])
    .range(["#d9d9d9","#c6dbef","#08306b"]);

var colorRanges = {
    population: ["#d9d9d9","#c6dbef","#08306b"],
    bus2: ["#d9d9d9","#fee391","#cc4c02","#a50f15"],
    tele2: ["#d9d9d9","#fff5f0","#a50f15"]
};

var colorDomains = {
    population: [0,1, 5659],
    bus2: [0,1,500,1300],
    tele2: [0,1,2129]
};

var projection = d3.geoMercator()
    .scale(110000)
    .center([24.75,59.43])
    .translate([width / 2, height / 2])
    .clipExtent([[margin,margin],[width,height]])
    .precision(.1);

var path = d3.geoPath()
    .projection(projection);

var maxValues = {};
var timeKeys = {
    bus2: ["6", "6_30", "7", "7_30", "8", "8_30", "9", "9_30", "10", "10_30", "11", "11_30", "12", "12_30", "13", "13_30", "14", "14_30", "15", "15_30", "16", "16_30", "17", "17_30", "18", "18_30", "19", "19_30", "20", "20_30", "21", "21_30", "22", "22_30", "23_30"]
};

var slider = d3.select("#slider")
    .on("input", sliderChange)
    .on("change", sliderChange);

d3.select("#drop-down")
    .on("change", dropDownChange);

//var populationScale = d3.scaleLi

var svg = d3.select("#main-container").append("svg")
    .attr("width", width)
    .attr("height", height);

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
    .defer(d3.csv, "data/tele2_2.csv")
    .defer(d3.csv, "data/bus_stops.csv")
    .await(draw);

function draw(error,mapData,stops,busGridData,tele2,newStops){
    mapData = mapData.features;

    busGridData = tranformBusGridData(busGridData);

    stops = transformStopData(stops);
    var stopsNested = nestBus(newStops);
    newStops = transformNewStops(stopsNested);

    tele2 = transformTele2(tele2);

    var gridData = combineSources(mapData,busGridData,tele2,newStops);

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

function nestBus(data){

    var r = d3.nest()
        .key(function(d){return d.CellID})
        .key(function(d){return d.time_slot})
        .rollup(function(leaves){
            return d3.sum(leaves,function(d){return d.sum_all})
        })
        .entries(data);

    r.forEach(function(row){
        row.values.forEach(function(d){
            row[busKeyConverter(d.key)] = d.value;
        });
        timeKeys.bus2.forEach(function(key){
            if (!row[key]){
                row[key] = 0
            }
        })
    });

    return r;
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
                if (d.bus2) debugger;
                value = d[state.type] ? d[state.type][state.time] : 0;
            } else {
                value = d[state.type] || 0;
            }
            d.tooltipValue = value;
            return state.color(value);
        });

    d3.selectAll(".slider").classed("hidden", state.type=="population" );
    d3.select("#slider-text").text(formatSliderText(state.time));
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

function transformNewStops(data){
    var max = 300;
    /*timeKeys.bus2 = Object.keys(data[0])
        .filter(function(d){return d!="key" && d!="values"})
        .sort(function(a,b){
            return tele2keytonr(a)-tele2keytonr(b);
        });
    console.log(timeKeys.bus2)*/
    maxValues.bus2 = max;
    return d3.map(data,function(d){return d.key})
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

function combineSources(mapData,busGridData,tele2,newStops){

    mapData.forEach(function(row){
        var id = row.properties.OBJECTID;
        row.population = row.properties.rahvaarv_e;
        row.bus = busGridData.get(id);
        row.tele2 = tele2.get(id);
        row.bus2 = newStops.get(id);
    });

    maxValues.population = d3.max(mapData,function(d){return d.population});
}

function sliderChange(dropdownChange){
    if (state.type != "population"){
        state.time = timeKeys[state.type][+slider.property("value")];
    }
    change(dropdownChange);
}

function dropDownChange(){
    state.type = this.value;
    color.domain(colorDomains[state.type])
        .range(colorRanges[state.type]);
   // debugger;
    if (state.type != "population"){
        slider.attr("max",timeKeys[state.type].length-1);
    }
    sliderChange(true);
}

function transformTele2(data){
    var max = 0;
    timeKeys.tele2 = Object.keys(data[0])
        .filter(function(d){return d!="OBJECTID"})
        .sort(function(a,b){
            return tele2keytonr(a)-tele2keytonr(b);
        });

    data.forEach(function(row){
        timeKeys.tele2.forEach(function(key){
            row[key] = +row[key];
            max = d3.max([max, +row[key]]);
        })
    });
    maxValues.tele2 = max;
    return d3.map(data,function(d){return d.OBJECTID})
}

function tele2keytonr(key){
    return +key.replace("_",".")
}

function busKeyConverter(key){
    var hour = +key.split(":")[0];
    var mins = +key.split(":")[1];
    var PM = key.split(" ")[1];

    return hour+(PM?12:0) + (mins? "_30" : "")
}

function formatSliderText(time){
    if (state.type == "bus"){
        return +time + ":00 - " + (+time + 1) + ":00"
    } else {
        if(time.indexOf("_")==-1){
            return time + ":00 - " + (+time + 1) + ":30"
        } else {
            var hour = time.split("_")[0];
            return hour + ":30 - " + (+hour+1) + ":00"
        }
    }

}
