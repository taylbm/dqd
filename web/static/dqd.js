var now = new Date();
var then = new Date(now.getTime() - 182.5 * 24 * 3600 * 1e3);
var month = new Date(now.getTime() - (365/12) * 24 * 3600 * 1e3);
var sevenDays = new Date(now.getTime() - 7 * 24 * 3600 * 1e3);
var timeInterval = {
			'7Days':sevenDays/1000,
			'1Month':month/1000,
			'6Months':then/1000
};
var numberToMonth = {
	'1' : 'Jan',
	'2' : 'Feb',
	'3' : 'Mar',
	'4' : 'Apr',
	'5' : 'May',
	'6' : 'Jun',
	'7' : 'Jul',
	'8' : 'Aug',
	'9' : 'Sep',
	'10' : 'Oct',
	'11' : 'Nov',
	'12' : 'Dec'
}
var weights = [0.25,0.33,0.42] // Weights for Rain, Snow, & Bragg methods, respectively
var storeValues = {};
var storeData = {};
var year = now.getFullYear().toString();
var monthNum = (now.getMonth() + 1).toString();
var ICAO = 'KTLX';
var firstLoad = true;
var MainGage = null, RainGage = null, SnowGage = null, BraggGage = null;
function recalcInterval(year,monthNum)
{
    now.setUTCFullYear(year,monthNum,0);
    now.setUTCHours(23,59,59,999);
    then.setTime(now.getTime() - 182.5 * 24 * 3600 * 1e3);
    var sevenDaysNew = new Date(now.getTime() - 7 * 24 * 3600 * 1e3);
    var monthNew = new Date(now.getTime());
    monthNew.setUTCMonth(now.getUTCMonth(), 0)
    var thenNew = new Date(now.getTime() - 182.5 * 24 * 3600 * 1e3);
    var interval = {
	    		'7Days':sevenDaysNew/1000,
	    		'1Month':monthNew.getTime()/1000,
	    		'6Months':thenNew/1000
    };
    return interval
}
function mean(arr)
{
    var i,
        sum = 0,
	len = arr.length;
    for (i=0; i < len; i++) {
	sum += arr[i];
    }
    return sum / len;
}

function median(arr) 
{

    arr.sort( function(a,b) {return a - b;} );

    var half = Math.floor(arr.length/2);

    if(arr.length % 2)
        return arr[half];
    else
        return (arr[half-1] + arr[half]) / 2.0;
}

function dBMeanWeighted(arr) 
{
    var weightedLinearPow = 0;
    var weight = 0;
    for (var i in arr) {
	weightedLinearPow += weights[i]*Math.pow(10,(arr[i]/10))
	weight += weights[i]
    }	
    var weightedLinearMean = weightedLinearPow/weight;
    var convertedBack = 10 * Math.log10(weightedLinearMean);
    return convertedBack;
}

function showTooltip(x, y, contents) {
    $('<div id="tooltip">' + contents + '</div>').css( {
        position: 'absolute',
        display: 'none',
        top: y + 5,
        left: x + 5,
        border: '1px solid #fdd',
        padding: '2px',
        'background-color': '#fee',
        opacity: 0.80
    }).appendTo("body").fadeIn(200);
}

