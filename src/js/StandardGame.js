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

/**
 * represent a standard game.
 * basic jewel: just move some and get some points when 3 are aligned!
 * @param cxt the context in which the application is running
 */
function StandardGame (cxt)
{
	/** the length of the game */
	this.dateLength = new Date(60000); // 60 seconds
	/** The context in which the application is running */
	const context = cxt;
	/** true if the mouse button is actually down */
	var mouseDown = false;

	// these are private functions that create the animations. they are declared here and defined below
	var startAnimation, validExchange, cascade, endCascade, endAnimation;
	startAnimation = validExchange = cascade = endCascade = endAnimation = function(){;};

	this.newGame = this.newGame.bind(this);
	var superNewGame = this.newGame;
	/** launch a new game */
	this.newGame = function()
	{
		this.updateMoves();
		this.grid = new Grid(this.difficulty.gridSize, this.difficulty.nbColor);
		this.visualGrid = new VisualGrid(context, this.grid);
		// we enable the listeners
		context.canvas.removeEventListener("mousedown", this.onMouseDown);
		context.canvas.removeEventListener("mouseup", this.onMouseUp);
		context.canvas.removeEventListener("mousemove", this.onMouseMove);
		context.canvas.addEventListener("mousedown", this.onMouseDown);
		document.addEventListener("mouseup", this.onMouseUp); // in the document to update if the mouse is released out the canvas
		context.canvas.addEventListener("mousemove", this.onMouseMove);
		// we start the game
		this.visualGrid.setPosition(new Point(0, 0));
		this.visualGrid.setSize(Math.min(context.canvas.width, context.canvas.height));
		this.visualGrid.setNbRows(this.difficulty.gridSize);
		this.visualGrid.setBorderWidth(2);
		this.visualGrid.setBorderColor("rgba(255, 255, 255, 0)");
		this.visualGrid.setDiamondImages(this.diamondImages);
		this.visualGrid.initialize();
		this.updateMoves(this.grid.findMoves());
		this.updatePoints();
		this.cascadeMultiplier = 0;
		superNewGame();
	};
	this.newGame = this.newGame.bind(this);

	/**
	 * @param e the event
	 * @override AbstractGame
	 */
	this.onMouseDown = function(e)
	{
		var point;

		if (e.button === 0) // left button
		{
			point = this.visualGrid.convertCoordinates(new Point(e.pageX - this.offsetX, e.pageY - this.offsetY));
			if (point.x !== -1 && point.y !== -1) // if we click on a diamond
			{
				mouseDown = true;
				this.lastClickedPoint = point;
				this.setSelected(point, !this.grid.isSelected(point));
			}
		}
	};
	this.onMouseDown = this.onMouseDown.bind(this);

	/**
	 * @param e the event
	 * @override AbstractGame
	 */
	this.onMouseMove = function(e)
	{
		var point, i;

		if (mouseDown)
		{
			if (!this.grid.isSelected(this.lastClickedPoint))
				this.setSelected(this.lastClickedPoint, true);

			point = this.visualGrid.convertCoordinates(new Point(e.pageX - this.offsetX, e.pageY - this.offsetY));
			if (point.x !== -1 && point.y !== -1 && (point.x !== this.lastClickedPoint.x || point.y !== this.lastClickedPoint.y)
					&& Math.abs(point.x - this.lastClickedPoint.x) + Math.abs(point.y - this.lastClickedPoint.y) === 1)
			{
				this.clearSelection();
				this.setSelected(this.lastClickedPoint, true);
				this.setSelected(point, true);
				mouseDown = false; // it's not possible to drag again until we reclick
				startAnimation();
			}
		}
	};
	this.onMouseMove = this.onMouseMove.bind(this);

	/** @override AbstractGame */
	this.onMouseUp = function (e)
	{
		if (e.button === 0) // left button
		{
			mouseDown = false;
			if (this.selectedPoints.length === 2)
				startAnimation();
		}
	};
	this.onMouseUp = this.onMouseUp.bind(this);

	this.endGame = this.endGame.bind(this);
	var superEndGame = this.endGame;
	/** end the game */
	this.endGame = function()
	{
		context.canvas.removeEventListener("mousedown", this.onMouseDown);
		context.canvas.removeEventListener("mouseup", this.onMouseUp);
		context.canvas.removeEventListener("mousemove", this.onMouseMove);
		superEndGame();
	};
	this.endGame = this.endGame.bind(this);

	/** @override AbstractGame */
	this.timeout = function () { this.endGame(); };

	/** @override AbstractGame */
	this.resize = function(size)
	{
		this.computeOffset(context.canvas);
		this.visualGrid.setSize(size);
	};

	/**
	 * ask visualGrid to remove the diamonds and check that there is no selected points in the list. otherwise,
	 * clear the selection.
	 * @param pointsToRemove the list of Point
	 */
	var removeDiamonds = function(pointsToRemove)
	{
		var i, j, goone = true;
		const sizeS = this.selectedPoints.length, size = pointsToRemove.length;

		this.visualGrid.removeDiamond(pointsToRemove);
		this.updatePoints(size);

		// if a selected point has been removed, we remove them all!
		for (i = 0; i < size && goone; i++)
		{
			for (j = 0; j < sizeS && goone; j++)
			{
				if (this.selectedPoints[j].x === pointsToRemove[i].x && this.selectedPoints[j].y === pointsToRemove[i].y)
				{
					this.clearSelection();
					goone = false;
				}
			}
		}
	};
	removeDiamonds = removeDiamonds.bind(this);

	/** start a fall by exchanging two values. wait until it is possible to exchange. ie: no animation */
	startAnimation = function()
	{
		if (!this.animating && !this.visualGrid.isAnimating())
		{
			if ((Math.abs(this.selectedPoints[0].x - this.selectedPoints[1].x) + Math.abs(this.selectedPoints[0].y - this.selectedPoints[1].y) === 1))
			{
				this.updateMoves(); // we don't know as we will change the grid
				this.animating = true;
				this.grid.exchange(this.selectedPoints[0], this.selectedPoints[1]);
				this.visualGrid.exchange(this.selectedPoints[0], this.selectedPoints[1]);
				this.lastSelectedPoints = this.selectedPoints; // we save it in case the user select other points, we have a save
				this.clearSelection();
				validExchange();
			}
			else // possibly, after a fall, the selection are not aligned anymore
				this.clearSelection();
		}
	};
	startAnimation = startAnimation.bind(this);

	/** if the exchange was valid, create a cascade. otherwise, reechange */
	validExchange = function()
	{
		var alignedPoints;

		if (this.visualGrid.isAnimating())
			this.visualGrid.addEventListener("animationEnd", validExchange); // we wait until the animation is done
		else
		{
			this.visualGrid.removeEventListener("animationEnd", validExchange);
			alignedPoints = this.grid.findAligned();
			if (alignedPoints.length === 0) // bad move: not diamonds have been aligned
			{
				this.updatePoints(-3); // sanction
				this.grid.exchange(this.lastSelectedPoints[0], this.lastSelectedPoints[1]);
				this.visualGrid.exchange(this.lastSelectedPoints[0], this.lastSelectedPoints[1]);
				endAnimation();
			}
			else
			{
				removeDiamonds(alignedPoints);
				cascade();
			}
			this.lastSelectedPoints = [];
		}
	};
	validExchange = validExchange.bind(this);

	/** make the diamonds fall */
	cascade = function()
	{
		var fallingPoints;

		if (this.visualGrid.isAnimating())
			this.visualGrid.addEventListener("animationEnd", cascade); // we wait until the animation is done
		else
		{
			this.visualGrid.removeEventListener("animationEnd", cascade);
			fallingPoints = this.grid.niagara();
			this.visualGrid.fall(fallingPoints);
			fallingPoints = this.grid.populate();
			this.visualGrid.populate(fallingPoints);
			endCascade();
		}
	};
	cascade = cascade.bind(this);

	endCascade = function()
	{
		var alignedPoints;

		if (this.visualGrid.isAnimating())
			this.visualGrid.addEventListener("animationEnd", endCascade); // we wait until the animation is done
		else
		{
			this.visualGrid.removeEventListener("animationEnd", endCascade);
			alignedPoints = this.grid.findAligned();
			if (alignedPoints.length === 0) // we stop here
				endAnimation();
			else
			{
				this.cascadeMultiplier++;
				removeDiamonds(alignedPoints);
				cascade();
			}
		}
	};
	endCascade = endCascade.bind(this);

	/** end the animation. recall start animation if an exchange is waiting */
	endAnimation = function()
	{
		var i, j, point;

		if (this.visualGrid.isAnimating())
			this.visualGrid.addEventListener("animationEnd", endAnimation); // we wait until the animation is done
		else
		{
			this.visualGrid.removeEventListener("animationEnd", endAnimation);
			if (!this.animating) // end of game
			{
				this.updateMoves(this.grid.findMoves());
				this.endGame();
			}
			else
			{
				const size = this.grid.getSize();
	
				this.selectedPoints = [];
				this.cascadeMultiplier = 0;
				for (i = 0; i < size; i++) // we take the new coordinates of the selection (after fall and deletion)
				{
					for (j = 0; j < size; j++)
					{
						point = new Point(i, j);
						if (this.grid.isSelected(point))
							this.selectedPoints.push(point);
					}
				}
				if (this.selectedPoints.length === 2) // if the game is not finished and a new selection is waiting
				{
					this.animating = false;
					startAnimation();
				}
				else
				{
					this.animating = false;
					this.updateMoves(this.grid.findMoves()); // we do it only here because it takes some times
				}
			}
		}
	};
	endAnimation = endAnimation.bind(this);

	// we bind the inherited methods
	this.findMove = this.findMove.bind(this);
	this.updateTime = this.updateTime.bind(this);
	// we initialize the offsets
	this.computeOffset(context.canvas);
	// we set the images
	(function() {
		var i, images = [], loadedImg = 0;
		var checkLoad = function() {
			loadedImg++;
			if (loadedImg >= COLORS.NUMBER)
				this.gameIsReady();
		};
		checkLoad = checkLoad.bind(this);

		for (i = 0; i < COLORS.NUMBER; i++)
			this.diamondImages.push(COLORS.UNDEFINED);

		images.push(new Image());
		images[0].src = "js/resources/zerg.png";
		images[0].onload = (function() { this.diamondImages[0] = images[0]; checkLoad(); }).bind(this);
		images.push(new Image());
		images[1].src = "js/resources/terran.png";
		images[1].onload = (function() { this.diamondImages[1] = images[1]; checkLoad(); }).bind(this);
		images.push(new Image());
		images[2].src = "js/resources/protoss.png";
		images[2].onload = (function() { this.diamondImages[2] = images[2]; checkLoad(); }).bind(this);
		images.push(new Image());
		images[3].src = "js/resources/zerg2.png";
		images[3].onload = (function() { this.diamondImages[3] = images[3]; checkLoad(); }).bind(this);
		images.push(new Image());
		images[4].src = "js/resources/terran2.png";
		images[4].onload = (function() { this.diamondImages[4] = images[4]; checkLoad(); }).bind(this);
		images.push(new Image());
		images[5].src = "js/resources/protoss2.png";
		images[5].onload = (function() { this.diamondImages[5] = images[5]; checkLoad(); }).bind(this);
		images.push(new Image());
		images[6].src = "js/resources/sc2.png";
		images[6].onload = (function() { this.diamondImages[6] = images[6]; checkLoad(); }).bind(this);
	}).bind(this)();
}

// héritage
StandardGame.prototype = new AbstractdGame;

