const express = require("express");
const app = express();

const http = require("http").Server(app);
const io = require("socket.io")(http);

const fs = require("fs");
const path = require("path");

http.listen(8080); //listen to port 8080

app.get("/", function (req, res) {
	res.sendFile(path.resolve(__dirname, "./public/index.html"));
	app.use("/imgs", express.static(path.resolve(__dirname, "./public/imgs")));
	app.use("/css", express.static(path.resolve(__dirname, "./public/css")));
	app.use("/js", express.static(path.resolve(__dirname, "./public/js")));
});

var sockets = [], numbers = [], undo = [], redo = [];
function addEntry (array, entry) {
	if (array.indexOf(entry) == -1) {
		array.push(entry);
		return true;
	}
	return false;
}
function removeEntry (array, entry) {
	if (array.indexOf(entry) > -1) {
		array.splice(array.indexOf(entry), 1);
		return true;
	}
	return false;
}
function sendUpdate () {
	for (let connected of sockets) connected.emit("bingoUpdate", {numbers,undo,redo});
}
function sendPerError (socket) {
	socket.emit("showToast", {msg:"Bitte einloggen um die Schalter zu betätigen.", type:"error"})
}
function btoa (string) {
	if (typeof string != "string" && typeof string != "number") return "";
	return Buffer.from(string.toString()).toString("base64");
}
io.sockets.on("connection", function (socket) {
	addEntry(sockets, socket);
	console.log(`Neue Verbindung. (${sockets.length} verbunden)`);
	var login = null;
	socket.emit("bingoUpdate", {numbers, undo, redo});
	socket.on("loginReq", function (data) {
		if (login) socket.emit("showToast", {msg:"Bereits eingeloggt."});
		else {
			login = btoa(Math.random()*10000) + btoa(Math.random()*10000);
			socket.emit("inOutAuth", {login, footer:"", buttons:""});
			socket.emit("showToast", {msg:"Login erfolgreich.", type:"success"});
		}
	});
	socket.on("logoutReq", function (data) {
		if (!login) socket.emit("showToast", {msg:"Bereits ausgeloggt."});
		else if (login && data.login == login) {
			login = null;
			socket.emit("inOutAuth", {});
			socket.emit("showToast", {msg:"Logout erfolgreich.", type:"success"});
		}
		else socket.emit("showToast", {msg:"Logout fehlgeschlagen.", type:"error"});
	});
	socket.on("bingoData", function (data) {
		if (!login) sendPerError(socket);
		else if (login && data.login == login && data.number) {
			var undonumbers = [].concat(numbers);
			if (data.state) {
				if (addEntry(numbers, data.number)) {
					undo.push(undonumbers);
					redo = [];
					sendUpdate();
				}
			}
			else if (!data.state) {
				if (removeEntry(numbers, data.number)) {
					undo.push(undonumbers);
					redo = [];
					sendUpdate();
				}
			}
		}
	});
	socket.on("bingoUndo", function (data) {
		if (!login) sendPerError(socket);
		else if (login && data.login == login && undo.length > 0) {
			redo.unshift([].concat(numbers));
			numbers = undo.pop();
			sendUpdate();
		}
	});
	socket.on("bingoRedo", function (data) {
		if (!login) sendPerError(socket);
		else if (login && data.login == login && redo.length > 0) {
			undo.push([].concat(numbers));
			numbers = redo.shift();
			sendUpdate();
		}
	});
	socket.on("bingoReset", function (data) {
		if (!login) sendPerError(socket);
		else if (login && data.login == login && numbers.length > 0) {
			undo.push([].concat(numbers));
			numbers = [];
			redo = [];
			sendUpdate();
		}
	});
	socket.on("disconnect", function (data) {
		removeEntry(sockets, socket);
		console.log(`Verbindung getrennt. (${sockets.length} verbunden)`);
		login = null;
	});
});

process.on("SIGINT", function () { //on ctrl+c
	process.exit(); //exit completely
});

console.log("Bingo Node Server gestartet.");
