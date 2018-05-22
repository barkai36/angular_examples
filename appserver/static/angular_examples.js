// required app for angular
var app = angular.module('myApp', []);

app.controller('myCtrl',['$scope',function($scope) {
	require(["splunkjs/mvc",'splunkjs/mvc/simplexml/ready!'],function(mvc) {
		$scope.my_list = [];
		$scope.my_list.push({'field1':'data1_A','field2':'data1_B','field3':'data1_C','field4':'data1_D','field5':'data1_E','field6':'data1_F'});
		$scope.my_list.push({'field1':'data2_A','field2':'data2_B','field3':'data2_C','field4':'data2_D','field5':'data2_E','field6':'data2_F'});
		$scope.my_list.push({'field1':'data3_A','field2':'data3_B','field3':'data3_C','field4':'data3_D','field5':'data3_E','field6':'data3_F'});
		console.log($scope.my_list);
		
		$scope.action = function(row){
			console.log(row);
			$scope.row_details = row;
		}
		
		$scope.$apply();
		$('#my_table').show();
	});
}]);

//# sourceURL=angular_demo.js