//utils
if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}

Array.prototype.flatten = function flatten(){
   var flat = [];
   for (var i = 0, l = this.length; i < l; i++){
       var type = Object.prototype.toString.call(this[i]).split(' ').pop().split(']').shift().toLowerCase();
       if (type) { flat = flat.concat(/^(array|collection|arguments|object)$/.test(type) ? flatten.call(this[i]) : this[i]); }
   }
   return flat;
};

ModuledApplication = Ember.Application.extend({
  loadCount: 0,
  autoinit: false,

  callInit: function() {
    if (this.loadCount == 0)
      this.initialize();
  },

  urlForState: function(state, params) {
    var currentState = Ember.get(this.router, 'currentState');
    var targetState = this.router.findStateByPath(currentState, state);
    var hash = this.router.serializeRecursively(targetState, params, {});
    return this.router.urlFor(state, hash);
  },

  loadTemplates: function(templates, callback) {
    var arg = (typeof templates == 'string') ? templates : templates[0],
        next = (typeof templates == 'string') ? '' : Array.prototype.slice.call(templates,1),
        app = this;
    
    if (arg === undefined)
      return;
    if (arg.length === 0)
      return;
    if(typeof arg != 'string'){
        arg()
    }else{
      var scriptObj = document.createElement('script');
      scriptObj.type = 'text/x-handlebars';
      $(scriptObj).attr('data-template-name', arg.replace('.handlebars', '').substring(arg.lastIndexOf('/')+1))
      $.get(arg, function(data){
        scriptObj.text = data;
        document.head.appendChild(scriptObj);
        if(next.length > 0) app.loadTemplates(next, callback);
        else if (callback) callback();
      });
    }
  },

	addModule: function(module) {
    var app = this;
    app.loadCount++;
    app.loadTemplates(module.templates, function() {
      Ember.A(Ember.keys(module)).forEach(function(property) {
        if (property == 'Router') {
          var mixin = module.Router.PrototypeMixin;
          mixin.mixins.shift();
          App.RootRoute.reopen(mixin);
        } else if (property != 'templates' && property != 'moduleName' && property != 'rootUrl') {
          Ember.assert("Application already contains property named " + property + "!", (Ember.A(Ember.keys(app)).indexOf(property) == -1));
          app[property] = module[property];
        }
      });
      app.loadCount--;
      app.Navigation.links.pushObjects([
        app.NavigationLink.create({ path: module.rootUrl, name: module.moduleName, isDivider: false }),
      ]);
      app.callInit();
    });
	},

  loadScripts: function(scripts, callback) {
    var arg = (typeof scripts == 'string') ? scripts : scripts[0],
        next = (typeof scripts == 'string') ? '' : Array.prototype.slice.call(scripts,1),
        app = this;

    app.loadCount++;
    if (arg === undefined)
      return;
    if (arg.length === 0)
      return;
    if(typeof arg != 'string'){
        arg()
    }else{
      var scriptObj = document.createElement('script');
      scriptObj.type = 'text/javascript';
      scriptObj.src = arg;
      scriptObj.onload = scriptObj.onreadystatechange = function() {
        app.loadCount--;
        if (callback)
          callback();
        app.callInit();
      }
      document.head.appendChild(scriptObj);
      if(next.length > 0) app.loadScripts.apply(this, next);
    }
  }
});

ApplicationModule = Ember.Object.extend({
  templates: [],
});

var App = ModuledApplication.create({
  ApplicationView: Ember.View.extend({
    templateName: 'application'
  }),
  NavigationController: Em.ArrayController.extend(),
  NavigationView: Em.View.extend({
    templateName: 'navigation'
  }),
  IndexView: Ember.View.extend({
    templateName: 'index',
  }),
  RootRoute: Ember.Route.extend({
    loading: Ember.State.extend(),
    index:  Ember.Route.extend({
      route:'/',
      connectOutlets:  function(router, context){
        router.get('applicationController').connectOutlet('body', 'index');
      }
    })
  }),
});

App.Router = Ember.Router.extend({
  //enableLogging:  true,
  root: App.RootRoute
});

App.NavigationLink = Ember.Object.extend({
  appStateBinding: Ember.Binding.oneWay('App.router.currentState'),
  isActive: function() {
    return App.get('router.currentPath').startsWith(this.path);
  }.property('appState'),
  url: function() {
    return this.path ? App.urlForState(this.path) : '';
  }.property()
})

App.Navigation = Ember.Object.extend()
App.Navigation.reopenClass({
  links:  Em.A(),
  all: function() {
      this.links.insertAt(0, App.NavigationLink.create({ path: 'root.index', name: "Index", isDivider: false }));
    return this.links;
  }
});

App.ApplicationController = Ember.Controller.extend({
  navigation: App.Navigation.all()
}),


App.ros = new ROS();
App.ros.on('error', function(error) {
  console.log(error);
});
App.ros.connect('ws://10.0.2.15:9090'); // change to something dynamic




App.loadScripts(['js/test.js']);
App.loadScripts(['js/topics.js']);