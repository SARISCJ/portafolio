/**
 * Canvas Experiment
 */
function Animate(canvas, options) {
  this.canvas = canvas;
  this.options = defaults(options || {}, this.options);
  this.init();
}

Animate.prototype.options = {
  density: 10, // Affects how many poitns are created
  speed: 10, // Time in seconds to shift points
  sync: false, // Should points move in sync
  distance: 100, // Distance to move points
  lineColor: '255, 255, 255',
  circleColor: '255, 255, 255',
  radius: 20,
  lineWidth: 1,
  lines: 3,  // Number of closest lines to draw
  updateClosest : false, // Update closet points each loop
  mouse: true, // Link to mouse or random

};

/**
 * Setup everything
 */
Animate.prototype.init = function(){
  this.width = window.innerWidth;
  this.height = window.innerHeight;
  this.target = {
    position: {
      x: this.width / 2,
      y: this.height / 2
    }
  };

  // Setup canvas
  this.canvas.width = this.width;
  this.canvas.height = this.height;

  this.ctx = canvas.getContext('2d');

  window.addEventListener('resize', this.resize.bind(this));

  if(this.options.mouse === true && !('ontouchstart' in window) ) {
     window.addEventListener('mousemove', this.mousemove.bind(this));
  }

  this.points = [];
  for(var x = 0; x < this.width; x = x + this.width / this.options.density) {
    for(var y = 0; y < this.height; y = y + this.height/ this.options.density) {
      var point = new Point({
        x: x + Math.random() * this.width/ this.options.density,
        y: y + Math.random() * this.height/this.options.density
      }, this.ctx, this.points.length + 1, this.options);
      this.points.push(point);
    }
  }

  // Setup Circles
  for(var i in this.points) {
    this.points[i].circle = new Circle(this.points[i], this.ctx, this.options);
  }

  this.findClosest(); // Points

  this.animate(); // Start the loop

  this.shiftPoints(); // Start the tween loop

  if(this.options.mouse === false) {
    this.moveTarget(); // Start the random target loop
  }

};

/*
 * Cycles through each Point and finds its neighbors
 */

Animate.prototype.findClosest = function() {
  for(var i = 0; i < this.points.length; i++) {
    // Save the point
    var point = this.points[i];
    // Reset
    point.closest = [];
    // Cycle through the others
    for(var j = 0; j < this.points.length; j++) {
      // Point to test
      var testPoint = this.points[j];
      if(point.id !== testPoint.id) {
        var placed = false, k;
        for (k = 0; k < this.options.lines; k ++) {
          if(!placed) {
            if(typeof point.closest[k] === 'undefined') {
              point.closest[k] = testPoint;
              placed = true;
            }
          }
        }

        for(k = 0; k < this.options.lines; k++){
          if(!placed) {
            if(point.distanceTo(testPoint) < point.distanceTo(point.closest[k])) {
              point.closest[k] = testPoint;
              placed = true;
            }
          }
        }
      }
    }
  }
};

/**
 * Animation Loop
 */
Animate.prototype.animate = function() {
  var i;
  // Should we recalucate closest?
  if(this.options.updateClosest) {
    this.findClosest();
  }

  // Calculate Opacity
  for(i in this.points) {
    if(this.points[i].distanceTo(this.target, true) < 5000) {
       this.points[i].opacity = 0.4;
       this.points[i].circle.opacity = 0.6;
    } else if (this.points[i].distanceTo(this.target, true) < 10000) {
       this.points[i].opacity = 0.2;
       this.points[i].circle.opacity = 0.3;
    } else if (this.points[i].distanceTo(this.target, true) < 30000) {
       this.points[i].opacity = 0.1;
       this.points[i].circle.opacity = 0.2;
    } else {
       this.points[i].opacity = 0.05;
       this.points[i].circle.opacity = 0.05;
    }
  }
   // Clear
  this.ctx.clearRect(0, 0, this.width, this.height);
  for(i in this.points) {

    this.points[i].drawLines();
    this.points[i].circle.draw();
  }
 // Loop
 window.requestAnimationFrame(this.animate.bind(this));
};

/**
 * Starts each point in tween loop
 */
Animate.prototype.shiftPoints = function() {
  for(var i in this.points) {
    this.points[i].shift();
  }
};


/**
 * Make sure the canvas is the right size
 */
Animate.prototype.resize = function() {
  this.width = window.innerWidth;
  this.height = window.innerHeight;
  this.canvas.width = this.width;
  this.canvas.height = this.height;
};

