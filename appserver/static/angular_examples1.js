// required app for angular
var app = angular.module('myApp', []);

app.controller('myCtrl',['$scope',function($scope) {
	require(["splunkjs/mvc",'splunkjs/mvc/simplexml/ready!'],function(mvc) {
		
		
		$scope.$apply();
	});
}]);

//# sourceURL=angular_demo.js