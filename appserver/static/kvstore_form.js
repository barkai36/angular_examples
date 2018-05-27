// required app for angular
var kv_store_db = "demo_db";
var request_url = "storage/collections/data/"+kv_store_db;

$("#acknowledge").on("hidden", function () {
	location.reload(); // refresh after new data has been added
});

var app = angular.module('myApp', []);

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


app.controller('myCtrl',['$scope',function($scope) {
	require(["splunkjs/mvc",'splunkjs/mvc/simplexml/ready!'],function(mvc) {
		
		$scope.create_button_label = "Submit";
		var service = mvc.createService({ owner: "nobody" });
		var db_rows;
		req = service.request(
			request_url,
			"GET",
			null,
			null,
			{"Content-Type": "application/json"},
			null);
		req.then(function(response) {
			$scope.list = JSON.parse(response);
			$scope.list.forEach(function(row) {
				row.time = dateToString(row.time/1000); // calculate start time from miliseconds]
			});
				
			$scope.$apply();
			$('#list_table').show();
		});
		
		// Actions when submit pressed
		$scope.create_new_submit = function() {
			var submit_data = {
							'name' : $scope.create_new.name,
							'phone' : $scope.create_new.phone,
							'time' : new Date().getTime(),
							'comment' : $scope.create_new.comment
							}
			service.request(
							  request_url,
							  "POST",
							  null,
							  null,
							  JSON.stringify(submit_data),
							  {"Content-Type": "application/json"},
							  null);
			$("#createNew").modal('toggle'); // hide form popup 
			$scope.popup_message = "New record submitted";
			$("#acknowledge").modal(); // show acknowledge popup
		};
		
		// Delete action function
		$scope.delete = function(row) {
			keyid = row._key;
			service.del(request_url + "/" + encodeURIComponent(keyid))
				.done(function() { 
					$scope.popup_message = "Record deleted";
					$scope.$apply();
					$("#acknowledge").modal('toggle'); // show acknowledge popup
			});
	}
	});
}]);

//# sourceURL=kvstore_form.js