/**
 * Mouse Move Event - Moves the target with the mouse
 * @param    event   {Object}   Mouse event
 */
Animate.prototype.mousemove = function(event) {
  if(event.pageX || event.pageY) {
    this.target.position.x = event.pageX;
    this.target.position.y = event.pageY;
  } else if(event.clientX || event.clientY) {
    this.target.position.x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
    this.target.position.y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
  }
};

/**
 * Randomly move the target
 */
Animate.prototype.moveTarget = function() {
  var _this = this;
  TweenLite.to(this.target.position, 2, {
    x : (Math.random() * (this.width - 200)) + 100,
    y : (Math.random() * (this.height - 200)) + 100,
    ease: Expo.easeInOut,
    onComplete: function() {
      _this.moveTarget();
    }
  });
};

/**
 * Point Constructor
 * @param    position   {Object}     set of x and u coords
 * @param    ctx        {Object}     Canvas context to draw on
 * @param    options    {Object}     options passed from main function
 */
function Point(position, ctx, id, options) {
  this.options = options || {};
  this.id = id;
  this.ctx = ctx;
  this.position = position || {x: 0, y: 0};
  this.origin = {
    x: this.position.x,
    y: this.position.y
  };
  this.opacity = 0;
  this.closest = [];
}

/**
 * Caluclates the distance to another point
 * @param    point    {Object}    Another Point
 * @param    abs      {Boolean}   Return the absolute value or not
 * @returns  {Number}
 */
Point.prototype.distanceTo = function(point, abs) {
  abs = abs || false;
  var distance = Math.pow(this.position.x - point.position.x, 2) + Math.pow(this.position.y - point.position.y, 2);
  return abs ? Math.abs(distance) : distance;
};

/**
 *  Draws lines to the closet points
 */
Point.prototype.drawLines = function() {
  for(var i in this.closest) {
    if(this.opacity  > 0) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.position.x, this.position.y);
       var test = i + 1;
      if(!this.closest[test]) {
        test = 0;
      }
      this.ctx.lineCap = 'round';
      this.ctx.strokeStyle = 'rgba(' + this.options.lineColor + ', ' + this.opacity + ')';
       this.ctx.lineWidth = this.options.lineWidth;


      this.ctx.lineTo(this.closest[i].position.x, this.closest[i].position.y);

      this.ctx.stroke();
    }
  }
};

/**
 * Tween loop to move each point around it's origin
 */
Point.prototype.shift = function() {
  var _this = this,
       speed = this.options.speed;

  // Random the time a little
  if(this.options.sync !== true) {
    speed -= this.options.speed * Math.random();
  }
  TweenLite.to(this.position, speed, {
    x : (this.origin.x - (this.options.distance/2) + Math.random() * this.options.distance),
    y : (this.origin.y - (this.options.distance/2) + Math.random() * this.options.distance),
    ease: Expo.easeInOut,
    onComplete: function() {
      _this.shift();
    }
  });
};

/**
 * Circle Constructor
 * @param    point   {Object}    Point object
 * @param    ctx     {Object}    Context to draw on
 * @param    options {Object}    options passed from main function
 */
function Circle(point, ctx, options) {
  this.options = options || {};
  this.point = point || null;
  this.radius = this.options.radius || null;
  this.color = this.options.color || null;
  this.opacity = 0;
  this.ctx = ctx;
}


/**
 * Draws Circle to context
 */
Circle.prototype.draw = function() {
  if(this.opacity > 0) {
    this.ctx.beginPath();
    this.ctx.arc(this.point.position.x, this.point.position.y, this.options.radius, 0, 2 * Math.PI, false);
    this.ctx.fillStyle = 'rgba(' + this.options.circleColor + ', ' + this.opacity + ')';
    this.ctx.fill();
  }
};

// Get the balls rolling
new Animate(document.getElementById('canvas'));


/**
 * Utility Function to set default options
 * @param    object    {object}
 * @param    src  {object}
 */
function defaults(object, src) {
  for(var i in src) {
    if(typeof object[i] === 'undefined') {
      object[i] = src[i];
    }
  }
  return object;
}



