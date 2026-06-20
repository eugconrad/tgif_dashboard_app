
function newAclEntry(scope, data) {

    //https://api.tgif.network/dmr/userdb/
    data['tgid'] = scope;
    $.ajax({
        type: 'POST',
        url: 'https://'+window.location.hostname+'/tgcontrol.php',
        dataType: 'json',
        data: data,
        context: document.body,
        //global: false,
        async: true,
        success: function (data) {
        },
        error: function (e) {
            console.log(e);
            alert(e);
        }

    });
}


function banUserCB(cli, dat, data, timespan, labelz, flags = 0) {

    var htext = '<div class="row">' +
        '<div class="scroller flex-grow-1 visible" style="border: 3px solid var(--blue) ;">' +
        '<form id="ACL_MODAL" action="" data-tgid="'+dat.tgid+'" >' +
        '<div class="form-group" style="padding-left: 12px;padding-right: 12px;">' +
        '<label>Enforce For: </label><br>';

    htext += '<div class="form-check"><input class="form-check-input" type="checkbox" id="formCheck-' + 0 + '" data-val="' + dat.ipstr + '"><label class="form-check-label" for="formCheck-' + 0 + '">IP: ' + dat.ipstr + '</label></div>';

    for (let i = 0; i < data.length; i++) {
        //console.log(data[i]);
        htext += '<div class="form-check"><input class="form-check-input" type="checkbox" id="formCheck-' + String(i + 1) + '" data-val="' + data[i] + '"><label class="form-check-label" for="formCheck-' + String(i + 1) + '">ID: ' + data[i] + '</label></div>';
    }

    htext += '</div></form></div></div>';

    $.confirm({
        title: cli.callsign + ' ACL Rule Details',
        content: htext,
        icon: 'fas fa-bolt',
        animation: 'scale',
        draggable: true,
        theme: 'dark',
        closeIcon: true,
        columnClass: 'small',
        dragWindowGap: 25,
        closeAnimation: 'zoom',
        escapeKey: true,
        backgroundDismiss: true,
        onContentReady: function () {

            var self = this;
            $('.jconfirm-buttons button')[0].style.width='100%';

        },
        buttons: {
            formSubmit: {
                text: 'Submit',
                btnClass: 'btn-primary',
                action: function () {

                    var nEntry = {};
                    nEntry['flags'] = 3 | flags;
                    nEntry['cidr'] = [];
                    nEntry['uuid'] = [];
                    nEntry['duration'] = timespan;
                    nEntry['label'] = labelz;
                    nEntry['action'] = 'add';

                    var cboxes = $('.form-check-input');
                    for (var i = 0; i < cboxes.length; i++) {
                        if (cboxes[i].checked) {
                            if (i == 0 && parseCIDR(cboxes[i].attributes['data-val'].nodeValue)) {
                                nEntry['flags'] |= 0x10;
                                nEntry['cidr'].unshift(cboxes[i].attributes['data-val'].nodeValue);
                            } else {
                                var nID = String(cboxes[i].attributes['data-val'].nodeValue);
                                //if (nID.length > 9 || nID < 4) continue;
                                nEntry['uuid'].unshift(nID);
                                nEntry['flags'] |= 0x20;
                            }
                        }
                    }

                    console.log(nEntry);
                    if (nEntry['cidr'].length > 0 || nEntry['uuid'].length > 0)
                        newAclEntry($('#ACL_MODAL').data('tgid'), nEntry);
                }
            },
        }
    });
}


function banUser(cli, dat, timespan, label, flags=0x80) {

    //https://api.tgif.network/dmr/userdb/
    var callsign = "";
    if (typeof cli.rptcallsign == "undefined") {
        callsign = cli.rptcallsign = dat.callsign;
        cli["callsign"] = dat.callsign;
    }else{
        callsign = cli.rptcallsign;
    }
    $.ajax({
        type: 'GET',
        url: "https://api.tgif.network/dmr/userdb/" + callsign,
        dataType: 'json',
        //context: document.body,
        //global: false,
        async: false,
        success: function (data) {
            return banUserCB(cli, dat, data, timespan, label, flags);
        },
        error: function (e) {
            alert(e.toString());
        }

    });
}






