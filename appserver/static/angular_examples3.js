// Change to enable console logging
var debug = true;

if (!debug) {
	console.log = function() {}
}

// CONST time in seconds
const DAY_MILISEC = 24*3600*1000; // number of miliseconds in a day
const WEEK_MILISEC = 7*24*3600*1000;  // number of miliseconds in a week
// parameters for logging events
const INDEX = 'maintenance_log';
const SOURCETYPE = 'log_action';
const SOURCE = 'ajax'; 
const SERVICES_LOOKUP = "services.csv";

// Convert date+time in epoch pattern to string
function dateToString(epoch_date) {
	var d = new Date(0);
	d.setUTCSeconds(epoch_date);
	date_string = ("0" + d.getDate()).slice(-2)+"/"+
	("0" + (d.getMonth()+1)).slice(-2)+"/"+
	d.getFullYear()+" "+
	("0" + d.getHours()).slice(-2)+":"+
	("0" + d.getMinutes()).slice(-2)+":"+
	("0" + d.getSeconds()).slice(-2);
	return date_string;
}

// current date in string, en-GB format.
function current_date() {
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1; //January is 0!
	var yyyy = today.getFullYear();

	if(dd<10) {
		dd = '0'+dd
	} 

	if(mm<10) {
		mm = '0'+mm
	} 

	today = dd + '/' + mm + '/' + yyyy;
	return today;
}

function current_time() {
	var now = new Date();
	hh = now.getHours();
	mm = now.getMinutes();
	if (hh<10) {
		hh = '0'+hh;
	}
	if (mm<10) {
		mm = '0'+mm;
	}
	return hh+":"+mm;
}

// Create string from key-value object
 function makeContentBody(fields){
             
             // Make the content body field
             var content_body = '';
             
             for (var key in fields) {
                 content_body = content_body + key + '=\"' + fields[key] + '\", ';
             }
             
             return content_body;
 }
 
//Create new event in splunk index
function makeAnEvent(index,source,sourcetype,content){
             
	// Prepare the arguments
	var params = new Object();
	params.index = index;
	params.source = source;
	params.sourcetype = sourcetype;
	if (!source)
	params.source = 'ajax';
	if (!sourcetype)
		params.sourcetype = 'ajax_sourcetype';
		params.host = document.domain;
		params.output_mode = 'json';
			 
		var uri = Splunk.util.make_url('/splunkd/__raw/services/receivers/simple');
		uri += '?' + Splunk.util.propToQueryString(params);

		// Fire off the request
		jQuery.ajax({
		 url:         uri,
		 type:        'POST',
		 data:        JSON.stringify(content),
		 contentType: false,
		 processData: false,
		 success: function(result) {
			 console.log("event was written into "+params.index);
		 }
		});
}

// log relevant data into splunk index
function log_event(user,action,data,recur_count,recur_type)  {
	delete data.actions;delete data.$$hashKey;
	var content = new Object();
	content.user = user;
	content.action = action;
	if (recur_count)
	{
		content.recurrence = true;
		content.recur_count = recur_count;
		content.recur_type = recur_type;
	}
	content.data = data;
	makeAnEvent(INDEX,SOURCE,SOURCETYPE,content);
}

require(['splunkjs/mvc/simplexml/ready!',"splunkjs/mvc"],function(mvc) {
	// Get the default model
	var defaultTokenModel = splunkjs.mvc.Components.getInstance("default");
	// Get some token from there
	var token_kang = defaultTokenModel.get("kang");
});


// required app for angular
var app = angular.module('myApp', []);

$("#start_date").datepicker();

var service = splunkjs.mvc.createService({ owner: "nobody" });
var db_rows; // Maintenance rows to show within table
var services_array = []; // services.csv lookup
var durations = [{name: "Minutes", data: 60},
				{name: "Hours", data: 3600},
				{name: "Days", data: 86400}]; 
var recur_types = [{name: "Days"},
				{name: "Weeks"}];
var weekdays = [{name: "Sun",id: 0, used: true},
				{name: "Mon",id: 1, used: true},
				{name: "Tue",id: 2, used: true},
				{name: "Wed",id: 3, used: true},
				{name: "Thu",id: 4, used: true},
				{name: "Fri",id: 5, used: true},
				{name: "Sat",id: 6, used: true},];

var now = new Date();
// default Add maintenance form values
var defaultForm={
    service: "",
    start_date: current_date(),
	start_time: current_time(),
	duration_type: durations[1],
	duration_count: 1,
	recur_count: 1,
	recur_type: recur_types[0],
	comment: ""
}

