#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // Library wajib diinstal melalui Library Manager di Arduino IDE

// Kredensial WiFi (GANTI DENGAN WI-FI ANDA)
const char* ssid = "Home";
const char* password = "admin#1234";

// URL API Next.js (IP Laptop/PC Anda: 192.168.1.10)
const char* serverName = "http://192.168.1.10:3000/api/infusion"; 

// Data simulasi tetesan infus untuk 3 pasien berbeda yang dipantau oleh 1 ESP32
int dropsCount1 = 1500;
int dropsCount2 = 800;
int dropsCount3 = 2400;

void setup() {
  Serial.begin(115200);
  
  // Koneksi ke WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;
    
    // Inisialisasi koneksi
    http.begin(client, serverName);
    http.addHeader("Content-Type", "application/json");
    
    // Simulasi sensor tetesan infus bertambah
    dropsCount1 += random(1, 4);
    dropsCount2 += random(2, 5);
    dropsCount3 += random(1, 3);
    
    // Simulasi flowRate (tetes per menit)
    int flowRate1 = random(55, 75);   // Normal
    int flowRate2 = random(125, 140);  // Bahaya (Terlalu Cepat)
    int flowRate3 = random(5, 8);      // Bahaya (Tersumbat / Habis)
    
    // Membuat Array JSON untuk mengirim data 3 alat sekaligus dalam 1 request
    DynamicJsonDocument doc(1024);
    JsonArray array = doc.to<JsonArray>();
    
    // Objek Alat 1 (Mawar 01)
    JsonObject device1 = array.createNestedObject();
    device1["deviceId"] = "Kamar-Mawar-01"; // Harus sesuai yang terdaftar di admin
    device1["flowRate"] = flowRate1;
    device1["dropsCount"] = dropsCount1;
    
    // Objek Alat 2 (Muani 01)
    JsonObject device2 = array.createNestedObject();
    device2["deviceId"] = "Kamar-Muani-01"; // Harus sesuai yang terdaftar di admin
    device2["flowRate"] = flowRate2;
    device2["dropsCount"] = dropsCount2;

    // Objek Alat 3 (Melati 01)
    JsonObject device3 = array.createNestedObject();
    device3["deviceId"] = "Kamar-Melati-01"; // Harus sesuai dengan yang didaftarkan di admin
    device3["flowRate"] = flowRate3;
    device3["dropsCount"] = dropsCount3;
    
    String requestBody;
    serializeJson(doc, requestBody);
    
    // Mengirim HTTP POST berupa array JSON
    int httpResponseCode = http.POST(requestBody);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("HTTP Response Code: ");
      Serial.println(httpResponseCode);
      Serial.println(response);
    } else {
      Serial.print("Error sending POST: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("WiFi Disconnected");
  }
  
  delay(2000); // Kirim data berkala setiap 2 detik
}