function createBanBtnEvent(ele, data) {
    //var key = data.radio_id;
    var key = String(data.admin.radio_id) + String(data.uuid).replace(/\s+|\(|\)/g, '');

    $(ele).on('click', function () {
        var clidata = seshCache.lookup(key);
        $.confirm({
            columnClass: 'small',
            draggable: true,
            dragWindowGap: 25, // number of px of distance
            theme: 'dark',
            closeIcon: true,
            useBootstrap: true,
            backgroundDismiss: true,
            title: '&nbsp;Ban',
            content: 'Callsign: ' + clidata.rptcallsign + '<br>ID: ' + clidata.rptbaseid + '<br>TG: ' + data.tgid,
            icon: "fas fa-bolt",
            animation: 'scale',
            escapeKey: true,
            closeAnimation: 'zoom',
            opacity: 0.5,
            onContentReady: function () {

                var self = this;
                for(var i=0; i<$('.jconfirm-buttons button').length; i++){
                    $('.jconfirm-buttons button')[i].style.width='inherit';
                }

            },
            buttons: {
                ban15mins: {
                    text: '15 Minutes',
                    btnClass: 'btn-blue',
                    action: function () {
                        banUser(clidata, data, 60 * 15, (typeof clidata.rptcallsign == "undefined" ? data.callsign : clidata.rptcallsign) + ' 15 Minute Ban');
                    }
                },
                ban30mins: {
                    text: '1 Hour',
                    btnClass: 'btn-blue',
                    action: function () {
                        banUser(clidata, data, 60 * 60, (typeof clidata.rptcallsign == "undefined" ? data.callsign : clidata.rptcallsign) + ' 1 Hour Ban');
                    }
                },
                ban1hour: {
                    text: '1 Day',
                    btnClass: 'btn-blue',
                    action: function () {
                        banUser(clidata, data, 60 * 60 * 24, (typeof clidata.rptcallsign == "undefined" ? data.callsign : clidata.rptcallsign) + ' 24 Hour Ban');
                    }
                },
                ban1week: {
                    text: '1 Week',
                    btnClass: 'btn-blue',
                    action: function () {
                        banUser(clidata, data, 60 * 60 * 24 * 7, (typeof clidata.rptcallsign == "undefined" ? data.callsign : clidata.rptcallsign) + '1 Week Ban');
                    }
                },
                banperm: {
                    text: '<i class="far fa-hand-middle-finger"> Permanently',
                    btnClass: 'btn-orange',
                    action: function () {
                        banUser(clidata, data, -1, (typeof clidata.rptcallsign == "undefined" ? data.callsign : clidata.rptcallsign) + "Permanent Ban");
                    }
                }
            }
        });
    });
}

function createMuteBtnEvent(ele, data) {
    //var key = data.radio_id;

    var key = String(data.admin.radio_id) + String(data.uuid).replace(/\s+|\(|\)/g, '');
    $(ele).on('click', function () {

        var clidata = seshCache.lookup(key);
        console.log(clidata);
        console.log(data);
        //data.talkgroup = clidata.talkgroup;
        //data.callsign = clidata.callsign;
        //data.repeater_id = clidata.repeater_id
        $.confirm({
            columnClass: 'small',
            draggable: true,
            dragWindowGap: 25, // number of px of distance
            theme: 'dark',
            closeIcon: true,
            useBootstrap: true,
            backgroundDismiss: true,
            title: '&nbsp;Mute Station',
            content: 'Callsign: ' + clidata.rptcallsign + '<br>ID: ' + clidata.rptbaseid + '<br>TG: ' + clidata.talkgroup,
            icon: "fas fa-bolt",
            animation: 'scale',
            escapeKey: true,
            closeAnimation: 'zoom',
            opacity: 0.5,
            onContentReady: function () {

                var self = this;
                for(var i=0; i<$('.jconfirm-buttons button').length; i++){
                    $('.jconfirm-buttons button')[i].style.width='inherit';
                }

            },
            buttons: {
                ban15mins: {
                    text: '2 Minutes',
                    btnClass: 'btn-blue',
                    action: function () {
                        banUser(clidata, data, 60 * 2, (typeof clidata.rptcallsign == "undefined" ? data.callsign : clidata.rptcallsign) + ' 2 Minute Mute', 0x40);
                    }
                },
                ban30mins: {
                    text: '15 Minutes',
                    btnClass: 'btn-blue',
                    action: function () {
                        banUser(clidata, data, 60 * 60, (typeof clidata.rptcallsign == "undefined" ? data.callsign : clidata.rptcallsign) + ' 15 Minute Mute', 0x40);
                    }
                },
                ban1hour: {
                    text: '1 Day',
                    btnClass: 'btn-blue',
                    action: function () {
                        banUser(clidata, data, 60 * 60 * 24, (typeof clidata.rptcallsign == "undefined" ? data.callsign : clidata.rptcallsign) + ' 24 Hour Mute', 0x40);
                    }
                },
                ban1week: {
                    text: '1 Week',
                    btnClass: 'btn-blue',
                    action: function () {
                        banUser(clidata, data, 60 * 60 * 24 * 7, (typeof clidata.rptcallsign == "undefined" ? data.callsign : clidata.rptcallsign) + '1 Week Mute', 0x40);
                    }
                },
                banperm: {
                    text: '<i class="far fa-hand-middle-finger"> Permanently',
                    btnClass: 'btn-orange',
                    action: function () {
                        banUser(clidata, data, -1, (typeof clidata.rptcallsign == "undefined" ? data.callsign : clidata.rptcallsign) + "Permanent Mute", 0x40);
                    }
                }
            }
        });
    });
}

