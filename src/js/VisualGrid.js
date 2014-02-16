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

/**
 * Represent the visual grid, what is drawn in the canvas.
 * @param cxt the canvas context in which we want to draw
 * @param grille the non visual grid representing the game
 */
function VisualGrid (cxt, grille)
{
	/** the canvas' context in which we want to draw */
	const context = cxt;
	/** the non visual grid representing the game */
	const grid = grille;
	/** the 2D array containing the diamonds */
	var diamonds = [];
	/** meta object that contains all the sizes and positions */
	const placement = {
			gridSize: 0, /** the size of the visualisation grid */
			position: new Point(0, 0), /** the position of the grid in the canvas */
			nbRows: 0, /** the number of elements in a row */
			rowSize: 0, /** The size of a row */
			celluleSize: 0 /** the size of a cellule = (rowSize - borderSize) * 0.9 */
	};
	/** meta object that contains all the appearance elements */
	const appearance = {
			borderWidth: 0,
			borderColor: "black",
			diamondImages: ["blue", "green", "lime", "maroon", "purple", "silver", "fuchsia"] /** the list of diamond representations */
	};
	/** contains all the listener of this object */
	var listeners = { animationStart: [], animationEnd: [] };
	/** true if an animation is in progress */
	var animating = false;
	/**
	 * An array of function's pointers.
	 * If an action has to be done before the repaint of the grid, it should be added here and deleted once done. Useful
	 * for animations (the coordinates are calculated before the repaint
	 */
	var listActionsBegin = [];
	/** the same but it will be called after the main repainting */
	var listActionsEnd = [];
	/** Contains all the variables used by the different actions */
	const actionVars = { // we can access it whenever we want as JS is thread safe
			lastFrame: 0, // the time where was displayed the last frame
			excBeginFrame: 0, // the begin frame of an exchange
			excPoints: [], // the 2 points to be exchanged
			falPoints: [], // the points that must fall, used by moveDiamonds.
			rmPoints: [], // the points that must be removed
			rmAlpha: 1 // l'avancement de la transparence pour la disparition
	};

	/** the number of pixels per seconds */
	this.animationSpeed = 0;

	/**
	 * change the value of animating, and eventually send an event
	 * @param isMoving must be true if an animation is running
	 */
	var setAnimating = function(isMoving)
	{
		animating = isMoving;
		if (animating)
			this.fire("animationStart");
		else
			this.fire("animationEnd");
	};

	/**
	 * move the diamonds.
	 * NEVER call it directly! put the diamonds to move in actionVars.falPoints[] ({ x: X, y: Y }), add moveDiamonds()
	 * in listActions[] and finally, call this.draw()
	 * @param framerate the framerate for animation
	 */
	var moveDiamonds = function(framerate)
	{
		var i, points, deplacement = 0, actualPosition, finished = true;
		const rowsize = placement.rowSize, offsetY = rowsize / 2 + placement.position.y;

		points = actionVars.falPoints;

		if (framerate > 0) // otherwise, deplacement = 0
			deplacement = Math.round((framerate - actionVars.lastFrame) / 1000 * this.animationSpeed);

		for (i = 0; i < points.length; i++) // points.length may change
		{
			actualPosition = diamonds[points[i].x][points[i].y].getPosition();
			if (actualPosition.y + deplacement > Math.round(offsetY + points[i].x * rowsize)) // it finishes at the right place
			{
				actualPosition.y = Math.round(offsetY + points[i].x * rowsize);
				diamonds[points[i].x][points[i].y].setPosition(actualPosition);
				points.splice(i, 1); // this point is finished, we remove it
				i--;
			}
			else // not finished
			{
				actualPosition.y += deplacement;
				finished = false; // by default, finished === true
				diamonds[points[i].x][points[i].y].setPosition(actualPosition);
			}
		}

		if (finished) // action finished we remove the context and the function from listActions
		{
			listActionsBegin.splice(listActionsBegin.indexOf(this.fall), 1);
			actionVars.falPoints = [];
		}
	};

	/**
	 * draw the grid.
	 * if listActions contains functions, they will be call and draw will be recalled later by requestAnimationFrame
	 * @param framerate the framerate givent by requestAnimationFrame()
	 */
	this.draw = function(framerate)
	{
		var i, j, actualPosition, lineTo, currentPoint = new Point();
		const size = placement.gridSize, width = placement.rowSize - 2 * appearance.borderWidth;

		if (!framerate || !animating)
		{
			setAnimating(true);
			framerate = 0;
			actionVars.lastFrame = 0;
		}
		else if (actionVars.lastFrame === 0)
			actionVars.lastFrame = framerate;
		//context.clearRect(posX, posY, posX + size, posY + size);
		context.clearRect(0, 0, context.canvas.width, context.canvas.height); // optimaized

		// first, we calcul the new coordinates or do whatever
		if (listActionsBegin.length > 0)
		{
			for (i = 0; i < listActionsBegin.length; i++)
				listActionsBegin[i](framerate);
		}

		// then, we draw the grid
		if (appearance.borderWidth)
		{
			const posX = placement.position.x, posY = placement.position.y;

			context.lineWidth = appearance.borderWidth;
			context.strokeStyle = appearance.borderColor;
			context.strokeRect(posX, posY, size, size);
			for (i = 1; i < placement.nbRows; i++)
			{
				context.beginPath();
				lineTo = Math.floor(i * size / placement.nbRows) - 1;
				context.moveTo(lineTo + posX, posY);
				context.lineTo(lineTo + posX, size + posY);
				context.moveTo(posX, lineTo + posY);
				context.lineTo(size + posX, lineTo + posY);
				context.stroke();
			}
		}

		// finally the diamonds
		for (i = 0; i < placement.nbRows; i++)
		{
			for (j = 0; j < placement.nbRows; j++)
			{
				currentPoint.x = i;
				currentPoint.y = j;
				if (diamonds[i][j] !== null && grid.getStatusAt(currentPoint) !== STATUS.HOLE)
				{
					if (grid.isSelected(currentPoint))
					{
						actualPosition = diamonds[i][j].getPosition();
						context.beginPath();
						context.lineWidth = 3;
						context.fillStyle = "rgba(255, 255, 255, 0.4)";
						context.strokeStyle = "rgba(255, 255, 255, 0.6)";
						context.fillRect(actualPosition.x - width / 2, actualPosition.y - width / 2, width, width);
						context.strokeRect(actualPosition.x - width / 2, actualPosition.y - width / 2, width, width);
					}
					diamonds[i][j].draw(context);
				}
			}
		}

		// we call the last methods
		if (listActionsEnd.length > 0)
		{
			for (i = 0; i < listActionsEnd.length; i++)
				listActionsEnd[i](framerate);
		}

		// we call this function again until no changes are to made
		actionVars.lastFrame = framerate;
		if (listActionsBegin.length > 0 || listActionsEnd.length > 0)
			requestAnimationFrame(this.draw);
		else
			setAnimating(false);
	};

	/**
	 * initialize the object : creates all the diamonds
	 */
	this.initialize = function()
	{
		var i, j, points = [];

		// we create the diamonds
		diamonds = [];
		for (i = 0; i < placement.nbRows; i++)
		{
			diamonds.push([]);
			for (j = 0; j < placement.nbRows; j++)
			{
				diamonds[i].push(null);
				points.push(new Point(i, j));
			}
		}
		points.sort(function(a, b) { return b.x - a.x !== 0 ? b.x - a.x : a.y - b.y; });
		this.populate(points);
	};

	/**
	 * exchange the position of a and b (a and b are Point)
	 * @param a the first point (after, a become the timestamp)
	 * @param b the second point
	 */
	this.exchange = function(a, b)
	{
		var framerate, percent, points, finished = true, pos = new Point();

		if (typeof b !== "undefined" && typeof a !== "number") // first time the function is called
		{
			if (listActionsBegin.indexOf(this.exchange) >= 0) // the function is already executing
				return;
			framerate = 0;
			actionVars.excPoints.push({ gridPos: a, initPos: diamonds[a.x][a.y].getPosition() });
			actionVars.excPoints.push({ gridPos: b, initPos: diamonds[b.x][b.y].getPosition() });
			listActionsBegin.push(this.exchange); // we add the function in the list of actions
		}
		else
			framerate = a; // a is the framerate
		if (actionVars.excBeginFrame === 0)
			actionVars.excBeginFrame = framerate;

		points = actionVars.excPoints;
		percent = Math.max(Math.abs(points[1].initPos.x - points[0].initPos.x), Math.abs(points[1].initPos.y - points[0].initPos.y));
		percent = 1000 * percent / this.animationSpeed;
		percent = (framerate - actionVars.excBeginFrame) / percent;

		if (percent < 1)
			finished = false;
		else // animation finished
			percent = 1;

		pos.x = Math.round((points[1].initPos.x - points[0].initPos.x) * percent + points[0].initPos.x); // first point
		pos.y = Math.round((points[1].initPos.y - points[0].initPos.y) * percent + points[0].initPos.y);
		diamonds[points[0].gridPos.x][points[0].gridPos.y].setPosition(pos);
		pos.x = Math.round((points[0].initPos.x - points[1].initPos.x) * percent + points[1].initPos.x); // second point
		pos.y = Math.round((points[0].initPos.y - points[1].initPos.y) * percent + points[1].initPos.y);
		diamonds[points[1].gridPos.x][points[1].gridPos.y].setPosition(pos);

		if (finished) // action finished we remove the context and the function from listActions
		{ // finally, we exchange the diamonds in the grid
			const tmp = diamonds[points[0].gridPos.x][points[0].gridPos.y];
			diamonds[points[0].gridPos.x][points[0].gridPos.y] = diamonds[points[1].gridPos.x][points[1].gridPos.y];
			diamonds[points[1].gridPos.x][points[1].gridPos.y] = tmp;
			listActionsBegin.splice(listActionsBegin.indexOf(this.exchange), 1);
			actionVars.excBeginFrame = 0;
			actionVars.excPoints = [];
		}
		if (!animating) // finally, we call draw if it's the first time the function is called
			this.draw();
	};

	/**
	 * make the diamonds fall after deletion.
	 * @param points the list of points that we must fall, ordered by their decreasing depth. it becomes the framerate after
	 * points are { x1: X1, y1: Y1, x2: X2, y2: Y2 } where (X1,Y1) is the initial position, (X2,Y2) is the position after the fall
	 */
	this.fall = function(points)
	{
		var i, swap;
		const size = points.length;

		for (i = 0; i < size; i++)
		{
			swap = diamonds[points[i].x2][points[i].y2];
			diamonds[points[i].x2][points[i].y2] = diamonds[points[i].x1][points[i].y1];
			diamonds[points[i].x1][points[i].y1] = swap;
			actionVars.falPoints.push(new Point(points[i].x2, points[i].y2)); // we memorize the points
		}

		if (listActionsBegin.indexOf(moveDiamonds) === -1)
		{
			listActionsBegin.push(moveDiamonds); // otherwise, the function is already running
			this.draw();
		}
	};

	/**
	 * create new jewels after deletion
	 * @param points the emplacement of the new jewels sorted by depth (x). We have Point
	 */
	this.populate = function(points)
	{
		var i, color, tmpDiamond, depth = [], point = new Point();
		const size = points.length, rowsize = placement.rowSize;
		const offsetX = rowsize / 2 + placement.position.x, offsetY = rowsize / 2 + placement.position.y;

		for (i = 0; i < placement.nbRows; i++) // initially, all the diamonds are above the grid, so we use depth
			depth.push(0);

		for (i = 0; i < size; i++)
		{
			if (depth[points[i].y] === 0) // we know that points are srted by depth
				depth[points[i].y] = points[i].x + 1;
			color = grid.getColorAt(points[i]);
			point.x = Math.round(offsetX + points[i].y * rowsize);
			point.y = Math.round(offsetY + (points[i].x - depth[points[i].y]) * rowsize);
			tmpDiamond = new Diamonds(color, appearance.diamondImages[color]);
			tmpDiamond.setSize(placement.celluleSize);
			tmpDiamond.setPosition(point);
			diamonds[points[i].x][points[i].y] = tmpDiamond;
		}

		actionVars.falPoints = actionVars.falPoints.concat(points);
		if (listActionsBegin.indexOf(moveDiamonds) === -1)
		{
			listActionsBegin.push(moveDiamonds); // otherwise, the function is already running
			this.draw();
		}
	};

	/**
	 * remove the given diamonds from the grid
	 * @param points an array of points representing the diamonds. becomes the framerate later. we have Point
	 */
	this.removeDiamond = function(points)
	{
		var i, j, framerate, finished = true, alpha = 0;
		var position, sparks, sparkPosition = { pos: new Point(), size: -1 };
		const size = actionVars.rmPoints.length;

		if (typeof points !== "undefined" && Array.isArray(points)) // first time
		{
			if (listActionsEnd.indexOf(this.removeDiamond) >= 0) // the function is already executing
				return;
			framerate = 0;
			actionVars.rmPoints = points;
			listActionsEnd.push(this.removeDiamond); // we add the function in the list of actions
		}
		else
			framerate = points;

		if (framerate > 0 && framerate > actionVars.lastFrame + 1)
			alpha = (framerate - actionVars.lastFrame) / 300;
		if (actionVars.rmAlpha - alpha < 0)
			alpha = 0;
		else
		{
			finished = false;
			alpha = actionVars.rmAlpha - alpha;
			actionVars.rmAlpha = alpha;
		}

		for (i = 0; i < size; i++)
		{
			context.globalAlpha = alpha;
			diamonds[actionVars.rmPoints[i].x][actionVars.rmPoints[i].y].draw(context);
			context.globalAlpha = 1;
			// sparks
			position = diamonds[actionVars.rmPoints[i].x][actionVars.rmPoints[i].y].getPosition();
			sparks = Math.random() * 3; // we generate between 0 and 5 sparks
			for (j = 0; j < sparks; j++)
			{
				sparkPosition.pos.x = position.x - (Math.random() * placement.celluleSize * 2/3) + placement.celluleSize * 2/6;
				sparkPosition.pos.y = position.y - (Math.random() * placement.celluleSize * 2/3) + placement.celluleSize * 2/6;
				sparkPosition.size = Math.random() * placement.celluleSize / 10;
				context.beginPath();
				var radial = context.createRadialGradient(sparkPosition.pos.x, sparkPosition.pos.y, sparkPosition.size / 5, sparkPosition.pos.x, sparkPosition.pos.y, sparkPosition.size);
				radial.addColorStop(0, "yellow");
				radial.addColorStop(0.5, "red");
				radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
				context.fillStyle = radial;
				context.arc(sparkPosition.pos.x, sparkPosition.pos.y, sparkPosition.size, 0, Math.PI * 2);
				context.fill();
			}
		}

		if (finished)
		{
			actionVars.rmAlpha = 1;
			for (i = 0; i < size; i++)
			{
				delete diamonds[actionVars.rmPoints[i].x][actionVars.rmPoints[i].y];
				diamonds[actionVars.rmPoints[i].x][actionVars.rmPoints[i].y] = null;
			}
			actionVars.rmPoints = [];
			listActionsEnd.splice(listActionsEnd.indexOf(this.removeDiamond), 1);
		}
		if (!animating) // finally, we call draw if it's the first time the function is called
			this.draw();
	};

	/**
	 * convert the given real coordinates in the grid coordinates.
	 * the coordinates must be begin at (0, 0) from the top-left corner of the canvas. The coordinates are returned in
	 * a Point = { x: X, y: Y }. If the coordinates are not in the grid, return a non valid Point = { x: -1, y: -1 }
	 * @param pos the position
	 * @return the coordinates to be used in common functions or with a Grid object
	 */
	this.convertCoordinates = function(pos)
	{
		var tmpX, tmpY, cellPos;

		if (pos.x < placement.position.x || pos.x > placement.position.x + placement.gridSize
				|| pos.y < placement.position.y || pos.y > placement.position.y + placement.gridSize)
			return new Point(); // we are not in the grid

		cellPos = (placement.rowSize - placement.celluleSize) / 2; // divide by to because margin left + right
		tmpX = (pos.x - placement.position.x) % placement.rowSize; // we get the position in the cell
		tmpY = (pos.y - placement.position.y) % placement.rowSize;
		if (tmpX <= cellPos || tmpY <= cellPos || tmpX >= placement.rowSize - cellPos || tmpY >= placement.rowSize - cellPos)
			return new Point(); // we are between 2 diamonds

		tmpX = Math.floor((pos.x - placement.position.x) / placement.rowSize) + (tmpX === 0 ? 0 : 1); // we get the correct place
		tmpY = Math.floor((pos.y - placement.position.y) / placement.rowSize) + (tmpY === 0 ? 0 : 1);
		return new Point(tmpY - 1, tmpX - 1); // we make it begin at 0 instead of 1
	};

	// For the events:
	this.addEventListener = function(type, listener)
	{
		if (typeof listeners[type] !== "undefined")
			listeners[type].push(listener);
	};

	/**
	 * launch an element event = { type: TYPE, target: TARGET } to all listeners of this event
	 * @param event must be a string
	 */
	this.fire = function(event)
	{
		var i;
		if (typeof listeners[event] !== "undefined")
		{
			const len = listeners[event].length, evt = { type: event, target: this };

			for (i = 0; i < len; i++)
				listeners[event][i].call(this, evt);
		}
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

	/** update the appearance of the grid after a change of size, border, nbRows... */
	var updateGraphics = function()
	{
		var i, j, point = new Point();

		if (typeof placement.gridSize !== "undefined")
		{
			this.animationSpeed = placement.gridSize * 0.75;
			if (typeof placement.nbRows !== "undefined" && placement.nbRows > 0)
			{
				placement.rowSize = Math.round(placement.gridSize / placement.nbRows);
				placement.celluleSize = Math.round((placement.rowSize - appearance.borderWidth) * 0.9);
			}
		}
		// we update all the diamonds
		if (diamonds.length !== 0)
		{
			const offsetX = placement.rowSize / 2 + placement.position.x;
			const offsetY = placement.rowSize / 2 + placement.position.y;

			for (i = 0; i < placement.nbRows; i++)
			{
				for (j = 0; j < placement.nbRows; j++)
				{
					if (diamonds[i][j] !== null)
					{
						diamonds[i][j].setSize(placement.celluleSize);
						point.x = Math.round(offsetX + j * placement.rowSize);
						point.y = Math.round(offsetY + i * placement.rowSize);
						diamonds[i][j].setPosition(point);
					}
				}
			}
			if (!animating)
				this.draw();
		}
	};

	/** @return the size of the visual grid */
	this.getSize = function() { return placement.gridSize; };
	/** @param size the new size of the grid (in appearance) */
	this.setSize = function(size)
	{
		placement.gridSize = size;
		updateGraphics();
	};

	/** @return the number of elements per rows */
	this.getNbRows = function() { return placement.nbRows; };
	/** @param nb the number of elements per rows */
	this.setNbRows = function(nb)
	{
		placement.nbRows = nb;
		updateGraphics();
	};

	/** @return the position of the grid in the canvas, a Point */
	this.getPosition = function() { return placement.position; };
	/** @param position the position of the grid in the canvas, a Point */
	this.setPosition = function(position)
	{
		placement.position = position;
		updateGraphics();
	};

	/** @return the border width */
	this.getBorderWidth = function() { return appearance.borderWidth; };
	/** @param width the border width */
	this.setBorderWidth = function(width)
	{
		appearance.borderWidth = width;
		updateGraphics();
	};

	/** @return the border color */
	this.getBorderColor = function() { return appearance.borderColor; };
	/** @param color the border color */
	this.setBorderColor = function(color) { appearance.borderColor = color; };

	/** @return the images representations of diamonds */
	this.getDiamondImages = function() { return appearance.diamondImages; };
	/** @param images the image representation of a diamond */
	this.setDiamondImages = function(images) { appearance.diamondImages = images; };

	/** @return true if an animation is in progress */
	this.isAnimating = function() { return animating; };

	// we bind this.draw() and others such as it can be called with requestAnimationFrame()
	this.draw = this.draw.bind(this);
	moveDiamonds = moveDiamonds.bind(this);
	this.exchange = this.exchange.bind(this);
	setAnimating = setAnimating.bind(this);
	this.removeDiamond = this.removeDiamond.bind(this);
	updateGraphics = updateGraphics.bind(this);
}
