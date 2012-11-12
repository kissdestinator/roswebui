#!/usr/bin/env python
import roslib; roslib.load_manifest('roswebui')

from roswebui.srv import *
import rospy

class ROSWebUI:
  def handle_webuimodules(self, req):
      return WebUIModulesResponse(self.modules, self.default_modules)

  def __init__(self):
      rospy.init_node('roswebui')

      self.modules = rospy.get_param('~modules', [])
      self.default_modules = rospy.get_param('~default_modules', [
        'some/defaultmodel.js'
      ])

      s = rospy.Service('get_modules', WebUIModules, self.handle_webuimodules)
      rospy.spin()

if __name__ == "__main__":
    ROSWebUI()