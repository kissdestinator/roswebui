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
  	Router: Ember.Router.extend({
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
              deferred.resolve(topics.Topics.find(context.slug));
            });
            return deferred.promise();
          },
          enter: function(router) {
            topics.Topics.current = topics.Topics.find(window.location.hash.split('/').get('lastObject'));
            if (topics.Topics.current)
              topics.Topics.current.set('__stream_notify', -1);
          },
          exit: function(router) {
            topics.Topics.current.unsubscribe();
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
    _type: null,

    init: function() {
      this._publishers = Em.A();
      this._subscribers = Em.A();
      this._messageDetails = Em.A();
    },

    slug: function() {
      var s = this.name;
      if (s[0] == '/')
        s = s.slice(1);
      return s.replace('/', '-');
    }.property(),

    url: function() {
      return App.urlForState('root.topics.topic', [this]);
    }.property(),

    type: function() {
      if (!this._type) {
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

    __subscribers_notify: 0,
    subscribers: function() {
      if(!this._subscribers) {
        this._subscribers = Em.A();
      }
      var that = this;
      var service = new App.ros.Service({
        name        : '/rosapi/subscribers'
      });
      service.callService(new App.ros.ServiceRequest({'topic': this.name}), function(result) {
        that._subscribers.clear();
        that._subscribers.addObjects(result.subscribers);
        that.set('__subscribers_notify', 1);
      });
      return this._subscribers;
    }.property('__subscribers_notify'),

    __publishers_notify: 0,
    publishers: function() {
      var that = this;
      var service = new App.ros.Service({
        name        : '/rosapi/publishers'
      });
      service.callService(new App.ros.ServiceRequest({'topic': this.name}), function(result) {
        that._publishers.clear();
        that._publishers.addObjects(result.publishers);
        that.set('__publishers_notify', 1);
      });
      return this._publishers;
    }.property('__publishers_notify'),

    messageDetails: function() {
      if (this._type) {
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
                isArray: (item.fieldarraylen[i] >= 0) ? true : false,
                arraylen: item.fieldarraylen[i],
                example: item.examples[i],
                indent: indent ? ('indent' + indent) : '',
                level: indent,
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
    }.property('type'),

    unsubscribe: function() {
      //console.log(this.name);
      this.message_topic.unsubscribe();
      this.message_topic = null;
    },

    __stream_notify: 0,
    messageStream: function() {
      if (!this._stream) {
        this._stream = Em.A();
      }
      if (this._type && this._messageDetails && !this.message_topic) {
        var that = this;
        this.message_topic = new App.ros.Topic({
          name: this.name,
          messageType: this._type
        });

        this.message_topic.subscribe(function(message) {
          function createStream(message, level, parent) {
            var out = new Array();

            Ember.A(Ember.keys(message)).forEach(function(item) {
              var sorted = that._messageDetails.filterProperty('parent', parent);
              var index = sorted.indexOf(sorted.findProperty('name', item));
              var n = {
                name: item,
                level: level,
                parent: parent,
                index: index,
                indent: level ? ('indent' + level) : ''
              }
              if ($.isPlainObject(message[item]) || Object.prototype.toString.call( message[item] ) === '[object Array]') {
                n = $.extend(n, {
                  val: createStream(message[item], level+1, item),
                  hasChild: true,
                  isArray: Object.prototype.toString.call( message[item] ) === '[object Array]'
                });
              } else {
                n = $.extend(n, {
                  val: message[item],
                });
              }
              out.push(n);
            });
            //sorted = that._messageDetails.filterProperty('level', level);
            out = out.sort(function(obj1, obj2) {
              return obj1.index - obj2.index;
            });
            //console.log(out);
            return out;
          };
          var out = createStream(message, 0, '');

          var list = new Array();
          function flatten(input) {
            input.forEach(function(item) {
              if ($.isArray(item.val)) {
                var t = $.extend(true, {}, item);;
                //console.log(item)
                t.val = '';
                list.push(t);
                flatten(item.val);
              } else {
                list.push(item);
              }
            })
          }
          flatten(out);

          $('#message_stream').css('min-height', $('#message_stream').height());
          $('#message_stream').css('min-width', $('#message_stream').width());

          that._stream.clear();
          that._stream.pushObjects(list);
          that.set('__stream_notify', that.get('__stream_notify') + 1);
        });
      }
      return this._stream;
    }.property('type', '__stream_notify')
  });

  topics.TopicController = Ember.ObjectController.extend({

  });


  topics.Topics = Ember.Object.extend();
  topics.Topics.reopenClass({
    _topics:  Em.A(),
    current: null,
    all: function() {
      var topics_list = this._topics;
      var service = new App.ros.Service({
        name        : '/rosapi/topics',
        serviceType : 'rosapi/Topics'
      });
      service.callService(new App.ros.ServiceRequest(), function(result) {
        topics_list.clear();
        result.topics.forEach(function(item) {
          var t =topics.Topic.create();
          t.set('name', item);
          topics_list.addObject(t);
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