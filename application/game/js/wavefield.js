// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
/*
	Wavefield lets you take a div and turn it into a Wavefield.

*/



//	Define the Wavefield class.
function Wavefield() {
	this.fps = 30;
	this.canvas = null;
	this.width = 0;
	this.width = 0;
	this.minVelocity = 15;
	this.maxVelocity = 30;
	this.waves = 100;
	this.intervalId = 0;
	this.scoreboard = [];
	/*
	this.scoreboard = [
		{
			"Level": 1,
			"Lives": 3,
			"Nickname": "fabian.martins",
			"Score": 0,
			"Shots": 0,
			"Timestamp": "2018-10-31T20:04:10.245Z"
		},
		{
			"Level": 1,
			"Lives": 0,
			"Nickname": "chicobento",
			"Score": 170,
			"Shots": 37,
			"Timestamp": "2018-10-29T16:51:25.814Z"
		},
		{
			"Level": 1,
			"Lives": 3,
			"Nickname": "malkavian",
			"Score": 15,
			"Shots": 3,
			"Timestamp": "2018-10-29T17:39:42.858Z"
		},
		{
			"Level": 3,
			"Lives": 0,
			"Nickname": "mark",
			"Score": 775,
			"Shots": 247,
			"Timestamp": "2018-10-29T21:25:17.768Z"
		},
		{
			"Level": 5,
			"Lives": 0,
			"Nickname": "jurema",
			"Score": 1590,
			"Shots": 299,
			"Timestamp": "2018-10-30T00:43:07.071Z"
		}
	];
	*/
}

//	The main function - initialises the Wavefield.
Wavefield.prototype.initialise = function (div) {
	var self = this;

	//	Store the div.
	this.containerDiv = div;
	self.width = window.innerWidth;
	self.height = window.innerHeight;

	window.onresize = function (event) {
		self.width = window.innerWidth;
		self.height = window.innerHeight;
		self.canvas.width = self.width;
		self.canvas.height = self.height;
		self.draw();
	}

	//	Create the canvas.
	var canvas = document.createElement('canvas');
	div.appendChild(canvas);
	this.canvas = canvas;
	this.canvas.width = this.width;
	this.canvas.height = this.height;
};

Wavefield.prototype.start = function () {

	//	Create the waves.
	var waves = [];
	for (var i = 0; i < this.waves; i++) {
		waves[i] = new Wave(Math.random() * this.width, Math.random() * this.height, Math.random() * 3 + 1,
			(Math.random() * (this.maxVelocity - this.minVelocity)) + this.minVelocity);
	}
	this.waves = waves;

	var self = this;
	//	wavet the timer.
	this.intervalId = setInterval(function () {
		self.update();
		self.draw();
	}, 1000 / this.fps);
};

Wavefield.prototype.stop = function () {
	clearInterval(this.intervalId);
};

Wavefield.prototype.update = function () {
	var dt = 1 / this.fps;

	for (var i = 0; i < this.waves.length; i++) {
		var wave = this.waves[i];
		wave.y += dt * wave.velocity;
		//	If the wave has moved from the bottom of the screen, spawn it at the top.
		if (wave.y > this.height) {
			this.waves[i] = new Wave(Math.random() * this.width, 0, Math.random() * 3 + 1,
				(Math.random() * (this.maxVelocity - this.minVelocity)) + this.minVelocity);
		}
	}
};

Wavefield.prototype.setScoreboard = function (scoreboard) {
	this.scoreboard = scoreboard;
}