! function($) {

    "use strict";

    var Typed = function(el, options) {

        // chosen element to manipulate text
        this.el = $(el);

        // options
        this.options = $.extend({}, $.fn.typed.defaults, options);

        // attribute to type into
        this.isInput = this.el.is('input');
        this.attr = this.options.attr;

        // show cursor
        this.showCursor = this.isInput ? false : this.options.showCursor;

        // text content of element
        this.elContent = this.attr ? this.el.attr(this.attr) : this.el.text()

        // html or plain text
        this.contentType = this.options.contentType;

        // typing speed
        this.typeSpeed = this.options.typeSpeed;

        // add a delay before typing starts
        this.startDelay = this.options.startDelay;

        // backspacing speed
        this.backSpeed = this.options.backSpeed;

        // amount of time to wait before backspacing
        this.backDelay = this.options.backDelay;

        // div containing strings
        this.stringsElement = this.options.stringsElement;

        // input strings of text
        this.strings = this.options.strings;

        // character number position of current string
        this.strPos = 0;

        // current array position
        this.arrayPos = 0;

        // number to stop backspacing on.
        // default 0, can change depending on how many chars
        // you want to remove at the time
        this.stopNum = 0;

        // Looping logic
        this.loop = this.options.loop;
        this.loopCount = this.options.loopCount;
        this.curLoop = 0;

        // for stopping
        this.stop = false;

        // custom cursor
        this.cursorChar = this.options.cursorChar;

        // shuffle the strings
        this.shuffle = this.options.shuffle;
        // the order of strings
        this.sequence = [];

        // All systems go!
        this.build();
    };

    Typed.prototype = {

        constructor: Typed

        ,
        init: function() {
            // begin the loop w/ first current string (global self.strings)
            // current string will be passed as an argument each time after this
            var self = this;
            self.timeout = setTimeout(function() {
                for (var i=0;i<self.strings.length;++i) self.sequence[i]=i;

                // shuffle the array if true
                if(self.shuffle) self.sequence = self.shuffleArray(self.sequence);

                // Start typing
                self.typewrite(self.strings[self.sequence[self.arrayPos]], self.strPos);
            }, self.startDelay);
        }

        ,
        build: function() {
            var self = this;
            // Insert cursor
            if (this.showCursor === true) {
                this.cursor = $("<span class=\"typed-cursor\">" + this.cursorChar + "</span>");
                this.el.after(this.cursor);
            }
            if (this.stringsElement) {
                self.strings = [];
                this.stringsElement.hide();
                var strings = this.stringsElement.find('p');
                $.each(strings, function(key, value){
                    self.strings.push($(value).html());
                });
            }
            this.init();
        }

        // pass current string state to each function, types 1 char per call
        ,
        typewrite: function(curString, curStrPos) {
            // exit when stopped
            if (this.stop === true) {
                return;
            }

            // varying values for setTimeout during typing
            // can't be global since number changes each time loop is executed
            var humanize = Math.round(Math.random() * (100 - 30)) + this.typeSpeed;
            var self = this;

            // ------------- optional ------------- //
            // backpaces a certain string faster
            // ------------------------------------ //
            // if (self.arrayPos == 1){
            //  self.backDelay = 50;
            // }
            // else{ self.backDelay = 500; }

            // contain typing function in a timeout humanize'd delay
            self.timeout = setTimeout(function() {
                // check for an escape character before a pause value
                // format: \^\d+ .. eg: ^1000 .. should be able to print the ^ too using ^^
                // single ^ are removed from string
                var charPause = 0;
                var substr = curString.substr(curStrPos);
                if (substr.charAt(0) === '^') {
                    var skip = 1; // skip atleast 1
                    if (/^\^\d+/.test(substr)) {
                        substr = /\d+/.exec(substr)[0];
                        skip += substr.length;
                        charPause = parseInt(substr);
                    }

                    // strip out the escape character and pause value so they're not printed
                    curString = curString.substring(0, curStrPos) + curString.substring(curStrPos + skip);
                }

                if (self.contentType === 'html') {
                    // skip over html tags while typing
                    var curChar = curString.substr(curStrPos).charAt(0)
                    if (curChar === '<' || curChar === '&') {
                        var tag = '';
                        var endTag = '';
                        if (curChar === '<') {
                            endTag = '>'
                        } else {
                            endTag = ';'
                        }
                        while (curString.substr(curStrPos).charAt(0) !== endTag) {
                            tag += curString.substr(curStrPos).charAt(0);
                            curStrPos++;
                        }
                        curStrPos++;
                        tag += endTag;
                    }
                }

                // timeout for any pause after a character
                self.timeout = setTimeout(function() {
                    if (curStrPos === curString.length) {
                        // fires callback function
                        self.options.onStringTyped(self.arrayPos);

                        // is this the final string
                        if (self.arrayPos === self.strings.length - 1) {
                            // animation that occurs on the last typed string
                            self.options.callback();

                            self.curLoop++;

                            // quit if we wont loop back
                            if (self.loop === false || self.curLoop === self.loopCount)
                                return;
                        }

                        self.timeout = setTimeout(function() {
                            self.backspace(curString, curStrPos);
                        }, self.backDelay);
                    } else {

                        /* call before functions if applicable */
                        if (curStrPos === 0)
                            self.options.preStringTyped(self.arrayPos);

                        // start typing each new char into existing string
                        // curString: arg, self.el.html: original text inside element
                        var nextString = curString.substr(0, curStrPos + 1);
                        if (self.attr) {
                            self.el.attr(self.attr, nextString);
                        } else {
                            if (self.isInput) {
                                self.el.val(nextString);
                            } else if (self.contentType === 'html') {
                                self.el.html(nextString);
                            } else {
                                self.el.text(nextString);
                            }
                        }

                        // add characters one by one
                        curStrPos++;
                        // loop the function
                        self.typewrite(curString, curStrPos);
                    }
                    // end of character pause
                }, charPause);

                // humanized value for typing
            }, humanize);

        }

        ,
        backspace: function(curString, curStrPos) {
            // exit when stopped
            if (this.stop === true) {
                return;
            }

            // varying values for setTimeout during typing
            // can't be global since number changes each time loop is executed
            var humanize = Math.round(Math.random() * (100 - 30)) + this.backSpeed;
            var self = this;

            self.timeout = setTimeout(function() {

                // ----- this part is optional ----- //
                // check string array position
                // on the first string, only delete one word
                // the stopNum actually represents the amount of chars to
                // keep in the current string. In my case it's 14.
                // if (self.arrayPos == 5){
                //  self.stopNum = 6;
                // }
                //every other time, delete the whole typed string
                if (self.arrayPos == 6){
                  self.stopNum = 7;
                }
                else{
                  self.stopNum = 0;
                }

                if (self.contentType === 'html') {
                    // skip over html tags while backspacing
                    if (curString.substr(curStrPos).charAt(0) === '>') {
                        var tag = '';
                        while (curString.substr(curStrPos).charAt(0) !== '<') {
                            tag -= curString.substr(curStrPos).charAt(0);
                            curStrPos--;
                        }
                        curStrPos--;
                        tag += '<';
                    }
                }

                // ----- continue important stuff ----- //
                // replace text with base text + typed characters
                var nextString = curString.substr(0, curStrPos);
                if (self.attr) {
                    self.el.attr(self.attr, nextString);
                } else {
                    if (self.isInput) {
                        self.el.val(nextString);
                    } else if (self.contentType === 'html') {
                        self.el.html(nextString);
                    } else {
                        self.el.text(nextString);
                    }
                }

                // if the number (id of character in current string) is
                // less than the stop number, keep going
                if (curStrPos > self.stopNum) {
                    // subtract characters one by one
                    curStrPos--;
                    // loop the function
                    self.backspace(curString, curStrPos);
                }
                // if the stop number has been reached, increase
                // array position to next string
                else if (curStrPos <= self.stopNum) {
                    self.arrayPos++;

                    if (self.arrayPos === self.strings.length) {
                        self.arrayPos = 0;

                        // Shuffle sequence again
                        if(self.shuffle) self.sequence = self.shuffleArray(self.sequence);

                        self.init();
                    } else
                        self.typewrite(self.strings[self.sequence[self.arrayPos]], curStrPos);
                }

                // humanized value for typing
            }, humanize);

        }
        /**
         * Shuffles the numbers in the given array.
         * @param {Array} array
         * @returns {Array}
         */
        ,shuffleArray: function(array) {
            var tmp, current, top = array.length;
            if(top) while(--top) {
                current = Math.floor(Math.random() * (top + 1));
                tmp = array[current];
                array[current] = array[top];
                array[top] = tmp;
            }
            return array;
        }

        // Start & Stop currently not working

        // , stop: function() {
        //     var self = this;

        //     self.stop = true;
        //     clearInterval(self.timeout);
        // }

        // , start: function() {
        //     var self = this;
        //     if(self.stop === false)
        //        return;

        //     this.stop = false;
        //     this.init();
        // }

        // Reset and rebuild the element
        ,
        reset: function() {
            var self = this;
            clearInterval(self.timeout);
            var id = this.el.attr('id');
            this.el.after('<span id="' + id + '"/>')
            this.el.remove();
            if (typeof this.cursor !== 'undefined') {
                this.cursor.remove();
            }
            // Send the callback
            self.options.resetCallback();
        }

    };

    $.fn.typed = function(option) {
        return this.each(function() {
            var $this = $(this),
                data = $this.data('typed'),
                options = typeof option == 'object' && option;
            if (!data) $this.data('typed', (data = new Typed(this, options)));
            if (typeof option == 'string') data[option]();
        });
    };

    $.fn.typed.defaults = {
        strings: ["These are the default values...", "You know what you should do?", "Use your own!", "Have a great day!"],
        stringsElement: null,
        // typing speed
        typeSpeed: 0,
        // time before typing starts
        startDelay: 0,
        // backspacing speed
        backSpeed: 0,
        // shuffle the strings
        shuffle: false,
        // time before backspacing
        backDelay: 500,
        // loop
        loop: false,
        // false = infinite
        loopCount: false,
        // show cursor
        showCursor: true,
        // character for cursor
        cursorChar: "|",
        // attribute to type (null == text)
        attr: null,
        // either html or text
        contentType: 'html',
        // call when done callback function
        callback: function() {},
        // starting callback function before each string
        preStringTyped: function() {},
        //callback for every typed string
        onStringTyped: function() {},
        // callback for reset
        resetCallback: function() {}
    };


}(window.jQuery);

