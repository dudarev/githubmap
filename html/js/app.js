// namespace
var rmap = rmap || {};

// Application instance
var app = null;

rmap.config = {
    tiles_location: '../base/'
};

/**
 * Represents POINT data
 */
rmap.Point = function(conf) {
    this.guid = conf.guid;
    this.name = conf.name;
    this.url = conf.url == undefined ? null : conf.url;
    this.color = conf.color == undefined ? null : conf.color;
    this.x = conf.x;
    this.y = conf.y;
    this.radius = conf.r;

    /**
     * numver of linked tiles
     */
    this.links = 1;
    
    this.plusLink = function() {
        this.links += 1;
    }
    
    this.minuxLink = function() {
        this.links += 1;
    }
};

/**
 * Represents tile object
 */
rmap.Tile = function(map, points, z, x, y) {
   
    this.location = {
        z: z,
        x: x,
        y: y
    }
    
    this.points_links = new Array();
    
    // Set points
    for(var i = 0; i < points.length; i++) {
        var p = map.addPoint(points[i], this);
        this.points_links[this.points_links.length] = p.guid;
    }
    
};
    
rmap.Map = function() {
    
    this.points = {};
    
    /**
     * Tiles structure
     * 
     * this.tiles[Z]['X-Y']
     *
     */
    this.tiles = {
        '0': {}
    };
    
    /**
     * Add point to the storage
     * If point exist add +1 link
     */
    this.addPoint = function(point_data, linked_tile) {
        var p = new rmap.Point(point_data);
        
        if (this.points[p.guid] == undefined) {
            this.points[p.guid] = p;
        } else {
            this.points[p.guid].plusLink();
        }
        return this.points[p.guid];
    }
    
    /**
     * return points array to draw
     *
     *  @param bound_box: {xtl: top_lef, ytl: top_left, xbr: bot_rigth, ybr:bot_right}
     */
    this.loadPoints = function(z, bound_box, callback) {
        //        console.log("IBB", bound_box)
        var self = this,
        box_scale = Math.pow(2, z),
        x_from = Math.floor((1 + bound_box.xtl)*box_scale),
        y_from = Math.floor((1 + bound_box.ybr)*box_scale),
        x_to = Math.ceil((1 + bound_box.xbr)*box_scale),
        y_to = Math.ceil((1 + bound_box.ytl)*box_scale),
        tiles_to_load = new Array(),
        tiles_response = new Array();
        
        if (x_from < 0) {
            x_from = 0;
        }
        
        if(y_from < 0) {
            y_from = 0;
        }
        
        if (x_to > box_scale -1) {
            x_to = box_scale -1;
        }
        if (y_to > box_scale -1) {
            y_to = box_scale -1;
        }
        
        
        //        console.log("scale", x_from, y_from, x_to, y_to);
        
        var loader =  function(loader) {
            var tile = tiles_to_load.shift();
            if (tile == undefined) {
                var points = {};
                // get points from tile maps
                for( var i=0; i < tiles_response.length; i++) {
                    for( var j=0; j < tiles_response[i].points_links.length; j++) {
                        if (points[tiles_response[i].points_links[j]] == undefined) {
                            points[tiles_response[i].points_links[j]] = self.points[tiles_response[i].points_links[j]]
                        }
                    }
                };
                // callback
                callback(z, bound_box, points);
                return;
            }
            
            if (self.tiles[tile.z] != undefined && self.tiles[tile.z][tile.x.toString() + "-" + tile.y.toString()] != undefined) {
                tiles_response[tiles_response.length] = self.tiles[tile.z][tile.x.toString() + "-" + tile.y.toString()];
                loader(loader);
            } else {
                dojo.xhrGet(
                {
                    url : rmap.config.tiles_location + tile.z.toString() + "/" +tile.x.toString() + "-"+ tile.y.toString() +".json",
                    Z: tile.z,
                    X: tile.x,
                    Y: tile.y,
            
                    load : function(response, ioArgs) {
                        var points = dojo.fromJson(response);
                        if (! dojo.isArray(points)) {
                            loader(loader);
                        }
                        
                        // FIXME: HAS TILE check
                        var tile = new rmap.Tile(self, points, ioArgs.args.Z, ioArgs.args.X, ioArgs.args.Y);
                        self.tiles[ioArgs.args.Z] = self.tiles[ioArgs.args.Z] || {};
                        self.tiles[ioArgs.args.Z][ioArgs.args.X.toString() + "-" + ioArgs.args.Y.toString()] = tile;
                        tiles_response[tiles_response.length] = self.tiles[ioArgs.args.Z][ioArgs.args.X.toString() + "-" + ioArgs.args.Y.toString()];
                        loader(loader);
                    },
                    
                    error : function(response, ioArgs) {
                        loader(loader);
                    }
                });
            }
        };
        
        
        for (var x=x_from; x<=x_to; x++) {
            for (var y=y_from; y<=y_to; y++) {
                tiles_to_load[tiles_to_load.length] = {
                    'z': z, 
                    'x': x, 
                    'y': y
                };
            }
        }
        
        loader(loader);
    // calculate tiles maps in bound_box
    }
};


