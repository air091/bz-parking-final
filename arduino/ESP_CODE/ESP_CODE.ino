#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <SoftwareSerial.h>

// ===== WiFi credentials =====
const char* ssid = "MSI-hotspot";
const char* password = "@SpooderMan.051s";

// ===== Serial communication with Arduino (D2=RX, D3=TX) =====
SoftwareSerial arduinoSerial(D2, D3); // RX, TX pins
ESP8266WebServer server(80);

// ===== Prevent spam messages =====
bool serverStarted = false;

// ===== Add these variables for automatic data sending =====
unsigned long lastDataSend = 0;
const unsigned long DATA_SEND_INTERVAL = 1000; // Send data every 1 seconds

// ===== CORS helpers =====
void cors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void handleOptions() {
  cors();
  server.send(204);
}

// ===== Wait for response from Arduino =====
String waitForResponse(unsigned long timeoutMs) {
  while (arduinoSerial.available()) arduinoSerial.read(); // clear old data
  unsigned long startTime = millis();
  String response = "";
  while (millis() - startTime < timeoutMs) {
    if (arduinoSerial.available()) {
      response = arduinoSerial.readStringUntil('\n');
      response.trim();
      if (response.length() > 0) break;
    }
    delay(5);
    yield(); // Feed the watchdog
  }
  if (response == "") response = "TIMEOUT";
  return response;
}

// ===== Add function to request and send distance data to USB Serial =====
void requestAndSendDistanceData() {
  // Request both distances from Arduino
  while (arduinoSerial.available()) arduinoSerial.read();
  arduinoSerial.println("GET_BOTH");
  arduinoSerial.flush();

  String response = waitForResponse(5000); // Increased timeout
  
  if (response != "TIMEOUT" && response.length() > 0) {
    // Send the response to USB serial for sensorServer.js to read
    Serial.println(response);
    Serial.flush(); // Ensure data is sent immediately
  }
}

// ===== API Handlers =====
void handleSensorOn() {
  while (arduinoSerial.available()) arduinoSerial.read();
  arduinoSerial.println("SENSOR_ON");
  arduinoSerial.flush();

  String response = waitForResponse(3000);
  cors();
  server.send(200, "application/json", "{\"result\":\"" + response + "\"}");
}

void handleSensorOff() {
  while (arduinoSerial.available()) arduinoSerial.read();
  arduinoSerial.println("SENSOR_OFF");
  arduinoSerial.flush();

  String response = waitForResponse(2000);
  cors();
  server.send(200, "application/json", "{\"result\":\"" + response + "\"}");
}

void handleGetDistance1() {
  while (arduinoSerial.available()) arduinoSerial.read();
  arduinoSerial.println("GET_DISTANCE1");
  arduinoSerial.flush();

  String response = waitForResponse(3000);
  cors();
  server.send(200, "application/json", "{\"result\":\"" + response + "\"}");
}

void handleGetDistance2() {
  while (arduinoSerial.available()) arduinoSerial.read();
  arduinoSerial.println("GET_DISTANCE2");
  arduinoSerial.flush();

  String response = waitForResponse(3000);
  cors();
  server.send(200, "application/json", "{\"result\":\"" + response + "\"}");
}

void handleGetBoth() {
  while (arduinoSerial.available()) arduinoSerial.read();
  arduinoSerial.println("GET_BOTH");
  arduinoSerial.flush();

  String response = waitForResponse(3000);
  cors();
  server.send(200, "application/json", "{\"result\":\"" + response + "\"}");
}

// ===== Root endpoint for testing =====
void handleRoot() {
  cors();
  String html = "<html><body>";
  html += "<h1>Ultrasonic Sensor API</h1>";
  html += "<p><a href='/sensor/on'>Turn Sensors ON</a></p>";
  html += "<p><a href='/sensor/off'>Turn Sensors OFF</a></p>";
  html += "<p><a href='/distance/1'>Get Distance Sensor 1</a></p>";
  html += "<p><a href='/distance/2'>Get Distance Sensor 2</a></p>";
  html += "<p><a href='/distance/both'>Get Both Distances</a></p>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

// ===== Setup & Loop =====
void setup() {
  Serial.begin(115200);
  arduinoSerial.begin(9600);
  
  // Disable WiFi auto-reconnect that might cause resets
  WiFi.setAutoReconnect(false);
  WiFi.persistent(false);

  // Ensure stable WiFi boot
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) {
    delay(500);
    yield(); // Feed watchdog
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(WiFi.localIP());
  }

  // Delay to stabilize
  delay(1000);

  // Define endpoints
  server.on("/", handleRoot);
  server.on("/sensor/on", handleSensorOn);
  server.on("/sensor/off", handleSensorOff);
  server.on("/distance/1", handleGetDistance1);
  server.on("/distance/2", handleGetDistance2);
  server.on("/distance/both", handleGetBoth);

  // CORS preflight
  server.on("/sensor/on", HTTP_OPTIONS, handleOptions);
  server.on("/sensor/off", HTTP_OPTIONS, handleOptions);
  server.on("/distance/1", HTTP_OPTIONS, handleOptions);
  server.on("/distance/2", HTTP_OPTIONS, handleOptions);
  server.on("/distance/both", HTTP_OPTIONS, handleOptions);

  server.begin();
  
  // Only print this once
  if (!serverStarted) {
    Serial.println("API_READY");
    serverStarted = true;
  }
}

void loop() {
  // Check WiFi connection and reconnect if needed
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.begin(ssid, password); 
    delay(5000);
    return;
  }
  
  server.handleClient();
  
  // ===== Add automatic data sending to USB Serial =====
  if (millis() - lastDataSend >= DATA_SEND_INTERVAL) {
    requestAndSendDistanceData();
    lastDataSend = millis();
  }
  
  yield(); // Feed the watchdog timer
  delay(10); // Small delay to prevent tight loop
}