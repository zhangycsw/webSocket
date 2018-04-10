var fs = require('fs');
var net = require('net');
var http = require('http');
var sio = require('socket.io');
var cluster = require('cluster');
var express = require('express');

cluster.schedulingPolicy = 2;

if(cluster.isMaster) {
	var cpu_count = require('os').cpus().length;
	console.log('cpu_count: ', cpu_count);
	var worker_arr = [];
	for(var i = 0, len = cpu_count; i < len; i++) {
		worker_arr[i] = cluster.fork();
	}

	var worker_index = function(ip, len) {
		var s = '';
		for(var i = 0, _len = ip.length; i < _len; i++) {
			if(!isNaN(ip[i])) {
				s += ip[i];
			}
		}
		return Number(s) % len;
	};
	var server = net.createServer({
		pauseOnConnect: true
	}, function(connection) {
		var worker = worker_arr[worker_index(connection.remoteAddress, cpu_count)];
		worker.send('connect', connection);
	});
	server.listen(8070, function(){
		console.log("listening port : 8070");
	});

} else {
	console.log('process id: ', process.pid);
	var http_server = http.createServer(function(req, res) {
		console.log('http req process id:', process.pid);
		var str = fs.readFileSync('./index.html', {
			encoding: 'utf8'
		});
		res.writeHead(200, {
			'Conten-Type' : 'text/html'
		});
		res.end(str);
	});

	http_server.listen(0, 'localhost');
	var io = sio(http_server);
	process.on('message', function(message, connection) {
		if(message !== 'connect') {
			return;
		}
		http_server.emit('connection', connection);
		connection.resume();
	});
	
}

