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
init();
DEFAULTS = {}
    function GetClock(){
    var d=new Date();
    var nday=d.getUTCDay(),nmonth=d.getUTCMonth(),ndate=d.getUTCDate(),nyear=d.getUTCFullYear();
    if(nyear<1000) nyear+=1900;
    var d=new Date();
    var nhour=d.getUTCHours(),nmin=d.getUTCMinutes(),nsec=d.getUTCSeconds();
    if(nmin<=9) nmin="0"+nmin
    if(nsec<=9) nsec="0"+nsec;

    $('#clockbox-date').html(""+DATA.calendar.tday[nday]+", "+DATA.calendar.tmonth[nmonth]+" "+ndate+", "+nyear);
    $('#clockbox-time').html(""+nhour+":"+nmin+":"+nsec+" "+"UT");
    }
    function perfCheck(end){
        setInterval(function(){
            var remaining = end*1000-Date.parse(new Date())
            if(remaining < DATA.perfCheckYellow){
                $('#perf_check_time').css('background-color','#FCFC23')
            }
            else{
                $('#perf_check_time').css('background-color','white')
            }
            var d = new Date(end*1000-Date.parse(new Date()))
            var nhour=d.getUTCHours(),nmin=d.getUTCMinutes(),nsec=d.getUTCSeconds();
            $('#perf_check_time').html(nhour+'h '+nmin+'m '+nsec+'s')
            if(remaining < 0){
                $('#perf_check_time').html('PENDING').css('background-color','#51FF22')
            }
        },1000);
    }

    window.onload=function(){
    GetClock();
    setInterval(GetClock,DATA.clockInterval);
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



    var actionflag = {}
    var PMD = {}
    $(document).ready(function(){
	function toggleHandler(attr,switchval){	
	    switch(switchval){
	    case 1:
		if(attr.controlname == 'AVSET_Exception'){attr.controlname = 'RS_AVSET'}
		switch(attr.controlname){
		case 'SAILS_Exception':
	  	    $.post('/sails',{NUM_CUTS:attr.num_cuts});
		    delete actionflag.SAILS
		    break;
		case 'RS_AVSET': case 'RS_CMD': case 'RS_SUPER_RES':
		    if (attr.displayname == 'AVSET'){flag = 0}else{flag=1};
		    if (attr.newVal.confirmation == "on"){
			$.post('/send_cmd',{COM:attr.controlname+'_ENABLE',FLAG:flag});
		    }
		    else{
			$("#"+attr.controlname+"_contain .ui-slider-label-b").text('PENDING')
			$.post('/send_cmd',{COM:attr.controlname+'_DISABLE',FLAG:flag});
		    }
		    break;
		case 'Model_Update': case 'VAD_Update': case 'mode_A_auto_switch': case 'mode_B_auto_switch':
		    if(attr.newVal.confirmation == "on"){
			$.post('/set_flag',{TYPE:'hci_set_'+attr.controlname.toLowerCase()+'_flag',FLAG:1});
		    }
		    else{
			$.post('/set_flag',{TYPE:'hci_set_'+attr.controlname.toLowerCase()+'_flag',FLAG:0});
		    }
		    break;
		}	
		$("#"+attr.controlname).val(attr.current).slider('refresh')
		if(attr.displayname.split('-')[0] == "AVSET"){
		    document.cookie = "AVSET"+"="+attr.current+"; expires="+attr.date0.toUTCString();
		}
		else{
		    document.cookie = attr.controlname+"="+attr.current+"; expires="+attr.date0.toUTCString();
		}
		break;
	    case 2:
		$("#"+attr.controlname).val(attr.newVal.cancel).slider('refresh')
		break;
	    }			
	};
	$(".control-item").css('background-color','#1F497D','color','#FFFFFF');
	$(".nav-item").css('background-color','#002060');
	$(".default-select").on('click',function(){
	    var element = $(this);
	    var value = element.attr('value');
	    var id = element.parent().attr('id');
	    switch(id) {
		case 'default_wx_mode':	
		    $('#id-confirm').html(DATA.defaults.Pre+DATA.defaults.defWx+' '+value+' ?');
		    break;
		case 'default_mode_A':
                    $('#pop-confirm').attr("alt","A");
                    $('#id-confirm').html(DATA.defaults.Pre+DATA.defaults.defModeA+' '+value+' ?');
		    break;
		case 'default_mode_B':	
		    $('#pop-confirm').attr("alt","B");
                    $('#id-confirm').html(DATA.defaults.Pre+DATA.defaults.defModeB+' '+value+' ?');
		    break;
	    };
	    $('#pop-cancel').attr("alt",id);
	    $('#pop-confirm').attr("value",value);	
	    $("#popupDialog").popup('open');
	    $("#pop-title").html(DATA.popTitle);
	
	});
	$("#pop-confirm").on('click',function(){
	    var command = $(this).attr("value");
            var mode = $(this).attr("alt");
	    if(command != "") {
	        if($.isNumeric(command))
	            $.post('/deau_set',{SET:command,FLAG:1,MODE:mode});
	        else 
                    $.post('/deau_set',{SET:command,FLAG:0});
	    }	
	});
	$("#pop-cancel").on('click',function(){
	    var id = $(this).attr("alt");
            if(id != "") 
		$("#"+id).val(DEFAULTS[id]).selectmenu("refresh")
	});
        $("#pass-protect").click(function(){
            $('#popupDialogPass').popup('open')
        });
        $('#pop-submit').on('click', function(event){
            user = $(":radio:checked").attr('id')
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
                                $("#default-contain :input").not(":button").selectmenu('enable');
                            }
                            else {
                                $("#pass-protect").attr("class","ui-btn ui-icon-lock ui-btn-icon-left control-item control-shadow")
                                $("#pass-protect").attr("value","locked").html("Locked")
				$("#default-contain :input").not(":button").selectmenu('disable');
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

 
	$(".toggle").on('slidestop',function(){
	    $("#pop-confirm").attr("value","");	
	    var element = $(this)
	    var controlname = element.attr("id")
	    var displayname = element.attr("alt")
	    var current = element.val();
	    console.log(current)
	    var date0 = new Date();
	    date0.setTime(date0.getTime()+900000)
	    if(displayname.split('-')[0] == "SAILS"){
		$.getJSON("/update",function(data){
		    actionflag["SAILS"] = data['RPG_dict']['ORPGVST']
		});
	    }
	    else if(displayname.split('-')[0] == "AVSET"){
		$.getJSON("/vst",function(data){
		    actionflag["AVSET"] = data['ORPGVST']
		});
	    }
	    else{
		$.getJSON("/vst",function(data){
		    actionflag[controlname] = data['ORPGVST']
		});
	    }
	    if (controlname != "RDA_Messages"){
		$.getJSON("/vst",function(data){
                    actionflag[controlname] = data['ORPGVST']
		});
		if (current=="on"){newVal = {cancel:"off",confirmation:"on"}}else{newVal = {cancel:"on",confirmation:"off"}}
		attr = {controlname:controlname,displayname:displayname,date0:date0,newVal:newVal,current:current}
		if (controlname == "PRF_Mode"){
		    $("#prf_control").click();
		    $('#PRF_Mode').val(newVal.cancel).slider('refresh')
		}
	        else{
  		    $("#popupDialog").popup('open');
	            $("#pop-title").html(DATA.popTitle)
		    $("#sails-insert").html('')
		    child1 = element.find("option:first-child").html()
		    child2 = element.find("option:last-child").html()
		    console.log(child1)
		    console.log(child2)
		    if (['SAILS','AVSET','CMD','Super-Res'].indexOf(displayname) >=0){
			if (displayname == 'SAILS'){
			    $("#pop-title").html(DATA.popTitleSails)
                            $("#sails-insert").html($('#sails-form').html())
                            $("#id-confirm").html(DATA.SAILSDialog)
                            $('#popupDialog').trigger('create')
                        }
			else {
		            if (current=="on"){
                                $("#id-confirm").html(DATA.hardCommandConfirm[0]+displayname+DATA.hardCommandConfirm[1])
                            }
                            else{
			        $("#id-confirm").html(DATA.softCommandConfirm[0]+displayname+DATA.softCommandConfirm[1]+child1+DATA.softCommandConfirm[2])
			    }
		        }
		    }
		    else{
		 	if (current=="off"){
			    $("#id-confirm").html(DATA.softCommandConfirm[0]+displayname +DATA.softCommandConfirm[1]+child1+DATA.softCommandConfirm[2])
			}
			else{
			    $("#id-confirm").html(DATA.softCommandConfirm[0]+displayname+DATA.softCommandConfirm[1]+child2+DATA.softCommandConfirm[2])
			}
		    }
                    $('#popupDialog').trigger('create')
		    $("#pop-cancel").bind('click',{attr},function(event){
		        toggleHandler(event.data.attr,2)
                        $('#pop-confirm').unbind();
                        $('#pop-cancel').unbind();						
		    });
		    $("#pop-confirm").bind('click',{attr},function(event){
			if (event.data.attr.displayname == 'SAILS') {
			    event.data.attr['num_cuts'] = $('#sails-insert #select-choice-0').val();
			}    
			toggleHandler(event.data.attr,1)
			$('#pop-confirm').unbind();
			$('#pop-cancel').unbind();
		    });
		}
	    }

	});
	    var non_rapid = new EventSource('/update_s');
	    non_rapid.addEventListener('RPG_dict',function(e) {
		var RPG = JSON.parse(e.data)
		var flags = Object.keys(actionflag)
		for (flag in flags){
		    if(actionflag[flags[flag]] != RPG['ORPGVST']){
		 	delete actionflag[flags[flag]]
		    }
		}
		if (Object.keys(actionflag).indexOf('SAILS') < 0){
		    if(RPG['RPG_SAILS']){
			$('#SAILS_Exception').val('on').slider('refresh');
			if(RPG['sails_allowed']){
			    $('#SAILS_Exception_contain .ui-slider .ui-slider-label-a').text('ACTIVE/'+RPG['sails_cuts'])
			}
			else{
			    $('#SAILS_Exception_contain .ui-slider .ui-slider-label-a').text('INACTIVE')
			}
		    }   
		    else{
			$('#SAILS_Exception').val('off').slider('refresh');
		    }
		}
                if(RPG['RPG_state'] == "SHUTDOWN"){
                    var unk_list = ['AVSET_Exception','RS_CMD','RS_SUPER_RES']
                    for (unk in unk_list){
                        $('#'+unk_list[unk]).val('off').slider('refresh')
                        $('#'+unk_list[unk]+'_contain .ui-slider .ui-slider-label-b').text('????')
                        $('#'+unk_list[unk]+'_status').removeClass('hide')
                    }
                }

	    });
	    non_rapid.addEventListener('PMD_dict',function(e) {
		var PMD_current = JSON.parse(e.data)
                if ( PMD_current['perf_check_time'] != PMD['perf_check_time'] )
                    perfCheck(PMD_current['perf_check_time']);
                if ( PMD_current['prf'] != PMD['prf'] ) {
                    switch(PMD_current['prf']){
                      case 'CELL_BASED': case 'STORM_BASED':
                          $('#PRF_Mode_contain .ui-slider .ui-slider-label-a').text('MULTI')
                          $('#PRF_Mode').val('on').slider('refresh')
                          break;
                      case 'AUTO_PRF':
                          $('#PRF_Mode_contain .ui-slider .ui-slider-label-a').text('AUTO')
                          $('#PRF_Mode').val('on').slider('refresh')
                          break;
                      case 'MANUAL_PRF':
                          $('#PRF_Mode').val('off').slider('refresh')
                          break;
                    }
                }

		if(PMD['mode_trans']){
		    $("#Mode_Conflict_contain").html('TRANS').removeClass('normal-ops').addClass('minor-alarm');
		}
		else{
		    if(PMD['mode_conflict']){
		        $("#Mode_Conflict_contain").html('YES').removeClass('normal-ops').addClass('minor-alarm');
		    }
		    else{
			$("#Mode_Conflict_contain").html('NO').removeClass('minor-alarm').addClass('normal-ops');
		    }
		}

		if(PMD['mode_conflict']){$("#Mode_Conflict_contain").html('YES').addClass('minor-alarm')}
		else{$("#Mode_Conflict_contain").html('NO').addClass('normal-ops')}
		if(PMD['current_precip_status']){$('#Precip_contain').html('ACCUM')}
		else{$('#Precip_contain').html('NO ACCUM')}
                var loadshed_cats = Object.keys(PMD['loadshed'])
                $('#Load_Shed_contain').html('NORMAL')
                for (lshd in loadshed_cats){
                    if(PMD['loadshed'][loadshed_cats[lshd]] != 'NONE'){
                        $('#Load_Shed_contain').html(PMD['loadshed'][lshd])
                        if(PMD['loadshed'][lshd] == 'ALARM'){
                            $('#Load_Shed_contain').attr('style','font-size:14px;background-color:blue')
                        }
                    }
                }
                if ( PMD_current['loadshed'] != PMD['loadshed'] ) {
                    var loadshed_cats = Object.keys(PMD_current['loadshed'])
                    $('#Load_Shed_contain').html('NORMAL')
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
		var ADAPT = JSON.parse(e.data)
                exception_list = ['Model_Update','VAD_Update','mode_A_auto_switch','mode_B_auto_switch']
                for (e in exception_list){
                    var exception = exception_list[e]
                    if(Object.keys(actionflag).indexOf(exception) <0){
                        var cookieCheck = getCookie(exception,1)
                        if(ADAPT[exception]){
                            $('#'+exception).val('on').slider('refresh');
                        }
                        else{
                            $('#'+exception).val('off').slider('refresh');
                        }
                    }
                }
		default_list = ['default_wx_mode','default_mode_A','default_mode_B']
		for (d in default_list) {
		    var def = default_list[d];
		    $('#'+def).val(ADAPT[def]).selectmenu('refresh');
		    DEFAULTS[def] = ADAPT[def];	
		}
		    
	    });

 	    non_rapid.addEventListener('RS_dict',function(e) {
	        var RS = JSON.parse(e.data)
		var item = ['RS_SUPER_RES','RS_CMD']; 
		for (i in item){
		    var value = item[i]
		    if(Object.keys(actionflag).indexOf(value) < 0){
			var cookieCheck = getCookie(value,1)
			var val = RS[value]
			if(cookieCheck != "NULL"){
			    if(cookieCheck){
				$("#"+value).val('on').slider("refresh")
			    }
			    else{
				$("#"+value).val('off').slider("refresh")
				$('#'+value+'_contain .ui-slider .ui-slider-label-b').text('PENDING')
			    }
			}
			else{
			    $("#"+value).val(val).slider("refresh")	
			} 
		    }
		}
                if (Object.keys(actionflag).indexOf('AVSET') < 0){
                    var cookieCheck = getCookie('AVSET',1)
                    if(cookieCheck == "NULL"){
                        $('#AVSET_Exception').val(RS['RS_AVSET']).slider('refresh')
                        $('#AVSET_Exception_contain .ui-slider .ui-slider-label-b').text('DISABLED')
                    }
                    else{
                        if(cookieCheck){
                            $('#AVSET_Exception').val('on').slider('refresh')
                        }
                        else{
                            $('#AVSET_Exception_contain .ui-slider .ui-slider-label-b').text('PENDING')
                            $('#AVSET_Exception').val('off').slider('refresh')
                        }
                    }
                }

		$("#RS_VCP_NUMBER").html(RS['RS_VCP_NUMBER'])
	    });

	$('#refreshPage').click(function(){
		location.reload()
	});
	$('#perf_check_time').click(function(){
		$.get("/button?id=hci_rdc_orda");
	});
	$('#Mode_Conflict_contain').click(function(){
		$.get("/button?id=hci_mode_status");
	});
	$('#prf_control').click(function(){
		$.get("/button?id=hci_prf");
	});	

	$('#enviro_data').click(function(){
		$.get("/button?id=hci_wind");
	});
	$('#Precip_contain').click(function(){
		$.get("/button?id=hci_precip_status")
	});
	$('#vcp-button').click(function(){
		window.open("http://localhost:3142","_blank","width= 1024, height = 720, scrollbars=yes");
	});
	$('#RDA_Messages').val("on").slider("refresh")
	$('#close').click(function(){
		window.close();
	});
		
    });
	
