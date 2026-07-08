#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Ds1302.h>
#include "HX711.h"

// ================= WIFI & TELEGRAM =================
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <UniversalTelegramBot.h>

#define WIFI_SSID "SULTAN"
#define WIFI_PASS "asdf2112"

// ================= MQTT CONFIGURATION =================
#include <PubSubClient.h> // Pastikan library PubSubClient terinstal di Arduino IDE Anda

#define MQTT_SERVER "broker.hivemq.com"
#define MQTT_PORT 1883
// GANTI MQTT_DEVICE_ID & MQTT_TOPIC sesuai dengan ID Alat yang didaftarkan di Web Dashboard Admin Next.js
#define MQTT_DEVICE_ID "ESP32-01" 
#define MQTT_TOPIC "iv-monitor/device/ESP32-01/data"

WiFiClient espClient;
PubSubClient mqttClient(espClient);

unsigned long lastMQTTPublish = 0;
const unsigned long intervalMQTTPublish = 2000; // Kirim telemetry ke web setiap 2 detik

// GANTI DENGAN TOKEN BOT DARI BOTFATHER
#define BOT_TOKEN "8549329351:AAHmDvqhD7KjaLFTKbi9Zjw_Sj-68ux70mQ"

// GANTI DENGAN CHAT ID TELEGRAM ANDA
#define ADMIN_CHAT_ID "1402014125"

WiFiClientSecure secured_client;
UniversalTelegramBot bot(BOT_TOKEN, secured_client);

unsigned long lastTelegram = 0;
const unsigned long intervalTelegram = 1500;

String statusSebelumnya = "AMAN";

// Flags untuk mendeteksi notifikasi berat agar tidak kirim berulang-ulang
bool notified_250 = false;
bool notified_150 = false;
bool notified_100 = false;
bool notified_50 = false;
bool notified_10 = false;
bool notified_5 = false;
bool notified_0 = false;

// ================= LCD I2C =================
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ================= RTC DS1302 =================
#define RTC_RST 5
#define RTC_CLK 18
#define RTC_DAT 19

Ds1302 rtc(RTC_RST, RTC_CLK, RTC_DAT);

// ================= HX711 =================
#define HX711_DT 32
#define HX711_SCK 33

HX711 scale;

// GANTI NILAI INI SETELAH KALIBRASI LOAD CELL
float calibration_factor = -7050.0;

float beratGram = 0;

// ================= OPTOCOUPLER =================
#define OPTO_PIN 34

volatile unsigned long jumlahTetes = 0;
volatile unsigned long totalTetesKumulatif = 0; // Menghitung total tetesan kumulatif untuk sisa infus di web
volatile unsigned long lastDropTime = 0;

// Anti dobel hitung tetesan
const unsigned long debounceDrop = 120; // ms

// Hitung tetesan setiap 30 detik
const unsigned long intervalHitung = 30000;

unsigned long lastHitung = 0;
unsigned long lastLCD = 0;
unsigned long lastSerial = 0;

int tetes30Detik = 0;
int tetesPerMenit = 0;
float mlPerJam = 0;

// Drop factor infus
// Makro biasanya 20 tetes/mL
// Mikro biasanya 60 tetes/mL
float dropFactor = 20.0;

// ================= LED WARNING =================
#define LED_MERAH 25
#define LED_HIJAU 26

// Batas berat cairan
float batasKurang = 100.0; // gram
float batasHabis = 30.0;   // gram

String statusCairan = "AMAN";

unsigned long lastBlink = 0;
bool redBlinkState = false;

// Untuk ganti tampilan LCD
bool tampilanUtama = true;
unsigned long lastGantiTampilan = 0;

// ================= INTERRUPT TETESAN =================
void IRAM_ATTR hitungTetes() {
  unsigned long now = millis();

  if (now - lastDropTime > debounceDrop) {
    jumlahTetes++;
    totalTetesKumulatif++; // Akumulasikan ke hitungan kumulatif
    lastDropTime = now;
  }
}

