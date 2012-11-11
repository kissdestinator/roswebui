var test = ApplicationModule.create({
  moduleName: 'Test module',
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
});