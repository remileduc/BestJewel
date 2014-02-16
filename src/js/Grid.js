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
 * The different possible colors for diamonds
 */
const COLORS = {
		UNDEFINED: -1,
		BLUE: 0,
		GREEN: 1,
		GREEN2: 2,
		ORANGE: 3,
		PURPLE: 4,
		SILVER: 5,
		FUCHSIA: 6,
		NUMBER: 7 // the total number of colors
};

/**
 * represent the status of a diamond
 */
const STATUS = { // POSSIBLE + SELECTED = 5; POSSIBLE + NORMAL = 4; -> diamonds.status - SELECTED = the good thing!
		HOLE: -1, // there is a hole: no diamonds here
		NEW: 0, // this diamond is new, it has just been moved in the grid or it just appeared
		NORMAL: 1, // nothing particular
		POSSIBLE: 2, // by moving this diamond, you make a valid move (3 diamonds aligned)
		SELECTED: 3 // this diamond is selected by the user
};

/**
 * represent a 2D point with x and y coordinates.
 * this point can be either in the grid, or in the window...
 * @param x the x position, -1 if non valid
 * @param y the y position, -1 if non valid
 */
function Point (x, y)
{
	this.x = typeof x === "undefined" ? -1 : x;
	this.y = typeof y === "undefined" ? -1 : y;
}

/**
 * represent the data of the grid (non drawn)
 * @param taille the size of the grid
 * @param nbColours the number of colors in the grid
 */
