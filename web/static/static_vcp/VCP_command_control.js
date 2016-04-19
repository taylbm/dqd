

var TestRanges = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
var VcpData = {};
var ElevList = {};
var vcps = []
var i;
var full_dataset = [];
var VCP_LATEST = {'SET':0};
var colorTable = {"CS/CD":"rgb(40, 255, 40)","BATCH":"rgb(255, 40, 40)","CDBATCH":"rgb(40, 40, 255)"}


if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}
smonth=new Array("Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sept","Oct","Nov","Dec");
function timeStamp(){
    var d=new Date();
    var nday=d.getUTCDay(),nmonth=d.getUTCMonth(),ndate=d.getUTCDate(),nyear=d.getUTCFullYear();
    if(nyear<1000) nyear+=1900;
    var d=new Date();
    var nhour=d.getUTCHours(),nmin=d.getUTCMinutes(),nsec=d.getUTCSeconds();
    if(nmin<=9) nmin="0"+nmin
    if(nsec<=9) nsec="0"+nsec;
    return smonth[nmonth]+" "+ndate+","+nyear%100+" "+"["+nhour+":"+nmin+":"+nsec+"]";
}

var RefractiveIndex = 1.21, EarthRadius = 6371.0;

function beamHeight(elevation, slantRange)
{
	return (slantRange * Math.sin(elevation * 3.14159 / 180.0) + (slantRange * slantRange) / (2 * RefractiveIndex * EarthRadius)) * 3280.84;
}


function vcpUpdate(){
    $.getJSON("/current_vcp", function(attr){
        if (VCP_LATEST['LATEST'] != attr['vcp_num']){
            $('#'+VCP_LATEST['LATEST']).removeClass('ui-icon-check-green')
        }
        if (VCP_LATEST['SET'] == 0){
            $('#'+attr['vcp_num'].toString()).addClass('ui-icon-check-green')
        }
        VCP_LATEST['LATEST'] = attr['vcp_num']
        VCP_LATEST['SET'] = 1;
    });
}
	

function plotVCPs(vcps){

    for (i in vcps){
	var this_vcp = vcps[i].toString()
	VcpData[this_vcp] = [];
	(function(i){len = vcps.length-1;
	    $.getJSON("/parse_vcps?VCP="+vcps[i], function(elev){
  	        var elevs = [];
		var waveform = {};
                $.each(elev.Elev_attr, function(i, field){
		    elevs.push(field.elev_ang_deg);
		    if (field.waveform_type == 'CS')
		        waveform[field.elev_ang_deg] = field.waveform_type + '/CD';
		    else if (field.waveform_type != 'CD')
			waveform[field.elev_ang_deg] = field.waveform_type;
                });
	        elevs.sort(function(a, b){return a-b});
	        elevs = elevs.filter(Number);	
		setFlags = {"CS/CD":0,"BATCH":0,"CDBATCH":0}
                $.each(elevs, function (zIdx, zVal) {
                    var lower = {
                        id:     'elev-' + zIdx + '-lower',
                        data:   [],	
                        lines:  {
                            lineWidth:  0.3,
			color: colorTable[waveform[zVal]]
                        }
                    }; 
		    if (!setFlags[waveform[zVal]]) {
			setFlags[waveform[zVal]] = 1;
                        var upper = {
                            id:     'elev-' + zIdx,
                            data:   [],
			    label: waveform[zVal],
                            lines:  {
                                lineWidth:  0.3,
                                fill:       0.5
                            },
			    color: colorTable[waveform[zVal]],
                            fillBetween:    'elev-' + zIdx + '-lower'
                        };
		    }
		    else {
                        var upper = {
                            id:     'elev-' + zIdx,
                            data:   [],
                            lines:  {
                                lineWidth:  0.3,
                                fill:       0.5
                            },
                            color: colorTable[waveform[zVal]],
                            fillBetween:    'elev-' + zIdx + '-lower'
                        };
		    }
                   
                    $.each(TestRanges, function (xIdx, xSlantRange) {
                        lower.data.push([xSlantRange, beamHeight(zVal - 0.5, xSlantRange)]);
                    }); 
                    $.each(TestRanges, function (xIdx, xSlantRange) {
                        upper.data.push([xSlantRange, beamHeight(zVal + 0.5, xSlantRange)]);
                    }); 
		    vcp = vcps[i]
		    VcpData[vcp].push(lower);
		    VcpData[vcp].push(upper);
		});

                $.plot(
		    $('#vcp'+vcps[i].toString()+'-draw-details'), 
		    VcpData[vcps[i]],
		    {
			xaxis:  {
			    label:        'km',
			    labelPos:	  'low',
			    tickDecimals:   0,
			    min:            0,
			    max:            100,
			    tickSize:       4,
			},
			yaxis:  {
			    label:	  'ft. ARL',
			    labelPos:	  'high',
			    min:            0,
			    max:            50000,
			    tickSize:       5000,
			    tickDecimals:   0,
			},
                        legend: {
                                 show: true,
				 position: "nw"
                        },

		    }
		)
                $.plot(
                    $('#vcp'+vcps[i].toString()+'-draw-overview'), 
                    VcpData[vcps[i]], 
                    {
                        xaxis:  {
                            show:           false,
                            min:            0,
                            max:            100
                        },
                        yaxis:  {
                            show:           false,
                            min:            0,
                            max:            50000
                        },
			legend: {	
				show: false
			}
                    }
                );
		
	    });

	})(i);
    }
}

