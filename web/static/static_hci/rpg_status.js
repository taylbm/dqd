    function loadJSON(callback) {

    var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
    xobj.open('GET', 'static/static_hci/hci_cfg.json', true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
          }
    };
    xobj.send(null);
    }

    var DATA = {}

    function init() {
        loadJSON(function(response) {
            // Parse JSON string into object
            DATA = JSON.parse(response);
        });
    }
    var log = {}
    $(document).ready(function(){	
	init();
        var rpg_log = new EventSource('/rpg_s');
	rpg_log.addEventListener('message',function(e) {
	    log = JSON.parse(e.data)
            console.log(log['syslog'])
	
	    if ( log['alarms'][0] != "NONE" ) {
		for (a in log['alarms']) {
		    $('#'+log['alarms'][a]).css("background-color",DATA.RPGalarmSum[log['alarms'][a]])
	   	}
	    }
	    else {
	    }	
	    if ( parseInt(e.lastEventId) == 0) {
	        for (var i = log['syslog']['msg_type'].length - 1 ; i > 0; --i) {
		    var class_string = "";
                    if ( log['syslog']['msg_type'][i] )
		        class_string = DATA.colorMsgs[log['syslog']['msg_type'][i].split('_')[2]]
		    if (log['syslog']['cleared'][i] )
		        class_string = 'normal-ops'
		    $('#logTable').find('tbody').append($('<tr>').text(log['syslog']['status_msgs'][i]).attr('class',class_string).attr('alt',log['syslog']['msg_type'][i]))
	        }
	    }
	    else {
		if (log['syslog']['error'] != -38) {
                    var class_string = "";
                    if ( log['syslog']['msg_type'] )
                        class_string = DATA.colorMsgs[log['syslog']['msg_type'].split('_')[2]]
                    if (log['syslog']['cleared'] )
                        class_string = 'normal-ops'
                    $('#logTable').find('tbody').prepend($('<tr>').text(log['syslog']['status_msgs']).attr('class',class_string)).trigger("create")
		}
	    }
	    $('#logTable').trigger("create")
	    
	});

	$('#close').click(function(){
		window.close();
	});
		
    });
	
