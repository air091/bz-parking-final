#include <SoftwareSerial.h>

// Serial communication with ESP8266
SoftwareSerial espSerial(2, 3); // RX, TX pins

// Ultrasonic sensor pins
const int trigPin1 = 9;  // Sensor 1
const int echoPin1 = 10; // Sensor 1
const int trigPin2 = 6;  // Sensor 2
const int echoPin2 = 7;  // Sensor 2

// Relay pin to control sensor power
const int relayPin = 8;

// Variables
bool sensorEnabled = false;

void setup() {
  Serial.begin(9600);
  espSerial.begin(9600);
  
  // Initialize pins
  pinMode(trigPin1, OUTPUT);
  pinMode(echoPin1, INPUT);
  pinMode(trigPin2, OUTPUT);
  pinMode(echoPin2, INPUT);
  pinMode(relayPin, OUTPUT);
  
  // Start with sensor OFF
  digitalWrite(relayPin, LOW);
  sensorEnabled = false;
}

void loop() {
  // Check for commands from ESP8266
  if (espSerial.available()) {
    String command = espSerial.readStringUntil('\n');
    command.trim();
    
    if (command.length() == 0) return; // Skip empty
    
    if (command == "SENSOR_ON") {
      handleSensorOn();
    }
    else if (command == "SENSOR_OFF") {
      handleSensorOff();
    }
    else if (command == "GET_DISTANCE1") {
      handleGetDistance(1);
    }
    else if (command == "GET_DISTANCE2") {
      handleGetDistance(2);
    }
    else if (command == "GET_BOTH") { 
      handleGetBoth();
    }
    else {
      espSerial.println("ERROR: Unknown command: " + command);
    }
    
    // Clear buffer
    while (espSerial.available()) espSerial.read();
  }
}

void handleSensorOn() {
  digitalWrite(relayPin, HIGH);
  sensorEnabled = true;
  delay(500); // allow stabilization
  espSerial.println("SENSOR_ON_OK");
}

void handleSensorOff() {
  digitalWrite(relayPin, LOW);
  sensorEnabled = false;
  espSerial.println("SENSOR_OFF_OK");
}

void handleGetDistance(int sensor) {
  if (!sensorEnabled) {
    espSerial.println("DISTANCE_ERROR - Sensors are OFF");
    return;
  }
  
  int distance = (sensor == 1) ? measureDistance(trigPin1, echoPin1) 
                               : measureDistance(trigPin2, echoPin2);
  
  if (distance > 0) {
    String response = "DISTANCE" + String(sensor) + ": " + String(distance) + " IN";
    espSerial.println(response);
  } else {
    String response = "DISTANCE" + String(sensor) + "_ERROR - Sensor disconnected or failed";
    espSerial.println(response);
  }
}

void handleGetBoth() {
  if (!sensorEnabled) {
    espSerial.println("DISTANCE_ERROR - Sensors are OFF");
    return;
  }
  
  int d1 = measureDistance(trigPin1, echoPin1);
  int d2 = measureDistance(trigPin2, echoPin2);
  
  // Handle different scenarios
  if (d1 > 0 && d2 > 0) {
    // Both sensors working
    String response = "DISTANCES: S1=" + String(d1) + " IN, S2=" + String(d2) + " IN";
    espSerial.println(response);
  }
  else if (d1 > 0 && d2 <= 0) {
    // Only sensor 1 working
    String response = "DISTANCE1: " + String(d1) + " IN";
    espSerial.println(response);
  }
  else if (d1 <= 0 && d2 > 0) {
    // Only sensor 2 working
    String response = "DISTANCE2: " + String(d2) + " IN";
    espSerial.println(response);
  }
  else {
    // Both sensors failed
    espSerial.println("ERROR: Both sensors disconnected or failed");
  }
}

int measureDistance(int trigPin, int echoPin) {
  if (!sensorEnabled) return -1;

  // Clear trigger pin
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  
  // Send trigger pulse
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  // Read echo with timeout
  long duration = pulseIn(echoPin, HIGH, 30000); // 30ms timeout
  
  if (duration == 0) {
    // Sensor timeout or disconnected
    return -1;
  }

  // Calculate distance
  int distance = (int)(duration * 0.0135039 / 2.0);

  // Validate range
  if (distance < 1 || distance > 157) {
    return -1; // out of range
  }

  return distance;
}