function setSizes(pageName, plotAdd)
{
    var SummaryData = storeData['SummaryData'],
        DailyData = storeData['DailyData'],
        redundantBool = storeData['redundantBool']
	redundant = storeData['redundant']
    ;
    var method = pageName.replace('-page', ''),
        possibleChartName = method + '-container',
        pageMainName = method + '-main',
        chartContainer = $('#' + possibleChartName)
	
    ;
    storeValues = {}
        
    if (chartContainer.length < 1)
        return;
    chartContainer.height('400').width($(document).width() * 0.8).css('margin', 'auto');
    
    var belowDataToPlot = [],
        aboveDataToPlot = [],
	dailyPoints	= [],
	overTolerance	= []
    ;
    var methodName = 'median' + method[0].toUpperCase() + method.slice(1) 
    if(redundantBool){
	var chan1 = {'belowDataToPlot':[],'aboveDataToPlot':[]}	
	    chan2 = {'belowDataToPlot':[],'aboveDataToPlot':[]}
	; 
        $.each(SummaryData, function (idx, obj) {
                var channel = 'chan' + redundant[idx]
                eval(channel)['belowDataToPlot'].push([obj.time * 1e3, obj[methodName] < 0 ? obj[methodName] : null]);
                eval(channel)['aboveDataToPlot'].push([obj.time * 1e3, obj[methodName] >= 0 ? obj[methodName] : null]);
                overTolerance.push([obj.time * 1e3, -0.50 > obj[methodName] || obj[methodName] > 0.50 ? obj[methodName] : null]);
                storeValues[obj.time * 1e3] = obj[methodName];
        });
        $.each(DailyData, function(idx, obj) {
            dailyPoints.push([obj.time * 1e3, obj[methodName]]);
        });
    }
    else {
        $.each(SummaryData, function (idx, obj) {
                belowDataToPlot.push([obj.time * 1e3, obj[methodName] < 0 ? obj[methodName] : null]);
                aboveDataToPlot.push([obj.time * 1e3, obj[methodName] >= 0 ? obj[methodName] : null]);
                overTolerance.push([obj.time * 1e3, -0.50 > obj[methodName] || obj[methodName] > 0.50 ? 0.50 : null]);
                storeValues[obj.time * 1e3] = obj[methodName];
        });
        $.each(DailyData, function(idx, obj) {
            dailyPoints.push([obj.time * 1e3, obj[methodName]]);
        });

    }
    var plotOpts =         
	[
            {
                id: 'topTolerance',
                data: [[then, 0.2], [now, 0.2]],
                lines:  {show: true, lineWidth: 0, fill: false}
            },
            {
                data: [[then, -0.2], [now, -0.2]],
                lines:  {
                    show: true,
                    lineWidth: 0,
                    fill: 0.2
                },
                color: 'rgb(128, 128, 255)',
                fillBetween: 'topTolerance'
            }
        ]
    if (redundantBool){
	for (p in plotAdd){
            plotOpts.push(
		{
		    data: eval(plotAdd[p])['belowDataToPlot'],
		    lines:    {
			show: true,
			fill: true,
			fillColor:'rgb(0,0,128)'
		    }
		}
	    );
            plotOpts.push(
		{
		    data: eval(plotAdd[p])['aboveDataToPlot'],
		    lines:    {
			show: true,	
			fill: true,
			fillColor:'rgb(128,0,0)'
		    }
		}
	    );
    	}
    }
    else{
	plotOpts.push(            
	    {
                data: belowDataToPlot,
                lines:   {
                    show: true,
                    fill:   true,
                    fillColor:  'rgb(0, 0, 128)'
                },
                points: {
                    show: false
                }
            }
	);
	plotOpts.push(
            {
                data: aboveDataToPlot,
                lines:   {
                    show: true,
                    fill:   true,
                    fillColor:  'rgb(128, 0, 0)'
                },
                points: {
                    show: false
                }
            }
	);
    }

    plotOpts.push(
        {
            data:dailyPoints,
            color:'black',
            points: {
                show: true,
                symbol: "cross",
            }
        }
    );
    plotOpts.push(
	{
	    data: overTolerance,
	    color: 'black',
	    points: {
		show: true,
		symbol: "square",
	    }
	}
    );
    $.plot(
        chartContainer,plotOpts, 
        {
	    grid: { hoverable: true },
            yaxis:  {
                min:    -0.5,
                max:    0.5,
                ticks:  [-0.5, -0.2, 0.0, 0.2, 0.5],
                tickFormatter:  function (v) { return v + ' dB'; }
            },
            xaxis: {
                mode: 'time', 
                timeformat: '%m/%d',
                min:    then,
                max:    now
            }
        }
    );
    
}

function normalizeToGage(val)
{
    return Math.max(0, Math.min(100, Math.round(val / 1.0 * 50 + 50)));
}

