# Angel's Pixel Warmth 🎨

An elegant 8x8 pixel art drawing board application with device synchronization support. Create your warm-toned masterpieces in this tiny pixel world.

## Features

- 🎨 **8x8 Pixel Canvas** - Simple yet creative drawing space
- 🌈 **Color Wheel Picker** - Supports both HSL and RGB color modes
- 💾 **10 Storage Slots** - Save multiple artworks and switch between them
- 🔄 **Device Sync** - Sync your artwork to external devices via API (e.g., dev boards, LED matrices)
- ☁️ **Cloud Storage** - Persistent storage powered by MongoDB

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your MongoDB connection string:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
MONGODB_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/?appName=your_app_name
```

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## API Documentation

This application provides a complete RESTful API for external devices (like Arduino, ESP32 dev boards) to access and sync data.

### Basic Information

- **Base URL**: `http://your-domain.com/api` (Development: `http://localhost:3000/api`)
- **Content-Type**: `application/json`
- **Authentication**: None required (suitable for internal networks or personal projects)

---

### 1. Get All Slots Data

Retrieve all 10 slots' artwork data.

**Request**

```http
GET /api/slots
```

**Response Example**

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "id": 1,
    "name": "Slot 1",
    "grid": [
      ["#FF0000", "#00FF00", null, null, null, null, null, null],
      [null, null, "#0000FF", null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null]
    ],
    "lastModified": 1700000000000
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "id": 2,
    "name": "Slot 2",
    "grid": [
      // ... 8x8 matrix
    ],
    "lastModified": 1700000000000
  }
  // ... remaining 8 slots
]
```

**Field Descriptions**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | MongoDB document ID |
| `id` | number | Slot ID (1-10) |
| `name` | string | Slot name |
| `grid` | array | 8x8 2D array, each element is a color value (hex string) or `null` (empty pixel) |
| `lastModified` | number | Last modified timestamp (milliseconds) |

---

### 2. Update Slot Data

Update the artwork data for a specific slot (typically called by the web interface).

**Request**

```http
POST /api/slots
Content-Type: application/json
```

**Request Body**

```json
{
  "id": 1,
  "name": "Slot 1",
  "grid": [
    ["#FF0000", "#00FF00", null, null, null, null, null, null],
    [null, null, "#0000FF", null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null]
  ]
}
```

**Response Example**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "id": 1,
  "name": "Slot 1",
  "grid": [
    // ... updated 8x8 matrix
  ],
  "lastModified": 1700000100000
}
```

**Notes**

- This operation automatically increments the `webVersion` counter, triggering sync status update
- `id` must be within the range of 1-10

---

### 3. Get Sync Status

Query the current sync version numbers for both web and device.

**Request**

```http
GET /api/sync
```

**Response Example**

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "type": "global",
  "webVersion": 42,
  "deviceVersion": 40
}
```

**Field Descriptions**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Fixed value `"global"` |
| `webVersion` | number | Web version number, auto-incremented on each slot save |
| `deviceVersion` | number | Device version number, should be updated by device after sync completion |

**Sync Logic**

- If `webVersion > deviceVersion`: New content available for sync
- If `webVersion === deviceVersion`: Already synced

---

### 4. Update Device Sync Version

After the device pulls data, call this endpoint to notify the server that sync is complete.

**Request**

```http
POST /api/sync
Content-Type: application/json
```

**Request Body**

```json
{
  "deviceVersion": 42
}
```

**Response Example**

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "type": "global",
  "webVersion": 42,
  "deviceVersion": 42
}
```

**Notes**

Typically, the device should send the `webVersion` obtained from `GET /api/sync` as the new `deviceVersion`.

---

## Device Sync Examples

### Arduino/ESP32 Pseudocode