$(document).ready(function(){
	vcpUpdate();	
	setInterval(vcpUpdate,10000);
	$(".vcp-confirm").on("click", function(){
	    delete vcp 
	    vcp = $(this).attr("id")
	    $("#vcp-num").html(vcp)
	    $(".final-vcp-confirm").html(vcp)
	});
	$(".vcp-desc").on("click", function() {
	    $(".vcp-desc-title").html("VCP "+$(this).attr("id")+" Description") 
	});

	$(".vcp-button").on("click", function() {
	    vcp = $(this).attr("id")		
	    $("#TableContain").html($("#vcpTable-"+vcp).html())
	});
	$('#current-vcp').on("click", function() {
	    $.getJSON("/current_vcp", function(attr){
	        $('#vcp-def-link').click();
	        $("#TableContain").html($("#vcpTable-"+attr['vcp_num']).html())
		$('.vcp-button').removeClass('ui-btn-active');
		$('.v'+attr['vcp_num']).addClass('ui-btn-active');
    	    });
	});
	
	$('#restart-vcp-confirm').on("click",function() {
	    $.post('/send_cmd',{COM:'COM4_RDACOM',INPUT:'CRDA_RESTART_VCP'});
	    var date0 = new Date();
            date0.setTime(date0.getTime()+900000)
            document.cookie = "FEEDBACK="+timeStamp()+" >> Requesting the VCP to be restarted; expires="+date0.toUTCString();
	});
	$('.vcp-dload-confirm').on("click",function(){
            $.post('/send_cmd',{COM:'COM4_DLOADVCP',INPUT:$(".final-vcp-confirm").html()});
	    var date0 = new Date();
            date0.setTime(date0.getTime()+900000)
            document.cookie = "FEEDBACK="+timeStamp()+" >> Requesting the download of RPG VCP "+$(".final-vcp-confirm").html()+";path='/'; expires="+date0.toUTCString();
        });
	$.getJSON("/el_list",function(attr){
	    $.each(attr, function(i,field){
		ElevList[i] = {};
		$.each(field,function(el){
		    ElevList[i][el] = el
		});
	    });
	});
        $.getJSON("/list_vcps", function(attr){
            $.each(attr, function(i,field){
    	        vcps.push(field)
	    });
	    plotVCPs(vcps);
        });
        $(window).resize(function () {
            var w = $(window).width() * 0.8
            $('.vcp-details').width(w).css('width', w + 'px');
        }).trigger("resize");


});

    $('#close').click(function(){
        window.close();
    }); 


