var loadPre = "dqd/aspwalk?d=";
var ICAO = 'KTLX';
var messageStore = {};
var filename = "out.txt";
var mimeType = "text/plain";

function loadData(loadString) 
{
    $('.ui-loader').css('display','initial')
    $.getJSON(loadPre + loadString, function (data) {
	$('#logBody').html('<tr/>')
	messageStore = data;
	var dLog = loadString + '\n';
        for (var m = 0 ; m < data.length - 1; m++) {
	    var classString = data[m][0]
	    $('#logTable').find('tbody').append($('<tr>').text(data[m][1]).attr('class',classString))
	    dLog += data[m][0] + ',' + data[m][1] + '\n';
        }
        $('#downloadLog').attr({
            'download':filename,
            'href':'data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(dLog)
        });
        $('.ui-loader').css('display','none')
    })
    .error(function (jqXHR, textStatus, errorThrown) {
        alert('Internal Server Error :(' )
    })
}
    
    $(document).ready(function() {
	$('#printPage').click(function() { 
	    alert('this feature is under construction :(')
	})
	$('#logBody').click(function() { 
	    downloadInnerHtml("out.txt","main","text/html")
	});
	$('#datep').datepicker({
	    minDate: new Date(2008, 12, 1),
	    maxDate: new Date()
	});
        $('.ICAO').on('click', function () {
            ICAO = $(this).attr("id");
            $('#selectICAO').popup('close');
	    $('#selectICAObutton').html(ICAO);
        });
	$('input[name="rangeToggle"]').on("click", function() { 
	    var rangeBool = Boolean(parseInt($(this).val()))
	    var calendar = $('#datep').datepicker().data('datepicker')
	    calendar.clear()
	    calendar.update({range:rangeBool})
	});	
	    	
	$('#submitDate').click(function() {
	    var rangeBool = Boolean(parseInt($('input[name="rangeToggle"]:checked').val()))
	    if (rangeBool) {
  	        var min = $('#datep').data().datepicker.minRange	
	        var max = $('#datep').data().datepicker.maxRange
	        if (Boolean(min) && Boolean(max)) {
	 	    var minDay = min.getUTCDate()
	 	    var minMonth = min.getUTCMonth() + 1
		    var minYear = min.getUTCFullYear()
	            var maxDay = max.getUTCDate()
		    var maxMonth = max.getUTCMonth() + 1
		    var maxYear = max.getUTCFullYear()
		    if (!ICAO)
		        alert("Select an ICAO first")
		    else 
		        loadData(ICAO + "_" + minYear + "-" + minMonth + "-" + minDay + "_" + maxYear + "-" + maxMonth + "-" + maxDay)
	        }
	        else {	
		    if (!Boolean(min) ) 
		        alert("Invalid end date selection")
		    else if (!Boolean(max)) 
		        alert("Invalid start date selection")
	        }
	    }
	    else { 
		var selectedDate = $('#datep').data().datepicker.selectedDates[0]
		if (Boolean(selectedDate)) {
                    var Day = selectedDate.getUTCDate()
                    var Month = selectedDate.getUTCMonth() + 1
                    var Year = selectedDate.getUTCFullYear()
		    if (!ICAO) 
		 	alert("Select an ICAO first")
		    else 
			loadData(ICAO + "_" + Year + "-" + Month + "-" + Day + "_" + Year + "-" + Month + "-" + Day)
		}
		else
		    alert("Invalid date selection")
	    }
	});
	$('input[name="logFilter"]').click(function() { 
	    var display = $(this).prop('checked') ? '' : 'none'
	    $('.' + $(this).attr('id')).css('display',display)
	});
	$('#SELECT_ALL').click(function() {
	    var checked = $('#SELECT_ALL').prop('checked')
	    var display = checked ? '' : 'none' 
	    $('input[name="logFilter"]').each(function(idx,element) { 
		$(element).prop('checked',checked).checkboxradio('refresh')
	        $('.' + $(this).attr('id')).css('display',display) 
	    });
	});

    });
	
