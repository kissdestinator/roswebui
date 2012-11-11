ModuledApplication = Ember.Application.extend({
  loadCount: 0,
  autoinit: false,

  callInit: function() {
    if (this.loadCount == 0)
      this.initialize();
  },

  urlForState: function(state) {
    var currentState = Ember.get(this.router, 'currentState');
    var targetState = this.router.findStateByPath(currentState, state);
    var hash = this.router.serializeRecursively(targetState, [], {});
    return this.router.urlFor(state, hash);
  },

  loadTemplates: function(templates, callback) {
    var arg = templates[0],
        next = Array.prototype.slice.call(templates,1);
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
        if(next.length > 0) loadTemplates.apply(this, next);
        else callback();
      });
    }
  },

	addModule: function(module) {
    var app = this;
    app.loadCount++;
    app.loadTemplates(module.templates, function() {
      Ember.A(Ember.keys(module)).forEach(function(property) {
        if (property == 'Router') {
          var mixin = test.Router.PrototypeMixin;
          mixin.mixins.shift();
          App.RootRoute.reopen(mixin);
        } else if (property != 'templates') {
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

  loadModules: function(modules) {
    var arg = (typeof modules == 'string') ? modules : modules[0],
        next = (typeof modules == 'string') ? '' : Array.prototype.slice.call(modules,1),
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
        app.addModule(eval(arg.replace('.js', '').substring(arg.lastIndexOf('/')+1)));
        app.loadCount--;
        app.callInit();
      }
      document.head.appendChild(scriptObj);
      if(next.length > 0) app.loadModules.apply(this, next);
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
    return App.get('router.currentPath') == this.path;
  }.property('appState'),
  url: function() {
    return this.path ? App.urlForState(this.path) : '';
  }.property()
})

App.Navigation = Ember.Object.extend()
App.Navigation.reopenClass({
  links:  Em.A(),
  all: function() {
    return this.links;
  }
});

App.ApplicationController = Ember.Controller.extend({
  navigation: App.Navigation.all()
}),

App.loadModules(['js/test.js']);
