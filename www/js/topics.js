(function(){
  var topics = ApplicationModule.create({
    moduleName: 'Topics',
    rootUrl: 'root.topics',
    templates: [
      'templates/topics.handlebars',
      'templates/topic.handlebars'
    ],
    TopicsView: Ember.View.extend({
      templateName: 'topics'
    }),
    TopicView: Ember.View.extend({
      templateName: 'topic'
    }),
    TopicController: Ember.ObjectController.extend(),
  	Router: Ember.Router.extend({
      loading: Ember.State.extend({}),
  		topics: Ember.Route.extend({
        route: '/topics',
        connectOutlets:  function(router, context){
            router.get('applicationController').connectOutlet('body', 'topics');
          },
        index: Ember.Route.extend({
          route: '/',
          enter: function(router) {
            topics.Topics.didLoad(0, function() {
              router.transitionTo('topic', topics.Topics.firstObject());
            });
          }
        }),
        topic: Ember.Route.extend({
          route: '/:slug',
          connectOutlets:  function(router, context){
            router.get('topicsController').connectOutlet('detail', 'topic', context);
          },
          deserialize:  function(router, context){
            deferred = $.Deferred();
            topics.Topics.didLoad(context.slug, function() {
              console.log(context.slug);
              deferred.resolve(topics.Topics.find(context.slug));
            });
            return deferred.promise();
          },
          serialize:  function(router, context){
            return {
              slug: context.get('slug')
            }
          },
          messageExpand: function(router, event) {
            var src = $(event.srcElement);
            $('[data-parent="' + src.parent().parent().parent().data('name') + '"]', src.parent().parent().parent().parent()).toggle();
            src.toggleClass('icon-plus-sign').toggleClass('icon-minus-sign');
          }
        })
  		})
  	})
  });

  topics.Topic = Ember.Object.extend({
    slug: function() {
      var s = this.name;
      if (s[0] == '/')
        s = s.slice(1);
      return s.replace('/', '-');
    }.property(),
    url: function() {
      return App.urlForState('root.topics.topic', [this]);
    }.property(),
    _type: '',
    type: function() {
      if (this._type == '') {
        var that = this;
        var type_service = new App.ros.Service({
          name        : '/rosapi/topic_type',
          serviceType : 'rosapi/TopicType'
        });
        type_service.callService(new App.ros.ServiceRequest({'topic': this.name}), function(result) {
          that.set('_type', result.type);
        });
      }
      return this._type;
    }.property('_type'),

    messageDetails: function() {
      if (!this._messageDetails) {
        this._messageDetails = Em.A();
      } else if (this._type != '') {
        var that = this;
        var service = new App.ros.Service({
          name        : '/rosapi/message_details',
          serviceType : 'rosapi/MessageDetails'
        });
        service.callService(new App.ros.ServiceRequest({'topic': this._type}), function(result) {

          result.typedefs.forEach(function(item) {
            var indent = 0,
                parent = that._messageDetails.findProperty('type', item.type)
                index = -1;
            
            if(parent) {
              indent = (parent.indent == '') ? 1 : (parseInt(parent.indent.replace('indent', '')) + 1);
              index = that._messageDetails.indexOf(parent) + 1;
              parent['hasChild'] = true;
            }
            for(i=0; i<item.fieldtypes.length; i++) {
              out = {
                type: item.fieldtypes[i],
                name: item.fieldnames[i],
                arraylen: item.fieldarraylen[i],
                example: item.examples[i],
                indent: indent ? ('indent' + indent) : '',
                parent: parent ? parent.name : ''
              }
              if (parent) {
                that._messageDetails.insertAt(index+i, out);
              } else {
                that._messageDetails.addObject(out);
              }
            }
          });
        });
      }
      return this._messageDetails;
    }.property('_type')
  });

  topics.Topics = Ember.Object.extend();
  topics.Topics.reopenClass({
    _topics:  Em.A(),
    all: function() {
      var topics_list = this._topics;
      var service = new App.ros.Service({
        name        : '/rosapi/topics',
        serviceType : 'rosapi/Topics'
      });
      service.callService(new App.ros.ServiceRequest(), function(result) {
        topics_list.clear();
        result.topics.forEach(function(item) {
          topics_list.addObject(
            topics.Topic.create({
              name: item
            })
          );
        });
      });

      return this._topics;
    },
    find: function(slug) {
      return this._topics.findProperty('slug', slug);
    }.observes('_topics'),
    firstObject: function() {
      return this._topics.get('firstObject');
    }.observes('_topics'),
    didLoad: function(what, callback) {
      if (this._topics.length == 0) {
        var that = this;
        var opts = {
          arrayDidChange: function(start, removeCount, addCount) {
            if (that.find(what) || !what) {
              that._topics.removeArrayObserver(opts);
              callback();
            }
          }, arrayWillChange: function(start, removeCount, addCount) {
          }
        };
        this._topics.addArrayObserver(opts);
      } else {
        callback();
      }
    }
  });

  topics.TopicsController = Ember.Controller.extend({
    topics: topics.Topics.all()
  })

  App.addModule(topics);
})();