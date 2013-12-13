/*
BEST JEWEL is a jewel game with multiple mods.
Copyright © 2013 Rémi DUCCESCHI
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
var DIFFICULTY = {
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
function StandardGame (cxt)
{
/** The context in which the application is running */
	var context = cxt;
	/** The grid */
	var grid = null;
	/** the visual grid */
	var visualGrid = null;
	/** the level of difficulty */
	var difficulty = DIFFICULTY.EASY;
	/** true if the mouse button is actually down */
	var mouseDown = false;
	/** tells if an animation is occuring, so we should wait before launch the next move */
	var animating = false;
	/** offset of the canvas in the page */
	var offsetX = 0, offsetY = 0;
	/** The images of diamonds */
	var diamondImages = [];
	/** the selected points we want to exchange */
	var selectedPoints = [];
	/** keep in memory the last selected points */
	var lastSelectedPoints = [];
	/** the last clicked point, useful for mousemove */
	var lastClickedPoint = { x: -1, y: -1 };
	/** the number of possible moves */
	var possibleMoves = -1;
	/** the points gained */
	var points = 0;
	/** the depth of the actual cascade (used to calculate the points: multiplier) */
	var cascadeMultiplier = 0;
	/** the begin date of the game */
	var dateBegin = null;
	/** the length of the game */
	var dateLength = new Date(60000); // 60 seconds
	/** the id of the function in setInterval */
	var intervalID = null;
	/** the HTML elements where to write the points etc... */
	var htmels = {
			elPoints: null,
			elTime: null,
			elMoves: null
	};

	// these are private functions that create the animations. they are declared here and defined below
	var startAnimation, validExchange, cascade, endCascade, endAnimation;
	startAnimation = validExchange = cascade = endCascade = endAnimation = function(){};

	/** launch a new game */
	this.newGame = function()
	{
		updateMoves();
		grid = new Grid(difficulty.gridSize, difficulty.nbColor);
		visualGrid = new VisualGrid(context, grid);
		// we enable the listeners
		context.canvas.removeEventListener("mousedown", this.onMouseDown);
		context.canvas.removeEventListener("mouseup", this.onMouseUp);
		context.canvas.removeEventListener("mousemove", this.onMouseMove);
		context.canvas.addEventListener("mousedown", this.onMouseDown);
		context.canvas.addEventListener("mouseup", this.onMouseUp);
		context.canvas.addEventListener("mousemove", this.onMouseMove);
		// we start the game
		visualGrid.setPosition({ x: 0, y:0 });
		visualGrid.setSize(Math.min(context.canvas.width, context.canvas.height));
		visualGrid.setNbRows(difficulty.gridSize);
		visualGrid.setBorderWidth(3);
		visualGrid.setBorderColor("rgba(255, 255, 255, 0)");
		visualGrid.setDiamondImages(diamondImages);
		visualGrid.initialize();
		dateBegin = new Date();
		updateMoves(grid.findMoves());
		updatePoints();
		updateTime();
		if (intervalID !== null)
			clearInterval(intervalID);
		//intervalID = setInterval(updateTime.bind(this), 250); // need to be precise because this function is such a shit
		cascadeMultiplier = 0;
	};

	/** @param e the event */
	this.onMouseDown = function(e)
	{
		var point, i, size = selectedPoints.length;

		if (e.button === 0) // left button
		{
			point = visualGrid.convertCoordinates(e.pageX - offsetX, e.pageY - offsetY);
			if (point.x !== -1 && point.y !== -1) // if we click on a diamond
			{
				mouseDown = true;
				lastClickedPoint = point;
				grid.setSelected(point.x, point.y, !grid.isSelected(point.x, point.y));
				if (grid.isSelected(point.x, point.y)) // if the point has been selected
				{
					if (size === 0
							|| (size < 2 && Math.abs(point.x - selectedPoints[0].x)
									+ Math.abs(point.y - selectedPoints[0].y) === 1)) // if it is next to the last selection
						selectedPoints.push(point);
					else // otherwise, we clear the selection
					{
						for (i = 0; i < size; i++)
							grid.setSelected(selectedPoints[i].x, selectedPoints[i].y, false);
						selectedPoints = [];
						selectedPoints.push(point);
					}
				}
				else
				// otherwise, we remove the point from the list of selected points
				{
					if (selectedPoints[0].x === point.x && selectedPoints[0].y === point.y)
						selectedPoints.shift();
					else
						selectedPoints.pop();
				}
				if (!animating) // if animating is true, a repaint is programmed
					visualGrid.draw();
			}
		}
	};

	/** @param e the event */
	this.onMouseMove = function(e)
	{
		var point, i, size;

		if (mouseDown)
		{
			point = visualGrid.convertCoordinates(e.pageX - offsetX, e.pageY - offsetY);
			if (point.x !== -1 && point.y !== -1 && (point.x !== lastClickedPoint.x || point.y !== lastClickedPoint.y)
					&& Math.abs(point.x - lastClickedPoint.x) + Math.abs(point.y - lastClickedPoint.y) === 1)
			{
				size = selectedPoints.length;
				for (i = 0; i < size; i++)
					grid.setSelected(selectedPoints[i].x, selectedPoints[i].y, false);
				selectedPoints = [];
				grid.setSelected(lastClickedPoint.x, lastClickedPoint.y, true);
				grid.setSelected(point.x, point.y, true);
				selectedPoints.push(lastClickedPoint);
				selectedPoints.push(point);
				if (!animating) // if animating is true, a repaint is programmed
					visualGrid.draw();
				mouseDown = false; // it's not possible to drag again until we reclick
				startAnimation();
			}
		}
	};

	this.onMouseUp = function (e)
	{
		if (e.button === 0) // left button
		{
			mouseDown = false;
			if (selectedPoints.length === 2)
				startAnimation();
		}
	};

	/** Select a diamond that can be moved, to help the user */
	this.findMove = function()
	{
		var i, j, size, move;

		if (!animating && possibleMoves > 0)
		{
			updatePoints(-3); // we penalize
			move = Math.floor(Math.random() * possibleMoves);
			size = selectedPoints.length;
			for (i = 0; i < size; i++)
				grid.setSelected(selectedPoints[i].x, selectedPoints[i].y, false);
			selectedPoints = [];
			size = grid.getSize();
			for (i = 0; i < size; i++)
			{
				for (j = 0; j < size; j++)
				{
					if (grid.getStatusAt(i, j) === STATUS.POSSIBLE)
					{
						if (move === 0) // we select it
						{
							grid.setSelected(i, j, true);
							selectedPoints.push({ x: i, y: j });
							visualGrid.draw(); // we know we are not in an animation, so no repaint is planned
							return;
						}
						else
							move--;
					}
				}
			}
		}
	};

	/** @param diff the new difficulty */
	this.changeDifficulty = function(diff) { difficulty = diff; };

	/** end the game */
	this.endGame = function()
	{
		context.canvas.removeEventListener("mousedown", this.onMouseDown);
		context.canvas.removeEventListener("mouseup", this.onMouseUp);
		context.canvas.removeEventListener("mousemove", this.onMouseMove);
		if (intervalID != null)
			clearInterval(intervalID);
		if (animating)
		{
			animating = false;
			return;
		}
		alert("Game finished with " + points + " points.\nTime left: " + htmels.elTime.innerHTML +
				"\nMoves left: " + possibleMoves + "\n\nA new grid will be generated.");
		this.newGame();
	};

	/**
	 * compute the points and show it
	 * @param nbDiams the number of jewels removed. if undefined, reset the number of points
	 */
	var updatePoints = function(nbDiams)
	{
		var nbSupp = 0;

		if (typeof nbDiams === "undefined")
			points = 0;
		else
		{
			if (nbDiams > 3)
				nbSupp = nbDiams;
			nbDiams = (nbDiams * 10) + (nbDiams * 10) * (nbSupp * 0.1);
			points += Math.round(nbDiams + nbDiams * (cascadeMultiplier * 0.5));
			if (points < 0)
				points = 0;
		}
		if (htmels.elPoints)
			htmels.elPoints.innerHTML = "POINTS: " + points;
	};

	var updateTime = function()
	{
		var timeString, timeLeft, currentTime = new Date();

		if (dateBegin.getTime() > currentTime.getTime())
			dateBegin.setTime(currentTime.getTime());
		timeLeft = currentTime.getTime() - dateBegin.getTime();
		if (timeLeft > dateLength.getTime()) // end of game
		{
			timeLeft = dateLength.getTime();
			this.endGame();
		}
		timeLeft = new Date(dateLength.getTime() - timeLeft);
		if (htmels.elTime)
		{
			timeString = (timeLeft.getMinutes() < 10 ? "0" : "") + timeLeft.getMinutes();
			timeString += ":";
			timeString += (timeLeft.getSeconds() < 10 ? "0" : "") + timeLeft.getSeconds();
			htmels.elTime.innerHTML = "TIME: " + timeString;
		}
	};

	/**
	 * update the number of possible moves.
	 * @param nbMoves the number of moves.
	 * if nbMoves undefined or < 0, show "..." in the GUI
	 * if nbMoves == 0, end the game
	 */
	var updateMoves = function(nbMoves)
	{
		if (typeof nbMoves === "undefined")
			possibleMoves = -1;
		else
			possibleMoves = nbMoves;
		if (possibleMoves === 0)
			this.endGame();
		if (htmels.elMoves)
			htmels.elMoves.innerHTML = "MOVES: " + (possibleMoves < 0 ? "..." : possibleMoves);
	};

	/**
	 * ask visualGrid to remove the diamonds and check that there is no selected points in the list. otherwise,
	 * clear the selection.
	 * @param pointsToRemove the list of points = { x: X, y: Y }
	 */
	var removeDiamonds = function(pointsToRemove)
	{
		var i, j, sizeS = selectedPoints.length, size = grid.getSize();

		visualGrid.removeDiamond(pointsToRemove);
		updatePoints(pointsToRemove.length);

		selectedPoints = [];
		for (i = 0; i < size; i++)
		{
			for (j = 0; j < size; j++)
			{
				if (grid.isSelected(i, j))
					selectedPoints.push({ x: i, y: j });
			}
		}
		size = selectedPoints.length;
		if (sizeS !== size)
		{
			for (i = 0; i < size; i++)
				grid.setSelected(selectedPoints[i].x, selectedPoints[i].y, false);
			selectedPoints = [];
		}
	};

	/** start a fall by exchanging two values. wait until it is possible to exchange. ie: no animation */
	startAnimation = function()
	{
		if (!animating && !visualGrid.isAnimating())
		{
			if ((Math.abs(selectedPoints[0].x - selectedPoints[1].x) + Math.abs(selectedPoints[0].y - selectedPoints[1].y) === 1))
			{
				updateMoves(); // we don't know as we will change the grid
				animating = true;
				grid.exchange(selectedPoints[0], selectedPoints[1]);
				visualGrid.exchange(selectedPoints[0], selectedPoints[1]);
				grid.setSelected(selectedPoints[0].x, selectedPoints[0].y, false);
				grid.setSelected(selectedPoints[1].x, selectedPoints[1].y, false);
				lastSelectedPoints = selectedPoints; // we save it in case the user select other points, we have a save
				selectedPoints = [];
				validExchange();
			}
			else // possibly, after a fall, the selection are not aligned anymore
			{
				grid.setSelected(selectedPoints[0].x, selectedPoints[0].y, false);
				grid.setSelected(selectedPoints[1].x, selectedPoints[1].y, false);
				selectedPoints = [];
				visualGrid.draw();
			}
		}
	};

	/** if the exchange was valid, create a cascade. otherwise, reechange */
	validExchange = function()
	{
		var alignedPoints;

		if (visualGrid.isAnimating())
			visualGrid.addEventListener("animationEnd", validExchange); // we wait until the animation is done
		else
		{
			visualGrid.removeEventListener("animationEnd", validExchange);
			alignedPoints = grid.findAligned();
			if (alignedPoints.length === 0) // bad move: not diamonds have been aligned
			{
				updatePoints(-3); // sanction
				grid.exchange(lastSelectedPoints[0], lastSelectedPoints[1]);
				visualGrid.exchange(lastSelectedPoints[0], lastSelectedPoints[1]);
				endAnimation();
			}
			else
			{
				removeDiamonds(alignedPoints);
				cascade();
			}
			lastSelectedPoints = [];
		}
	};

	/** make the diamonds fall */
	cascade = function()
	{
		var fallingPoints;

		if (visualGrid.isAnimating())
			visualGrid.addEventListener("animationEnd", cascade); // we wait until the animation is done
		else
		{
			visualGrid.removeEventListener("animationEnd", cascade);
			fallingPoints = grid.niagara();
			visualGrid.fall(fallingPoints);
			fallingPoints = grid.populate();
			visualGrid.populate(fallingPoints);
			endCascade();
		}
	};

	endCascade = function()
	{
		var alignedPoints;

		if (visualGrid.isAnimating())
			visualGrid.addEventListener("animationEnd", endCascade); // we wait until the animation is done
		else
		{
			visualGrid.removeEventListener("animationEnd", endCascade);
			alignedPoints = grid.findAligned();
			if (alignedPoints.length === 0) // we stop here
				endAnimation();
			else
			{
				cascadeMultiplier++;
				removeDiamonds(alignedPoints);
				cascade();
			}
		}
	};

	/** end the animation. recall start animation if an exchange is waiting */
	endAnimation = function()
	{
		var i, j, size = grid.getSize();

		if (visualGrid.isAnimating())
			visualGrid.addEventListener("animationEnd", endAnimation); // we wait until the animation is done
		else
		{
			visualGrid.removeEventListener("animationEnd", endAnimation);
			selectedPoints = [];
			cascadeMultiplier = 0;
			for (i = 0; i < size; i++) // we take the new coordinates of the selection (after fall and deletion)
			{
				for (j = 0; j < size; j++)
				{
					if (grid.isSelected(i, j))
						selectedPoints.push({ x: i, y: j });
				}
			}
			if (selectedPoints.length === 2 && animating) // if the game is not finished and a new selection is waiting
			{
				animating = false;
				startAnimation();
			}
			else if (animating)
			{
				animating = false;
				updateMoves(grid.findMoves()); // we do it only here because it takes some times
			}
			else // end of game
			{
				updateMoves(grid.findMoves());
				this.endGame();
			}
		}
	};

	this.setHTMLPoints = function(htmlpoints) { htmels.elPoints = htmlpoints; };
	this.setHTMLTime = function(htmltime) { htmels.elTime = htmltime; };
	this.setHTMLMoves = function(htmlmoves) { htmels.elMoves = htmlmoves; };

	// we initialize the offsets
	(function(){
		var pt, marginX, marginY;

		pt = getComputedStyle(context.canvas, null);
		marginX = parseInt(pt.paddingLeft, 10);
		marginY = parseInt(pt.paddingTop, 10);
		offsetX = marginX + context.canvas.offsetLeft;
		offsetY = marginY + context.canvas.offsetTop;
	})();
	// we set the images
	(function() {
		var i, images = [];

		for (i = 0; i < COLORS.NUMBER; i++)
			diamondImages.push(COLORS.UNDEFINED);

		images.push(new Image());
		images[0].src = "js/resources/zerg.png";
		images[0].onload = function() { diamondImages[0] = images[0]; };
		diamondImages[0] = images[0];
		images.push(new Image());
		images[1].src = "js/resources/terran.png";
		images[1].onload = function() { diamondImages[1] = images[1]; };
		diamondImages[1] = images[1];
		images.push(new Image());
		images[2].src = "js/resources/protoss.png";
		images[2].onload = function() { diamondImages[2] = images[2]; };
		diamondImages[2] = images[2];
		images.push(new Image());
		images[3].src = "js/resources/zerg2.png";
		images[3].onload = function() { diamondImages[3] = images[3]; };
		diamondImages[3] = images[3];
		images.push(new Image());
		images[4].src = "js/resources/terran2.png";
		images[4].onload = function() { diamondImages[4] = images[4]; };
		diamondImages[4] = images[4];
		images.push(new Image());
		images[5].src = "js/resources/protoss2.png";
		images[5].onload = function() { diamondImages[5] = images[5]; };
		diamondImages[5] = images[5];
		images.push(new Image());
		images[6].src = "js/resources/sc2.png";
		images[6].onload = function() { diamondImages[6] = images[6]; };
		diamondImages[6] = images[6];
	})();
	// we bind updateMoves()such as it can be called with an event
	updateMoves = updateMoves.bind(this);
	endAnimation = endAnimation.bind(this);
	this.endGame = this.endGame.bind(this);
	this.newGame = this.newGame.bind(this);
}

