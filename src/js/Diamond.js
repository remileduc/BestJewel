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
 * Represent a diamond
 * @param colour the color of the diamond (COLOR.SOMETHING)
 * @param image the image representation of the diamond
 */
function Diamonds (colour, image)
{
	var color = colour;
	var size = 0;
	var position = { x: 0, y: 0 };
	var sprite = image;

	/**
	 * print the diamond at the given position
	 * @param context the context in which we want to draw
	 */
	this.draw = function(context)
	{
		if (typeof sprite == "string")
		{
			context.beginPath();
			context.fillStyle = sprite;
			context.arc(position.x, position.y, size / 2, 0, Math.PI * 2);
			context.fill();
		}
		else
		{
			context.drawImage(sprite, position.x - size / 2, position.y - size / 2, size, size);
		}
	};

	/** @return the color of the object */
	this.getColor = function() { return color; };

	/** @return the size of the object */
	this.getSize = function() { return size; };

	/**
	 * @param taille the new size
	 */
	this.setSize = function(taille) { size = taille; };

	/** @return the position (center of the diamond) */
	this.getPosition = function() { return position; };

	/**
	 * @param pos the new position. This must be the center of the diamond
	 */
	this.setPosition = function(pos) { position = pos; };

	/** @return the color of the object */
	this.getSprite = function() { return sprite; };
}