function quickBoot(cli, dat, timespan, label = "") {

    //https://api.tgif.network/dmr/userdb/

   /* $.ajax({
        type: 'GET',
        url: "https://api.tgif.network/dmr/userdb/" + dat.callsign,
        dataType: 'json',
        //context: document.body,
        //global: false,
        async: false,
        success: function (data) {*/
            var nEntry = {};
            nEntry['flags'] = 3 | 0x80 | 0x10 | 0x20;
            nEntry['cidr'] = [];
            nEntry['uuid'] = [];
            nEntry['duration'] = timespan;
            nEntry['label'] = label;
            nEntry['action'] = 'add';

            nEntry['cidr'].unshift(dat.ipstr);
    nEntry['uuid'].unshift(Number(cli.rptbaseid));
            //console.log(nEntry);
            newAclEntry(dat.tgid, nEntry);

       /* },
        error: function (e) {
            console(e);
            alert('Error: ' + e);
        }

    });*/
}

function createBootBtnEvent(ele, data) {
    //var key = data.radio_id;
    var key = String(data.admin.radio_id) + String(data.uuid).replace(/\s+|\(|\)/g, '');
    $(ele).on('click', function () {
        var clidata = seshCache.lookup(key);
        quickBoot(clidata, data, 15 * 60, "Quick ban " + clidata.rptcallsign);
    });

}