$(function(){
      $(".typed").typed({
        strings: ["^2000 Hola! Soy Diseñadora Publicitaria.", " Soy Coders Developer.", " Soy Front End.", " Esto es mi pasión.^1000", " Me encantaria ayudar en tu proyecto!", " La imaginación no tiene LÍMITES!"],
      typeSpeed: 30,
      callback: function(){
        lift();
      }
    });

  });

  function lift(){
    $(".sub-tagline").addClass("lift-text");
    $(".btn-group").css("opacity", '1');
  }

  function shift(){
      $(".head-wrap").addClass("shift-text");
      terminalHeight();
  }

  function terminalHeight(){
      var termHeight = $(".terminal-height");
      var value = termHeight.text();
      value = parseInt(value);
      setTimeout(function(){
          if (value > 10){
              value = value-1;
              this.txtValue = value.toString();
              termHeight.text(this.txtValue);
              self.terminalHeight();
          }
          else{
              clearTimeout();
          }
      }, 10);
  };


  var Point = function(x, y) {
    this.x = x;
    this.y = y;
  };

var Point = function(x, y) {
    this.x = x;
    this.y = y;
  };

var Circle = function(rad, centerPoint) {
    this.rad = rad;
    this.centerPoint = centerPoint;
  };

var DelaunayDataSet = function(vertex, context) {
    this.vertex = vertex;
    this.context = context;

    this.fillTriangleColor = "#ff0000";
    this.fillTriangleCheck = true;

    this.strokeTriangleColor = "rgba( 255, 255, 255, 0)";
    this.strokeTriangleCheck = true;
  }

