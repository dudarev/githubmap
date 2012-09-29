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
        var self = this;
        // calculate tiles maps
        
        var urls = new Array(rmap.config.tiles_location + "0/0-0.json");
        
        dojo.xhrGet(
        {
            url : urls[0],
            
            Z: 0,
            
            X: 0,
            
            Y: 0,
            
            //the relative URL
            // Run this function if the request is successful
            load : function(response, ioArgs) {
                var points = dojo.fromJson(response);
                if (! dojo.isArray(points)) {
                    return;
                }
                // HAS TILE check
                var tile = new rmap.Tile(self, points, ioArgs.args.Z, ioArgs.args.X, ioArgs.args.Y);
                self.tiles[ioArgs.args.Z] = self.tiles[ioArgs.args.Z] || {};
                self.tiles[ioArgs.args.Z][ioArgs.args.X.toString() + "-" + ioArgs.args.Y.toString()] = tile;
                //                console.log(self.tiles, tile);
                
                var ts = [tile];
                // get tile maps
                var points = {};
                
                // get points from tile maps
                for( var i=0; i < ts.length; i++) {
                    for( var j=0; j < ts[i].points_links.length; j++) {
                        if (points[ts[i].points_links[j]] == undefined) {
                            points[ts[i].points_links[j]] = self.points[ts[i].points_links[j]]
                        }
                    }
                };
                
                // callback
                callback(z, bound_box, points);
                
            },
            // Run this function if the request is not successful
            error : function(response, ioArgs) {}
        });
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
    
    this.word = {
        Z: 0,
        Z_MAX: null,
        XTL: -1,
        YTL: 1,
        XBR: 1,
        YBR: -1,
        scale: null
    }
    
    /**
     * Mouse pressed
     */
    this.pressed = false;
    
    /**
     * Draw current map
     */
    this.draw = function() {
        var guid, coords, ctx = this.getContext();
        
        ctx.strokeStyle="#000000";
        ctx.fillStyle="#FF0000";
        
        for (guid in this.points) {
            coords = this.translateCoords(this.points[guid].x, this.points[guid].y, this.points[guid].radius);
            ctx.beginPath();
            console.log(coords);
            ctx.arc(coords.x, coords.y, coords.radius, 0 * Math.PI/180, 360 * Math.PI/180);
            ctx.stroke();
            ctx.fill();
//            console.log(this.points[guid], this.translateCoords(this.points[guid].x, this.points[guid].y, this.points[guid].radius));
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
        this.initBoudBoxScale();
        
    };
    
    this.initBoudBoxScale = function() {
        this.word.scale = (2 * Math.pow(2,  this.word.Z)) / (this.dim.width > this.dim.height ? this.dim.height : this.dim.width);
    //        this.dim.width > this.dim.height
    }
    
    /**
     * Return 2D canvas context
     */
    this.getContext = function() {
        return this.canvas.getContext("2d");
    }

    /**
     * callback when map loads boud box data
     */
    this.mapLoadedCallback = function(Z, bound_box, points) {
        console.log(arguments);
        this.points = points;
        this.word.Z = Z;
        this.draw();
    };
    
        
    /**
     * Start application
     */
    this.start = function() {
        this.map.loadPoints(0, {
            xtr: -1, 
            ytr: -1, 
            xbr: 1, 
            ybr:1
        }, function(me){
            return function() {
                me.mapLoadedCallback.apply(me, arguments)
            }
        }(this));
    };
    
    /**
     * Translate point coordinates to the current canvas coords
     * @returns {x: canvas_x, y: canvas_y, radius: canvas_r}
     */
    this.translateCoords = function(x, y, radius) {
        return  {
            x: Math.round((x - (-1 - this.word.XTL) + 1 )/ this.word.scale) ,
            y: Math.round(((y - (1 - this.word.YTL) - 1) * -1 )/ this.word.scale),
            radius: Math.round(radius/this.word.scale)
        }
    }
    
    // EVENT listeners
    
    /**
     * Canvas clicked
     */
    this.onDown = function() {
        //        console.log("down")
        this.pressed = true;
    };
    
    this.onRelease = function() {
        //        console.log("release")
        this.pressed = false;
    };
    
    this.onClick = function() {
    //        console.log("click")
    };
    
    this.onMove = function () {
        if (this.pressed) {
        // DRAGGED
        }
    };
    
    // INIT //
    this.canvas.addEventListener("click", this.onClick);
    this.canvas.addEventListener("mousemove", this.onMove);
    this.canvas.addEventListener("mousedown", this.onDown);
    this.canvas.addEventListener("mouseup", this.onRelease);
    this.initDimentions();
};

dojo.addOnLoad("dojo/rady", function() {
    app = new rmap.App();
    app.start();
});