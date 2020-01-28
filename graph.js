var canvas, ctx;
var tileList = [];
var searchableTileList = [];
var imageData;
var obstructions = [];
var mouseHeld = false;
var showFullSearch = false;
var lastClicked;

var color = {
	WHITE: "rgba(255, 255, 255, 1)",
	BLACK: "rgba(0, 0, 0, 1)",
	RED: "rgba(237, 28, 36, 1)"
};

/* Important coordinates:
Lumby spawn 410 685
Varrock fountain 400 475
Draynor 293 639
Draynor Manor 296 573
*/

/* Walkability directions:
   0   1   2
	 3       5
	 6   7   8
*/
var dir = {
	NW: 0,
	N: 1,
	NE: 2,
	W: 3,
	E: 5,
	SW: 6,
	S: 7,
	SE: 8
};

var dirdxdy = [
 [-1, -1],
 [0, -1],
 [1, -1],
 [-1, 0],
 [0, 0],
 [1, 0],
 [-1, 1],
 [0, 1],
 [1, 1],
];

class Tile {
	constructor(pixels, x, y) {
		this.x = x || -1;
		this.y = y || -1;
		this.walkable = new Uint8Array(9);
		this.highlighted = false;

		for (var i = 0; i < 9; i++) {
			this.walkable[i] = 1;
		}
		if (pixels.includes(color.RED)) {
			// not a node
			return;
		}
		for (var i = 1; i < 9; i+=2) {
			this.walkable[i] = pixels[i] === color.WHITE;
		}

		tileList.push(this);
		searchableTileList[Math.floor(y / 3) * 10000 + Math.floor(x/3)] = this;

	}

	paint() {
			var data = new Uint8ClampedArray(36);

			for (var i = 0; i < 9; i++) {
					for (var k = 0; k < 3; k++) {
						if (this.walkable[i]) {
							data[i*4+k] = 64 * k;
						} else {
							data[i*4+k] = 64 * (3-k)
						}
					}
					data[i*4+3] = 255;
			}
			this.imageData = ctx.createImageData(3, 3);
			this.imageData.data.set(data);
	}

	applyInvisibleCollision() {

		for (var i = 1; i < 9; i+=2) {
			if (i === 4) continue;
			var x = this.x + 3 * dirdxdy[i][0];
			var y = this.y + 3 * dirdxdy[i][1];
			var neighbor = searchableTileList[Math.floor(y / 3) * 10000 + Math.floor(x/3)];
			if (neighbor === undefined) {
				this.walkable[i] = 0;
			} else if (!this.walkable[i]) {
				var convert = [ -1, 7, -1, 5, -1, 3, -1, 1, -1 ];
				neighbor.walkable[convert[i]] = 0;
			}
		}
	}

	applyInvisibleCorners() {
		for (var i = 0; i < 9; i+=2) {
			if (i === 4) continue;
			var x = this.x + 3 * dirdxdy[i][0];
			var y = this.y + 3 * dirdxdy[i][1];
			var neighbor = searchableTileList[Math.floor(y / 3) * 10000 + Math.floor(x/3)];
			if (neighbor === undefined) {
				this.walkable[i] = 0;
			} else if (!this.walkable[i]) {
				var convert = [ 8, -1, 6, -1, -1, -1, 2, -1, 0 ];
				neighbor.walkable[convert[i]] = 0;
			}
		}
	}

	fillDiagonals() {
		this.walkable[0] = (this.walkable[1] && this.walkable[3]) && this.walkable[0];
		this.walkable[2] = (this.walkable[1] && this.walkable[5]) && this.walkable[2];
		this.walkable[4] = this.walkable[1] || this.walkable[3] || this.walkable[5] || this.walkable[7];
		this.walkable[6] = (this.walkable[7] && this.walkable[3]) && this.walkable[6];
		this.walkable[8] = (this.walkable[7] && this.walkable[5]) && this.walkable[8];
	}

	draw() {
		ctx.putImageData(this.imageData, this.x, this.y);
	}

	onHover() {
		this.highlight(240, 22, 22, 255);
		this.draw();
		this.highlighted = true;
	}

	highlight(r, g, b, a) {
		if (this.highlighted) return;

		var data = this.imageData.data;
		for (var i = 0; i < 9; i++) {
			if (!this.walkable[i]) {

			} else {
				data[i*4] = r;
				data[i*4+1] = g;
				data[i*4+2] = b;
				data[i*4+3] = a | 256;
			}
		}
		this.imageData.data.set(data);
	}

	getNeighbors() {
		var neighbors = [];
		for (var i = 0; i < 9; i++) {
			if (i === 4) continue;
			if (!this.walkable[i]) continue;
			var x = this.x + 3 * dirdxdy[i][0];
			var y = this.y + 3 * dirdxdy[i][1];
			var neighbor = searchableTileList[Math.floor(y / 3) * 10000 + Math.floor(x/3)];
			if (neighbor !== undefined) {
				neighbors.push(neighbor);
			}
		}
		return neighbors;
	}
}