var TriSettings = [];
var lights = [];
var max_lights = 50;

DelaunayDataSet.prototype.drawLight = function() {
  while (lights.length < max_lights) {
    var light = {
      x: Math.random() * this.context.canvas.width,
      y: Math.random() * this.context.canvas.height,
      angle: Math.random() * 360 * (Math.PI / 180),
      speed: Math.random() * 10
    }
    lights.push(light);
  }
  for (var i = 0; i < lights.length; i++) {
    var light = lights[i];
    light.x += Math.cos(light.angle) * light.speed;
    light.y += Math.sin(light.angle) * light.speed;
    if (light.x < 0 || light.y < 0 || light.x > this.context.canvas.width || light.y > this.context.canvas.height) {
      light.x = Math.random() * this.context.canvas.width;
      light.y = Math.random() * this.context.canvas.height;
      continue;
    }
    with(this.context) {
      fillStyle = "#96c";
      beginPath();
      arc(light.x, light.y, 5, 0, 2 * Math.PI, false);
      shadowColor = '#96c';
      shadowBlur = 30;
      shadowOffsetX = 0;
      shadowOffsetY = 0;
      fill();
      closePath();
    }
  }
  this.context.shadowBlur = 0;
};

DelaunayDataSet.prototype.drawTriangle = function() {

  for (var i = 0; i < this.triangleVertexNumber.length; i += 3) {

    if (this.triangleVertexNumber[i] !== 0 && this.triangleVertexNumber[i] !== 1 && this.triangleVertexNumber[i] !== 2 && this.triangleVertexNumber[i + 1] !== 0 && this.triangleVertexNumber[i + 1] !== 1 && this.triangleVertexNumber[i + 1] !== 2 && this.triangleVertexNumber[i + 2] !== 0 && this.triangleVertexNumber[i + 2] !== 1 && this.triangleVertexNumber[i + 2] !== 2) {

      var ctx = this.context;
      var points = [];
      points.push({
        x: this.vertex[this.triangleVertexNumber[i]].x,
        y: this.vertex[this.triangleVertexNumber[i]].y
      });
      points.push({
        x: this.vertex[this.triangleVertexNumber[i + 1]].x,
        y: this.vertex[this.triangleVertexNumber[i + 1]].y
      });
      points.push({
        x: this.vertex[this.triangleVertexNumber[i + 2]].x,
        y: this.vertex[this.triangleVertexNumber[i + 2]].y
      });

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y)
      ctx.lineTo(points[1].x, points[1].y)
      ctx.lineTo(points[2].x, points[2].y)
      ctx.lineTo(points[0].x, points[0].y)

      if (this.fillTriangleCheck) {
        var settings = TriSettings[i];
        if (!settings) {
          var num = 120 + (80 / this.triangleVertexNumber.length * i) | 0;
          var sp = new Point(this.vertex[this.triangleVertexNumber[i]].x, this.vertex[this.triangleVertexNumber[i]].y);
          var ep = new Point(sp.x + 50 + Math.random() * 200, sp.y + 50 + Math.random() * 200);
          var opacity = .05 + Math.random() * .2;
          settings = {
            start_point: sp,
            end_point: ep,
            opacity: opacity
          }
          TriSettings[i] = settings;
        }

        var color = '70,70,70';
        var collision = false;
        for (var l = 0; l < lights.length; l++) {
          var collision = is_in_triangle(lights[l].x, lights[l].y, points[0].x, points[0].y, points[1].x, points[1].y, points[2].x, points[2].y)
          if (collision) {
            color = '153,102,204';
            continue;
          }
        }

        var grad = ctx.createLinearGradient(settings.start_point.x, settings.start_point.y, settings.end_point.x, settings.end_point.y);
        grad.addColorStop(0, 'rgba(0,0,0,' + settings.opacity + ')');
        grad.addColorStop(1, 'rgba(' + color + ',' + settings.opacity + ')');
        ctx.fillStyle = grad;
        ctx.fill();
      }

      if (this.strokeTriangleCheck) {
        ctx.strokeStyle = this.strokeTriangleColor;
        ctx.stroke();
      }

      ctx.closePath();

    }
  }
};

