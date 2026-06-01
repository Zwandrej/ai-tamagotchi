/**
 * CreatureWidgetEntry.swift
 *
 * iOS Home Screen widget — creature vitals, mood, and age.
 * Reads from shared App Group UserDefaults.
 *
 * Xcode template creates CreatureWidget.swift — this uses a different
 * name so it survives the template step. Delete the auto-generated
 * CreatureWidget.swift and keep this one.
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

private let suiteName = "group.com.zwitter.aitamagotchi"
private let widgetDataKey = "widget_creature_data"

func loadCreatureData() -> WidgetCreatureData? {
    guard let defaults = UserDefaults(suiteName: suiteName),
          let json = defaults.string(forKey: widgetDataKey),
          let data = json.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(WidgetCreatureData.self, from: data)
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
        var displayData = data
        if var d = displayData {
            let last = ISO8601DateFormatter().date(from: d.lastInteraction) ?? Date()
            let hours = Date().timeIntervalSince(last) / 3600
            if hours > 0 {
                d.hunger = min(100, d.hunger + Int(hours * 6))
                d.energy = max(0, d.energy - Int(hours * 4))
                d.happiness = max(0, d.happiness - Int(hours * 3))
                d.hygiene = max(0, d.hygiene - Int(hours * 2))
                d.age += Float(hours / 24)
            }
            displayData = d
        }
        let entry = SimpleEntry(date: Date(), data: displayData)
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
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