$("#acknowledge").on("hidden", function () {
	location.reload(); // refresh after new data has been added
});

app.controller('myCtrl',['$scope',function($scope) {

	
	// Scope global variables
	var recurrence = false; //Do we use recurrence in the form submition
	var current_user=Splunk.util.getConfigValue("USERNAME");
	$scope.popup_message = "";
	$scope.form_type = "create_new";
	
	function set_default_form() {
		// Scope default attributes
		currentForm = $.extend({}, defaultForm);
		//currentForm = Object.assign({}, defaultForm); //Not supported in IE11, blame roike.
		$scope.create_new = currentForm;
		$scope.create_button_label = "Create Maintenance Window";
		$("#create_new_service").attr("disabled", false);
		$("#reoccure_show").attr("disabled", false);
		$scope.form_type = "create_new";
	}
	
	set_default_form();
	
	// General action function
	$scope.action = function(row,action) {
		console.log("action");
		console.log(row);
		console.log(action);
		if (action == "edit") 
			$scope.edit(row);
		else if (action == "cancel")
			$scope.change_status(row,"cancel","CANCELED");
		else if (action == "end_now")
			$scope.change_status(row,"end_now","ENDED");
		else if (action == "delete")
			$scope.delete(row);
		else if (action == "extend")
			$scope.extend(row);
	}
	
	// Edit future maintenance
	$scope.edit = function(row) {
		console.log("edit");
		console.log(row);
		// find service name from service id list
		$scope.create_new.service = $scope.service_list.find(
			function(service) {
					if (service.id == row.service_id) {return true} 
			});
		date_time = row.start_time_h.split(" ");
		$scope.create_new.start_date = date_time[0];
		$scope.create_new.start_time = date_time[1];
		if ((row.duration >= (3600*24)) && (row.duration % (3600*24) == 0)) { // duration set in days
			console.log("days");
			$scope.create_new.duration_type = durations[2];
			$scope.create_new.duration_count = row.duration / 3600 / 24;
		}
		else if (row.duration % 3600 == 0) { // duration set in hours 
			console.log("hours");
			$scope.create_new.duration_type = durations[1];
			$scope.create_new.duration_count = row.duration / 3600;
		}
		else { // duration set in hours
			console.log("minutes");
			$scope.create_new.duration_type = durations[0];
			$scope.create_new.duration_count = row.duration / 60;
		}
		$scope.create_new.comment = row.comment;
		$("#create_new_service").attr("disabled", true);
		$("#reoccure_show").attr("disabled", true);
		$scope.create_button_label = "Submit change";
		$scope.form_type = "edit";
		$scope.form_keyid = row._key;
		$("#createNew").modal('toggle');
	}

	// Extend current running maintenance
	$scope.extend = function(row) {
		console.log("extend");
		console.log(row);
		$("#extend").modal();
		$scope.extend_row = row;
	}
		
		
	$scope.change_status  = function(row,action,new_status) {
		log_event(current_user,action,row);
		
		keyid = row._key;
		req = service.request(
			"storage/collections/data/maintenance_db/"+encodeURIComponent(keyid),
			"GET",
			null,
			null,
			{"Content-Type": "application/json"},
			null);
		req.then( function(response) {
			console.log(response);
			response = JSON.parse(response);
			response.status = new_status;
			service.request(
							  "storage/collections/data/maintenance_db/" + encodeURIComponent(keyid),
							  "POST",
							  null,
							  null,
							  JSON.stringify(response),
							  {"Content-Type": "application/json"},
							  null);
							  
			$scope.popup_message = "Change submitted.";
			$("#acknowledge").modal(); // show acknowledge popup
		});
	}
	
	// Delete action function
	$scope.delete = function(row) {
		row_log = row;delete row_log.actions;delete row_log.$$hashKey; // preare data for logging 
		log_event(current_user,"delete",row_log);  
		keyid = row._key;
		console.log('deleting key from db: '+keyid);
		
		service.del("storage/collections/data/maintenance_db/" + encodeURIComponent(keyid))
			.done(function() { 
				console.log('Removing done!');
		});
		location.reload(); // refresh after data was deleted
	}
	$scope.toggle_recurrence = function () {
		if (!recurrence && ($("#reoccure_show")[0].attributes.disabled == null))
		{ // recurrence panel not shown yet, AND recurrence button is not disabled
			$('#reoccure_show i').show();
			$('#reoccur_form').show();
			recurrence = true;
		}
		else
		{
			$('#reoccure_show i').hide();
			$('#reoccur_form').hide();
			recurrence = false;
		}
	}
	$scope.toggle_weekday = function (x) {
		$($('.weekday_row i')[x.id]).toggle() // toggle checkmark
		if (x.used) { // toggle used flag on weekday
			x.used = false;
		}
		else {x.used = true;}
		console.log(x);
	}

	req = service.request(
		"storage/collections/data/maintenance_db",
		"GET",
		null,
		null,
		{"Content-Type": "application/json"},
		null);
	req.then(function(response) {
			db_rows = JSON.parse(response);
			db_rows.forEach(function(row) {
				row.start_time_h = dateToString(row.start_time/1000); // calculate start time from miliseconds
				row.end_time_h = dateToString((row.start_time/1000)+row.duration);  //calculate end time from start time + duration
				
				if (row.status == "NEW") {
					row.actions = [{action:"Edit",action_func:"edit"},
								   {action:"Cancel",action_func:"cancel"},
								   {action:"Delete",action_func:"delete"}];
				}
				else if (row.status == "IN_PROGRESS") {
					row.actions = [{action:"Extend",action_func:"extend"},
								   {action:"End Now",action_func:"end_now"}];
				}
				else { // No actions should be available in other statuses
					row.actions = [];
					row.actions_enabled = "disabled";
				}
			});
			
			require(["splunkjs/mvc","splunkjs/mvc/searchmanager"], function(mvc,SearchManager) {    
				var current_user=Splunk.util.getConfigValue("USERNAME");
				var defaultTokenModel = mvc.Components.get("default");
				
				var tokenValue = defaultTokenModel.get("service");
				
				// Get services list from lookup
				services_search = new SearchManager({
					preview: true,
					cache: false,
					search: "| inputlookup "+SERVICES_LOOKUP
				});
				var services_results = services_search.data("results", {count: 0});
				//services_search.on('search:done', function() {
				services_results.on("data", function() {
					console.log('results has data');
					services_fields = services_results.data().fields;
					services_rows = services_results.data().rows;
					service_id_index = services_fields.indexOf("service_id");
					service_name_index = services_fields.indexOf("service_name");
					services_rows.forEach(function(row) {
						keyvalue = {};
						keyvalue["id"] = row[service_id_index];
						keyvalue["name"] = row[service_name_index];
						services_array.push(keyvalue);						
					});
					db_rows.forEach(function(db_row) { 
						services_array.forEach(function(service_row) {
							if (db_row.service_id == service_row.id) 
							{
									db_row.service_name = service_row.name;
							}
						});
					});
					
					$scope.maintenance_list = db_rows;
					$scope.service_list = services_array;
					$scope.durations = durations;
					$scope.recur_types = recur_types;
					$scope.weekdays = weekdays;
					
					// Actions when pop-up get canceled.
					$('#createNew').on('hidden', function () {
						set_default_form();
						$scope.$apply();
					})
					
					// Actions when submit pressed
					$scope.create_new_submit = function() {
						console.log("submit");
						console.log($scope.create_new.service);
						console.log($scope.create_new.start_date);
						console.log($scope.create_new.start_time);
						console.log($scope.create_new.duration_type);
						console.log($scope.create_new.duration_count);
						console.log($scope.create_new.comment);
						console.log("Recurrence: "+recurrence);
						console.log($scope.create_new.recur_count);
						console.log($scope.create_new.recur_type);
						
						// Calculate epoch start time from user input
						var datestring = $scope.create_new.start_date+" "+$scope.create_new.start_time
						var dateparts = datestring.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
						var start_date = new Date(dateparts[3],dateparts[2]-1,dateparts[1],dateparts[4],dateparts[5]);
						var duration_secs = $scope.create_new.duration_type.data * $scope.create_new.duration_count;
						
						// User selected to use recurrence, not in edit mode
						if ($scope.form_type!="edit" && recurrence) {
							console.log("Recur count: "+$scope.create_new.recur_count);
							console.log("Object name: "+$scope.create_new.recur_type.name);
							
							var submit_data = [];
							recur_count = $scope.create_new.recur_count;
							recur_type = $scope.create_new.recur_type.name;
							
							if (recur_type=="Days") {  // recurrence based on days
								week_count = 1;
								days_count = recur_count;
							}
							else { // recurrence based on weeks
								week_count = recur_count;
								days_count = 7;
							}
							for (week=0;week<week_count;week++) // all weeks
							{
								for (i = 0; i < days_count; i++) { // all days in a week
									// Calculate exact time for specific day in a week
									post_time_epoch = start_date.getTime()+(i*DAY_MILISEC)+(week*WEEK_MILISEC);
									post_time = new Date(post_time_epoch); 
									
									if ($scope.weekdays[post_time.getDay()]['used']) { // write only to selected dates
										console.log(post_time);
										submit_data.push({
											'service_id' : $scope.create_new.service['id'],
											'status' : 'NEW',
											'user' : current_user,
											'start_time' : post_time_epoch,
											'duration' : duration_secs,
											'source_system' : 'splunk',
											'comment' : $scope.create_new.comment
										});
									}
								}
							}
							
							
							
							/*
							if (recur_type=="Days") {  // recurrence based on days
								for (i = 0; i < recur_count; i++) {
									submit_data[i] = {
										'service_id' : $scope.create_new.service['id'],
										'status' : 'NEW',
										'user' : current_user,
										'start_time' : start_date.getTime()+(i*DAY_MILISEC),
										'duration' : duration_secs,
										'source_system' : 'splunk',
										'comment' : $scope.create_new.comment
									}
								}
							}
							else { // recurrence based on weeks
								for (week=0;week<recur_count;week++) // all weeks
								{
									for (i = 0; i < 7; i++) { // all days in a week
										// Calculate exact time for specific day in a week
										post_date = new Date(start_date.getTime()+(i*DAY_MILISEC)+(week*WEEK_MILISEC)); 
										
										if ($scope.weekdays[post_date.getDay()]['used']) { // write only to selected dates
											console.log(post_date);
											submit_data[i] = {
												'service_id' : $scope.create_new.service['id'],
												'status' : 'NEW',
												'user' : current_user,
												'start_time' : post_date,
												'duration' : duration_secs,
												'source_system' : 'splunk',
												'comment' : $scope.create_new.comment
											}
										}
									}
								}
							}
							*/
							
							log_event(current_user,"add",submit_data[0],recur_count,recur_type); // log event into splunk
							
							// Post the entire batch of new maintenance windows
							service.request(
							  "storage/collections/data/maintenance_db/batch_save",
							  "POST",
							  null,
							  null,
							  JSON.stringify(submit_data),
							  {"Content-Type": "application/json"},
							  null);
						}
						else { // One time event
							var submit_data = {
							'service_id' : $scope.create_new.service['id'],
							'status' : 'NEW',
							'user' : current_user,
							'start_time' : start_date.getTime(),
							'duration' : duration_secs,
							'source_system' : 'splunk',
							'comment' : $scope.create_new.comment
							}
							
							if ($scope.form_type == "edit") { // use key to edit a current row
								request_url = "storage/collections/data/maintenance_db/"+encodeURIComponent($scope.form_keyid);
								log_event(current_user,"edit",submit_data); // log event into splunk
							}
							else { //create_new row in db
								request_url = "storage/collections/data/maintenance_db/";
								log_event(current_user,"add",submit_data); // log event into splunk
							}
							service.request(
							  request_url,
							  "POST",
							  null,
							  null,
							  JSON.stringify(submit_data),
							  {"Content-Type": "application/json"},
							  null);
						}
						
						$("#createNew").modal('toggle'); // hide form popup 
						$scope.popup_message = "New maintenance submitted";
						$("#acknowledge").modal(); // show acknowledge popup
					  };
					  
					$scope.extend_submit = function() {
						console.log("extend submit");
						keyid = $scope.extend_row._key;
						req = service.request(
							"storage/collections/data/maintenance_db/"+encodeURIComponent(keyid),
							"GET",
							null,
							null,
							{"Content-Type": "application/json"},
							null);
						req.then( function(response) {
									console.log(response);
									response = JSON.parse(response);
									 // extend duration with user input
									response.duration = response.duration+($scope.extend.extend_count*$scope.extend.duration_type.data)
									service.request(
											  "storage/collections/data/maintenance_db/" + encodeURIComponent(keyid),
											  "POST",
											  null,
											  null,
											  JSON.stringify(response),
											  {"Content-Type": "application/json"},
											  null);
									log_event(current_user,"extend",response); // log event into splunk
									$("#extend").modal('toggle'); // hide form popup 
									$scope.popup_message = "Change submitted.";
									$("#acknowledge").modal(); // show acknowledge popup					
						});
					}
					
					
					$scope.$apply();
					$scope.popup_message = "Submission completed!";
					$('#maintenance_table').show();
				});
			});
	});
}]);

//# sourceURL=maintenance.js