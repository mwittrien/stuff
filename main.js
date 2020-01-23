window.addEventListener("load", function () {
	console.log("Verbunden.");
	var socket = io();
	var login = null;
	var settings_cog = document.getElementById("settings_cog");
	var settings_menu = document.getElementById("settings_menu");
	var login_controls = document.getElementById("login_controls");
	var login_btn = document.getElementById("login_btn");
	var logout_controls = document.getElementById("logout_controls");
	var logout_btn = document.getElementById("logout_btn");
	var last_entry = document.getElementById("last_entry");
	var advanced_controls = document.getElementById("advanced_controls");
	var undo_btn = document.getElementById("undo_btn");
	var redo_btn = document.getElementById("redo_btn");
	var reset_btn = document.getElementById("reset_btn");
	var numbertiles = document.getElementsByClassName("number tile");
	settings_cog.addEventListener("click", function (e) {
		settings_menu.classList.toggle("closing");
	});
	login_btn.addEventListener("click", function (e) {
		if (!login) socket.emit("loginReq", {pw:login_input.value});
	});
	logout_btn.addEventListener("click", function (e) {
		if (login) socket.emit("logoutReq", {login});
	});
	undo_btn.addEventListener("click", function (e) {
		if (login) socket.emit("bingoUndo", {login});
	});
	redo_btn.addEventListener("click", function (e) {
		if (login) socket.emit("bingoRedo", {login});
	});
	reset_btn.addEventListener("click", function (e) {
		if (login) socket.emit("bingoReset", {login});
	});
	for (let numbertile of numbertiles) numbertile.addEventListener("click", function (e) {
		if (login) socket.emit("bingoData", {login, number:numbertile.getAttribute("number"), state:!numbertile.classList.contains("on")});
	});
	socket.on("inOutAuth", function (data) {
		if (data.login) {
			login = data.login;
			login_controls.style.setProperty("display", "none");
			advanced_controls.style.removeProperty("display");
			logout_controls.style.removeProperty("display");
		}
		else {
			login = null;
			login_controls.style.removeProperty("display");
			advanced_controls.style.setProperty("display", "none");
			logout_controls.style.setProperty("display", "none");
		}
		settings_cog.click();
	});
	socket.on("showToast", function (data) {
		console.log(data.msg);
		toast(data.msg, {type:data.type});
	});
	socket.on("bingoUpdate", function (data) {
		for (let numbertile of numbertiles) {
			var number = numbertile.getAttribute("number");
			if (number) numbertile.classList.toggle("on", data.numbers.includes(number));
		}
		if (data.undo.length > 0) undo_btn.removeAttribute("disabled");
		else undo_btn.setAttribute("disabled", "");
		if (data.redo.length > 0) redo_btn.removeAttribute("disabled");
		else redo_btn.setAttribute("disabled", "");
		if (data.numbers.length > 0) reset_btn.removeAttribute("disabled");
		else reset_btn.setAttribute("disabled", "");
		var lastnumber = data.numbers.length > 0 ? data.numbers[data.numbers.length-1] : null;
		if (lastnumber) {
			var lastnumbertile = document.querySelector(`.tile.number[number="${lastnumber}"]`);
			if (lastnumbertile) return last_entry.textContent = lastnumbertile.parentElement.getAttribute("column") + " " + lastnumber;
		}
		last_entry.textContent = "---";
	});
	var forcevideo = htmlToElement('<video controls muted playsinline autoplay src="data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA=" style="width: 0 !important; height: 0 !important; opacity: 0 !important; pointer-events: none !important;"></video>');
	forcevideo.addEventListener("loadedmetadata", () => {
		if (forcevideo.duration <= 1) forcevideo.setAttribute("loop", "");
		else forcevideo.addEventListener("timeupdate", () => {
			if (forcevideo.currentTime > 0.5) forcevideo.currentTime = Math.random();
		});
	});
	document.getElementById("settings_menu").append(forcevideo);
});
var htmlToElement = function (html) {
	if (!html || !html.trim()) return null;
	let template = document.createElement("template");
	template.innerHTML = html.replace(/\t|\n|\r/g, "");
	if (template.content.childElementCount == 1) return template.content.firstElementChild;
	else {
		var wrapper = document.createElement("span");
		var nodes = Array.from(template.content.childNodes);
		while (nodes.length) wrapper.appendChild(nodes.shift());
		return wrapper;
	}
};
var encodeToHTML = function (string) {
	var ele = document.createElement("div");
	ele.innerText = string;
	return ele.innerHTML;
};
var toast = function (text, options = {}) {
	var toasts = document.querySelector(".toasts");
	if (!toasts) {
		toasts = htmlToElement(`<div class="toasts"></div>`);
		document.body.appendChild(toasts);
	}
	const {type = '', icon = true, timeout = 3000, html = false} = options;
	var toast = htmlToElement(`<div class="toast">${html === true ? text : encodeToHTML(text)}</div>`);
	if (type) {
		toast.classList.add(`toast-${type}`);
		if (icon) toast.classList.add("toast-icon");
	}
	toasts.appendChild(toast);
	toast.close = () => {
		if (document.contains(toast)) {
			toast.classList.add("closing");
			setTimeout(() => {
				toast.remove();
				if (!toasts.querySelectorAll(".toast").length) toasts.remove();
			}, 3000);
		}
	};
	toast.addEventListener("click", toast.close);
	setTimeout(() => {toast.close();}, timeout > 0 ? timeout : 600000);
	return toast;
};