// ================= KIRIM TELEGRAM =================
void kirimTelegram(String pesan) {
  if (WiFi.status() == WL_CONNECTED) {
    bot.sendMessage(ADMIN_CHAT_ID, pesan, "");
  }
}

// ================= FORMAT STATUS TELEGRAM =================
String buatPesanStatus() {
  noInterrupts();
  unsigned long tetesSekarang = totalTetesKumulatif; // Tampilkan total kumulatif di Telegram
  interrupts();

  Ds1302::DateTime now;
  rtc.getDateTime(&now);

  char tanggal[17];
  char jam[17];

  sprintf(tanggal, "%02d/%02d/20%02d", now.day, now.month, now.year);
  sprintf(jam, "%02d:%02d:%02d WIB", now.hour, now.minute, now.second);

  String pesan = "";
  pesan += "STATUS SISTEM INFUS\n";
  pesan += "Tanggal: " + String(tanggal) + "\n";
  pesan += "Jam: " + String(jam) + "\n\n";

  pesan += "Berat Cairan: " + String(beratGram, 0) + " gram\n";
  pesan += "Hitungan Berjalan: " + String(tetesSekarang) + " tetes\n";
  pesan += "Tetes / Menit: " + String(tetesPerMenit) + " tetes/menit\n";
  pesan += "Flow Infus: " + String(mlPerJam, 0) + " mL/jam\n";
  pesan += "Status Cairan: " + statusCairan + "\n\n";

  if (statusCairan == "AMAN") {
    pesan += "Kondisi cairan masih aman.";
  } else if (statusCairan == "KURANG") {
    pesan += "Peringatan: cairan mulai berkurang.";
  } else if (statusCairan == "HABIS") {
    pesan += "Peringatan: cairan hampir habis atau sudah habis.";
  }

  return pesan;
}

// ================= HANDLE PESAN TELEGRAM =================
void handlePesanTelegram(int jumlahPesanBaru) {
  for (int i = 0; i < jumlahPesanBaru; i++) {
    String chat_id = bot.messages[i].chat_id;
    String text = bot.messages[i].text;
    String nama = bot.messages[i].from_name;

    Serial.print("Pesan Telegram dari Chat ID: ");
    Serial.println(chat_id);

    if (text == "/start") {
      String pesan = "";
      pesan += "Assalamu'alaikum, " + nama + ".\n";
      pesan += "Bot monitoring infus sudah aktif.\n\n";
      pesan += "Perintah yang tersedia:\n";
      pesan += "/status - Melihat kondisi infus\n";
      pesan += "/help - Bantuan perintah\n\n";
      pesan += "Chat ID Anda:\n";
      pesan += chat_id;

      bot.sendMessage(chat_id, pesan, "");
    }

    else if (text == "/status") {
      bot.sendMessage(chat_id, buatPesanStatus(), "");
    }

    else if (text == "/help") {
      String pesan = "";
      pesan += "DAFTAR PERINTAH BOT INFUS\n\n";
      pesan += "/start - Memulai bot\n";
      pesan += "/status - Melihat berat cairan, tetesan, flow, dan status cairan\n";
      pesan += "/help - Melihat bantuan";

      bot.sendMessage(chat_id, pesan, "");
    }

    else {
      bot.sendMessage(chat_id, "Perintah tidak dikenal. Ketik /help untuk melihat daftar perintah.", "");
    }
  }
}

// ================= CEK TELEGRAM =================
void cekTelegram() {
  if (millis() - lastTelegram >= intervalTelegram) {
    lastTelegram = millis();

    int jumlahPesanBaru = bot.getUpdates(bot.last_message_received + 1);

    while (jumlahPesanBaru) {
      handlePesanTelegram(jumlahPesanBaru);
      jumlahPesanBaru = bot.getUpdates(bot.last_message_received + 1);
    }
  }
}