window.onload = function() {
	canvas = document.getElementById("canvas");
	ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = false;


	loadImageMap('map_trimmed');
  imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
	loadMap();


	canvas.addEventListener('mousemove', e => {
		if (mouseHeld) {

		}
	})

	canvas.addEventListener('mousedown', e => {
		mouseHeld = true;
		var rect = canvas.getBoundingClientRect();
		var x = Math.floor(e.clientX - rect.left);
		var y = Math.floor(e.clientY - rect.top);
		var tile = findTileFromCoords(x, y);
		if (tile !== undefined) {
			if (tile.walkable[4] === 0) {
				lastClicked = undefined;
			} else if (lastClicked !== undefined) {
				findShortestPath(lastClicked.x, lastClicked.y, tile.x, tile.y);
			}
			lastClicked = tile;
			//console.log(Math.floor(tile.x/3) + " " + Math.floor(tile.y/3));

		}
	});

	canvas.addEventListener('mouseup', e => {
		mouseHeld = false;
	});

	main();
	//setInterval(main, 1/60 * 1000);
}

function main() {
	//update

	//render
	ctx.fillStyle = color.WHITE;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	//drawGrid();

	drawAllTiles();

	ctx.globalAlpha = 0.5;
	loadImageMap('colormap', -35, -13);
	ctx.globalAlpha = 1;
}

function findShortestPath(x1, y1, x2, y2) {
	var start = findTileFromCoords(x1, y1);
	var end = findTileFromCoords(x2, y2);
	if (start === undefined || end === undefined) {
		console.log("invalid start/end");
		return;
	}
	var touchedTiles = [];
	start.highlight(255, 128, 0, 255);
	start.draw();
	end.highlight(0, 255, 128, 255);
	end.draw();

	var options = new BinaryHeap(function(x) { return distanceBetweenTiles(end, x) + x.weight });
	options.push(start);
	start.weight = 0;
	touchedTiles.push(start);
	var runs = 0;
	while (options.size() !== 0 && runs < 100000) {
		runs++;
		var currOptions = [options.pop()];
		var currScore = options.score(currOptions[0]);
		while (options.size() !== 0 && options.score(options.peek()) === currScore) {
			currOptions.push(options.pop());
		}

		for (var i = 0; i < currOptions.length; i++) {
			curr = currOptions[i];
			curr.used = true;
			if (showFullSearch) { curr.highlight(0, 255, 0); curr.draw(); }
			if (curr === end) {
				console.log(curr.weight);
				var r = getRandomColor();
				var g = getRandomColor();
				var b = getRandomColor();
				while (curr !== undefined) {
					curr.highlight(r, g, b); curr.draw();
					curr = curr.prev;
				}
				touchedTiles.forEach((t)=> {
					t.weight = undefined;
					t.prev = undefined;
					t.used = undefined;
				});
				return;
			}

			curr.getNeighbors().forEach(t=>{
				if (t.weight === undefined) {
					touchedTiles.push(t);
					t.weight = curr.weight + 1000;
					options.push(t);
					if (showFullSearch) { t.highlight(255, 0, 0); t.draw();}
					t.prev = curr;
				} else if (!t.used && t.weight > curr.weight) {
					t.weight = curr.weight + 1000;
		 			if (showFullSearch) { t.highlight(255, 0, 0); t.draw(); }
					t.prev = curr;
				}
			});
		}
	}
	console.log(runs)
	touchedTiles.forEach((t)=> {
		t.weight = undefined;
		t.prev = undefined;
		t.used = undefined;
	});




}

function distanceBetweenTiles(tile1, tile2) {
	//return (tile1.x - tile2.x) * (tile1.x - tile2.x) + (tile1.y - tile1.y) * (tile1.y * tile2.y);
	var dx = Math.abs(tile2.x - tile1.x);
	var dy = Math.abs(tile2.y - tile1.y);
	return Math.max(dx, dy);
}

function findTileFromCoords(x, y) {
	return searchableTileList[Math.floor(y / 3) * 10000 + Math.floor(x/3)];
}

function coord(x, y) {
	return [x*3, y*3];
}

function saveTileListAsJSON() {
	console.log(JSON.stringify(tileList));
}

function drawAllTiles() {
	tileList.forEach((t)=>{
		t.draw();
	});
}

function fixCollision() {
	tileList.forEach((t)=>{
		t.applyInvisibleCollision();
	});
}

function loadImageMap(name, x, y) {
	var map = document.getElementById(name);
	ctx.drawImage(map, x | 0, y | 0);
}

function getRandomColor() {
	return Math.floor(Math.random() * 256);
}

