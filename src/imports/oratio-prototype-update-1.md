Update the existing mobile prototype for Oratio (Prototype v1.1). Do not redesign the product. Refine the current UI to improve the map hierarchy, prayer light design, clustering behaviour, and prayer interaction feedback while maintaining the existing layout and navigation.

Follow strong mobile UX/UI principles: minimal interface, calm visual atmosphere, clear hierarchy, and map-first design.

Map Styling Improvements
Slightly darken the map background so the prayer lights remain the brightest elements on screen.

Ocean color: #0A1A3A
Land color: #1C2A4A

Reduce the opacity of map labels and borders so they fade into the background.

The map should feel atmospheric and subtle, similar to a night sky.

Prayer Light Component
Refine the prayer lights so they feel like glowing stars on the map.

Structure:

Core light
4–6px warm white (#F5F3FF)

Inner glow
soft halo around the core

Outer halo
larger soft glow with low opacity

Increase the outer halo slightly so lights are more visible when zoomed out.

Lights should pulse gently with a slow breathing animation.

Cluster Marker Redesign
Replace the current numbered cluster markers with a cleaner visual representation.

Clusters should appear as:

• a slightly larger glowing halo
• multiple small light dots grouped together inside the halo

The cluster should resemble a small constellation of lights rather than a circle with a number.

When the user zooms closer, the cluster breaks apart into smaller clusters or individual lights.

Cluster Interaction
When a cluster is tapped:

the map smoothly zooms into the region
the cluster splits into smaller clusters or individual prayer lights.

Zoom Behaviour
Ensure the map transitions through multiple zoom levels.

World → Region → Country → City

As the user zooms in, clusters gradually break apart and individual lights appear.

Prayer Card Improvement
Add a subtle drag handle at the top of the bottom sheet prayer card so the interaction feels more native.

Prayer Interaction Feedback
When the user presses “I Prayed”:

the selected light briefly brightens
the halo expands slightly
a soft ripple spreads outward from the light.

Signature Interaction – New Prayer Light Appearing
When a new prayer request is submitted, the map should show a new prayer light appearing.

Interaction sequence:

a faint glow appears at the location

the light fades in gradually

the halo expands softly

the light settles into its normal glow state.

The fade-in should take approximately 0.8–1.2 seconds.

The effect should feel calm and subtle, like a new star appearing in the night sky.

Map Controls
Maintain the floating “My Location” button.

Add an optional search field for locations so users can search for a city or region to view prayer activity there.

Activity Screen
Keep the activity screen simple and inspiring.

Display metrics such as:

Prayers today
Countries represented
Active prayer requests

Below this, show recent prayer locations from around the world.

Design Goal
The interface should communicate the idea that the world is slowly lighting up with prayer.

Visual priority order:

prayer lights

clusters

UI controls

map background