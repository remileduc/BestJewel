/*
BEST JEWEL is a jewel game with multiple mods.
Copyright © 2013 - 2014 Rémi DUCCESCHI
remi.ducceschi@gmail.com

This file is part of Best Jewel.

Best Jewel is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

"use strict";

/** Represent the difficulty of the level */
const DIFFICULTY = {
	TEST: { name: "TEST", gridSize: 4, nbColor: 3 },
	VERYEASY: { name: "Very easy", gridSize: 12, nbColor: 5 },
	EASY: { name: "Easy", gridSize: 10, nbColor: 5 },
	INTERMEDIATE: { name: "Intermediate", gridSize: 8, nbColor: 5 },
	HARD: { name: "Hard", gridSize: 8, nbColor: 6 },
	VERYHARD: { name: "Very hard", gridSize: 6, nbColor: 7 }
};

/**
 * represent a standard game.
 * basic jewel: just move some and get some points when 3 are aligned!
 * @param cxt the context in which the application is running
 */
function AbstractdGame ()
{
	// public variables
	/** The grid */
	this.grid = null;
	/** the visual grid */
	this.visualGrid = null;
	/** the level of difficulty */
	this.difficulty = DIFFICULTY.EASY;
	/** true if the game is temporized */
	this.isTempo = false;
	/** The images of diamonds */
	this.diamondImages = [];
	/** the selected points we want to exchange */
	this.selectedPoints = [];
	/** keep in memory the last selected points */
	this.lastSelectedPoints = [];
	/** the last clicked point, useful for mousemove */
	this.lastClickedPoint = new Point();
	/** the length of the game */
	this.dateLength = new Date(60000); // 60 seconds
	/** the depth of the actual cascade (used to calculate the points: multiplier) */
	this.cascadeMultiplier = 0;
	/** tells if an animation is occuring, so we should wait before launch the next move */
	this.animating = false;
	// private variables
	/** the number of possible moves */
	var possibleMoves = -1;
	/** offset of the canvas in the page */
	this.offsetX = 0, this.offsetY = 0;
	/** the points gained */
	var points = 0;
	/** tells if the game is ready to begin or not */
	var ready = false;
	/** tells if the game is running */
	var running = false;
	/** the begin date of the game */
	var dateBegin = new Date(0);
	/** the id of the function in setInterval */
	var intervalID = null;
	/** the HTML elements where to write the points etc... */
	var htmels = {
			elPoints: null,
			elTime: null,
			elMoves: null
	};
	/** contains all the listener of this object */
	var listeners = { gameReady: [], gameLaunched: [], gameFinished: [] };

	/** 
	 * launch a new game.
	 * inheritance must override this function creating the event listeners and the grid and visual grid, and finishing calling this function (AbstractGame.newGame())
	 */
	this.newGame = function()
	{
		dateBegin.setTime(this.dateLength.getTime());
		if (intervalID !== null)
			clearInterval(intervalID);
		this.updateTime();
		if (this.isTempo)
			intervalID = setInterval(this.updateTime, 1000);
		running = true;
		fire("gameLaunched");
	};

	/** Select a diamond that can be moved, to help the user. MUST be bind in inherited objects */
	this.findMove = function()
	{
		var i, j, size, move, point;

		if (!this.animating && possibleMoves > 0)
		{
			this.updatePoints(-3); // we penalize
			move = Math.floor(Math.random() * possibleMoves);
			size = this.selectedPoints.length;
			for (i = 0; i < size; i++)
				this.grid.setSelected(this.selectedPoints[i], false);
			this.selectedPoints = [];
			size = this.grid.getSize();
			for (i = 0; i < size; i++)
			{
				for (j = 0; j < size; j++)
				{
					point = new Point(i, j);
					if (this.grid.getStatusAt(point) === STATUS.POSSIBLE)
					{
						if (move === 0) // we select it
						{
							this.grid.setSelected(point, true);
							this.selectedPoints.push(point);
							this.visualGrid.draw(); // we know we are not in an animation, so no repaint is planned
							return;
						}
						else
							move--;
					}
				}
			}
		}
	};
	
	/**
	 * select the given point
	 * @param point the point to select
	 * @param selected if true, we select point, else we deselect it
	 */
	this.setSelected = function(point, selected)
	{
		var i;
		const size = this.selectedPoints.length;

		this.grid.setSelected(point, selected);
		if (selected) // if the point has been selected
		{
			if (size === 0
					|| (size === 1 && Math.abs(point.x - this.selectedPoints[0].x)
							+ Math.abs(point.y - this.selectedPoints[0].y) === 1)) // if it is next to the last selection
				this.selectedPoints.push(point);
			else // otherwise, we clear the selection
			{
				this.clearSelection();
				this.selectedPoints.push(point);
			}
		}
		else // otherwise, we remove the point from the list of selected points
		{
			for (i = 0; i < size; i++)
			{
				if (this.selectedPoints[i].x === point.x && this.selectedPoints[i].y === point.y)
				{
					this.selectedPoints.splice(i, 1);
					break;
				}
			}
		}
		if (!this.animating) // if animating is true, a repaint is programmed
			this.visualGrid.draw();
	};

	/** Clear the selected points (unselect them) */
	this.clearSelection = function()
	{
		var i;
		const size = this.selectedPoints.length;

		for (i = 0; i < size; i++)
			this.grid.setSelected(this.selectedPoints[i], false);
		this.selectedPoints = [];
		if (!this.animating) // if animating is true, a repaint is programmed
			this.visualGrid.draw();
	};

	/**
	 * end the game
	 * must be override by removing the event listeners, and then call this method
	 */
	this.endGame = function()
	{
		if (intervalID != null)
			clearInterval(intervalID);
		if (this.animating)
		{
			this.animating = false;
			return;
		}
		running = false;
		fire("gameFinished");
	};

	/**
	 * compute the points and show it
	 * @param nbDiams the number of jewels removed. if undefined, reset the number of points
	 */
	this.updatePoints = function(nbDiams)
	{
		var nbSupp = 0;

		if (typeof nbDiams === "undefined")
			points = 0;
		else
		{
			if (nbDiams > 3)
				nbSupp = nbDiams;
			nbDiams = (nbDiams * 10) + (nbDiams * 10) * (nbSupp * 0.1);
			points += Math.round(nbDiams + nbDiams * (this.cascadeMultiplier * 0.5));
			if (points < 0)
				points = 0;
		}
		if (htmels.elPoints)
			htmels.elPoints.innerHTML = "POINTS: " + points;
	};

	/**
	 * update the number of possible moves.
	 * @param nbMoves the number of moves.
	 * if nbMoves undefined or < 0, show "..." in the GUI
	 * if nbMoves == 0, end the game
	 */
	this.updateMoves = function(nbMoves)
	{
		if (typeof nbMoves === "undefined")
			possibleMoves = -1;
		else
			possibleMoves = nbMoves;
		if (htmels.elMoves)
			htmels.elMoves.innerHTML = "MOVES: " + (possibleMoves < 0 ? "..." : possibleMoves);
		if (possibleMoves === 0)
			this.endGame();
	};

	/** for temporized games. MUST be bind in inherited objects */
	this.updateTime = function()
	{
		var timeString;

		dateBegin.setTime(dateBegin.getTime() - 1000);

		if (htmels.elTime)
		{
			timeString = (dateBegin.getMinutes() < 10 ? "0" : "") + dateBegin.getMinutes();
			timeString += ":";
			timeString += (dateBegin.getSeconds() < 10 ? "0" : "") + dateBegin.getSeconds();
			htmels.elTime.innerHTML = "TIME: " + timeString;
		}
		if (dateBegin.getTime() <= 0) // end of game
			this.timeout();
	};

	/** call this function when the game is ready to start (all images loaded...) */
	this.gameIsReady = function()
	{
		ready = true;
		fire("gameReady");
	};

	/**
	 * compute the values offsetX and offsetY from the given html element
	 * @param htmlElement the elemnt containing the grid (table, canvas...)
	 */
	this.computeOffset = function(htmlElement)
	{
		var pt, marginX, marginY;

		pt = getComputedStyle(htmlElement, null);
		marginX = parseInt(pt.paddingLeft, 10);
		marginY = parseInt(pt.paddingTop, 10);
		this.offsetX = marginX + htmlElement.offsetLeft;
		this.offsetY = marginY + htmlElement.offsetTop;
	};

	// For the events:
	this.addEventListener = function(type, listener)
	{
		if (typeof listeners[type] !== "undefined")
			listeners[type].push(listener);
	};

	this.removeEventListener = function(type, listener)
	{
		var index;
		if (typeof listeners[type] !== "undefined")
		{
			index = listeners[type].indexOf(listener);
			if (index >= 0)
				listeners[type].splice(index, 1);
		}
	};

	this.setHTMLPoints = function(htmlpoints) { htmels.elPoints = htmlpoints; };
	this.setHTMLTime = function(htmltime) { htmels.elTime = htmltime; };
	this.setHTMLMoves = function(htmlmoves) { htmels.elMoves = htmlmoves; };
	this.isReady = function() { return ready; };
	this.isRunning = function() { return running; };

	// private members
	/**
	 * launch an element event = { type: TYPE, target: TARGET } to all listeners of this event
	 * @param event must be a string
	 */
	var fire = function(event)
	{
		var i;
		if (typeof listeners[event] !== "undefined")
		{
			const len = listeners[event].length, evt = { type: event, target: this };

			for (i = 0; i < len; i++)
				listeners[event][i].call(this, evt);
		}
	};
}

/**
 * resize the canvas of the game
 * @param size the new size (it's a square, so just the width ;) )
 */
AbstractdGame.prototype.resize = function(size) { this.visualGrid.setSize(size); };

/**
 * This function is called when timeout
 * @warning this function must be reimplemented in the subclasses
 */
AbstractdGame.prototype.timeout = function() {};

/**
 * @warning this function must be reimplemented in the subclasses
 * @param e the event
 */
AbstractdGame.prototype.onMouseDown = function(e) {};

/**
 * @warning this function must be reimplemented in the subclasses
 * @param e the event
 */
AbstractdGame.prototype.onMouseMove = function(e) {};

/**
 * @warning this function must be reimplemented in the subclasses
 * @param e the event
 */
AbstractdGame.prototype.onMouseUp = function (e) {};