```cpp
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* serverUrl = "http://192.168.1.100:3000/api";
int currentDeviceVersion = 0;

void checkAndSync() {
  // 1. Check for updates
  HTTPClient http;
  http.begin(String(serverUrl) + "/sync");
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, http.getString());
    
    int webVersion = doc["webVersion"];
    int deviceVersion = doc["deviceVersion"];
    
    if (webVersion > currentDeviceVersion) {
      Serial.println("New content found, syncing...");
      
      // 2. Pull all slot data
      http.begin(String(serverUrl) + "/slots");
      httpCode = http.GET();
      
      if (httpCode == 200) {
        // Parse and display artwork
        DynamicJsonDocument slotsDoc(16384);
        deserializeJson(slotsDoc, http.getString());
        
        // Process each slot's grid data
        for (int i = 0; i < 10; i++) {
          JsonArray grid = slotsDoc[i]["grid"];
          displayGridOnLEDMatrix(grid);
        }
        
        // 3. Confirm sync completion
        HTTPClient httpPost;
        httpPost.begin(String(serverUrl) + "/sync");
        httpPost.addHeader("Content-Type", "application/json");
        
        String payload = "{\"deviceVersion\":" + String(webVersion) + "}";
        httpPost.POST(payload);
        
        currentDeviceVersion = webVersion;
        Serial.println("Sync complete!");
      }
    }
  }
  
  http.end();
}

void loop() {
  checkAndSync();
  delay(5000); // Check every 5 seconds
}
```

### Python Example

```python
import requests
import time

API_BASE = "http://localhost:3000/api"
current_version = 0

def check_and_sync():
    global current_version
    
    # 1. Check sync status
    response = requests.get(f"{API_BASE}/sync")
    sync_data = response.json()
    
    web_version = sync_data["webVersion"]
    
    if web_version > current_version:
        print("New content found, syncing...")
        
        # 2. Get all slots
        slots_response = requests.get(f"{API_BASE}/slots")
        slots = slots_response.json()
        
        # Process data (e.g., display on LED matrix)
        for slot in slots:
            grid = slot["grid"]
            print(f"Slot {slot['id']}: {slot['name']}")
            display_on_device(grid)
        
        # 3. Update device version
        requests.post(
            f"{API_BASE}/sync",
            json={"deviceVersion": web_version}
        )
        
        current_version = web_version
        print("Sync complete!")
    else:
        print("Already up to date")

while True:
    check_and_sync()
    time.sleep(5)
```

### cURL Examples

```bash
# Get all slots
curl http://localhost:3000/api/slots

# Get sync status
curl http://localhost:3000/api/sync

# Update device version
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"deviceVersion": 42}'

# Update slot data
curl -X POST http://localhost:3000/api/slots \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "name": "Slot 1",
    "grid": [[null, null, null, null, null, null, null, null], ...]
  }'
```

---

## Tech Stack

- **Frontend Framework**: Next.js 16 (App Router)
- **UI Styling**: Tailwind CSS 4
- **Database**: MongoDB (Mongoose ODM)
- **Language**: TypeScript
- **Color Processing**: colord, react-colorful
- **Icons**: lucide-react

## Project Structure

```
ag-drawing-board/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── slots/
│   │   │   │   └── route.ts      # Slot data API
│   │   │   └── sync/
│   │   │       └── route.ts      # Sync status API
│   │   ├── page.tsx               # Main page (drawing board)
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── lib/
│   │   └── db.ts                  # MongoDB connection
│   └── models/
│       ├── Slot.ts                # Slot data model
│       └── SyncState.ts           # Sync state model
├── .env.local                     # Environment variables (not committed to Git)
├── .env.example                   # Environment variable template
└── package.json
```

## Deployment

### Vercel Deployment (Recommended)

1. Push your code to GitHub
2. Import the project on [Vercel](https://vercel.com)
3. Add `MONGODB_URI` to environment variables
4. Auto-deploy complete

### Custom Server

```bash
npm run build
npm start
```

Make sure to set the `MONGODB_URI` environment variable in production.

---

## License

MIT License

## Contributing

Contributions, issues, and feature requests are welcome!
