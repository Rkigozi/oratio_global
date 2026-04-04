Update the existing mobile prototype for Oratio (Prototype v1.1). Do not redesign the product. Refine the map styling, prayer light component, clustering behaviour, and prayer interaction feedback while keeping the existing screen structure.

Follow strong mobile UX/UI design principles including minimal interface, clear visual hierarchy, map-first layout, calm visual atmosphere, intuitive interactions, readable typography, and smooth map behaviour.

If small UI improvements would significantly improve usability, visual clarity, or interaction feedback, apply them while maintaining the current design direction and layout.

Map Design
Update the world map styling to a night-map aesthetic.

Ocean color: #0A1A3A (deep midnight blue)
Land color: #1C2A4A (slightly lighter blue)
Grid lines: very subtle navy

Design rules:
The map should remain visually quiet so the prayer lights stand out.
Avoid flat grey colors.
Continents should be recognizable but subtle.
Add very subtle map grid lines for orientation.
Maintain strong contrast between the lights and the map background.

Prayer Light Component
Replace existing markers with a layered light component.

Layer 1 – Core light
Size: 4–6px
Color: #F5F3FF
No blur

Layer 2 – Inner glow
Approx size: 14px
Opacity: 50–60%
Blur: 6–8px

Layer 3 – Outer halo
Approx size: 28px
Opacity: 10–20%
Blur: 12–18px

The light should resemble a star on the map.

Light Animation
Add a subtle pulse animation to the halo.

Halo radius: 28px → 34px → 28px
Duration: 4–5 seconds
Loop continuously

The pulse should be slow and calm.

Map Seeding
Increase marker density significantly to test clustering.
Seed approximately 150–300 lights globally.

Higher density should appear in major regions such as Western Europe, West Africa, Southeast Asia, South America, and North America.

Lights should appear distributed across cities rather than random ocean areas.

Clustering Behaviour
When multiple lights are close together, merge them into cluster markers.

Cluster design:
Circular glowing marker
Number displayed in center
Stronger glow than individual lights

Example cluster marker:

72

Clusters should look like concentrations of light rather than traditional map pins.

Interaction flow:

Tap cluster
Map smoothly zooms into that region
Cluster splits into smaller clusters or individual lights

Zoom Behaviour
Map should visually support multiple zoom levels.

World → Region → Country → City

As zoom increases, clusters reduce and individual lights appear.

Prayer Light Interaction
When a user taps an individual light, display a bottom sheet prayer card.

Card behaviour:
Slides up from the bottom of the screen
Map remains visible behind the card

Example content:

London, United Kingdom
Pray for my father who is going into surgery tomorrow.
28 people prayed

Primary action button:
I Prayed

Prayer Feedback Interaction
When the user presses “I Prayed”, trigger visual feedback on the map.

Interaction sequence:

Selected light brightness increases

Outer halo expands

Ripple pulse spreads outward from the light

Halo fades back to normal

Then display a confirmation message:

Thank you for praying
Your prayer has been counted.

Map Controls
Add a floating “My Location” button.

Placement: bottom-right corner above the navigation bar.

Behaviour:

Tap My Location
Map centers on the user’s city
Zoom adjusts to a local level
Nearby lights become visible.

Activity Screen
Update the activity screen to show simple global statistics.

Example metrics:

Prayers today: 3,842
Countries represented: 41
Active prayer requests: 217

Below this, include a list of recent prayer locations such as:

Manila, Philippines
São Paulo, Brazil
Lagos, Nigeria
Dallas, USA
Rome, Italy

Design Goal
The interface should communicate the idea that the world is slowly lighting up with prayer.

Visual priority order:

Prayer lights

Clusters

UI controls

Map background