function Grid (taille, nbColours)
{
	/** The size of the grid */
	const size = taille;
	/** the number of colors in the grid */
	const nbColors = nbColours;
	/** the number of possible moves. If -1, we don't know yet, computing */
	var nbMoves = -1;
	/** The grid with the color of elements */
	var colorGrid = [];
	/** The grid with the status of elements */
	var statusGrid = [];

	/** 
	 * Initialize the grid with random values. Automatically called when the object is created
	 */
	this.initialize = function()
	{
		var i, j, color;

		while (nbMoves <= 0) // we don't generate an impossible grid
		{
			colorGrid = [];
			statusGrid = [];

			for (i = 0; i < size; i++)
			{
				colorGrid.push([]);
				statusGrid.push([]);
				for (j = 0; j < size; j++)
				{
					color = Math.floor(Math.random() * nbColors);
					while ((i - 2 >= 0 && colorGrid[i - 2][j] === color && colorGrid[i - 1][j] === color)
							|| (j - 2 >= 0 && colorGrid[i][j - 2] === color && colorGrid[i][j - 1] === color))
						color = (color + 1) % nbColors;
					colorGrid[i].push(color);
					statusGrid[i].push(STATUS.NEW);
				}
			}
			this.findMoves(); // compute statusGrid and nbMoves
		}
	};

	/**
	 * find all the 3 or more aligned diamonds
	 * @return a list of all destroyed diamonds (unsorted). if no aligned, return [] (empty array)
	 * Point = { x: X, y: Y } @see Point(x, y)
	 */
	this.findAligned = function()
	{
		var i, j, color, points = [], select;

		nbMoves = -1;
		for (i = 0; i < size; i++)
		{
			for (j = 0; j < size; j++)
			{
				select = statusGrid[i][j] >= STATUS.SELECTED;
				if (select)
					statusGrid[i][j] -= STATUS.SELECTED; // to reduce the number of conditions
				// if new diamond, or a neighbour of a new diamond (or newly deleted)
				if (statusGrid[i][j] === STATUS.NEW
						|| (i - 1 >= 0 && (statusGrid[i - 1][j] === STATUS.NEW || statusGrid[i - 1][j] === STATUS.HOLE))
						|| (i - 2 >= 0 && (statusGrid[i - 2][j] === STATUS.NEW || statusGrid[i - 2][j] === STATUS.HOLE))
						|| (j - 1 >= 0 && (statusGrid[i][j - 1] === STATUS.NEW || statusGrid[i][j - 1] === STATUS.HOLE))
						|| (j - 2 >= 0 && (statusGrid[i][j - 2] === STATUS.NEW || statusGrid[i][j - 2] === STATUS.HOLE)))
				{
					color = colorGrid[i][j];
					// vertical
					if (i - 2 >= 0 && colorGrid[i - 2][j] === color && colorGrid[i - 1][j] === color)
					{
						if (statusGrid[i - 2][j] !== STATUS.HOLE)
						{
							statusGrid[i - 2][j] = STATUS.HOLE;
							points.push(new Point(i - 2, j));
						}
						if (statusGrid[i - 1][j] !== STATUS.HOLE)
						{
							statusGrid[i - 1][j] = STATUS.HOLE;
							points.push(new Point(i - 1, j));
						}
						statusGrid[i][j] = STATUS.HOLE;
						points.push(new Point(i, j));
					}
					// horizontal
					if (j - 2 >= 0 && colorGrid[i][j - 2] === color && colorGrid[i][j - 1] === color)
					{
						if (statusGrid[i][j - 2] !== STATUS.HOLE)
						{
							statusGrid[i][j - 2] = STATUS.HOLE;
							points.push(new Point(i, j - 2));
						}
						if (statusGrid[i][j - 1] !== STATUS.HOLE)
						{
							statusGrid[i][j - 1] = STATUS.HOLE;
							points.push(new Point(i, j - 1));
						}
						if (statusGrid[i][j] !== STATUS.HOLE)
						{
							statusGrid[i][j] = STATUS.HOLE;
							points.push(new Point(i, j));
						}
					}
				}
				if (statusGrid[i][j] !== STATUS.HOLE && select)
					statusGrid[i][j] += STATUS.SELECTED;
			}
		}
		const len = points.length;
		for (i = 0; i < len; i++)
			colorGrid[points[i].x][points[i].y] = COLORS.UNDEFINED;
		return points;
	};

	/**
	 * make the diamonds fall after an alignment
	 * @return the list of all points falling ordered by their depth. if nothing has been added, return [] (empty array)
	 * point = { x1: X1, y1: Y1, x2: X2, y2: Y2 } where (X1,Y1) is the initial position, (X2,Y2) is the position after the fall
	 */
	this.niagara = function()
	{
		var i, j, points = [], fall;

		nbMoves = -1;
		for (j = 0; j < size; j++)
		{
			fall = 0;
			for (i = size - 1; i >= 0; i--)
			{
				if (statusGrid[i][j] === STATUS.HOLE)
					fall++;
				else if (fall > 0)
				{
					colorGrid[i + fall][j] = colorGrid[i][j];
					colorGrid[i][j] = COLORS.UNDEFINED;
					statusGrid[i + fall][j] = STATUS.NEW  + (statusGrid[i][j] >= STATUS.SELECTED ? STATUS.SELECTED : 0);
					statusGrid[i][j] = STATUS.HOLE;
					points.push({ x1: i, y1: j, x2: i + fall, y2: j });
				}
			}
		}
		points.sort(function(a, b) { return b.x2 - a.x2 !== 0 ? b.x2 - a.x2 : a.y2 - b.y2; });
		return points;
	};

	/** 
	 * fill the empty places (where diamonds just have been destroyed).
	 * you MUST have call this.niagara() BEFORE
	 * @return the list of all new points ordered by their depth. if nothing has been added, return [] (empty array)
	 * Point = { x: X, y: Y } @see Point(x, y)
	 */
	this.populate = function()
	{
		var i, j, points = [];

		nbMoves = -1;
		for (i = 0; i < size; i++)
		{
			for (j = 0; j < size; j++)
			{
				if (statusGrid[i][j] === STATUS.HOLE)
				{
					colorGrid[i][j] = Math.floor(Math.random() * nbColors);
					statusGrid[i][j] = STATUS.NEW;
					points.push(new Point(i, j));
				}
			}
		}
		points.sort(function(a, b) { return b.x - a.x !== 0 ? b.x - a.x : a.y - b.y; });
		return points;
	};

	/** 
	 * Find the possible moves and update statusGrid
	 * @return the number of possible moves
	 */
	this.findMoves = function()
	{
		var i, j, color, tmpmv = 0;

		nbMoves = -1;
		for (i = 0; i < size; i++)
		{
			for (j = 0; j < size; j++)
			{
				//if (statusGrid[i][j] === STATUS.NEW) // brut force = simpler
				//{
					color = colorGrid[i][j];
					// Xoxx
					if ((i - 3 >= 0 && colorGrid[i - 3][j] === color && colorGrid[i - 2][j] === color)
							|| (i + 3 < size && colorGrid[i + 3][j] === color && colorGrid[i + 2][j] === color)
							|| (j - 3 >= 0 && colorGrid[i][j - 3] === color && colorGrid[i][j - 2] === color)
							|| (j + 3 < size && colorGrid[i][j + 3] === color && colorGrid[i][j + 2] === color))
					{
						statusGrid[i][j] = STATUS.POSSIBLE + (statusGrid[i][j] >= STATUS.SELECTED ? STATUS.SELECTED : 0);
						tmpmv++;
					}
					// oXo
					// xox
					else if ((i - 1 >= 0 && i + 1 < size && j - 1 >= 0 && colorGrid[i - 1][j - 1] === color && colorGrid[i + 1][j - 1] === color)
							|| (i - 1 >= 0 && i + 1 < size && j + 1 < size && colorGrid[i - 1][j + 1] === color && colorGrid[i + 1][j + 1] === color)
							|| (j - 1 >= 0 && j + 1 < size && i - 1 >= 0 && colorGrid[i - 1][j - 1] === color && colorGrid[i - 1][j + 1] === color)
							|| (j - 1 >= 0 && j + 1 < size && i + 1 < size && colorGrid[i + 1][j - 1] === color && colorGrid[i + 1][j + 1] === color))
					{
						statusGrid[i][j] = STATUS.POSSIBLE + (statusGrid[i][j] >= STATUS.SELECTED ? STATUS.SELECTED : 0);
						tmpmv++;
					}
					// Xoo
					// oxx
					else if ((i - 2 >= 0 && j - 1 >= 0 && colorGrid[i - 1][j - 1] === color && colorGrid[i - 2][j - 1] === color)
							|| (i + 2 < size && j - 1 >= 0 && colorGrid[i + 1][j - 1] === color && colorGrid[i + 2][j - 1] === color)
							|| (i - 2 >= 0 && j + 1 < size && colorGrid[i - 1][j + 1] === color && colorGrid[i - 2][j + 1] === color)
							|| (i + 2 < size && j + 1 < size && colorGrid[i + 1][j + 1] === color && colorGrid[i + 2][j + 1] === color)
							|| (j - 2 >= 0 && i - 1 >= 0 && colorGrid[i - 1][j - 1] === color && colorGrid[i - 1][j - 2] === color)
							|| (j + 2 < size && i - 1 >= 0 && colorGrid[i - 1][j + 1] === color && colorGrid[i - 1][j + 2] === color)
							|| (j - 2 >= 0 && i + 1 < size && colorGrid[i + 1][j - 1] === color && colorGrid[i + 1][j - 2] === color)
							|| (j + 2 < size && i + 1 < size && colorGrid[i + 1][j + 1] === color && colorGrid[i + 1][j + 2] === color))
					{
						statusGrid[i][j] = STATUS.POSSIBLE + (statusGrid[i][j] >= STATUS.SELECTED ? STATUS.SELECTED : 0);
						tmpmv++;
					}
					else
						statusGrid[i][j] = STATUS.NORMAL + (statusGrid[i][j] >= STATUS.SELECTED ? STATUS.SELECTED : 0);
				//}
			}
		}
		nbMoves = tmpmv;
		return nbMoves;
	};

	/**
	 * exchante the position of a and b (a and b are points : { x: X, y: Y } @see populate())
	 * @param a the first point
	 * @param b the second point
	 */
	this.exchange = function(a, b)
	{
		nbMoves = -1;
		var tmp = colorGrid[a.x][a.y];
		colorGrid[a.x][a.y] = colorGrid[b.x][b.y];
		colorGrid[b.x][b.y] = tmp;
		statusGrid[a.x][a.y] = STATUS.NEW;
		statusGrid[b.x][b.y] = STATUS.NEW;
	};

	/**
	 * select or not the ginven diamond
	 * @param pos the position of the point in the grid (Point)
	 * @param selected a boolean telling if we must select the item (true) or not (false)
	 */
	this.setSelected = function(pos, selected)
	{
		if (statusGrid[pos.x][pos.y] !== STATUS.HOLE)
		{
			if (selected && statusGrid[pos.x][pos.y] < STATUS.SELECTED)
				statusGrid[pos.x][pos.y] += STATUS.SELECTED;
			else if (!selected && statusGrid[pos.x][pos.y] >= STATUS.SELECTED)
				statusGrid[pos.x][pos.y] -= STATUS.SELECTED;
		}
	};

	/**
	 * @return true if the element is selected
	 * @param pos the position of the point in the grid (Point)
	 * @warning you *must* use this method to know if an element is selected!
	 */
	this.isSelected = function(pos)
	{
		return statusGrid[pos.x][pos.y] >= STATUS.SELECTED;
	};

	/**
	 * @return the color at the given place
	 * @param pos the position of the point in the grid (Point)
	 */
	this.getColorAt = function (pos)
	{
		return colorGrid[pos.x][pos.y];
	};
	
	/**
	 * @return the status at the given place
	 * @param pos the position of the point in the grid (Point)
	 */
	this.getStatusAt = function (pos)
	{
		return statusGrid[pos.x][pos.y];
	};

	/** @return the size of the grid */
	this.getSize = function() { return size; };

	/** @return the number of possible moves */
	this.getMovesNumber = function() { return nbMoves; };

	this.toString = function()
	{
		var i, j, str = "grid: " + size + " * " + size + "\ncolor\t\tstatus";

		for (i = 0; i < size; i++)
		{
			str += "\n";
			for (j = 0; j < size; j++)
				str += colorGrid[i][j] + " ";
			str += "\t";
			for (j = 0; j < size; j++)
				str += statusGrid[i][j] + " ";
		}
		return str;
	};

	// on initialise les grids
	this.initialize();
}