DelaunayDataSet.prototype.update = function() {

  var vertexNumber = this.vertex.length;
  this.triangleVertexNumber = [0, 1, 2];
  this.circumCircles = [];


  var firstCircle = calculationCircle(this.vertex[0], this.vertex[1], this.vertex[2]);
  this.circumCircles.push(firstCircle);

  for (var i = 3; i < vertexNumber; i++) {
    calTriangles(this, i);
    if (i > 3) {
      removeTriangle(this, i);
    }
  }

};


// define the method which is very useful


function distanceBetweenPoints(pt1, pt2) {
  var dx = pt2.x - pt1.x;
  var dy = pt2.y - pt1.y;

  return Math.sqrt(dx * dx + dy * dy);
}

function distanceBetweenPointAndCircle(pt, circle) {
  var dx = pt.x - circle.centerPoint.x;
  var dy = pt.y - circle.centerPoint.y;

  return Math.sqrt(dx * dx + dy * dy);
}

function judgeBetweenDistance(_pt, _circle) {
  var dis = distanceBetweenPointAndCircle(_pt, _circle);

  var circleJudge = false;
  if (dis < _circle.rad) {
    circleJudge = true;
  }

  return circleJudge;
}

//this is the process of 3 ( separating of the triangles, add the circum circles, and deleting the extra triangle