function determineOverview(chan,recalc,initialData)
{
    var DailyData = initialData ? initialData['DailyData'] : storeData['DailyData'],
        redundantBool = initialData ? initialData['redundantBool'] : storeData['redundantBool']
	redundant = initialData ? initialData['redundant'] : storeData['redundant']
    ;
    var tBragg = -99,
        tSnow = -99,
        tRain = -99,
	mBragg = [],
	mSnow = [],
	mRain = []
    ;
    var time = $('#time-form :checked').val()
    var timeIntervalLocal = recalc ? recalcInterval(year,monthNum) : timeInterval
    if(redundantBool){
	rBragg = {'chan1':[],'chan2':[]};
        rSnow = {'chan1':[],'chan2':[]};
        rRain = {'chan1':[],'chan2':[]};
	
	if(time != 'MostRecent'){
            $.each(DailyData, function(idx,obj){
                if(timeIntervalLocal[time] <= obj.time){
		    var channel = 'chan' + redundant[idx]
                    rBragg[channel].push(obj.medianBragg);
                    rSnow[channel].push(obj.medianSnow);
                    rRain[channel].push(obj.medianRain);
                }
            });	
            tRain = median(rRain[chan].filter(function(val) {return val !== null;}))
            tSnow = median(rSnow[chan].filter(function(val) {return val !== null;}))
            tBragg = median(rBragg[chan].filter(function(val) { return val !== null;}))  
        }
        else {
	    var copyData = JSON.parse(JSON.stringify(DailyData)).reverse()
	    $.each(copyData,function(idx,obj) {
		if (redundant[idx] == chan.replace('chan','')) {
                    tRain = obj.medianRain;
            	    tSnow = obj.medianSnow;
            	    tBragg = obj.medianBragg;
		    return false;
		}
	    });
	}
		    
    }
    else {
        if(time != 'MostRecent'){
            $.each(DailyData, function(idx,obj){
                if(timeIntervalLocal[time] <= obj.time){
                    mBragg.push(obj.medianBragg);
                    mSnow.push(obj.medianSnow);
                    mRain.push(obj.medianRain);
                }
            });
            tRain = median(mRain.filter(function(val) {return val !== null;}))
            tSnow = median(mSnow.filter(function(val) {return val !== null;}))
            tBragg = median(mBragg.filter(function(val) { return val !== null;}))
        }
        else
            tRain = DailyData[DailyData.length - 1].medianRain,
            tSnow = DailyData[DailyData.length - 1].medianSnow,
            tBragg = DailyData[DailyData.length - 1].medianBragg
        ;
    }
		    	
    var valsForOverview = {};
    
    $.each([tRain, tSnow, tBragg], function (idx, obj) {
        if (obj > -99.0 && obj != null) 
            valsForOverview[idx] = obj;
    });
    MainGage.refresh(dBMeanWeighted(valsForOverview));
    if (tRain == null || tRain == -99)
        RainGage.refresh(Number.NaN);
    else
	RainGage.refresh(tRain);
    if (tSnow == null || tSnow == -99)
	SnowGage.refresh(Number.NaN);
    else
        SnowGage.refresh(tSnow);
    if(tBragg == null || tBragg == -99)
	BraggGage.refresh(Number.NaN);
    else
        BraggGage.refresh(tBragg);
}

function makeGages()
{
    MainGage = new JustGage({
        id:                     'main-gauge',
	value:			-99,
        min:                    -0.5,
        max:                    0.5,	
	decimals:		2,
	pointer:		true,
        title:                  'Overall ZDR data quality',
        levelColors:            ['#000000', '#ff0000', '#ffff00', '#00cc00','#00cc00','#ffff00', '#ff0000', '#000000'],
        levelColorsGradient:    true,
        label:                  'dB',
        showMinMax:             true
    });
    RainGage = new JustGage({
        id:                     'rain-gauge',
        value:                  -99,
        min:                    -0.5,
        max:                    0.5,
	decimals:		2,
	pointer:		true,
        title:                  'ZDR rain method',
        levelColors:            ['#000000', '#ff0000', '#ffff00', '#00cc00','#00cc00','#ffff00', '#ff0000', '#000000'],
        levelColorsGradient:    true,
        label:                  'dB',
        showMinMax:             true
    });
    SnowGage = new JustGage({
        id:                     'snow-gauge',
        value:                  -99,
        min:                    -0.5,
        max:                    0.5,
	decimals:		2,
	pointer:		true,
        title:                  'ZDR snow method',
        levelColors:            ['#000000', '#ff0000', '#ffff00', '#00cc00','#00cc00','#ffff00', '#ff0000', '#000000'],
        levelColorsGradient:    true,
        label:                  'dB',
        showMinMax:             true
    });
    BraggGage = new JustGage({
        id:                     'bragg-gauge',
        value:                  -99,
        min:                    -0.5,
        max:                    0.5,
	decimals:		2,
	pointer:		true,
        title:                  'ZDR Bragg method',
        levelColors:            ['#000000', '#ff0000', '#ffff00', '#00cc00','#00cc00','#ffff00', '#ff0000', '#000000'],
        levelColorsGradient:    true,
        label:                  'dB',
        showMinMax:             true
    });


}

