/**
 * WidgetBridge.m — Native module that syncs creature state
 * to shared App Group UserDefaults so the widget can read it.
 */

#import <React/RCTBridgeModule.h>
#import <Foundation/Foundation.h>

@interface WidgetBridge : NSObject <RCTBridgeModule>
@end

@implementation WidgetBridge

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(exportState:(NSString *)json)
{
  NSUserDefaults *shared = [[NSUserDefaults alloc] initWithSuiteName:@"group.com.zwitter.aitamagotchi"];
  if (shared) {
    [shared setObject:json forKey:@"widget_creature_data"];
    [shared synchronize];
  }
}

@end
