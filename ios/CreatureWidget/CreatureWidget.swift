/**
 * CreatureWidget.swift
 *
 * iOS Home Screen widget — creature vitals, mood, and age.
 * Reads creature data from a JSON file in the App Group shared container.
 */

import WidgetKit
import SwiftUI

struct WidgetCreatureData: Codable {
    var name: String
    var species: String
    var stage: String
    var mood: String
    var age: Float
    var hunger: Int
    var happiness: Int
    var energy: Int
    var hygiene: Int
    var ascii: String
    var lastInteraction: String
}

private let appGroupId = "group.com.zwitter.aitamagotchi"
private let widgetDataFile = "widget_creature_data.json"

func loadCreatureData() -> WidgetCreatureData? {
    guard let containerURL = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: appGroupId
    ) else { return nil }

    let fileURL = containerURL.appendingPathComponent(widgetDataFile)

    guard let data = try? Data(contentsOf: fileURL),
          let creature = try? JSONDecoder().decode(WidgetCreatureData.self, from: data)
    else { return nil }

    return creature
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), data: WidgetCreatureData(
            name: "Pixel", species: "stardrop", stage: "egg",
            mood: "content", age: 0, hunger: 80, happiness: 90,
            energy: 85, hygiene: 95, ascii: "✦",
            lastInteraction: ISO8601DateFormatter().string(from: Date())
        ))
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
        completion(SimpleEntry(date: Date(), data: loadCreatureData()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
        let data = loadCreatureData()
        let entry = SimpleEntry(date: Date(), data: data)
        // Refresh every minute so changes from the app appear quickly
        let next = Calendar.current.date(byAdding: .minute, value: 1, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let data: WidgetCreatureData?
}

struct CreatureWidgetEntryView: View {
    var entry: Provider.Entry

    var body: some View {
        if let c = entry.data {
            HStack(spacing: 8) {
                VStack(spacing: 4) {
                    Text(c.ascii)
                        .font(.system(size: 8, design: .monospaced))
                        .foregroundColor(Color(red: 0.77, green: 0.66, blue: 0.30))
                        .multilineTextAlignment(.center)
                        .minimumScaleFactor(0.5)
                    Text(c.name)
                        .font(.system(size: 8, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(red: 0.77, green: 0.66, blue: 0.30))
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("day \(Int(c.age))")
                        .font(.system(size: 7, design: .monospaced))
                        .foregroundColor(.gray)
                    HStack(spacing: 3) {
                        Circle().fill(moodColor(c)).frame(width: 5, height: 5)
                        Text(moodLabel(c)).font(.system(size: 7, design: .monospaced)).foregroundColor(.gray)
                    }
                    MiniBar(label: "HGR", val: c.hunger, color: .orange)
                    MiniBar(label: "HAP", val: c.happiness, color: .yellow)
                    MiniBar(label: "NRG", val: c.energy, color: .green)
                    MiniBar(label: "HYG", val: c.hygiene, color: .blue)
                }
            }
            .padding(8)
            .background(Color.black)
            .containerBackground(.black, for: .widget)
        } else {
            Text("✦\nNo creature")
                .font(.system(size: 10, design: .monospaced))
                .foregroundColor(Color(red: 0.77, green: 0.66, blue: 0.30))
                .multilineTextAlignment(.center)
                .padding()
                .background(Color.black)
                .containerBackground(.black, for: .widget)
        }
    }

    func moodColor(_ c: WidgetCreatureData) -> Color {
        switch c.mood {
        case "happy", "ecstatic": return .green
        case "sad", "sick": return .red
        case "hungry": return .orange
        case "sleeping": return .blue
        default: return .gray
        }
    }

    func moodLabel(_ c: WidgetCreatureData) -> String {
        ["ecstatic":"joyful","happy":"happy","content":"ok","bored":"bored",
         "hungry":"hungry","sad":"sad","angry":"angry","sick":"sick",
         "sleeping":"sleeping","mischief":"mischief"][c.mood] ?? c.mood
    }
}

struct MiniBar: View {
    let label: String; let val: Int; let color: Color
    var body: some View {
        HStack(spacing: 2) {
            Text(label).font(.system(size: 6, design: .monospaced)).foregroundColor(.gray)
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 1).fill(Color.gray.opacity(0.2)).frame(height: 3)
                    RoundedRectangle(cornerRadius: 1).fill(color)
                        .frame(width: g.size.width * CGFloat(val) / 100, height: 3)
                }
            }.frame(height: 3)
        }
    }
}

@main
struct CreatureWidget: Widget {
    let kind = "CreatureWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            CreatureWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Creature")
        .description("Your AI companion on your home screen.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