function loadMap() {
	for (var i = 1; i < canvas.width; i += 3) {
		for (var j = 0; j < canvas.height; j += 3) {
			loadTile(i, j);
		}
	}
	tileList.forEach((t)=>{
		t.applyInvisibleCollision();
	});
	tileList.forEach((t)=>{
		t.fillDiagonals();
	});
	tileList.forEach((t)=>{
		t.applyInvisibleCorners();
	});
	tileList.forEach((t)=>{
		t.paint()
	});

	drawAllTiles();
}

function loadTile(i, j) {
	new Tile([getPixelRGBA(i, j), getPixelRGBA(i + 1, j), getPixelRGBA(i + 2, j),
														getPixelRGBA(i, j + 1),
														getPixelRGBA(i + 1, j + 1),
														getPixelRGBA(i + 2, j + 1),
														getPixelRGBA(i, j + 2), getPixelRGBA(i + 1, j + 2), getPixelRGBA(i + 2, j + 2)],
														i, j);
}

function getPixelRGBA(x, y) {
	var data = fasterGetImageData(x, y);
	return "rgba(" + data[0] + ", "
								 + data[1] + ", "
								 + data[2] + ", "
								 + data[3] / 255 + ")";
}

function fasterGetImageData(x, y) {
	var spot = (x + y * canvas.width) * 4;
	return imageData.slice(spot, spot + 4);
}

function RGBAtoArray(RGBA) {
		return RGBA.substring(5, RGBA.length - 1).split(', ');
}

/*
function test() {

	var buffer = new ArrayBuffer(1);
	var view = new DataView(buffer);



	console.time('test');
	array = new Int8Array(36);
	for (var i = 0; i < 100000; i++) {
		array.fill(1);
	}
	console.timeEnd('test');

	console.time('test');
	array = new Uint8ClampedArray(36);
	for (var i = 0; i < 100000; i++) {
		array.fill(1);
	}
	console.timeEnd('test');

}*/




// youinked from https://eloquentjavascript.net/1st_edition/appendix2.html
function BinaryHeap(scoreFunction){
  this.content = [];
  this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
	score: function(element) {
		return this.scoreFunction(element);
	},

	peek: function(element) {
		return this.content[0];
	},

  push: function(element) {
    // Add the new element to the end of the array.
    this.content.push(element);
    // Allow it to bubble up.
    this.bubbleUp(this.content.length - 1);
  },

  pop: function() {
    // Store the first element so we can return it later.
    var result = this.content[0];
    // Get the element at the end of the array.
    var end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it sink down.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.sinkDown(0);
    }
    return result;
  },

  remove: function(node) {
    var length = this.content.length;
    // To remove a value, we must search through the array to find
    // it.
    for (var i = 0; i < length; i++) {
      if (this.content[i] != node) continue;
      // When it is found, the process seen in 'pop' is repeated
      // to fill up the hole.
      var end = this.content.pop();
      // If the element we popped was the one we needed to remove,
      // we're done.
      if (i == length - 1) break;
      // Otherwise, we replace the removed element with the popped
      // one, and allow it to float up or sink down as appropriate.
      this.content[i] = end;
      this.bubbleUp(i);
      this.sinkDown(i);
      break;
    }
  },

  size: function() {
    return this.content.length;
  },

  bubbleUp: function(n) {
    // Fetch the element that has to be moved.
    var element = this.content[n], score = this.scoreFunction(element);
    // When at 0, an element can not go up any further.
    while (n > 0) {
      // Compute the parent element's index, and fetch it.
      var parentN = Math.floor((n + 1) / 2) - 1,
      parent = this.content[parentN];
      // If the parent has a lesser score, things are in order and we
      // are done.
      if (score >= this.scoreFunction(parent))
        break;

      // Otherwise, swap the parent with the current element and
      // continue.
      this.content[parentN] = element;
      this.content[n] = parent;
      n = parentN;
    }
  },

  sinkDown: function(n) {
    // Look up the target element and its score.
    var length = this.content.length,
    element = this.content[n],
    elemScore = this.scoreFunction(element);

    while(true) {
      // Compute the indices of the child elements.
      var child2N = (n + 1) * 2, child1N = child2N - 1;
      // This is used to store the new position of the element,
      // if any.
      var swap = null;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        var child1 = this.content[child1N],
        child1Score = this.scoreFunction(child1);
        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore)
          swap = child1N;
      }
      // Do the same checks for the other child.
      if (child2N < length) {
        var child2 = this.content[child2N],
        child2Score = this.scoreFunction(child2);
        if (child2Score < (swap == null ? elemScore : child1Score))
          swap = child2N;
      }

      // No need to swap further, we are done.
      if (swap == null) break;

      // Otherwise, swap and continue.
      this.content[n] = this.content[swap];
      this.content[swap] = element;
      n = swap;
    }
  }
};