/**
 * Appllication class
 * handle events, map scale and other common staff
 */
rmap.App = function() {
    
    /**
     * Canvas element
     */
    this.canvas = document.getElementById("rmap");
    
    this.map = new rmap.Map();
    
    /**
     * Canvas dimentions
     */
    this.dim = null;
    
    /**
     * points to draw
     */
    this.points = {}
    
    this.world = {
        Z: 0,
        Z_MAX: 1,
        XTL: -1,
        YTL: 1,
        XBR: 1,
        YBR: -1,
        X: 0,
        Y: 0,
        scale: null,
        offsetX: 0,
        offsetY: 0
    }
    
    /**
     * Mouse pressed
     */
    this.pressed = false;
    
    //{x:0, y:0};
    this.last_mouse_pos = null;
    
    /**
     * Draw current map
     */
    this.draw = function() {
        var guid, coords, ctx = this.getContext();
        
        
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0,0,this.dim.width, this.dim.height);
        
        //        ctx.fillStyle = "#00FF00";
        //        ctx.fillRect(-150, -150, 100, 100);
        
        ctx.strokeStyle="#000000";
        ctx.fillStyle="#FF0000";
        
        for (guid in this.points) {
            coords = this.translateCoords(this.points[guid].x, this.points[guid].y, this.points[guid].radius);
            ctx.beginPath();
            ctx.arc(coords.x, coords.y, coords.radius, 0 * Math.PI/180, 360 * Math.PI/180);
            ctx.stroke();
            ctx.fill();
        }
    }
        
    /**
     * init canvas dimentions
     */
    this.initDimentions = function() {
        this.dim = {
            width: this.canvas.clientWidth,
            height: this.canvas.clientHeight
        };
        this.world.scale = this.getBoudBoxScale(this.world.Z);
        if (this.dim.width / this.dim.height != 1) {
            if (this.dim.width > this.dim.height) {
                this.world.offsetX = Math.round((this.dim.width - this.dim.height)/2);
            } else {
                this.world.offsetY = Math.round((this.dim.height - this.dim.width)/2);
            }
        }
    };
    
    /**
     * Return bound box scale for this Z
     */
    this.getBoudBoxScale = function(z) {
        return ((2*Math.pow(2,  z))/(this.dim.width > this.dim.height ? this.dim.height : this.dim.width) );
    }
    
    /**
     * Return 2D canvas context
     */
    this.getContext = function() {
        return this.canvas.getContext("2d");
    }
    
    /**
     * Generate bound box for current zoom according to world params
     * Return bound box in data coordinates
     * 
     * @param z: World zoom
     * @param x: world x position
     * @param y: world y position
     */
    this.getBoundBox = function(z, x, y) {
        var scale = this.getBoudBoxScale(z);
        return {
            xtl: x - (this.dim.width/2 * scale), 
            ytl: y + (this.dim.height/2 * scale), 
            xbr: x + (this.dim.width/2 * scale), 
            ybr: y - (this.dim.height/2 * scale) 
        }
    }

    /**
     * Load data from MAP
     */
    this.mapLoad = function(z, bb) {
        this.map.loadPoints(z, bb, function(me){
            return function() {
                me.mapLoadedCallback.apply(me, arguments)
            }
        }(this));
    }

    /**
     * callback when map loads boud box data
     */
    this.mapLoadedCallback = function(Z, bound_box, points) {
        //        console.log("CB", arguments)
        this.points = points;
        this.world.Z = Z;
        this.world.XTL = bound_box.xtl;
        this.world.YTL = bound_box.ytl;
        this.world.XBR = bound_box.xbr;
        this.world.YBR = bound_box.ybr;
        this.world.X = bound_box.xtl + Math.abs((bound_box.xbr - bound_box.xtl)/2);
        this.world.Y = bound_box.ybr + Math.abs((bound_box.ytl - bound_box.ybr)/2);
        this.world.scale = this.getBoudBoxScale(Z);
        this.draw();
    };
    
    /**
     * Move to selected position and zoom
     */
    this.move = function(x, y, z) {
        //        console.log("MOVE", arguments)
        if (z == undefined) {
            z = this.world.Z;
        }
        this.mapLoad(z, this.getBoundBox(z, x, y));
    }
        
    /**
     * Start application
     */
    this.start = function() {
        this.mapLoad(0, {
            xtl: this.world.XTL - (this.world.offsetX * this.world.scale), 
            ytl: this.world.YTL - (this.world.offsetY *this.world.scale),
            xbr: this.world.XBR + (this.world.offsetX * this.world.scale), 
            ybr: this.world.YBR + (this.world.offsetY * this.world.scale)
        });
    };
    
    /**
     * Translate point coordinates to the current canvas coords
     * @returns {x: canvas_x, y: canvas_y, radius: canvas_r}
     */
    this.translateCoords = function(x, y, radius) {
        
        //        console.log("Scale", arguments);
        var res = {
            x: Math.round((x- this.world.XTL) / this.world.scale) + this.world.offsetX ,
            y: Math.round((this.world.YTL - y)/ this.world.scale) + this.world.offsetY,
            radius: Math.round(radius / this.world.scale)
        }
        return res;
    }
    
    /**
     * Translate point coordinates from canvas to the world
     * @returns {x: canvas_x, y: canvas_y, radius: canvas_r}
     */
    this.translateCoordsW = function(x, y) {
        //        console.log("Scale", arguments);
        var res = {
            x: (x-this.world.offsetX)*this.world.scale + this.world.XTL ,
            y: (y-this.world.offsetY)*this.world.scale - this.world.YTL
        }
        //        console.log("ScaleRes", res);
        return res;
    }
    
    this.zoomIn = function(x, y) {
        var z = this.world.Z < this.world.Z_MAX ? this.world.Z +1 : this.world.Z;
        if (x == undefined || y == undefined) {
            x = this.world.XTL + Math.abs(this.world.XTL - this.world.XBR) / 2;
            y = this.world.YTL - Math.abs(this.world.YTL - this.world.YBR) / 2;
        }
        this.move(x, y, z);
    };
    
    this.zoomOut = function(x, y) {
        var z = this.world.Z > 0 ? this.world.Z - 1 : 0;
        if (x == undefined || y == undefined) {
            x = this.world.XTL + Math.abs(this.world.XTL - this.world.XBR) / 2;
            y = this.world.YTL - Math.abs(this.world.YTL - this.world.YBR) / 2;
        }
        this.move(x, y, z);
    };
    
    // EVENT listeners
    
    this.onClick = function() {
    //        console.log("click")
    };
    
    this.onDbClick = function(e) {
        var cords = this.translateCoordsW(e.clientX, e.clientY);
         
        console.log("click", cords);
    };
    
    /**
     * Canvas clicked
     */
    this.onDown = function() {
        //        console.log("down")
        this.pressed = true;
    };
    
    this.onOut = function() {
        this.pressed = false;
    }
    
    this.onMove = function (event) {
        var ppos = this.last_mouse_pos;
        this.last_mouse_pos = {
            x: event.offsetX,  
            y: event.offsetY
        };
        
        if (ppos == undefined ) {
            return;
        }
        
        if (this.pressed) {
            this.move(
                this.world.X + (ppos.x - this.last_mouse_pos.x) * this.world.scale, 
                this.world.Y - (ppos.y - this.last_mouse_pos.y) * this.world.scale, 
                this.world.Z);
        }
    };
    
    this.onRelease = function() {
        //        console.log("release")
        this.pressed = false;
    };
    
    
    // INIT //
    this.canvas.addEventListener("click", this.onClick);
    this.canvas.addEventListener("dblclick", function(self) {
        return function() {
            self.onDbClick.apply(self, arguments);
        }
    }(this));
    this.canvas.addEventListener("mousemove", function(self) {
        return function() {
            self.onMove.apply(self, arguments);
        }
    }(this));
    this.canvas.addEventListener("mousedown", function(self) {
        return function() {
            self.onDown.apply(self, arguments);
        }
    }(this));
    this.canvas.addEventListener("mouseout", function(self) {
        return function() {
            self.onOut.apply(self, arguments);
        }
    }(this));
    this.canvas.addEventListener("mouseup", function(self) {
        return function() {
            self.onRelease.apply(self, arguments);
        }
    }(this));
    
    document.getElementById("zoomin").addEventListener('click', function(self) {
        return function() {
            self.zoomIn();
        }
    }(this));
    
    document.getElementById("zoomout").addEventListener('click', function(self) {
        return function() {
            self.zoomOut();
        }
    }(this));
    
    this.initDimentions();
};

dojo.addOnLoad("dojo/ready", function() {
    app = new rmap.App();
    app.start();
});