function createAclBtnEvent(ele, data) {
    var key = data.radio_id.replace(/\s+|\(|\)/g, '');
    var clidata = seshCache.lookup(key);


    $(ele).on('click', function () {
        $.confirm({
            columnClass: 'small',
            draggable: true,
            dragWindowGap: 25, // number of px of distance
            theme: 'dark',
            boxWidth: '50%',
            closeIcon: true,
            useBootstrap: true,
            backgroundDismiss: true,
            title: '&nbsp;' + clidata.rptcallsign + ' - ' + clidata.callsign + '<br>&nbsp;' + clidata.rptbaseid,
            content: 'Repeater Callsign: ' + clidata.rptcallsign + '<br>Radio Callsign: ' + clidata.callsign + '<br>ID: ' + clidata.rptbaseid + '<br>TG: ' + data.tgid,
            icon: "fas fa-bolt",
            animation: 'scale',
            escapeKey: true,
            closeAnimation: 'zoom',
            onContentReady: function () {

                var self = this;
                /*$('.confirm-Mutebtn')[0].disabled=true;
                $('.confirm-Mutebtn')[0].style.opacity="20%";*/
                $('.confirm-customBtn')[0].disabled=true;
                $('.confirm-customBtn')[0].style.opacity="20%";
            },
            opacity: 0.5,
            buttons: {
                'confirm': {
                    text: '<i class="fas fa-gavel"></i> Ban',
                    btnClass: 'btn-danger',
                    action: function () {
                        $.confirm({
                            title: 'Ban Station',
                            content: 'How long should the rule be enforced?',
                            icon: 'fas fa-gavel',
                            animation: 'scale',
                            columnClass: 'small',
                            escapeKey: true,
                            draggable: true,
                            closeIcon: true,
                            dragWindowGap: 25, // number of px of distance
                            closeAnimation: 'zoom',
                            backgroundDismiss: true,
                            buttons: {
                                ban15mins: {
                                    text: '5 Minutes',
                                    btnClass: 'btn-blue',
                                    action: function () {
                                        banUser(clidata, data, 60 * 5, clidata.rptcallsign + ' 5 Minute Ban');
                                    }
                                },
                                ban30mins: {
                                    text: '1 Hour',
                                    btnClass: 'btn-blue',
                                    action: function () {
                                        banUser(clidata, data, 60 * 60, clidata.rptcallsign + ' 1 Hour Ban');
                                    }
                                },
                                ban1hour: {
                                    text: '1 Day',
                                    btnClass: 'btn-blue',
                                    action: function () {
                                        banUser(clidata, data, 60 * 60 * 24, clidata.rptcallsign + ' 24 Hour Ban');
                                    }
                                },
                                ban1week: {
                                    text: '1 Week',
                                    btnClass: 'btn-blue',
                                    action: function () {
                                        banUser(clidata, data, 60 * 60 * 24 * 7, clidata.rptcallsign + ' 1 Week Ban');
                                    }
                                },
                                banperm: {
                                    text: '<i class="far fa-hand-middle-finger"> Permanently',
                                    btnClass: 'btn-orange',
                                    action: function () {
                                        banUser(clidata, data, -1, clidata.rptcallsign + " Permanent Ban");
                                    }
                                }
                            }
                        });
                    }
                },

                muteBtn: {
                    text: '<i class="far fa-microphone-alt-slash"></i> Mute',
                    btnClass: 'btn-success confirm-Mutebtn',
                    action: function () {
                        $.confirm({
                            title: '&nbsp;Mute Station',
                            content: 'How long should the rule be enforced?',
                            icon: 'far fa-microphone-alt-slash',
                            animation: 'scale',
                            columnClass: 'small',
                            escapeKey: true,
                            draggable: true,
                            closeIcon: true,
                            dragWindowGap: 25, // number of px of distance
                            closeAnimation: 'zoom',
                            backgroundDismiss: true,
                            buttons: {
                                mute15mins: {
                                    text: '1 Minutes',
                                    btnClass: 'btn-blue',
                                    action: function () {
                                        banUser(clidata, data, 60 * 1, clidata.rptcallsign + ' 1 Minutes', 0x40);
                                    }
                                },
                                mute30mins: {
                                    text: '1 Hour',
                                    btnClass: 'btn-blue',
                                    action: function () {
                                        banUser(clidata, data, 60 * 60, clidata.rptcallsign + ' 1 Hour', 0x40);
                                    }
                                },
                                mute1hour: {
                                    text: '1 Day',
                                    btnClass: 'btn-blue',
                                    action: function () {
                                        banUser(clidata, data, 60 * 60 * 24, clidata.rptcallsign + ' 24 Hours', 0x40);
                                    }
                                },
                                mute1week: {
                                    text: '1 Week',
                                    btnClass: 'btn-blue',
                                    action: function () {
                                        banUser(clidata, data, 60 * 60 * 24 * 7, clidata.rptcallsign + ' 1 Week', 0x40);
                                    }
                                },
                                muteperm: {
                                    text: '<i class="far fa-hand-middle-finger"> Permanently',
                                    btnClass: 'btn-orange',
                                    action: function () {
                                        banUser(clidata, data, -1, clidata.rptcallsign + " Permanent", 0x40);
                                    }
                                }
                            }
                        });
                    }
                },
                bootBtn: {
                    text: '<i class="fas fa-hand-peace"></i> Boot',
                    btnClass: 'btn-warning confirm-bootBtn',
                    action: function () {
                        quickBoot(clidata, data, 60 * 15, clidata.rptcallsign + ' 15 Minute Boot');
                    }
                },

                customBtn: {
                    text: '<i class="fas fa-sliders-h"></i> Custom',
                    btnClass: 'btn-primary confirm-customBtn',
                    action: function () {
                        //$.alert('Load <strong> ACL Panel</strong>');
                    }
                }
            }
        });
    });
}





function flagChanged(checkboxElem) {
    var elemID = checkboxElem.id;

    var elemInp = document.getElementById(checkboxElem.attributes["data-for-input"].value);

    if (checkboxElem.checked) {
        elemInp.disabled = false;
        elemInp.focus();
        //$('#'+checkboxElem.attributes["data-for-input"].value).css('background-color', 'white');
    } else {
        elemInp.disabled = true;
        elemInp.focus();
        //$('#'+checkboxElem.attributes["data-for-input"].value).css('background-color', '');
    }
}

function tbFocus(elem){

    //$('#'+elem.id)[0].attributes.removeNamedItem('disabled')

    var elemID = elem.id;
    var checkboxElem = document.getElementById(elem.attributes["data-for-event"].value);

    checkboxElem.checked=true;

}