function calTriangles(_delaunayDataSet, num) {
  var newNumber = num;
  var pt = _delaunayDataSet.vertex[newNumber];

  var tempVertexNumber = [];
  var tempCircles = [];
  var tempNumbers = [];

  for (var i = 0; i < _delaunayDataSet.circumCircles.length; i++) {
    if (judgeBetweenDistance(pt, _delaunayDataSet.circumCircles[i])) {
      tempNumbers.push(i);

      var selectingNum01 = _delaunayDataSet.triangleVertexNumber[3 * i];
      var selectingNum02 = _delaunayDataSet.triangleVertexNumber[3 * i + 1];
      var selectingNum03 = _delaunayDataSet.triangleVertexNumber[3 * i + 2];

      tempVertexNumber.push(selectingNum01);
      tempVertexNumber.push(selectingNum02);
      tempVertexNumber.push(newNumber);

      tempVertexNumber.push(selectingNum02);
      tempVertexNumber.push(selectingNum03);
      tempVertexNumber.push(newNumber);

      tempVertexNumber.push(selectingNum03);
      tempVertexNumber.push(selectingNum01);
      tempVertexNumber.push(newNumber);

      var ct01circle1 = calculationCircle(_delaunayDataSet.vertex[selectingNum01], _delaunayDataSet.vertex[selectingNum02], _delaunayDataSet.vertex[newNumber]);
      var ct01circle2 = calculationCircle(_delaunayDataSet.vertex[selectingNum02], _delaunayDataSet.vertex[selectingNum03], _delaunayDataSet.vertex[newNumber]);
      var ct01circle3 = calculationCircle(_delaunayDataSet.vertex[selectingNum03], _delaunayDataSet.vertex[selectingNum01], _delaunayDataSet.vertex[newNumber]);

      tempCircles.push(ct01circle1);
      tempCircles.push(ct01circle2);
      tempCircles.push(ct01circle3);
    }
  }

  for (i = 0; i < tempVertexNumber.length; i++) {
    _delaunayDataSet.triangleVertexNumber.push(tempVertexNumber[i]);
  }

  for (i = 0; i < tempCircles.length; i++) {
    _delaunayDataSet.circumCircles.push(tempCircles[i]);
  }

  for (i = 0; i < tempNumbers.length; i++) {
    var num = tempNumbers[i] - i;

    var slicedObjectPtNumbers;
    var slicedCircles;

    if (num == 0) {
      slicedObjectPtNumbers = _delaunayDataSet.triangleVertexNumber.slice(3);
      slicedCircles = _delaunayDataSet.circumCircles.slice(1);
    } else {
      var slicedObjectPtNumberBefore = _delaunayDataSet.triangleVertexNumber.slice(0, 3 * num);
      var slicedObjectPtNumberAfter = _delaunayDataSet.triangleVertexNumber.slice(3 * num + 3);
      slicedObjectPtNumbers = slicedObjectPtNumberBefore.concat(slicedObjectPtNumberAfter);

      var slicedCircleBefore = _delaunayDataSet.circumCircles.slice(0, num);
      var slicedCircleAfter = _delaunayDataSet.circumCircles.slice(1 + num);
      slicedCircles = slicedCircleBefore.concat(slicedCircleAfter);
    }

    _delaunayDataSet.triangleVertexNumber = slicedObjectPtNumbers;
    _delaunayDataSet.circumCircles = slicedCircles;
  }

}

function calculationCircle(pt01, pt02, pt03) {

  var x1 = pt01.x;
  var y1 = pt01.y;

  var x2 = pt02.x;
  var y2 = pt02.y;

  var x3 = pt03.x;
  var y3 = pt03.y;

  var c = 2.0 * ((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1));
  var tempX = ((y3 - y1) * (x2 * x2 - x1 * x1 + y2 * y2 - y1 * y1) + (y1 - y2) * (x3 * x3 - x1 * x1 + y3 * y3 - y1 * y1)) / c;
  var tempY = ((x1 - x3) * (x2 * x2 - x1 * x1 + y2 * y2 - y1 * y1) + (x2 - x1) * (x3 * x3 - x1 * x1 + y3 * y3 - y1 * y1)) / c;
  var tempPt = new Point(tempX, tempY);

  var tempRad = Math.sqrt(Math.pow(tempX - x1, 2) + Math.pow(tempY - y1, 2));

  return new Circle(tempRad, tempPt);
}

function removeTriangle(_delaunayDataSet, tempVertexNum) {
  var circumcircleArrays = _delaunayDataSet.circumCircles;
  var ommitCircumCircleNumbers = [];

  for (var i = 0; i < circumcircleArrays.length; i++) {
    var vertexNum01 = _delaunayDataSet.triangleVertexNumber[i * 3];
    var vertexNum02 = _delaunayDataSet.triangleVertexNumber[i * 3 + 1];
    var vertexNum03 = _delaunayDataSet.triangleVertexNumber[i * 3 + 2];

    for (var num = 0; num < tempVertexNum; num++) {
      if (num != vertexNum01 && num != vertexNum02 && num != vertexNum03) {

        if (judgeBetweenDistance(_delaunayDataSet.vertex[num], circumcircleArrays[i])) {
          ommitCircumCircleNumbers.push(i);
          break;
        }

      }
    }

  }


  //omit
  var tempCircumCircleArray = [];
  var tempTriagneNumberArray = [];

  for (i = 0; i < circumcircleArrays.length; i++) {
    for (var j = 0; j < ommitCircumCircleNumbers.length; j++) {
      if (ommitCircumCircleNumbers[j] == i) {
        break;
      }
    }

    if (j == ommitCircumCircleNumbers.length) {

      tempTriagneNumberArray.push(_delaunayDataSet.triangleVertexNumber[3 * i]);
      tempTriagneNumberArray.push(_delaunayDataSet.triangleVertexNumber[3 * i + 1]);
      tempTriagneNumberArray.push(_delaunayDataSet.triangleVertexNumber[3 * i + 2]);

      tempCircumCircleArray.push(_delaunayDataSet.circumCircles[i]);
    }
  }

  _delaunayDataSet.triangleVertexNumber = [];
  for (i = 0; i < tempTriagneNumberArray.length; i++) {
    _delaunayDataSet.triangleVertexNumber[i] = tempTriagneNumberArray[i];
  }

  _delaunayDataSet.circumCircles = [];
  for (i = 0; i < tempCircumCircleArray.length; i++) {
    _delaunayDataSet.circumCircles[i] = tempCircumCircleArray[i];
  }
}