// ================= CEK PERUBAHAN STATUS =================
void cekNotifikasiStatus() {
  // Reset flags jika botol infus diganti/diisi ulang (berat naik di atas threshold)
  if (beratGram > 250.0) {
    notified_250 = false;
    notified_150 = false;
    notified_100 = false;
    notified_50 = false;
    notified_10 = false;
    notified_5 = false;
    notified_0 = false;
  }
  else if (beratGram > 150.0) {
    notified_150 = false;
    notified_100 = false;
    notified_50 = false;
    notified_10 = false;
    notified_5 = false;
    notified_0 = false;
  }
  else if (beratGram > 100.0) {
    notified_100 = false;
    notified_50 = false;
    notified_10 = false;
    notified_5 = false;
    notified_0 = false;
  }
  else if (beratGram > 50.0) {
    notified_50 = false;
    notified_10 = false;
    notified_5 = false;
    notified_0 = false;
  }
  else if (beratGram > 10.0) {
    notified_10 = false;
    notified_5 = false;
    notified_0 = false;
  }
  else if (beratGram > 5.0) {
    notified_5 = false;
    notified_0 = false;
  }
  else if (beratGram > 0.0) {
    notified_0 = false;
  }

  // Kirim notifikasi jika berat turun melewati batas
  if (beratGram <= 0.0 && !notified_0) {
    notified_0 = true;
    kirimTelegram("⚠️ PERINGATAN DARURAT: Cairan infus habis total! (0 gram)\n\n" + buatPesanStatus());
  }
  else if (beratGram <= 5.0 && beratGram > 0.0 && !notified_5) {
    notified_5 = true;
    kirimTelegram("⚠️ PERINGATAN DARURAT: Cairan infus kritis tersisa 5 gram!\n\n" + buatPesanStatus());
  }
  else if (beratGram <= 10.0 && beratGram > 5.0 && !notified_10) {
    notified_10 = true;
    kirimTelegram("⚠️ PERINGATAN KRITIS: Cairan infus tersisa 10 gram!\n\n" + buatPesanStatus());
  }
  else if (beratGram <= 50.0 && beratGram > 10.0 && !notified_50) {
    notified_50 = true;
    kirimTelegram("⚠️ PERINGATAN: Cairan infus tersisa 50 gram!\n\n" + buatPesanStatus());
  }
  else if (beratGram <= 100.0 && beratGram > 50.0 && !notified_100) {
    notified_100 = true;
    kirimTelegram("⚠️ PERINGATAN: Cairan infus tersisa 100 gram!\n\n" + buatPesanStatus());
  }
  else if (beratGram <= 150.0 && beratGram > 100.0 && !notified_150) {
    notified_150 = true;
    kirimTelegram("ℹ️ INFO: Cairan infus tersisa 150 gram.\n\n" + buatPesanStatus());
  }
  else if (beratGram <= 250.0 && beratGram > 150.0 && !notified_250) {
    notified_250 = true;
    kirimTelegram("ℹ️ INFO: Cairan infus tersisa 250 gram.\n\n" + buatPesanStatus());
  }
}

// ================= UPDATE LED =================
void updateLedWarning() {
  if (beratGram <= batasHabis) {
    // Cairan habis
    statusCairan = "HABIS";

    digitalWrite(LED_HIJAU, LOW);
    digitalWrite(LED_MERAH, HIGH);
  } 
  else if (beratGram <= batasKurang) {
    // Cairan kurang
    statusCairan = "KURANG";

    digitalWrite(LED_HIJAU, LOW);

    // LED merah kedip
    if (millis() - lastBlink >= 500) {
      lastBlink = millis();
      redBlinkState = !redBlinkState;
      digitalWrite(LED_MERAH, redBlinkState);
    }
  } 
  else {
    // Cairan aman
    statusCairan = "AMAN";

    digitalWrite(LED_MERAH, LOW);
    digitalWrite(LED_HIJAU, HIGH);
  }
}

