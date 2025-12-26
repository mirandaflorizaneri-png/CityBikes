# Bike — City Bikes Network Dashboard

## What is this

This is a small static front-end dashboard that lists CityBikes networks and their stations. It is a simple single-page app that fetches network and station data from the CityBikes API and renders them for exploration.

## Key features

- Browse bike networks (places) worldwide.
- Search by city, network name, or country (full name or ISO code).
- Country summary pills showing country flag, full name and number of networks.
- Click a network's **See stations** to view its stations and the realtime counts: **Bikes available** and **Docks available**.
- Friendly UI: loading and error messages, a fixed Back button to return home, and responsive cards.

## How the UI and output flow work (summary)

1. Home / initial load
	- The app fetches available networks and renders a grid of network cards (name, city, country). A message area shows loading, errors, or tips.

2. Search behavior
	- The search box accepts city names, network names, country names (e.g., "Poland"), or country codes (e.g., "PL").
	- Searching a country shows the list of networks (places) in that country (not the stations). Click a place's **See stations** to drill down into stations for that place.

3. Country summary pills
	- A summary bar lists countries present in the current results (flag, country name, count). Clicking a pill sets the search to that country and displays its networks.

4. Viewing stations (drill-down)
	- Click **See stations** on a network card to fetch and display stations for that network.
	- Each station entry displays:
	  - **Bikes available** — number of bikes you can rent now (CityBikes API field `free_bikes`).
	  - **Docks available** — number of free docking slots to return a bike (API field `empty_slots`).
	- A fixed **← Back to home** button appears top-left so you can quickly return to the networks view.

5. Loading, errors, and limits
	- Loading and error states are shown in the message area. Some fetches are limited to keep the UI responsive (e.g., when aggregating many networks).

## Interpreting station numbers

- `free_bikes = 0` — typically means there are no bikes currently available at that station to rent. It might also indicate the station is out of service or data is stale.
- `empty_slots = 0` — means there are no docking slots to return a bike at that moment.
- Both values can change quickly; treat them as a snapshot and consider refreshing if planning a trip.

Quick examples:
- `free_bikes = 5`, `empty_slots = 3` → 5 bikes to take; 3 docks to return.
- `free_bikes = 0`, `empty_slots = 2` → no bikes to rent, but you can return a bike.
- `free_bikes = 2`, `empty_slots = 0` → bikes available but nowhere to return one — warn users.

## How to run locally

1. Open the project folder and open [index.html](index.html) directly in your browser, or serve the folder:

```bash
# Python 3
python -m http.server 8000

# Then visit http://localhost:8000
```

## Development notes

- UI files: [index.html](index.html), [css/style.css](css/style.css), [script/app.js](script/app.js).
- `script/app.js` contains the fetch logic, search/filter behavior, country summary rendering, and station rendering.
- The app deduplicates malformed network entries, limits the number of displayed networks for performance, and provides robust click handlers for the `See stations` button.



