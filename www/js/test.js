(function(){
  App.addModule( 
    ApplicationModule.create({
      moduleName: 'Nodes',
      rootUrl: 'root.test',
      templates: [
        'templates/test.handlebars'
      ],
      TestController: Ember.Controller.extend(),
      TestView: Ember.View.extend({
        templateName: 'test'
      }),
    	Router: Ember.Router.extend({
    		test: Ember.Route.extend({
          route: '/test',
          enter: function(router) {
            console.log("entered /test index");
          },
          connectOutlets:  function(router, context){
            router.get('applicationController').connectOutlet('body', 'test');
          }
    		})
    	})
    })
  );
})();