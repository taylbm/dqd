var loadPre = "dqd/aspwalk?d=";
var ICAO = 'KTLX';
var messageStore = {};
var mimeType = "text/plain";
var logInfo = "N/A"

function loadData(loadString) 
{
    $('input[name="logFilter"]').each(function(idx,element) {
        $(element).prop('checked',true).checkboxradio('refresh')
        $('.' + $(this).attr('id')).css('display','initial')
    });
    logInfo = loadString;
    $('.ui-loader').css('display','initial')
    $.getJSON(loadPre + loadString, function (data) {
	$('#logBody').html('<tr/>')
	messageStore = data;
        for (var m = 0 ; m < data.length - 1; m++) {
	    var classString = data[m][0]
	    $('#logTable').find('tbody').append($('<tr>').text(data[m][1]).attr('class',classString))
        }
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
        $('#downloadLog').on('click',function() {
            var log = logInfo +"\n Filter String: " + $('#filterTable-input').attr('data-lastval') + '\n'
	    var filteredRaw = $('input[name="logFilter"]:not(:checked)')
	    var filters = $.map(filteredRaw, function(obj,idx) { return obj.id });
	    var filterOut = filters.length > 0 ? filters.join() : "None"
	    console.log(filterOut)
	    log += "Message Filters Active: " + filterOut + '\n'
            $('#logBody').find('tr').each(function (idx,obj) {
		console.log(obj)	
                if (obj.firstChild != null && obj.className.indexOf('ui-screen-hidden') < 0 && obj.style.display != "none")
                    log += obj.className + ',' + obj.firstChild.data + '\n'
            });
            var link = document.createElement('a');
            link.setAttribute('download', logInfo + ".txt")
            link.setAttribute('href','data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(log))
            document.body.appendChild(link)
            link.click()
            setTimeout(function(){
                document.body.removeChild(link);  //remove element
            }, 1);
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
	