function initTriangle(context, recWid, recHig, recTop, recLeft) {
  var vertex = [];

  var bigRad = Math.sqrt(Math.pow(recWid, 2) + Math.pow(recHig, 2)) / 2;
  var bigCirclePos = new Point(recWid / 2 + recLeft, recHig / 2 + recTop);

  vertex.push(new Point(bigCirclePos.x - Math.sqrt(3) * bigRad, bigCirclePos.y - bigRad));
  vertex.push(new Point(bigCirclePos.x + Math.sqrt(3) * bigRad, bigCirclePos.y - bigRad));
  vertex.push(new Point(bigCirclePos.x, bigCirclePos.y + bigRad * 2));

  return new DelaunayDataSet(vertex, context);
}

function is_in_triangle(px, py, ax, ay, bx, by, cx, cy) {

  var v0 = [cx - ax, cy - ay];
  var v1 = [bx - ax, by - ay];
  var v2 = [px - ax, py - ay];

  var dot00 = (v0[0] * v0[0]) + (v0[1] * v0[1]);
  var dot01 = (v0[0] * v1[0]) + (v0[1] * v1[1]);
  var dot02 = (v0[0] * v2[0]) + (v0[1] * v2[1]);
  var dot11 = (v1[0] * v1[0]) + (v1[1] * v1[1]);
  var dot12 = (v1[0] * v2[0]) + (v1[1] * v2[1]);

  var invDenom = 1 / (dot00 * dot11 - dot01 * dot01);

  var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  var v = (dot00 * dot12 - dot01 * dot02) * invDenom;

  return ((u >= 0) && (v >= 0) && (u + v < 1));
}

window.requestAnimFrame = (function() {
  return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
  function(callback) {
    window.setTimeout(callback, 1000 / 60);
  };
})();

(function() {
  var canvas = document.getElementById("myCanvas");
  var canvasWid = window.innerWidth;
  var canvasHig = window.innerHeight;

  canvas.width = canvasWid;
  canvas.height = canvasHig;

  var context = canvas.getContext("2d");

  var recWid = canvasWid;
  var recHig = canvasHig;

  var recTop = 0;
  var recLeft = 0;

  var delaneyNum = 80;
  var myDelaunayDataSet = initTriangle(context, recWid, recHig, recTop, recLeft);

  var tempPt;
  tempPt = new Point(0, 0);
  myDelaunayDataSet.vertex.push(tempPt);

  tempPt = new Point(canvasWid, 0);
  myDelaunayDataSet.vertex.push(tempPt);

  tempPt = new Point(0, canvasHig);
  myDelaunayDataSet.vertex.push(tempPt);

  tempPt = new Point(canvasWid, canvasHig);
  myDelaunayDataSet.vertex.push(tempPt);

  for (var i = 0; i < delaneyNum - 4; i++) {
    var pt = new Point(Math.random() * recWid + recLeft, Math.random() * recHig + recTop);
    myDelaunayDataSet.vertex.push(pt);
  }

  var mousePos = new Point(canvasWid / 2, canvasHig / 2);
  myDelaunayDataSet.vertex.push(mousePos);

  myDelaunayDataSet.update();
  myDelaunayDataSet.drawTriangle();

  function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return new Point(evt.clientX - rect.left, evt.clientY - rect.top);
  }

  loop();

  function loop() {
    context.clearRect(0, 0, canvasWid, canvasHig);
    myDelaunayDataSet.drawTriangle();
    myDelaunayDataSet.drawLight();
    requestAnimFrame(loop);
  }

})();