function loadData(recalc){
    var load_string = 'dqdwalk?d=' + monthNum + '-' + year + '-' + ICAO
    $('.sites').html(ICAO+' - Shade Chart - Past 6 Months');
    $('#site').html(ICAO);
    $('#selectMonth').val(numberToMonth[monthNum]).selectmenu('refresh')
    $('#selectYear').val(year).selectmenu('refresh')
    $('.ui-loader').css('display','initial')
    $.getJSON(load_string, function (data) {
	$('.ui-loader').css('display','none')
	if ( $.isEmptyObject(data) ) {
	    alert("No ZDR Stats Available, please run dqdwalk to acquire the data, then refresh the page")
	}
	else {
	    if ( firstLoad )
	        makeGages();
		firstLoad = false
	    $.each(data['SummaryData'], function (idx, obj) {
		data['SummaryData'][idx].medianRain = obj.medianRain > -99.0 ? obj.medianRain : null;
		data['SummaryData'][idx].medianSnow = obj.medianSnow > -99.0 ? obj.medianSnow : null;
		data['SummaryData'][idx].medianBragg = obj.medianBragg > -99.0 ? obj.medianBragg : null;
	    });
	    $.each(data['DailyData'],function(idx,obj) {
		data['DailyData'][idx].medianRain = obj.medianRain > -99.0 ? obj.medianRain : null;
		data['DailyData'][idx].medianSnow = obj.medianSnow > -99.0 ? obj.medianSnow : null;
		data['DailyData'][idx].medianBragg = obj.medianBragg > -99.0 ? obj.medianBragg : null;
	    });
            determineOverview('chan1',recalc,data)
	    $('#statsFound').html('Total ZDR Stats Processed: ' + data['statsFound'].toString())
	}
	var disp_redund = data['redundantBool'] ? 'initial' : 'hidden'
	$('.redundant').css('visibility',disp_redund);
	storeData = data;
    })
    .error(function (jqXHR, textStatus, errorThrown) {	
	alert('Internal Server Error :(' )
	$('.ui-loader').css('display','none')
    })
    ;
};



$(document).ready(function () {	
       	$( ".chart-page" ).on( "click", function() {
	    var pointClicked = false,
		clicksYet = false,
		previousPoint = null
	    ;
	    var pageName = $(this).attr('href').replace('#','')
	    if ( !$.isEmptyObject(storeData) ) {
		setSizes(pageName)
		var page = pageName.replace('page','')
		$("#"+page+"redundant #toggle").find("input[type='checkbox']").click(function () {
		    var dataSet = [];
		    $("#"+page+"redundant #toggle").find("input[type='checkbox']").each(function () {
			if ($(this).is(":checked")) {
			    var position = $(this).attr("id");
			    dataSet.push(position);
			}
		    });
		    setSizes(pageName,dataSet)
		});
		$("#"+page+"container").bind("plothover",function(event, pos, item) {
		    if (item) {
			if (previousPoint != item.datapoint) {	
			    previousPoint = item.datapoint;
			    $("#tooltip").remove();
			    var x = item.datapoint[0],
				y = item.datapoint[1]
			    ;
			    var actual = storeValues[x]
			    if (Math.abs(y) < 0.50)
				var actual = y;
			    var d = new Date(x)
			    var month = d.getUTCMonth()+1;
			    var day = d.getUTCDate();
			    var year = d.getUTCFullYear();
			    showTooltip(item.pageX, item.pageY, 
				actual +"dB on "+ month+"/"+day+"/"+year
			    );
			}
		    }
		    else {
			$("#tooltip").remove();
			clicksYet = false;
			previousPoint = null;
		    } 	
		});
	    }
	});

	$('#submitDate').on('click', function() {
	    year = $('#selectYear').val();
	    monthNum = $('#selectMonth :selected').attr('id');
	    loadData(true);
	});

	$('.ICAO').on('click', function () {
	    ICAO = $(this).attr("id");
	    $('#selectICAO').popup('close');
	    loadData(false);
	});
	$('#choice-4').prop('checked',true).click();
	$('#choice-5').prop('checked',true).click();
	
	$('input[name="time-select"]').on('click',function(){
	    var channel = $('#channel-form :checked').val()
	    var nowTemp = new Date();
	    var recalc = monthNum != (nowTemp.getMonth() + 1).toString()
	    determineOverview(channel,recalc,false);
	});
	$('input[name="channel-select"]').on('click',function(){
	    var channel  = $(this).attr('value');
	    var nowTemp = new Date();
	    var recalc = monthNum != (nowTemp.getMonth() + 1).toString() 
	    determineOverview(channel, recalc,false);
	});
	$('#selectICAO').popup('open')
			
	
});
