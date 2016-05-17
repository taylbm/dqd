var now = new Date();
var then = new Date(now.getTime() - 182.5 * 24 * 3600 * 1e3);
var month = new Date(now.getTime() - (365/12) * 24 * 3600 * 1e3);
var sevenDays = new Date(now.getTime() - 7 * 24 * 3600 * 1e3);
var timeInterval = {
			'sevenDays':sevenDays/1000,
			'oneMonth':month/1000,
			'sixMonths':then/1000
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
var weights = [0.25,0.33,0.42], // Weights for Rain, Snow, & Bragg methods, respectively
    summaryToolValues = {},
    dailyToolValues = {},
    storeData = {},
    year = now.getFullYear().toString(),
    monthNum = (now.getMonth() + 1).toString(),
    DQDICAO = 'KTLX',
    firstLoad = true,
    MainGage = null, RainGage = null, SnowGage = null, BraggGage = null
;

function dateCheck()
{
    var now = new Date();
    var monthBool = monthNum == (now.getMonth() + 1).toString();
    var yearBool = year == now.getFullYear().toString();
    return monthBool && yearBool
}

function Interval()
{
    check = dateCheck()
    if ( check ) {
        now.setTime(Date.now());
    }
    else {
        now.setUTCFullYear(year,monthNum,0);
        now.setUTCHours(23,59,59,999);
    }
    var sevenDays = new Date(now.getTime() - 7 * 24 * 3600 * 1e3);
    var month = new Date(now.getTime());
    month.setUTCMonth(now.getUTCMonth(), 0)
    then.setTime(now.getTime() - 182.5 * 24 * 3600 * 1e3);
    var interval = {
                        'sevenDays':sevenDays/1000,
                        'oneMonth':month.getTime()/1000,
                        'sixMonths':then/1000
    };
    return interval
}


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
    ;
    var method = pageName.replace('-page', ''),
        possibleChartName = method + '-container',
        pageMainName = method + '-main',
        chartContainer = $('#' + possibleChartName)
	
    ;
    summaryToolValues = {}
    dailyToolValues = {}
        
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
        var redundantChart = {"Chan1" : {'belowDataToPlot':[],'aboveDataToPlot':[],'dailyPoints':[]},
                              "Chan2": {'belowDataToPlot':[],'aboveDataToPlot':[],'dailyPoints':[]}
        }
        ;
	$.each(SummaryData, function (idx, obj) {
                var channel = 'Chan' + obj.redundantMode
                redundantChart[channel]['belowDataToPlot'].push([obj.time * 1e3, obj[methodName] < 0 ? obj[methodName] : null]);
                redundantChart[channel]['aboveDataToPlot'].push([obj.time * 1e3, obj[methodName] >= 0 ? obj[methodName] : null]);
                overTolerance.push([obj.time * 1e3, -0.50 > obj[methodName] || obj[methodName] > 0.50 ? 0.50 : null]);
		summaryToolValues[obj.time * 1e3] = [obj[methodName],channel];
        });
        $.each(DailyData, function(idx, obj) {
            var channel = 'Chan' + obj.redundantMode
            redundantChart[channel]['dailyPoints'].push([obj.time * 1e3, obj[methodName]]);
	    dailyToolValues[obj.time * 1e3] = [obj[methodName],channel];
        });
    }
    else {
        $.each(SummaryData, function (idx, obj) {
                belowDataToPlot.push([obj.time * 1e3, obj[methodName] < 0 ? obj[methodName] : null]);
                aboveDataToPlot.push([obj.time * 1e3, obj[methodName] >= 0 ? obj[methodName] : null]);
                overTolerance.push([obj.time * 1e3, -0.50 > obj[methodName] || obj[methodName] > 0.50 ? 0.50 : null]);
		summaryToolValues[obj.time * 1e3] = [obj[methodName],false];
        });
        $.each(DailyData, function(idx, obj) {
            dailyPoints.push([obj.time * 1e3, obj[methodName]]);
            dailyToolValues[obj.time * 1e3] = [obj[methodName],false];
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
	for (var p = 0; p < plotAdd.length; p++){
            plotOpts.push(
		{
		    data: redundantChart[plotAdd[p]]['belowDataToPlot'],
		    lines:    {
			show: true,
			fill: true,
			fillColor:'rgb(0,0,128)'
		    }
		}
	    );
            plotOpts.push(
		{
		    data: redundantChart[plotAdd[p]]['aboveDataToPlot'],
		    lines:    {
			show: true,	
			fill: true,
			fillColor:'rgb(128,0,0)'
		    }
		}
	    );
        plotOpts.push(
            {
                data:redundantChart[plotAdd[p]]['dailyPoints'],
                color:'black',
                points: {
                    show: true,
                    symbol: plotAdd[p] == "Chan1" ? "circle" : "triangle",
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
        plotOpts.push(
            {
                data: dailyPoints,
                color:'black',
                points: {
                    show: true,
                    symbol: "circle"
                }
            }
        );

    }
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

function determineOverview(chan,initialData)
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
    var timeInterval = Interval()
    if(redundantBool){
	rBragg = {'Chan1':[],'Chan2':[]};
        rSnow = {'Chan1':[],'Chan2':[]};
        rRain = {'Chan1':[],'Chan2':[]};
	
	if(time != 'latestVolume'){
            $.each(DailyData, function(idx,obj){
                if(timeInterval[time] <= obj.time){
		    var channel = 'Chan' + obj.redundantMode
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
		if (obj.redundantMode == chan.replace('Chan','')) {
                    tRain = obj.medianRain;
            	    tSnow = obj.medianSnow;
            	    tBragg = obj.medianBragg;
		    return false;
		}
	    });
	}
		    
    }
    else {
        if(time != 'latestVolume'){
            $.each(DailyData, function(idx,obj){
                if(timeInterval[time] <= obj.time){
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

function loadDQDData() 
{
    var load_string = 'dqd/dqdwalk?d=' + monthNum + '-' + year + '-' + DQDICAO
    $('.sites').html(DQDICAO+' - Shade Chart - Past 6 Months');
    $('#site').html(DQDICAO);
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
            determineOverview('Chan1',data)
	    $('#statsFound').html('Total ZDR Stats Processed: ' + data['statsFound'].toString())
	    $('#endStamp').html('6 Month Period Ending: ' + now.getUTCDate() + ' ' + numberToMonth[(now.getUTCMonth() + 1).toString()] + ' ' + now.getUTCFullYear())
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
       	$( ":mobile-pagecontainer" ).on( "pagecontainershow", function() {
	    var pageName = $(this)[0].baseURI.split('#')[1]
	    var page = pageName.replace('-page','')
	    if ( pageName == "dqd-page" ) 
		$('#selectDQDICAO').popup('open')

	    if ( ['rain-page','snow-page','bragg-page'].indexOf(pageName) >= 0) {
	        var pointClicked = false,
	            clicksYet = false,
	      	    previousPoint = null
	        ;
	        if ( !$.isEmptyObject(storeData) ) {
		    var channel = $('#channel-form :checked').val()
		    if ( storeData['redundantBool'] ) { 
                        $('input[name=channel-toggle]').prop('checked',false).trigger('refresh');
                        $('#' + page + channel).prop('checked',true).checkboxradio('refresh');
		 	setSizes(pageName, [channel])
                        $('input[name=channel-toggle]').on("click", function() {
                            var name = $(this).attr("class")
                            var selectedChannels = $('input[type="checkbox"]').filter('.' + name).map(function(){
                                if ( $(this).is(':checked') )
                                    return $(this).val();
                            });
                            setSizes(pageName, selectedChannels); 
                        });
		    }
		    else { 
			setSizes(pageName, [channel])
		    }
		}	
		$("#"+page+"-container").bind("plothover",function(event, pos, item) {
		    if (item) {
			if (previousPoint != item.datapoint) {	
			    previousPoint = item.datapoint;
			    $("#tooltip").remove();
			    var x = item.datapoint[0],
				y = item.datapoint[1],
				l = item.datapoint.length
			    ;
			    var actualValues = l == 3 || item.seriesIndex == 5 ? summaryToolValues[x] : dailyToolValues[x]
			    var actual = actualValues[0]
			    if (Math.abs(y) < 0.50)
				var actual = y;
			    var d = new Date(x)
			    var month = d.getUTCMonth()+1;
			    var day = d.getUTCDate();
			    var year = d.getUTCFullYear();
			    var chan = actualValues[1] ? actualValues[1] + " " : ""
			    showTooltip(item.pageX, item.pageY, 
				chan + actual.toFixed(2) +"dB on "+ month+"/"+day+"/"+year
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

	$('#submitDQDDate').on('click', function() {
	    year = $('#selectYear').val();
	    monthNum = $('#selectMonth :selected').attr('id');
	    loadDQDData();
	});

	$('.DQDICAO').on('click', function () {
	    DQDICAO = $(this).attr("id");
	    $('#selectDQDICAO').popup('close');
	    loadDQDData();
	});
	$('#latestVolume').prop('checked',true).click();
	$('#overviewChan1').prop('checked',true).click();
	
	$('input[name="time-select"]').on('click',function(){
	    var channel = $('#channel-form :checked').val()
	    determineOverview(channel,false);
	});
	$('input[name="overview-channel-select"]').on('click',function(){
	    var channel  = $(this).attr('value');
	    determineOverview(channel,false);
	});
	
});