// ================= KONEKSI & REKONEKSI MQTT =================
void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Menghubungkan ke MQTT Broker...");
    // Hubungkan dengan ClientID sesuai device ID
    if (mqttClient.connect(MQTT_DEVICE_ID)) {
      Serial.println("Terhubung ke MQTT Broker!");
    } else {
      Serial.print("Gagal terhubung, status=");
      Serial.print(mqttClient.state());
      Serial.println(" Mencoba kembali dalam 5 detik...");
      delay(5000);
    }
  }
}

// ================= SETUP WIFI =================
void setupWiFi() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Koneksi WiFi...");
  lcd.setCursor(0, 1);
  lcd.print(WIFI_SSID);

  Serial.print("Menghubungkan ke WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  // Batas waktu tunggu koneksi (20 detik)
  unsigned long startAttemptTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 20000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() != WL_CONNECTED) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Gagal");
    lcd.setCursor(0, 1);
    lcd.print("Restart...");
    delay(3000);
    ESP.restart();
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Terhubung");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP().toString());
  delay(2000);

  Serial.println("\nWiFi Terhubung");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  secured_client.setInsecure();

  String salam = "";
  salam += "Assalamu'alaikum.\n";
  salam += "Sistem monitoring infus berhasil terhubung ke WiFi SULTAN dan bot Telegram sudah aktif.\n\n";
  salam += "Gunakan perintah /status untuk melihat kondisi infus.";

  kirimTelegram(salam);
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);

  // LCD
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();

  // Hubungkan ke WiFi dan Telegram
  setupWiFi();

  // MQTT Server Setup
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);

  // RTC
  rtc.init();

  // ================= SET WAKTU RTC =================
  // AKTIFKAN SEKALI SAJA UNTUK SET WAKTU
  // SETELAH JAM BENAR, KOMENTARI LAGI BAGIAN INI

  // --- PENTING: Upload program ini SEKALI untuk men-set waktu RTC DS1302 ---
  // Setelah jam di LCD benar, beri tanda komentar kembali (/* ... */) bagian ini dan upload ulang!
  Ds1302::DateTime dt = {
    .year = 26,
    .month = Ds1302::MONTH_JUL,
    .day = 9,
    .hour = 4,
    .minute = 4,
    .second = 0,
    .dow = Ds1302::DOW_THU
  };

  rtc.setDateTime(&dt);

  // HX711
  scale.begin(HX711_DT, HX711_SCK);
  scale.set_scale(calibration_factor);

  // LED
  pinMode(LED_MERAH, OUTPUT);
  pinMode(LED_HIJAU, OUTPUT);

  digitalWrite(LED_MERAH, LOW);
  digitalWrite(LED_HIJAU, LOW);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Kosongkan Load");
  lcd.setCursor(0, 1);
  lcd.print("Cell...");
  delay(2000);

  // Tare / nol-kan load cell
  // Pastikan gantungan/load cell belum diberi beban saat ESP32 nyala
  scale.tare();

  // Optocoupler
  pinMode(OPTO_PIN, INPUT);

  // Kalau sensor tidak ngitung, ganti FALLING jadi RISING
  attachInterrupt(digitalPinToInterrupt(OPTO_PIN), hitungTetes, FALLING);

  lastHitung = millis();
  lastLCD = millis();
  lastGantiTampilan = millis();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Sistem Infus");
  lcd.setCursor(0, 1);
  lcd.print("Mulai...");
  delay(2000);
  lcd.clear();

  Serial.println("Sistem Infus Dimulai");
}