Wavefield.prototype.draw = function () {

	//	Get the drawing context.
	var ctx = this.canvas.getContext("2d");

	//	Draw the background
	
	//add gradient
	var grd = ctx.createLinearGradient(0,0,this.width,this.height);
	grd.addColorStop(0,"#1DCCD8");
	grd.addColorStop(1,"#1DA2D8");
	ctx.fillStyle=grd;
	//ctx.fillStyle = '#1da2d8';
	ctx.fillRect(0, 0, this.width, this.height);

	//	Draw waves.
	ctx.fillStyle = "rgba(255, 255, 255, 0.0)";
	for (var i = 0; i < this.waves.length; i++) {
		var wave = this.waves[i];
		ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.size*2, 0, 2 * Math.PI,false);
        ctx.lineWidth=1.5;
        ctx.strokeStyle="#ffffff";
        ctx.stroke();
		ctx.fillRect(wave.x, wave.y, wave.size, wave.size);
	}

	this.drawScoreboard(ctx);
};


Wavefield.prototype.drawScoreboard = function (ctx) {

	fontSize = 11;
	ctx.font = fontSize + "px Arial";
	ctx.fillStyle = '#ff9900'
	ctx.textBaseline = "middle";
	ctx.textAlign = "left";

	let self = this;
	let sizeLimits = {
		"Order": 3,
		"Nickname": 15,
		"Score": 6,
		"Lives": 8,
		"Shots": 12,
		"Level": 8
	};

	let printGamerScore = function (gamer, gamerPosition) {
		let verticalPosition = 40 + fontSize * gamerPosition;
		let horizontalPosition = self.width - 350;
		let tabPositions = 0;

		let gamerPositionTxt = (gamerPosition + 1) + ". "
		horizontalPosition = horizontalPosition + tabPositions;
		ctx.textAlign = "left";
		ctx.fillText(gamerPositionTxt, horizontalPosition, verticalPosition);
		tabPositions = Math.floor(sizeLimits["Order"] * fontSize / 2);

		let gamerIdentification = gamer.Nickname.substring(0, sizeLimits["Nickname"]);
		horizontalPosition = horizontalPosition + tabPositions;
		ctx.textAlign = "left";
		ctx.fillText(gamerIdentification, horizontalPosition, verticalPosition);
		tabPositions = Math.floor(sizeLimits["Nickname"] * fontSize / 2);

		horizontalPosition = horizontalPosition + tabPositions + sizeLimits["Score"] * Math.floor(fontSize) / 2;
		ctx.textAlign = "right";
		ctx.fillText(gamer.Score, horizontalPosition, verticalPosition);
		tabPositions = Math.floor(1 * fontSize / 2);

		horizontalPosition = horizontalPosition + tabPositions;
		let lives = "Lives: " + gamer.Lives;
		ctx.textAlign = "left";
		ctx.fillText(lives, horizontalPosition, verticalPosition);
		tabPositions = Math.floor(sizeLimits["Lives"] * fontSize / 2);

		horizontalPosition = horizontalPosition + tabPositions;
		let shots = "Shots: " + gamer.Shots;
		ctx.textAlign = "left";
		ctx.fillText(shots, horizontalPosition, verticalPosition);
		tabPositions = Math.floor(sizeLimits["Shots"] * fontSize / 2);

		horizontalPosition = horizontalPosition + tabPositions;
		let level = "Level: " + gamer.Level;
		ctx.textAlign = "left";
		ctx.fillText(level, horizontalPosition, verticalPosition)

		return;
	}

	if (this.scoreboard && this.scoreboard.length > 0) {
		ctx.fillStyle = '#333231'
		ctx.textBaseline = "middle";
		ctx.textAlign = "left";

		ctx.font = "16px Arial";
		ctx.fillText("TOP PLAYERS FOR THIS SESSION", this.width - 350, 20);

		fontSize = 11;
		ctx.font = fontSize + "px Arial";
		// only the 1st 25 players will be shown
		limit = ((this.scoreboard.length > 25) ? 25 : this.scoreboard.length);
		for (i = 0; i < limit; i++) {
			printGamerScore(this.scoreboard[i], i)
		};
	}
	return;
}

function Wave(x, y, size, velocity) {
	this.x = x;
	this.y = y;
	this.size = size;
	this.velocity = velocity;
}