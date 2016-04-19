
    function toRadians(deg) {
        return deg * Math.PI / 180
    }	
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
    function getCookie(cname,truthSwitch) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for(var i=0; i<ca.length; i++) {
            var c = ca[i];
	    while (c.charAt(0)==' ') c = c.substring(1);
            if (c.indexOf(name) == 0) {
        	if (truthSwitch){
                    if (c.substring(name.length,c.length) == "on") return true 
                    else return false
                }
                else{
                        return c.substring(name.length,c.length)
                }
	    }
        }
        return "NULL";
    }

    function deleteAllCookies() {
        var cookies = document.cookie.split(";");

        for (var i = 0; i < cookies.length; i++) {
     	    var cookie = cookies[i];
    	    var eqPos = cookie.indexOf("=");
    	    var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    	    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
    }
    
    function closest(array,num){
        var i=0;
        var minDiff=1000;
        var ans;
        for(i in array){
            var m=Math.abs(num-array[i]);
             if(m<minDiff){ 
                minDiff=m; 
                ans=array[i]; 
            }
        }
        return ans;
    }
    
init();

    function GetClock(){
        var d=new Date();
        var nday=d.getUTCDay(),nmonth=d.getUTCMonth(),ndate=d.getUTCDate(),nyear=d.getUTCFullYear();
        if(nyear<1000) nyear+=1900;
        var d=new Date();
        var nhour=d.getUTCHours(),nmin=d.getUTCMinutes(),nsec=d.getUTCSeconds();
        if(nmin<=9) nmin="0"+nmin
        if(nsec<=9) nsec="0"+nsec;
        $('#clockbox-date').html(""+DATA.calendar.tday[nday]+" "+DATA.calendar.tmonth[nmonth]+" "+ndate+", "+nyear);
        $('#clockbox-time').html(""+nhour+":"+nmin+":"+nsec+" "+"UT");
        $('#VCP_start_date').html("VCP START: "+DATA.calendar.smonth[nmonth]+" "+ndate+", "+nyear+'&nbsp');
    }
    function timeStamp(){
        var d=new Date();
        var nday=d.getUTCDay(),nmonth=d.getUTCMonth(),ndate=d.getUTCDate(),nyear=d.getUTCFullYear();
        if(nyear<1000) nyear+=1900;
        var d=new Date();
        var nhour=d.getUTCHours(),nmin=d.getUTCMinutes(),nsec=d.getUTCSeconds();
        if(nmin<=9) nmin="0"+nmin
        if(nsec<=9) nsec="0"+nsec;
        return DATA.calendar.smonth[nmonth]+" "+ndate+","+nyear%100+" "+"["+nhour+":"+nmin+":"+nsec+"]";
    }
    function perfCheck(end){
        var remaining = end*1000-Date.parse(new Date())
	setInterval(function(){
	    remaining -= 1000; 	    
	    if(remaining < DATA.perfCheckYellow){
	        $('#perf_check_time').css('background-color','#FCFC23')
	    }
	    else{
		$('#perf_check_time').css('background-color','white')
	    }
            var d = new Date(remaining)
	    var nhour=d.getUTCHours(),nmin=d.getUTCMinutes(),nsec=d.getUTCSeconds();
	    if(remaining < 0){
		$('#perf_check_time').html('PENDING').css('background-color','#51FF22')
		stopCheck['perfCheck'] = true;
	    }
	    else {
                $('#perf_check_time').html(nhour+'h '+nmin+'m '+nsec+'s')
	    }
	},DATA.clockInterval);
    }
    window.onload=function(){
        GetClock();
        setInterval(GetClock,DATA.clockInterval);
    }
    var colorMsgs = {
		     'MAR':'minor-alarm',
		     'MAM':'major-alarm',
		     'INOP':'inop',
		     'LS':'loadshed',
		     'NA':'',
		     'SEC':'white',
		     'WARN':'minor-alarm',
		     'INFO':'gray',
		     'COMMS':'seagreen',
		     'GEN':'',
    }

    var RS = {}
    var ADAPT = {}
    var RPG = {}
    var PMD = {}
    var radome = {}
    var actionflag = {}
    var cookieRaid = {'inserted':1}
    var rpgStatusMsgs = {'new':0} 
    var stopCheck = {'ICAO':true,'perfCheck':true,'WIDEBAND_SET':true,'az':0,'running':true}

$(document).ready(function(){
    	function toggleHandler(attr,switchval){	
	    switch (switchval) {
		case 1:	
		    if (attr.controlname == 'AVSET_Exception')
			attr.controlname = 'RS_AVSET'
		    switch(attr.controlname){
		        case 'RPG_SAILS': case 'SAILS_Exception':
			    var feedback =  attr.num_cuts == 0 ? DATA.SAILSfeedback[0] : DATA.SAILSfeedback[1] + attr.num_cuts + DATA.SAILSfeedback[2];
			    $('#Feedback').html(timeStamp() + feedback)
		            $.post('/sails',{NUM_CUTS:attr.num_cuts});
		            delete actionflag.SAILS
		            break;
		        case 'RS_AVSET': case 'AVSET_Exception': case 'RS_CMD': case 'RS_SUPER_RES':
		            var command = attr.newVal.confirmation == "on" ? '_ENABLE' : '_DISABLE'
		            $.post('/send_cmd',{COM:attr.controlname + command, FLAG:1});
			    break;
			case 'Model_Update': case 'VAD_Update':
			    var flag = attr.newVal.confirmation == "on" ? 1 : 0
			    $.post('/set_flag',{TYPE:'hci_set_'+attr.controlname.toLowerCase()+'_flag',FLAG:flag});
			    break;
		    }   
		    if (attr.displayname=="AVSET" || attr.displayname=="AVSET-Exception"){
			if (attr.newVal.confirmation=="on"){
				$('#RS_AVSET').val('on').slider('refresh')
				$('#AVSET_Exception').val('on').slider('refresh')
				$('#AVSET_Exception_status').addClass('hide')
			}
			else{
				$('#AVSET_Exception_status .ui-slider .ui-slider-label-b').text('PENDING')
				$('#RS_AVSET_contain .ui-slider .ui-slider-label-b').text('PENDING')
				$('#RS_AVSET').val('off').slider('refresh')
				$('#AVSET_Exception').val('off').slider('refresh')
				$('#AVSET_Exception_status').removeClass('hide')
			}
		    }  
		    if(attr.displayname == 'CMD' || attr.displayname == 'Super-Res'){
			$("#"+attr.controlname).val(attr.newVal.confirmation).slider('refresh')
			if (attr.newVal.confirmation == "on"){
			    $("#"+attr.controlname+"_status").addClass("hide")
			}
		    }
		    if(attr.displayname.split('-')[0] == "AVSET")
			document.cookie = "AVSET"+"="+attr.current+"; expires="+attr.date0.toUTCString();
	 	    else
			document.cookie = attr.controlname+"="+attr.current+"; expires="+attr.date0.toUTCString();
		    break;
		case 2:
		    $('#'+attr.controlname).val(attr.newVal.cancel).slider('refresh');
		    break;
		case 3:
		    if(attr.title == 'flag')
			$.post('/set_flag',{TYPE:'hci_set_'+attr.controlname.toLowerCase()+'_flag',FLAG:1});
		    $("#"+attr.controlname).val(attr.newVal.confirmation).slider('refresh')
		    $('#'+attr.controlname+'_status').addClass('hide')
		    document.cookie = attr.controlname+"="+attr.current+"; expires="+attr.date0.toUTCString();
		    break;
		case 4:
		    if(attr.title == 'flag')
			$.post('/set_flag',{TYPE:'hci_set_'+attr.controlname.toLowerCase()+'_flag',FLAG:0});
		    $("#"+attr.controlname).val(attr.newVal.cancel).slider('refresh')
		    break;	
	    }
	}
	var canvas = document.getElementById("radome");
	var canvas1 = document.getElementById("inner-circle");
        var gridwidth = $('#grid-a').width();	
	var cD = 2.22;
	canvas.height = window.innerHeight/cD
	canvas.width = gridwidth;
        canvas1.height = window.innerHeight/cD;
        canvas1.width = gridwidth;
	
	var maincircle = canvas.getContext("2d");
	var innercircle = canvas1.getContext("2d");
	var cH = canvas.height;
	var cW = canvas.width;
        var hD = 2.66;
        var wD = 2;
        var Ro = 0.9;
        var Ri = 0.8;
        var Tx = cW / 6;
	var Ty = cH / 1.4;
	var Tw = cW / 1.5;
	var Th = cH / 3.67;
	var Tm = Ty + Th / 2;

	function redrawCanvas() {
	    var gridwidth = $('#grid-a').width();
            canvas.height = window.innerHeight/cD;
	    canvas.width = gridwidth;
	    maincircle.clearRect(0,0,600,600)
	    innercircle.clearRect(0,0,600,600)
	    	    
            cH = canvas.height;
            cW = canvas.width;
            hD = 2.66;
            wD = 2;
            Ro = 0.9;
            Ri = 0.8;
            Tx = cW / 6;
            Ty = cH / 1.4;
            Tw = cW / 1.5;
            Th = cH / 3.67;
            Tm = Ty + Th / 2;
	    drawTower();
	    alignElements();
	};

        window.addEventListener('resize',redrawCanvas,false);

	function drawTower(init) {
                maincircle.lineWidth=3;maincircle.strokeStyle="black";
	        maincircle.strokeRect(Tx,Ty,Tw,Th); // Draw outline
	        maincircle.beginPath();maincircle.moveTo(Tx,Tm);maincircle.lineTo(Tx+Tw,Tm);maincircle.moveTo(Tx,Ty);maincircle.lineTo(Tx+Tw,Tm);
	        maincircle.moveTo(Tx,Tm);maincircle.lineTo(Tx+Tw,Ty);maincircle.moveTo(Tx,Tm);maincircle.lineTo(Tx+Tw,Ty+Th);maincircle.moveTo(Tx,Ty+Th);maincircle.lineTo(Tx+Tw,Tm);
                maincircle.shadowColor = "black";maincircle.shadowOffsetX = 2;maincircle.shadowOffsetY = 2;maincircle.shadowBlur = 5; // define dropshadow
                maincircle.moveTo(cW / wD,Ty-5);maincircle.lineTo(cW / wD,cH);maincircle.stroke();
	        maincircle.fillStyle = "#5B575B";maincircle.fillRect(cW/wD - cW*0.125, Tm - Th*0.15, cW*0.25, Th*0.3);maincircle.strokeRect(cW/wD - cW*0.125, Tm - Th*0.15, cW*0.25, Th*0.3);
 	        maincircle.fillStyle = "black";maincircle.font = DATA.sailsAvsetFont;maincircle.beginPath();maincircle.shadowColor = "transparent";maincircle.lineWidth = 4;
                innercircle.fillStyle="white";innercircle.beginPath();innercircle.arc(cW/wD,cH/hD,cW/wD*Ro,0,2*Math.PI);
                innercircle.closePath();innercircle.fill();innercircle.stroke();
                //Draw and fill the outer white circle with black outline   
                maincircle.fillStyle="white";innercircle.lineWidth=2;maincircle.beginPath();maincircle.arc(cW/wD,cH/hD,cW/wD*Ri,0,2*Math.PI);
                maincircle.closePath();maincircle.fill();
		if (!init) {
                    maincircle.fillStyle = "white";maincircle.font = DATA.sailsAvsetFont;maincircle.fillText(ADAPT['ICAO'],cW/wD - cW*0.075,Tm + Th*0.05);
		}
	}
	drawTower(true);
	function alignElements() {
	    $("#RPG_SAILS_contain").css({"left":cW/wD - cW*0.05+"px","top":cH/hD + cH*0.08+"px"})
	    $("#RS_AVSET_contain").css({"left":cW/wD - cW*0.05+"px","top":cH/hD + cH*0.2+"px"})
            var link_offset = $('#link_R').offset();
	    var control_offset = $('#moments_sq').offset();
            var gridwidth = $('#grid-a').width();
	    var radome = $('#radome').offset();
	    $('#link').css({"left":link_offset.left,"top":link_offset.top});
	    $('#control_stat').css({"left":control_offset.left,"top":control_offset.top*0.85,"width":gridwidth/2});
	    $('#inner-circle').css(radome);
	    $('.link-status').css({"width":gridwidth/2,"height":gridwidth/16.5});
	    $('.squaresWaveG_long').css({"width":gridwidth/16.5,"height":gridwidth/16.5});
	    for (i = 2; i < 9; i++) {
	        $('.squaresWaveG_long_'+i.toString()).css( "left" , (i - 1) * (1 + gridwidth/16.5 ) );
	    }
            moms = ['R','V','W','D']
	    for (m in moms){
	        var mom = moms[m];
	        $('#link_' + mom).css({"width":gridwidth/16.5,"height":gridwidth/16.5});
	    }
	}
	alignElements();

	$(".toggle").on('slidestop',function(){
	    var controlname = $(this).attr("id")
	    var title = $(this).attr("title")
	    var displayname = $(this).attr("alt")
	    var current = $(this).val();
	    var date0 = new Date();
	    date0.setTime(date0.getTime()+DATA.rdaCommandStickyToggleTimeout)		
	    if(displayname.split('-')[0] == "SAILS"){
		$.getJSON("/vst",function(data){
		    actionflag['SAILS'] = data['ORPGVST']
		});
	    }
	    else if(displayname.split('-')[0] == "AVSET"){
		$.getJSON("/vst",function(data){
		    actionflag['AVSET'] = data['ORPGVST']
		});
	    }
	    else{
		$.getJSON("/vst",function(data){
		    actionflag[controlname] = data['ORPGVST']
		});

	    }
	    if (current=="on"){newVal = {cancel:"off",confirmation:"on"}}else{newVal = {cancel:"on",confirmation:"off"}}
	    attr = {title:title,controlname:controlname,displayname:displayname,date0:date0,newVal:newVal,current:current}
	    if (controlname == "PRF_Mode"){
		$("#prf_control").click();
	    }
	    else {
                $("#optional-insert").html('')
                $('#popupDialog').popup('open')
                $("#pop-title").html(DATA.popTitle)
		if (['SAILS','AVSET','CMD','Super-Res','AVSET-Exception','SAILS-Exception'].indexOf(displayname) >=0){
		    $('#popupDialog').popup('open')
	            if (displayname == 'SAILS' || displayname == 'SAILS-Exception'){
                        $("#pop-title").html(DATA.popTitleSAILS)
                        $("#optional-insert").html($('#sails-form').html())	
		        $("#popupDialog #id-confirm").html(DATA.SAILSDialog)
		    }
		    else{
		        var child1 = $(this).find("option:first-child").html()
		        if (current=="on"){
			     $("#popupDialog #id-confirm").html(DATA.hardCommandConfirm[0]+displayname+DATA.hardCommandConfirm[1])
		        }
		        else{
			    $("#popupDialog #id-confirm").html(DATA.softCommandConfirm[0]+displayname+DATA.softCommandConfirm[1]+child1+DATA.softCommandConfirm[2])
		        }
		    }
                    $('#popupDialog').trigger('create')
		    $("#popupDialog #pop-cancel").bind('click',{attr},function(event){
			toggleHandler(event.data.attr,2);
			$('#popupDialog #pop-cancel').unbind()
			$('#popupDialog #pop-confirm').unbind()
		    });
		    $('#popupDialog #pop-confirm').bind('click',{attr},function(event){
                        if (event.data.attr.displayname == 'SAILS' || displayname == 'SAILS-Exception') {
                            event.data.attr['num_cuts'] = $('#optional-insert #select-choice-0').val();
                        }
			toggleHandler(event.data.attr,1);
			$('#popupDialog #pop-confirm').unbind()
			$('#popupDialog #pop-cancel').unbind()
		    });
		}
		else{
		    var child1 = $(this).find("option:first-child").html()
		    var child2 = $(this).find("option:last-child").html()
		    if (current=="on"){
			$("#popupDialog #id-confirm").html(DATA.softCommandConfirm[0]+displayname +DATA.softCommandConfirm[1]+child2+DATA.softCommandConfirm[2])
		    }
		    else{
			$("#popupDialog #id-confirm").html(DATA.softCommandConfirm[0]+displayname+DATA.softCommandConfirm[1]+child2+DATA.softCommandConfirm[2])
		    }
		    $("#popupDialog #pop-cancel").bind('click',{attr},function(event){
			toggleHandler(event.data.attr,4);
			$('#popupDialog #pop-confirm').unbind()
			$('#popupDialog #pop-cancel').unbind()
		    });			
		    $("#popupDialog #pop-confirm").bind('click',{attr},function(event){
			toggleHandler(event.data.attr,3);
			$('#popupDialog #pop-confirm').unbind()
			$('#popupDialog #pop-cancel').unbind()
		    });
		}
	    }
	});
        $("input[name='RDA_state']").click(function(e){
	    if (e.isTrigger != 3) {
	        $('#popupDialogRDA').popup('open');
	        var command = $(this).val();
	        $('#popupDialogRDA #pop-confirm').attr("value",command);
                $("#popupDialogRDA #id-confirm").html(DATA.controlRDA.STATE)
	    }
	});
	$('#RDA_power').on('slidestop',function(){
	    $('#popupDialogRDA').popup('open');
	    var command = $(this).val();
	    $('#popupDialogRDA #pop-confirm').attr("value",command);
	    $('#popupDialogRDA #id-confirm').html(DATA.RDApower);
	}); 
	$('input[name="RDA_control"]').click(function(){
            var command = $(this).val();
            $('#Feedback').html(timeStamp() + ' >> ' + DATA[command]);
            $.post('/send_cmd',{COM:command,FLAG:0});
	});
	$('#popupDialogRDA #pop-confirm').click(function(){
	    var command = $(this).attr("value")
	    $('#Feedback').html(timeStamp() + ' >> ' + DATA[command]);
	    $.post('/send_cmd',{COM:command,FLAG:0});
        });
	$('#popupDialogRDA #pop-cancel').click(function(){
	    if (RS['RS_AUX_POWER_GEN_STATE'])
	        $('#RDA_power').val("CRDA_AUXGEN");
	    else 
		$('#RDA_power').val("CRDA_UTIL");
	    $('#RDA_power').trigger("change")
	    $("#"+RS['RDA_static']['RDA_STATE']).trigger('click').checkboxradio('refresh')
 	}); 
        $("#MRPG :input").click(function(){
            var command = $(this).val();
            $('#popupDialogRPG #pop-confirm').attr("value",command);
            $.getJSON("/mrpg_state",function(data){
                var mrpg_state = data['MRPG_state']
                switch(command) {
                    case 'MRPG_STARTUP':
                        if( mrpg_state == 'MRPG_ST_STANDBY' ||
                            mrpg_state == 'MRPG_ST_SHUTDOWN'||
                            mrpg_state == 'MRPG_ST_OPERATING' ) {
                            $("#popupDialogRPG #id-confirm").html(DATA.controlRPG.SUB[0]+DATA.controlRPG.MRPG_STARTUP[mrpg_state]+DATA.controlRPG.SUB[1])
                            $("#popupDialogRPG").popup('open');
                        }
                        else {
			    alert(DATA.controlRPG.MRPG_STARTUP.FAIL)
                        }
                        break;
                    case 'MRPG_CLEANUP':
                        if( mrpg_state == 'MRPG_ST_STANDBY' ||
                            mrpg_state == 'MRPG_ST_SHUTDOWN' ||
                            mrpg_state == 'MRPG_ST_OPERATING' ) {
                            $("#popupDialogRPG #id-confirm").html(DATA.controlRPG.MRPG_CLEANUP.SUCESS+DATA.controlRPG.SUB[1])
                            $("#popupDialogRPG").popup('open');
                        }
                        else {
			    alert(DATA.controlRPG.MRPG_CLEANUP.FAIL)
                        }
                        break;
                    case 'MRPG_SHUTDOWN': case 'MRPG_STANDBY':
                        $("#popupDialogRPG #id-confirm").html(DATA.controlRPG.SHUTDOWN+DATA.controlRPG.SUB[1])
                        $("#popupDialogRPG").popup('open');
                        break;
                }
            });
            $('#popupDialogRPG').trigger('create')
        });

        $("#popupDialogRPG #pop-confirm").click(function(){
            var command = $(this).attr("value")
            if (command != 'MRPG_CLEANUP')
                $.post('/mrpg',{COM:command});
            else
                $.get("/mrpg_clean");
        });

        $("#pass-protect").click(function(){
	    $('#popupDialogPass').popup('open')
        });
        $('#pop-submit').on('click', function(event){
            user = $("#popupDialogPass :radio:checked").attr('id')
            $.ajax
                  ({
                        type:'GET',
                        url:'/auth',
                        dataType:'json',
                        async: true,
                        headers: {
                                "Authorization": "Basic " + btoa(user+":"+$('#password').val())
                        },
                        success: function (data) {
			    if ($("#pass-protect").attr("value") == "locked") {
				$("#pass-protect").attr("class","ui-btn ui-icon-edit ui-btn-icon-left control-item control-shadow")
				$("#pass-protect").attr("value","unlocked").html("Unlocked")
				$("input[type='checkbox']").checkboxradio('enable');
			    }
			    else {
				$("#pass-protect").attr("class","ui-btn ui-icon-lock ui-btn-icon-left control-item control-shadow")
				$("#pass-protect").attr("value","locked").html("Locked")
				$("input[type='checkbox']").checkboxradio('disable');
			    }
                            $('#password').val('')

                        },
			error: function(xhr,status,error) {
			    if (error == "Unauthorized") {
				alert('Incorrect Password')
			    }
                            $('#password').val('')	
			}
                 });
        });
        $('#init_perf_check').on('click',function(){	
	    var command = $(this).val()
	    $('#popupDialogRDA').popup('open')
	    if (RS['RDA_static']['RDA_STATE'] != 'OPERATE' || RS['RDA_static']['CS'] != 'CS_RPG_REMOTE') {
		$('#popupDialogRDA #id-confirm').html(DATA.perfCheck.Reject)
	    }
	    else {
                $('#popupDialogRDA #id-confirm').html(DATA.perfCheck.Accept)
                $('#popupDialogRDA #pop-confirm').attr("value",command);
      	    }
        });
	$('#refresh_rda').on('click',function(){
	    $.post('send_cmd',{COM:"DREQ_STATUS",FLAG:0});
	    $('#Feedback').html(timeStamp() + " >> " + DATA.RDAStatus);
	});
        var link = $('#squaresWaveG_long').html()
	var item = DATA.rdaItems;
	//$('#marq-insert').html($('#marq-form').html())	
	//$.getJSON("/update",function(data){
        //    cookieRaid['initial'] = data['RPG_dict']['ORPGVST']
 	//    maincircle.fillStyle = "white";maincircle.font = DATA.sailsAvsetFont;maincircle.fillText(data['ADAPT_dict']['ICAO'],cW/wD - cW*0.075,Tm + Th*0.05);
        //});

	var source = new EventSource('/radome');
	source.addEventListener('message',function(e) {
	    var radome_temp = JSON.parse(e.data)
	    if ( radome_temp.update ) {
		radome = radome_temp
	        maincircle.globalCompositeOperation='destination-over'; 
		maincircle.fillStyle="black";
		maincircle.beginPath();maincircle.moveTo(cW/wD,cH/hD);maincircle.arc(cW/wD,cH/hD,cW/wD*Ro,-Math.PI / 2 + toRadians(radome.start_az/10),-Math.PI / 2 + toRadians(radome.az/10));
		maincircle.lineTo(cW/wD,cH/hD);  
		maincircle.closePath();
		maincircle.fill();
	
		maincircle.globalCompositeOperation='source-over';
                // Clear the slate or it gets pixelated     
		maincircle.clearRect(0,0,canvas.width,Ty-2)
                maincircle.font = DATA.elFont;
                //Draw and fill the outer white circle with black outline   
                maincircle.fillStyle="white";innercircle.lineWidth=2;maincircle.beginPath();maincircle.arc(cW/wD,cH/hD,cW/wD*Ri,0,2*Math.PI);
                maincircle.closePath();maincircle.fill();  
	
	        // add additional info text to radome
		maincircle.fillStyle="black";   
	 	if( radome.last_elev ) {
		    maincircle.font = DATA.sailsSeqFont;maincircle.fillText('LAST',cW/wD - cW*0.125,cH/hD - cH*0.025);
		}
	 	if( radome.sails_seq > 0 ) {
		    maincircle.font = DATA.sailsSeqFont;maincircle.fillText(DATA.sails_seq[radome.sails_seq],cW/wD - cW*0.2,cH/hD - cH*0.025);
		}	
		try {
		    var elevation = radome.el / 10
		    if( radome.super_res > 0 ) {
		        maincircle.font = DATA.superResFont;maincircle.fillText('SR',cW/wD - cW*0.1,cH/hD + cH*0.28)
		    }
		}
		catch(err){
		    var elevation = 0.0
		}
		maincircle.font = DATA.elFont;
		var elMult = elevation < 10 ? 0.70 : 1;
		if(elevation % 1 == 0)
		    maincircle.fillText(elevation.toFixed(1),cW/wD - cW*0.25*elMult,cH/hD - cH*0.1);
		else
		    maincircle.fillText(elevation,cW/wD - cW*0.25*elMult,cH/hD - cH*0.1);

                maincircle.font = DATA.sailsAvsetFont;
                maincircle.fillText("SAILS:",cW/wD - cW*0.33,cH/hD + cH*0.04)
                maincircle.fillText("AVSET:",cW/wD - cW*0.33,cH/hD + cH*0.15)
 
	        if ( radome.moments_mask != stopCheck['moments'] ) {
	            if(stopCheck['WIDEBAND'] == "CONNECTED"){
	    	        var letter = radome.moments
	    	        for (l in DATA.moments){
	    		    var mom = DATA.moments[l]
	    		    if($('.link-status'+mom).html() == '' && letter.indexOf(mom) >= 0 ){
			        $('.link-status'+mom).html(link).removeClass('null-ops').addClass('normal-ops');
			        $('#link_'+mom).html(mom).removeClass('null-ops').addClass('normal-ops');
			        var yank = $('#link').html()	
			        $('#link').html(yank)
			    }
			    if(letter.indexOf(mom) < 0 && !stopCheck['running']){
			        $('.link-status'+mom).html('').removeClass('normal-ops').addClass('null-ops');
			        $('#link_'+mom).html(mom).removeClass('normal-ops').addClass('null-ops');
			    }
		        }
	            }
	        }
	        if ( stopCheck['ICAO'] ) {
		    maincircle.fillStyle = "white";maincircle.font = DATA.sailsAvsetFont;maincircle.fillText(ADAPT['ICAO'],cW/wD - cW*0.075,Tm + Th*0.05);
		    stopCheck['ICAO'] = false;
	        }
                stopCheck['moments'] = radome.moments_mask;
                stopCheck['start_az'] = radome.start_az;
	     
	    //if (getCookie('FEEDBACK') != "NULL"){
	    //	if(cookieRaid['inserted']){
	    //	    $('#Feedback').html(getCookie('FEEDBACK'))
	    //	    cookieRaid['inserted'] = 0
	    //	}
	    //}
	    //else{
	    //	cookieRaid['inserted'] = 1
	    //}
	    }
	    
	    else {
                if(stopCheck['az'] != radome.az){
                //Draw and fill the progress circle
                    maincircle.globalCompositeOperation='destination-over';
                    maincircle.fillStyle="black";
                    maincircle.beginPath();maincircle.moveTo(cW/wD,cH/hD);maincircle.arc(cW/wD,cH/hD,cW/wD*Ro,-Math.PI / 2 + toRadians(radome.start_az/10),-Math.PI / 2 + toRadians(radome_temp.az/10));
                    maincircle.lineTo(cW/wD,cH/hD);
                    maincircle.closePath();
                    maincircle.fill(); 
                    if(stopCheck['running']){
                        $('.squaresWaveG_long').css("animationPlayState","running");
                        stopCheck['running'] = false;
                    }
               
	        }
                else{
                    if(!stopCheck['running']){
                        $('.squaresWaveG_long').css("animationPlayState","paused");
                        stopCheck['running'] = true;
                    }
                }
	    } 
            stopCheck['az'] = radome_temp.az;
	});
	var non_rapid = new EventSource('/update_s');
	non_rapid.addEventListener('PMD_dict',function(e) {
	    var PMD_current = JSON.parse(e.data)
	    if ( PMD_current['perf_check_time'] != PMD['perf_check_time'] ) 
		perfCheck(PMD_current['perf_check_time']);
	  
	    if ( PMD_current['h_delta_dbz0'] != PMD['h_delta_dbz0']) {
		if(PMD_current['h_delta_dbz0'] >= 1.5)
		    $('#h_delta_dbz0').addClass('minor-alarm');
	        else
		    $('#h_delta_dbz0').addClass('normal-ops');
                $('#h_delta_dbz0').html(PMD_current['h_delta_dbz0']+'dB');
	    }
	    if ( PMD_current['v_delta_dbz0'] != PMD['v_delta_dbz0'] ) {
	        if(PMD_current['v_delta_dbz0'] >= 1.5)
		    $('#v_delta_dbz0').addClass('minor-alarm');
		else
	    	    $('#v_delta_dbz0').addClass('normal-ops');
                $('#v_delta_dbz0').html(PMD_current['v_delta_dbz0']+'dB');
	    }
	    if ( PMD_current['cnvrtd_gnrtr_fuel_lvl'] != PMD['cnvrtd_gnrtr_fuel_lvl'] ) {
	        $("#gen_level").attr('value',PMD_current['cnvrtd_gnrtr_fuel_lvl']);
	        $("#gen_level_num").html(PMD_current['cnvrtd_gnrtr_fuel_lvl']+'%');
	    }
	    if ( PMD_current['mode_trans'] != PMD['mode_trans'] || PMD_current['mode_conflict'] != PMD['mode_conflict'] ) {
	        if(PMD_current['mode_trans']) {
		    $("#Mode_Conflict_contain").html('TRANS').removeClass('normal-ops').addClass('minor-alarm');
		    $("#Mode_Conflict_status").removeClass('hide')
	        }
	        else{
		    if(PMD_current['mode_conflict']){
		        $("#Mode_Conflict_contain").html('YES').removeClass('normal-ops').addClass('minor-alarm');
		        $("#Mode_Conflict_status").removeClass('hide')
		    }
		    else{
		        $("#Mode_Conflict_contain").html('NO').removeClass('minor-alarm').addClass('normal-ops');
		        $("#Mode_Conflict_status").addClass('hide')
		    }
	        }
	    }
	    if ( PMD_current['prf'] != PMD['prf'] ) {
	        switch(PMD_current['prf']){
		  case 'CELL_BASED': case 'STORM_BASED':
		      $('#PRF_Mode_contain .ui-slider .ui-slider-label-a').text('MULTI')
		      $('#PRF_Mode').val('on').slider('refresh')
		      $('#PRF_Mode_status').addClass('hide')
		      break;
		  case 'AUTO_PRF':
		      $('#PRF_Mode_contain .ui-slider .ui-slider-label-a').text('AUTO')
		      $('#PRF_Mode').val('on').slider('refresh')
		      $('#PRF_Mode_status').addClass('hide')
		      break;
		  case 'MANUAL_PRF':
		      $('#PRF_Mode').val('off').slider('refresh')
		      $('#PRF_Mode_status').removeClass('hide')
		      break;
	          }	
	    }
    	    if ( PMD_current['loadshed'] != PMD['loadshed'] ) {
                var loadshed_cats = Object.keys(PMD_current['loadshed'])
                $('#Load_Shed_contain').html('NORMAL')
                $('#Load_Shed_status').addClass('hide')
                for (lshd in loadshed_cats){
                    if(PMD_current['loadshed'][loadshed_cats[lshd]] != 'NONE'){
                        $('#Load_Shed_contain').html(PMD_current['loadshed'][loadshed_cats[lshd]])
                        $('#Load_Shed_status').removeClass('hide')
                        $('#Alarms').attr('class','bar-border loadshed')
                        if(PMD_current['loadshed'][lshd] == 'ALARM'){
                             $('#Load_Shed_contain').attr('style','background-color:#00FFFF')
                        }
	            }	
                }
	    }
            PMD = JSON.parse(e.data);


	});


	non_rapid.addEventListener('ADAPT_dict',function(e) {
	    ADAPT = JSON.parse(e.data)
	    console.log(ADAPT)
	    $('#Z-ZDR').html(ADAPT['ptype'])
	    switch(Number(ADAPT['ZR_mult'])){
		case DATA.zrCats.CONVECTIVE:
		    $('#Z-R').html('CONVECTIVE')
		    break;
		case DATA.zrCats.TROPICAL:
		    $('#Z-R').html('TROPICAL')
		    break;
		case DATA.zrCats['MARSHALL-PALMER']:
		    $('#Z-R').html('MARSHALL-PALMER')
		    break;
		case DATA.zrCats['EAST-COOL-STRATIFORM']:
		    $('#Z-R').html('EAST-COOL STRATIFORM')
		    break;
		case DATA.zrCats['WEST-COOL-STRATIFORM']:
		    $('#Z-R').html('WEST-COOL STRATIFORM')
		    break;
	    }
            exception_list = ['Model_Update','VAD_Update','mode_A_auto_switch','mode_B_auto_switch']
	    
            for (e in exception_list){
                var exception = exception_list[e]
                    if(Object.keys(actionflag).indexOf(exception) <0){
                        var cookieCheck = getCookie(exception,1)
                            if(ADAPT[exception]){
                                $('#'+exception).val('on').slider('refresh');
                                $('#'+exception+'_status').addClass('hide')
                            }
                            else{
                                $('#'+exception).val('off').slider('refresh');
                                $('#'+exception+'_status').removeClass('hide')
                            }
                    }
            }

	});
	non_rapid.addEventListener('RPG_dict',function(e) {
	    var RPG = JSON.parse(e.data) 
	    var flags = Object.keys(actionflag)
	    for (flag in flags){
		if(actionflag[flags[flag]] != RPG['ORPGVST']){
		    delete actionflag[flags[flag]]
		}
	    }
	    if(cookieRaid['initial'] != RPG['ORPGVST']){
		deleteAllCookies();
		cookieRaid['initial'] = RPG['ORPGVST']
	    }
	    $('#Alarms').html(RPG['alarm_text'])
	    var cts = Math.round((new Date()).getTime() / 1000);	
	    if(cts - RPG['status_ts'] == DATA.noSystemChangeTimeout){
		rpgStatusMsgs['new'] = timeStamp() + DATA.noSystemChangeMsg 
	    }
	    if(cts - RPG['status_ts'] > DATA.noSystemChangeTimeout){
		    $('#Status').html(rpgStatusMsgs['new'])
	    }
	    else{ 
		$('#Status').html(RPG['status_msgs'])
	    }
	    if (RPG['msg_type']) {
	        status_class_string = 'bar-border '+colorMsgs[RPG['msg_type'].split('_')[2]]	
	        $('#Status').attr('class',status_class_string)	
	    }
	    else {
		if (RPG['error']) 
		    $('#Status').attr('class','bar-border minor-alarm')
		else
		    $('#Status').attr('class','bar-border')
	    }
	    if (RPG['cleared']) 
	        $('#Status').attr('class','bar-border normal-ops')
	    if (RPG['alarm_msg_type']) {
	        alarm_class_string = 'bar-border '+colorMsgs[RPG['alarm_msg_type'].split('_')[2]]
	        $('#Alarms').attr('class',alarm_class_string)
	    }
	    else {
		if (RPG['alarm_error']) 
		    $('#Alarms').attr('class','bar-border minor-alarm')
		else 
		    $('#Alarms').attr('class','bar-border')
	    }
	    if (!RPG['alarm_active']) 
		$('#Alarms').attr('class','bar-border normal-ops') 
		       
	    $('#VCP_start_time').html(" "+RPG['ORPGVST'])
	    if (Object.keys(actionflag).indexOf('SAILS') < 0){
	        if(RPG['RPG_SAILS']){
	       	    $('#RPG_SAILS').val('on').slider('refresh');
		    $('#SAILS_Exception').val('on').slider('refresh');
		    $('#SAILS_Exception_status').addClass('hide');
		    if(RPG['sails_allowed']){
		        $('#RPG_SAILS_contain .ui-slider .ui-slider-label-a').text('ACTIVE/'+RPG['sails_cuts'])	
		    }
		    else{
		        $('#RPG_SAILS_contain .ui-slider .ui-slider-label-a').text('INACTIVE')
		    }
		}
		else{
		    $('#RPG_SAILS').val('off').slider('refresh');
		    $('#SAILS_Exception').val('off').slider('refresh');
		    $('#SAILS_Exception_status').removeClass('hide');
		}
	    }			

	    $('#RPG_oper').html(RPG['RPG_op'][RPG['RPG_op'].length-1])
	    for (i in RPG['RPG_op']) {
	        switch (RPG['RPG_op'][i]){
	 	    case 'CMDSHDN':
			$('#RPG_oper').attr('class','minor-alarm bar-border2')
                        $('.RPG_STAT').removeClass('hide');
			break;
		    case 'LOADSHED': case 'MAR':
			if (RPG['RPG_op'][i] == 'MAR')
			    $('#RPG_oper').html('MAINT REQ')
			$('#RPG_oper').attr('class','minor-alarm bar-border2')
			$('#grid2').attr('class','minor-alarm-grid')
                        $('.RPG_STAT').removeClass('hide');
			break;
		    case 'MAM':
			$('#RPG_oper').html('MAINT MAND').attr('class','major-alarm bar-border2')
			$('#grid2').attr('class','major-alarm-grid')
			$('.RPG_STAT').removeClass('hide');
			break;
		    case 'ONLINE':
			if(RPG['RPG_alarms'] == 'NONE')
			    $('#grid2').attr('class','normal-ops-grid')		
			$('#RPG_oper').attr('class','normal-ops bar-border2')
			if (RPG['RPG_state'] == 'OPER' || RPG['RPG_state'] == 'STANDBY')
			    $('.RPG_STAT').addClass('hide');
	 	   	break;
		    default:
			$('#RPG_oper').attr('class','inop-indicator bar-border2')
			$('#grid2').attr('class','normal-ops-grid')
                        $('.RPG_STAT').removeClass('hide');
	        }
	    }

            $('#RPG_state').html(RPG['RPG_state'])
	    switch(RPG['RPG_state']){			
		case 'OPER': case 'STANDBY':
			if (RPG['RPG_state'] == 'OPER')
			    $('#RPG_state').html('OPERATE') 
			$('#RPG_state').attr('class','bar-border2 normal-ops');
			break;
		case 'RESTART': 
			$('#RPG_state').attr('class','bar-border2 inop-indicator');
                        $('.RPG_STAT').removeClass('hide');
			break;
		case 'TEST':
			$('#RPG_state').attr('class','bar-border2 minor-alarm');
                        $('.RPG_STAT').removeClass('hide');
			break;
		case 'SHUTDOWN':
			$('#RPG_state').attr('class','bar-border2 inop-indicator')
			$('#RDA_STATE').html('UNKNOWN').attr('class','bar-border2 inop-indicator')
			$('#OPERABILITY_LIST').html('UNKNOWN').attr('class','bar-border2 inop-indicator') 
                        $('.RPG_STAT').removeClass('hide');
			var unk_list = ['AVSET_Exception','RS_AVSET','RS_CMD','RS_SUPER_RES']
			for (unk in unk_list){
			    $('#'+unk_list[unk]).val('off').slider('refresh')
			    $('#'+unk_list[unk]+'_contain .ui-slider .ui-slider-label-b').text('????')
			    $('#'+unk_list[unk]+'_status').removeClass('hide')
			}
			break;		
            };
	    switch(RPG['narrowband']){
		case 'NB_HAS_NO_CONNECTIONS': case 'NB_HAS_FAILED_CONNECTIONS':
		    $('.nblink-status').html('').removeClass('normal-ops').addClass('null-ops')
		    break;
		case 'NB_HAS_CONNECTIONS':
		    $('nblink-status').html(link).removeClass('null-ops').addClass('normal-ops')
		    break;
	    }
	});

	non_rapid.addEventListener('RS_dict',function(e) {
	    RS = JSON.parse(e.data)
	    $("#RS_VCP_NUMBER").html(RS['RS_VCP_NUMBER'])
	    var state = Object.keys(RS['RDA_static']);
	    if (RS['RDA_static']['OPERABILITY_LIST'] == 'ONLINE' && RS['RDA_static']['RDA_STATE'] == 'OPERATE')
	        $('#RDA_STAT').addClass('hide');
	    else
		$('#RDA_STAT').removeClass('hide');
	    for (b in state){
		var value2 = state[b];
		$("#"+value2).html(RS['RDA_static'][value2])
		switch (RS['RDA_static'][value2]){
		    case 'OPERATE': case 'ONLINE': case 'OK': case 'STARTUP': case 'STANDBY':
			$("#"+value2).attr('class','normal-ops bar-border2');
			$('#'+value2+'_label').attr('class','bar-border1 show');
			$('#grid1').attr('class','normal-ops-grid');
			$('#grid1title').attr('class','normal-ops-grid');
			break;
		    case 'NOT_INSTALLED':
			$('#'+value2).attr('class','bar-border2 hide');$('#'+value2+'_label').attr('class','bar-border1 hide');
			break;
		    case 'MAINTENANCE_MAN':
			$("#grid1").attr('class','major-alarm-grid');
			$('#grid1title').attr('class','major-alarm-grid');
			$("#"+value2).attr('class','bar-border2 major-alarm');	
			$('#Alarms').attr('class','major-alarm');
			break;
		    case 'MAINTENANCE_REQ':
			$("#grid1").attr('class','minor-alarm-grid');
			$('#grid1title').attr('class','minor-alarm-grid');
			$("#"+value2).attr('class','bar-border2 minor-alarm');
			$('#Alarms').attr('class','minor-alarm');
			break;
		    case 'UNKNOWN':
			$("#"+value2).attr('class','bar-border2 inop-indicator');
			break; 
		    case 'INOPERABLE':
			$("#"+value2).html('INOPERABLE')
			$('#'+value2).attr('class','bar-border2 inop-indicator');
			$('#grid1').attr('class','inop-grid');
			$('#grid1title').attr('class','inop-grid');
			break;
		    case 'N/A':
			$('#'+value2).html('N/A');
			break;
		}
	    }
	    if(RS['latest_alarm']['valid']){
		if(RS['latest_alarm']['precedence']){
		    if (RS['latest_alarm']['alarm_status']){
			$('#Alarms').html(RS['latest_alarm']['timestamp']+' >> RDA ALARM ACTIVATED: '+RS['latest_alarm']['text']).attr('class','bar-border minor-alarm')
		    }
		    else{
			$('#Alarms').html(RS['latest_alarm']['timestamp']+' >> RDA ALARM CLEARED: '+RS['latest_alarm']['text']).attr('class','bar-border normal-ops')
		    }
		}
	    }
	    if (Object.keys(actionflag).indexOf('AVSET') < 0){
		var cookieCheck = getCookie('AVSET',0)
		if(cookieCheck == "NULL"){cookieCheck = RS['RS_AVSET']}
		$('#AVSET_Exception').val(cookieCheck).slider('refresh')
		if(cookieCheck  =='on'){
		    $('#AVSET_Exception_status').addClass('hide')
		}
		else{
		    $('#AVSET_Exception_status').removeClass('hide')
		}
	    }
	    for (i in item){
		var value = item[i]
		var val = RS[value]
		if (val == 'on'){var retrieved = true}else{var retrieved = false}
		if (value == "RS_AVSET"){
		    if (Object.keys(actionflag).indexOf('AVSET') < 0){
			var cookieCheck = getCookie('AVSET',0)
			if(cookieCheck != "NULL"){
			    val = cookieCheck
			    if(val == "off"){
				$('#RS_AVSET_contain .ui-slider .ui-slider-label-a').text('ENABLED')
			    }
			}
			else{
			    $('#RS_AVSET_contain .ui-slider .ui-slider-label-a').text('ENABLED')
			}
			$("#RS_AVSET").val(val).slider('refresh')
		    }
		}
		else{
		    var cookieCheck = getCookie(value,1)
		    if(cookieCheck != "NULL" && Object.keys(actionflag).indexOf(value) < 0){
			if(cookieCheck){
			    $("#"+value+"_status").addClass('hide');
			    $("#"+value+"_contain .ui-slider-label-a").text('ENABLED')
			}
			else{
			    $("#"+value+"_status").removeClass('hide');
			    $("#"+value).val('off').slider("refresh")
			    $('#'+value+'_contain .ui-slider .ui-slider-label-b').text('PENDING')
			}
		    }
		    else{
			if(retrieved){
			    $("#"+value+"_status").addClass('hide');
			    $("#"+value).val('on').slider("refresh")
			}
			else{
			    $("#"+value+"_status").removeClass('hide');
			    $("#"+value).val('off').slider("refresh")
			}
		    }
		}
	    }
	    var all_alarms = DATA.RDAalarms
	    for (a in all_alarms){
		$('#'+all_alarms[a]).addClass('hide')
	    };
	    var current_alarms = RS['RDA_static']['RS_RDA_ALARM_SUMMARY_LIST']
	    for (alarm in current_alarms){
		$('#'+current_alarms[alarm]).removeClass('hide')
		var i = all_alarms.indexOf(alarm);
		if (i != -1) {
		    all_alarms.splice(i,1);
		}
	    }
	    switch(RS['RDA_static']['CS']){
		case 'CS_RPG_REMOTE':
		    $('#CONTROL_STATUS').html('RPG')
		    break;
		case 'CS_LOCAL_ONLY':
		    $('#CONTROL_STATUS').html('RDA')
		    break;
		case 'CS_EITHER':
		    $('#CONTROL_STATUS').html('EITHER')
		    break;
	    }
	    if (RS['CONTROL_AUTHORITY']) {
		if (RS['RS_RDA_CONTROL_AUTH'] == "CA_LOCAL_CONTROL_REQUESTED")
                    $('#RS_RDA_CONTROL_AUTH').html("LOCAL REQUESTED")
	        else if (RS['RS_RDA_CONTROL_AUTH'] == "CA_REMOTE_CONTROL_ENABLED")
                    $('#RS_RDA_CONTROL_AUTH').html("REMOTE REQUESTED")
		else
                    $('#RS_RDA_CONTROL_AUTH').html("NO ACTION")
	    }
	    else {
                $('#RS_RDA_CONTROL_AUTH').html("UNKNOWN")
	    }
	    if (RS['RDA_static']['RDA_STATE'] == "UNKNOWN") 
	 	$("input[name='RDA_state']:checked").attr("checked",false).checkboxradio('refresh') 
            $("#"+RS['RDA_static']['RDA_STATE']).trigger('click').checkboxradio('refresh')
	    if (RS['RS_PERF_CHECK_STATUS']) 
	        $('#RS_PERF_CHECK_STATUS').html('PENDING')
	    else
		$('#RS_PERF_CHECK_STATUS').html('AUTO')
	    $('#RS_DATA_TRANS_ENABLED').html(DATA.RS_DATA_TRANS_ENABLED[RS['RS_DATA_TRANS_ENABLED']]);
	    $('#RS_AVE_TRANS_POWER').html(RS['RS_AVE_TRANS_POWER']+' Watts');
	    if(RS['RDA_static']['RS_RDA_ALARM_SUMMARY_LIST'][0] == 'NO_ALARM')
	        $('#grid1').addClass('normal-ops-forest')    
            $('input[name="RDA_control"]').checkboxradio('enable')                
	    if (RS['BLANKING_VALID'][0]) {
		if (RS['BLANKING_VALID'][1]) {
 		    $('#RDA_power').val("UNKNOWN");
                    $('#RDA_power_label').html('UNKNOWN')
		}
		else {
	    	    if (RS['RS_AUX_POWER_GEN_STATE']) {
                        $('#RDA_power').val("CRDA_AUXGEN")
                        $('#RDA_power_label').html('GENERATOR POWER')
                        $('#RS_AUX_POWER_GEN_STATE').removeClass('hide')
		    }
		    else {
		        $('#RDA_power_label').html('UTILITY POWER')
                        $('#RDA_power').val("CRDA_UTIL");
                        $('#RS_AUX_POWER_GEN_STATE').addClass('hide')
		    }
		}
		if (RS['BLANKING_VALID'][2]) {
                    $('#RDA_control_label').html("UNKNOWN");
		}
		else {
		  switch(RS['RDA_static']['CS']) 
		  {
		    case 'CS_LOCAL_ONLY':	
                        $('#RDA_control_label').html("LOCAL (RDA)");
			break;
		    case 'CS_RPG_REMOTE':
                        $('#RDA_control_label').html("REMOTE (RPG)");
			break;
		    case 'CS_EITHER':
                        $('#RDA_control_label').html("EITHER");
			break;
		    default:
                        $('#RDA_control_label').html("UNKNOWN");
			break;
		  }
	        }	
	        $('#RDA_power').slider('disable')
		$('input[name="RDA_control"]').checkboxradio('disable')
	    }
	    else {
                if (RS['RS_AUX_POWER_GEN_STATE']) {
                    $('#RDA_power').val("CRDA_AUXGEN");
                    $('#RDA_power_label').html('GENERATOR POWER')
		    $('#RS_AUX_POWER_GEN_STATE').removeClass('hide')
		}
                else {
                    $('#RDA_power').val("CRDA_UTIL");
		    $('#RDA_power_label').html('UTILITY POWER')
		    $('#RS_AUX_POWER_GEN_STATE').addClass('hide')
		}
                switch(RS['RDA_static']['CS'])
                {
                    case 'CS_LOCAL_ONLY':
                        $('#LOCAL').checkboxradio('disable');	
                        $('#RDA_control_label').html("LOCAL (RDA)");
			break;
                    case 'CS_RPG_REMOTE':
                        $('#REMOTE').checkboxradio('disable');
                        $('#RDA_control_label').html("REMOTE (RPG)");
                        break;
                    case 'CS_EITHER':
 			$('input[name="RDA_control"]').checkboxradio('disable')
                        $('#RDA_control_label').html("EITHER");
                        break;
                    default:
                        $('#RDA_control_label').html("UNKNOWN");
                        break;
                }

	    }	
            $('#RDA_power').slider('refresh')
            $('input[name="RDA_control"]').checkboxradio('refresh')


	    stopCheck['WIDEBAND'] = RS['RDA_static']['WIDEBAND']
	    switch (RS['RDA_static']['WIDEBAND']){
		    case 'CONNECTED':
			if (stopCheck['WIDEBAND_FLAG']){
			    for (w = 0;w < 4; w++){
				$('.status'+w).html('').removeClass('major-alarm').removeClass('minor-alarm').addClass('normal-ops')
			    }
			    $('.link-status-sq').removeClass('major-alarm').removeClass('minor-alarm').addClass('normal-ops')
			    stopCheck['WIDEBAND_FLAG'] = false
			}
			break;
		    case 'WBFAILURE': case 'DOWN': case 'NOT_IMPLEMENTED':
			var word = RS['RDA_static']['WIDEBAND'].split('_')
			var word_l = word.length-1
			for (w = 0;w < 4; w++){
			    if(w > word_l){$('.status'+w).html('').removeClass('minor-alarm').removeClass('normal-ops').addClass('major-alarm')}
			    else{$('.status'+w).html(word[w]).removeClass('minor-alarm').removeClass('normal-ops').addClass('major-alarm')}
			}
			$('.link-status-sq').html('X').removeClass('minor-alarm').removeClass('normal-ops').addClass('major-alarm')
			stopCheck['WIDEBAND_FLAG'] = true
			break;
		    case 'CONNECT_PENDING': case 'DISCONNECTED_CM': case 'DISCONNECTED_HC': case 'DISCONNECTED_RMS': case 'DISCONNECT_PENDING': case 'DISCONNECTED_SHUTDOWN':
			var word = RS['RDA_static']['WIDEBAND'].split('_')
			var word_l = word.length-1
			for (w = 0;w < 4; w++){
			    if(w > word_l){$('.status'+w).html('').removeClass('normal-ops').removeClass('major-alarm').addClass('minor-alarm')}
			    else{$('.status'+w).html(word[w]).removeClass('normal-ops').removeClass('major-alarm').addClass('minor-alarm')}
			}
			$('.link-status-sq').html('X').removeClass('normal-ops').removeClass('major-alarm').addClass('minor-alarm')	
			stopCheck['WIDEBAND_FLAG'] = true
			break;
	    }
                



		    


	});


	$('#refreshPage').click(function(){
		location.reload()
	});
	$('#Mode_Conflict_contain').click(function(){
		$.get("/button?id=hci_mode_status")
	});
	$('#link').click(function(){
		$.get("/button?id=hci_rda_link")
	});
	$('#perf_check_time').click(function(){
		$.get("/button?id=hci_rdc_orda")
	});
	$('#rda_alarms').click(function(){
		$.get("/button?id=hci_rda_orda")
	});	
	$('#rpg_status').click(function(){
            window.open("/rpg_status","_blank","width = 900, height = 700");
	});	
	$('#user_comms').click(function(){
		$.get("/button?id=hci_nb")
	});	
	$('#prf_control').click(function(){
		$.get("/button?id=hci_prf")
	});	
	$('#enviro_data').click(function(){
		$.get("/button?id=hci_wind")
	});
	$('#rpg_misc').click(function(){
		$.get("/button?id=hci_misc")
	});
	$('#dqd').click(function(){
	//	$.get("/button?id=dqd")
	});
	$('#88D-ops').click(function(){
                window.open("/operations","_blank","width = 1024, height = 380");
        }); 	
	$('#shift-change').click(function(){
                window.open("http://0.0.0.0:4235","_blank","width= 1024, height = 1024, scrollbars=yes");
        });

});