// ================= LOOP =================
void loop() {
  // ================= BACA LOAD CELL =================
  if (scale.is_ready()) {
    beratGram = scale.get_units(5);

    if (beratGram < 0) {
      beratGram = 0;
    }
  }

  // ================= UPDATE LED WARNING =================
  updateLedWarning();

  // ================= NOTIFIKASI TELEGRAM JIKA STATUS BERUBAH =================
  cekNotifikasiStatus();

  // ================= CEK PESAN TELEGRAM =================
  cekTelegram();

  // ================= KONEKSI DAN PROSES MQTT =================
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      reconnectMQTT();
    }
    mqttClient.loop();

    // Kirim data telemetry ke MQTT setiap 2 detik
    if (millis() - lastMQTTPublish >= intervalMQTTPublish) {
      lastMQTTPublish = millis();

      // Format JSON Payload: {"flowRate": tetesPerMenit, "dropsCount": totalTetesKumulatif}
      String payload = "{\"flowRate\":" + String(tetesPerMenit) + 
                       ",\"dropsCount\":" + String(totalTetesKumulatif) + "}";

      Serial.print("Publish ke MQTT: ");
      Serial.println(payload);

      mqttClient.publish(MQTT_TOPIC, payload.c_str());
    }
  }

  // ================= HITUNG TETES 30 DETIK =================
  if (millis() - lastHitung >= intervalHitung) {
    noInterrupts();
    tetes30Detik = jumlahTetes;
    jumlahTetes = 0; // reset hitungan mulai dari 0 lagi untuk flow rate
    interrupts();

    // Karena hitungnya 30 detik, estimasi tetes per menit dikali 2
    tetesPerMenit = tetes30Detik * 2;

    // Konversi ke mL/jam
    mlPerJam = (tetesPerMenit * 60.0) / dropFactor;

    lastHitung = millis();

    Serial.println("==============================");
    Serial.print("Tetes 30 Detik : ");
    Serial.println(tetes30Detik);

    Serial.print("Tetes / Menit  : ");
    Serial.println(tetesPerMenit);

    Serial.print("Flow Infus     : ");
    Serial.print(mlPerJam);
    Serial.println(" mL/jam");

    Serial.print("Berat Cairan   : ");
    Serial.print(beratGram);
    Serial.println(" gram");

    Serial.print("Status Cairan  : ");
    Serial.println(statusCairan);

    Serial.println("Hitungan tetes direset ke 0");
  }

  // ================= GANTI TAMPILAN LCD SETIAP 5 DETIK =================
  if (millis() - lastGantiTampilan >= 5000) {
    tampilanUtama = !tampilanUtama;
    lastGantiTampilan = millis();
    lcd.clear();
  }

  // ================= UPDATE LCD =================
  if (millis() - lastLCD >= 1000) {
    lastLCD = millis();

    noInterrupts();
    unsigned long tetesSekarang = totalTetesKumulatif; // Tampilkan total kumulatif di LCD
    interrupts();

    if (tampilanUtama) {
      // Tampilan utama: berat dan tetesan
      lcd.setCursor(0, 0);
      lcd.print("B:");
      lcd.print(beratGram, 0);
      lcd.print("g ");

      lcd.print("C:");
      lcd.print(tetesSekarang);
      lcd.print("   ");

      lcd.setCursor(0, 1);
      lcd.print(statusCairan);
      lcd.print(" F:");
      lcd.print(mlPerJam, 0);
      lcd.print("mL/j ");
      lcd.print("   ");
    } else {
      // Tampilan RTC: tanggal dan jam
      Ds1302::DateTime now;
      rtc.getDateTime(&now);

      char tanggal[17];
      char jam[17];

      sprintf(tanggal, "%02d/%02d/20%02d", now.day, now.month, now.year);
      sprintf(jam, "%02d:%02d:%02d WIB", now.hour, now.minute, now.second);

      lcd.setCursor(0, 0);
      lcd.print(tanggal);
      lcd.print("   ");

      lcd.setCursor(0, 1);
      lcd.print(jam);
      lcd.print("   ");
    }
  }

  // ================= SERIAL MONITOR LIVE =================
  if (millis() - lastSerial >= 1000) {
    lastSerial = millis();

    noInterrupts();
    unsigned long tetesSekarang = totalTetesKumulatif; // Tampilkan total kumulatif di Serial
    interrupts();

    Serial.print("Hitungan berjalan: ");
    Serial.print(tetesSekarang);
    Serial.print(" tetes | Berat: ");
    Serial.print(beratGram);
    Serial.print(" gram | Status: ");
    Serial.println(statusCairan);
  }
}
