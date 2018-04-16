/**
 * VisualDB
 * Author Matthieu McClintock 2015
 */

var vizdbTables = (function ($, Backbone, _, undefined) {

  var vizdbTables;
  var windowEvent;

  function vizdbTables(options) {
    vizdbTables = this;
    var that = this; // Save context
    this.$leftPane = options.leftPane;
    this.$canvas = options.canvas;
    this.leftPaneWidth = this.$leftPane.width();
    this.leftPaneHeight = this.$leftPane.height();
    this.tables = new Table_Collection();
    this.tableIconView = new Table_Icon_View();
    this.$leftPane.append(this.tableIconView.print().el);
    this.rowIconView = new Row_Icon_View();
    this.$leftPane.append(this.rowIconView.print().el);
    this.setupEvents();

    this.plumberOptions = {
      endpoint: ["Dot", {radius: 5}],
      isSource: true,
      connectorStyle: {strokeStyle: "#666"},
      isTarget: true,
      maxConnections: 20,
    };

    this.plumber = jsPlumb.getInstance({
      DragOptions: {cursor: 'pointer', zIndex: 2000},
      PaintStyle: {strokeStyle: '#666'},
      Container: "canvas"
    });

    jsPlumb.fire("jsPlumbDemoLoaded", this.plumber);

  }

  vizdbTables.prototype.setupEvents = function () {
    $tableIcon = this.$leftPane.find("#table");
    $rowIcon = this.$leftPane.find("#row");
    var self = this;
    var tableDown = false;
    var rowDown = false;

    $('body').bind("mousemove", function (event) {
      if (self.selectedView) {
        self.selectedView.handleDrag(event);
        self.selectedView.isDragged = true;
      }
    });

    $('body').bind("mouseup", function (event) {
      if (self.selectedView && self.selectedView.isDragged) {
        self.selectedView.handleDrop(event);
        self.selectedView.isDragged = false;
      }
      self.selectedView = false;
    });

  }

  vizdbTables.prototype.setAttributes = function (attributes) {
    this.model.set({name: '', content: ''});
    this.model.set({_default: '', content: ''});
    this.model.set({size: '', content: ''});
    this.model.set({autoincrement: '', content: ''});
    this.model.set({_null: '', content: ''});
    this.model.set({type: '', content: ''});
  }

  vizdbTables.prototype.createTable = function (x, y) {
    console.log('createTable' + x + ':' + y);
    var table = new Table();
    this.tables.add(table);
    var Table_view = new Table_View({model: table, x: x, y: y});
    this.$canvas.append(Table_view.print().el);
  }

  var Base_View = Backbone.View.extend({

    events: {
      "mousedown": "mousedown"
    },

    mousedown: function (event) {
      if(!vizdbTables.selectedView)
        vizdbTables.selectedView = this;
      return true;
    },

    handleDrag: function (event) {
      windowEvent = event;
      $(this.el).css({
        top:  event.pageY - 50,
        left: event.pageX - 50
      });
    },

    handleDrop: function (event) {
      console.log("handle drop");
      windowEvent = event;
    }

  });

  var Table_Collection = Backbone.Collection.extend();

  var Table = Backbone.Model.extend({
    initialize: function (options) {
      this.rows = new Row_Collection([],{parentTable:this});
    },

    createRow: function () {
      var row = new Row();
      this.rows.add(row);
      var row_view = new Row_View({model: row});
      this.get("view").addRowView(row_view);

    },

  });

  var Table_View = Base_View.extend({
    className: "tableBox tableEntityBox",

    events: {
      "mousedown": "mousedown",
      "mouseup": "mouseup",
      "mousemove": "mousemove",
      "click #closeButton": "destroy",
      "dblclick #dbTitle": "changeTitle",
      "keypress #dbTitleEdit": "checkEnterKey"
    },

    initialize: function (options) {
      this.model.set("view", this);
      this.x = options.x;
      this.y = options.y;
      this.model.set("id", 1);
      var id = this.model.collection.idInc;
      this.model.set("id", id);
      this.model.collection.idInc++;
    },

    checkEnterKey: function (event) {
      if (event.which == 13) {
        this.changeTitle();
      }

    },

    print: function () {
      var html = '<div id="tableBox" class="tableBox tableSection">';
      html += '<div class="container-fluid" class="tableBox"><div class="panel panel-primary" id="panel"><div class="panel-heading">';
      html += '<class="panel-title" id="panel-title"><button class="btn btn-primary" id="dbTitle" type="button">Database Table<span class="badge"></span></button><input id="dbTitleEdit" style="display:none;" />';
      html += '<button type="button" class="close" id="closeButton"><span aria-hidden="true">&times;</span></button></div><div class="panel-body table-body"></div></div></div>';
      html += '</div>';
      $(this.el).html(html);
      this.setPosition();
      return this;
    },
    
    addRowView: function (row_view) {
      $(this.el).find(".panel-body").first().append(row_view.print().el);
    },

    destroy: function (options, row_view) {
      this.model.rows.each(function(model) {
        model.get("view").destroy();
      });
      $(this.el).remove();
      if(this.model.collection)
        this.model.collection.remove(this.model);

    },

    changeTitle: function () {
      if (!this.editMode) {
        $('#dbTitle', this.el).hide();
        $('#dbTitleEdit', this.el).show();
        this.editMode = true;
      }
      else {
        $('#dbTitle', this.el).show();
        $('#dbTitleEdit', this.el).hide();
        $('#dbTitle', this.el).html($('#dbTitleEdit', this.el).val());
        this.editMode = false;
      }

    },

    handleDrag: function (event) {
      var x = event.pageX;
      if (x > vizdbTables.leftPaneWidth) {
        this.x = event.pageX - 50 - vizdbTables.leftPaneWidth;
        this.y = event.pageY - 50;
        this.setPosition();
      }

    },

    setPosition: function () {
      var eventObj = typeof event != 'undefined' ? event : windowEvent,
      x = eventObj.pageX;
      if (x > vizdbTables.leftPaneWidth) {
        $(this.el).css({
          top: this.y,
          left: this.x,
        });
      }
      vizdbTables.plumber.repaintEverything();
    },


  });

  var Row_Collection = Backbone.Collection.extend({
    initialize: function (models,options) {
      if(options)
        this.parentTable = options.parentTable;
      this.idInc = 0;
    }
  });

  var Row = Backbone.Model.extend({
    initialize: function (options) {
      if (options && options.rank) {
        this.set("rank", options.rank);
      }
    }
  });

  var Row_View = Base_View.extend({
    className: "rowBox",

    events: {
      "click #deleteButton": "destroy",
      "click #saveButton": "clickSaveButton",
      "dblclick .list-group-item": "clickEditButton",
      "mousedown": "mousedown",
      "mouseup": "mouseup",
      "mousemove": "mousemove",
    },

    initialize: function (models, options) {
      this.model.set("view", this);
      this.model.set("id", 1);
      var id = this.model.collection.idInc;
      this.model.set("id", id);
      this.model.collection.idInc++;
    },

    print: function () {
      var html = '<div id="rowInput"><a href="#" class="list-group-item" id="rowInput">Row Input</a></div>';
      html += '<div class="edit-form" style="display:none;"><form class="form-inline" id="rowInfo" method="POST"><div class="form-group">';
      html += '<input type="text" class="form-control" id="name" placeholder="Name"><input type="text" class="form-control" id="default" placeholder="Default"><input type="text" class="form-control" id="size" placeholder="Size"><div class="checkbox"><label><input type="checkbox" value="">Autoincrement</label></div><br><div class="checkbox"><label><input type="checkbox" value="">Null</label></div><br><select class="form-control input-sm"><option>Integer</option><option>VARCHAR</option></select></div><p><button type="button" id="saveButton" class="btn btn-primary btn-xs">Save</button><button type="button" class="btn btn-default btn-xs" id="deleteButton"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></button></p></div></div>';
      $(this.el).html(html);
      this.setUpPlumbing();
        return this;  
    },

    setUpPlumbing:function() {
      setTimeout(_.bind(function(){
        this.point1 = vizdbTables.plumber.addEndpoint($(this.el), {anchor: "Left"}, vizdbTables.plumberOptions);
        this.point2 = vizdbTables.plumber.addEndpoint($(this.el), {anchor: "Right"}, vizdbTables.plumberOptions);
      },this),1);
    },

    repaintPlumbing : function() {
      vizdbTables.plumber.repaintEverything();
    },

    clickSaveButton: function () {
      $(".edit-form", this.el).hide();
      $("#rowInput", this.el).show();
      $("#rowInput", this.el).html($("#name", this.el).val());
      //$(".list-group-item", this.el).show();
      //$(".list-group-item", this.el).html($("#name", this.el).val());
      var data = $(this.el).find("form").serializeObject();
      JSON.stringify(data);
      console.log(data);
      this.model.set("name", data.name);
      this.model.set("type", data.type);
      console.log("Tables: ", vizdbTables.tables);
    },

    clickEditButton: function () {
      if (!this.editMode) {
        $(".edit-form", this.el).show();
        $("#rowInput", this.el).hide();
        this.editMode = true;
      }
      else {
        $(".edit-form", this.el).hide();
        $("#rowInput", this.el).show();
        this.editMode = false;
      }
      var data = $(this.el).find("form").serializeObject();
      JSON.stringify(data);
      console.log(data);
      this.model.set("name", data.name);
      this.model.set("type", data.type);
      console.log("Tables: ", vizdbTables.tables);

    },

    destroy: function (options) {
      $(this.el).remove();
      this.model.collection.remove(this.model);
      vizdbTables.plumber.deleteEndpoint(this.point1);
      vizdbTables.plumber.deleteEndpoint(this.point2);
    },

    handleDrag: function (event) {
      console.log(this.isDragging);
      if(!this.isDragging){
        $(this.el).detach(); 
        $(this.el).appendTo(vizdbTables.$canvas);
        this.isDragging = true;
      }

      
      
      var x = event.pageX - vizdbTables.leftPaneWidth - 50;
      var y = event.pageY;
      if (x > vizdbTables.leftPaneWidth) {
        this.setPosition(x,y);
      }
      console.log('handleDrag');

    },

    handleDrop:function(event){
      this.isDragging = false;
      var compareX = event.pageX - vizdbTables.leftPaneWidth;
      var compareY = event.pageY;
      var hitTable = vizdbTables.tables.find(function (model) {
        if (Math.abs(model.get("view").x - compareX) < 175 && Math.abs(model.get("view").y - compareY) < 175) {
          return true;
        }
        return false;
      });

      if (hitTable) {
        this.model.collection.remove(this.model);
        hitTable.rows.add(this.model);
        this.model.collection = hitTable.rows;
      }


      $(this.el).detach(); 
      $(this.model.collection.parentTable.get("view").el).find(".panel-body").append($(this.el));
      this.setPosition("auto","auto");
    },


    setPosition: function (x,y) {
      $(this.el).css({
        top: y,
        left: x,
      });
      this.repaintPlumbing();

    }

  });

  var Table_Icon_View = Base_View.extend({

    className: "tableIcon",

    initialize: function () {
    },

    print: function () {
      var html = '<button type="button" class="btn btn-default btn-lg">';
      html += '<span class="glyphicon glyphicon-th" aria-hidden="true"></span> <h4>Add Table</h4>';
      html += '</button>';
      $(this.el).html(html);
      return this;
    },

    handleDrop: function (event) {
      var x = event.pageX,
        gutterWidth = 10;

      if (x > vizdbTables.leftPaneWidth) {
        var x = event.pageX - (vizdbTables.leftPaneWidth + gutterWidth);
        var y = event.pageY - 20;
        console.log('handleDrophandle'+vizdbTables.leftPaneWidth);
        vizdbTables.createTable(x, y);
        $(this.el).removeAttr("style");
      }
    }
  });

  var Row_Icon_View = Base_View.extend({
    className: "rowIcon",

    initialize: function () {
    },

    print: function () {
      var html = '<button type="button" class="btn btn-default btn-lg">';
      html += '<span class="glyphicon glyphicon-plus" aria-hidden="true"></span> <h4>Add Row</h4>';
      html += '</button>';
      $(this.el).html(html);
      return this;
    },

    handleDrop: function (event) {
      var compareX = event.pageX - vizdbTables.leftPaneWidth;
      var compareY = event.pageY;
      var hitTable = vizdbTables.tables.find(function (model) {
        if (Math.abs(model.get("view").x - compareX) < 175 && Math.abs(model.get("view").y - compareY) < 175) {
          return true;
        }
          return false;
      });

      if (hitTable) {
        hitTable.createRow();
      }

      $(this.el).removeAttr("style");
    }

  });
  
  return vizdbTables;

})(jQuery, Backbone, _, undefined);

$.fn.serializeObject = function () {
  var o = {};
  var a = this.serializeArray();
  $.each(a, function () {
    if (o[this.name] !== undefined) {
      if (!o[this.name].push) {
        o[this.name] = [o[this.name]];
      }
      o[this.name].push(this.value || '');
    }
    else {
      o[this.name] = this.value || '';
    }
  });
  return o;
};

$(function () {
  $('form').submit(function () {
    $(this.el).text(JSON.stringify($('form').serializeObject()));
    return false;
  });
});

(function ($) {
  var check = false, isRelative = true;
  $.elementFromPoint = function (x, y) {
    if (!document.elementFromPoint) {
      return null;
    }
    if (!check) {
      var sl;
      if ((sl = $(document).scrollTop()) > 0) {
        isRelative = (document.elementFromPoint(0, sl + $(window).height() - 1) == null);
      }
      else {
        if ((sl = $(document).scrollLeft()) > 0) {
          isRelative = (document.elementFromPoint(sl + $(window).width() - 1, 0) == null);
        }
      }
      check = (sl > 0);
    }

    if (!isRelative) {
      x += $(document).scrollLeft();
      y += $(document).scrollTop();
    }

    return document.elementFromPoint(x, y);
  };
})(jQuery);