function modalEventHandler(elem){
    //$('#'+elem.id)[0].attributes.removeNamedItem('disabled')
    if(elem.id == "allow_access" && $('#allow_access')[0].checked){
        //$('#deny_tx')[0].checked = false;
        $('#deny_access')[0].checked = false;
    }
    else if($('#deny_access')[0].checked){
        $('#deny_tx')[0].checked = $('#deny_access')[0].checked;
        $('#allow_access')[0].checked = false;
    }
}

function argsToMap(argz){
    var nMap = [];
    for(var index in argz){
        var name = argz[index].name;
        var value = argz[index].value;
        nMap[name]=value;
    }
    return nMap;
}

function returnError(err){
    $('#err-msg').html('<br><font color=red>Err: '+err+'</font>');
    $('#err-msg').css('visibility', 'visible');
    $("html, body").animate({
        scrollTop: 0
    }, "slow");
    return false;
}

function clearError(){
    $('#err-msg').html('');
    $('#err-msg').css('visibility', 'invisible');
}

var FLAG_ENABLED = 0;
var FLAG_WLBL = 1;
var FLAG_LOCK_AUTHOR = 2;

var FLAG_CIDR = 0x4;
var FLAG_UUID = 0x5;
var FLAG_MUTE = 0x6;
var FLAG_ACCESS = 0x7;

function submit_add(elemID) {
    var form = $('#'+elemID);
    var args = form.serializeArray();
    console.log(args);

    var flags = 0;
    flags=addFlag(flags, FLAG_ENABLED);

    var numConditions=0;

    args = argsToMap(args);


    if('allow_access' in args && args['allow_access']=='on'){
        flags=addFlag(flags, FLAG_ACCESS);
    }else{
        if('deny_tx' in args && args['deny_tx']=='on'){
            flags=addFlag(flags, FLAG_MUTE);
            flags=addFlag(flags, FLAG_WLBL);
        }
        if('deny_access' in args && args['deny_access']=='on'){
            flags=addFlag(flags, FLAG_ACCESS);
            flags=addFlag(flags, FLAG_WLBL);
        }
    }



    if(args['entry_label']===undefined || args['entry_label'].length==0)
        return returnError('Empty label for rule');

    var hasCIDR=0;
    if(args['ip-cidr']!==undefined && args['ip-cidr'].length>0 && 'ban_ip' in args && args['ban_ip']=="on"){
        if(!ACLIPisValid(args['ip-cidr']))
            return returnError('Invalid IP/CIDR');
        hasCIDR=1;
    }

    var hasID=0;
    if(args['client-id']!==undefined && args['client-id'].length>0 && 'ban_id' in args && args['ban_id']=="on"){
        var x = Number(args['client-id']);
        if(x<0 || x > 0xFFFFFF)
            return returnError('Invalid ID');
        hasID=1;
    }

    if(!hasFlag(flags, FLAG_ACCESS) && !hasFlag(flags, FLAG_MUTE))
        return returnError('Must have at least one attribute');

    if(!hasID && !hasCIDR)
        return returnError('Must provide at least one condition');

    if(hasCIDR){
        flags=addFlag(flags, FLAG_CIDR);
    }
    if(hasID){
        flags=addFlag(flags, FLAG_UUID);
    }

    args['unban-time'] = $('#unban-time')[0].selectedOptions[0].value;

    if(args['comment']===undefined || args['comment'].length<=0){
        args['comment']="";
    }

    var nEntry = {};
    nEntry['flags'] = flags;
    nEntry['cidr'] = [];
    nEntry['uuid'] = [];
    nEntry['duration'] = Number(args['unban-time']);
    nEntry['label'] = args['entry_label'];
    nEntry['action'] = 'add';
    nEntry['comment'] = args['comment'];
    if(hasID)
        nEntry['uuid'].unshift(args['client-id']);
    if(hasCIDR)
        nEntry['cidr'].unshift(args['ip-cidr']);

    console.log(nEntry);
    if (nEntry['cidr'].length > 0 || nEntry['uuid'].length > 0){
        nEntry['tgid'] = tgid;
        newAclEntry(tgid, nEntry);
        loadAllACL();
        /*$.ajax({
            type: 'POST',
            url: window.location.pathname,
            dataType: 'json',
            data: nEntry,
            context: document.body,
            //global: false,
            async: true,
            success: function (data) {
                $('#aclAddCustomModal').hide();
                $('#add-global')[0].reset();
            },
            error: function (e) {
                alert('Error: ' + e);
            }

        });*/
    }

}



function addFlag(flags, pos)
{
    return (Number(flags) | (1<<Number(pos)));
}

function hasFlag(flags, pos)
{
    return ((Number(flags) & (1<<Number(pos)))!=0);
}

