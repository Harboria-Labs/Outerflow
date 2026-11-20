import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PartCategory, Vec3 } from '../../types/studio';

export interface HardwarePinDef {
  id: string;
  label: string;
  kind: 'power' | 'gnd' | 'digital' | 'analog' | 'bus' | 'pwm';
  localPos: Vec3;
}

export interface HardwareCalloutDef {
  number: number;
  title: string;
  detail: string;
  localPos: Vec3;
}

export interface RoboticsHardwareSpec {
  id: string;
  name: string;
  group: 'boards' | 'outputs' | 'inputs' | 'sensors' | 'actuators' | 'power' | 'interface';
  category: PartCategory;
  logicVoltage: string;
  summary: string;
  defaultColor: string;
  specs: {
    mcu: string;
    clock: string;
    flash: string;
    ram: string;
    gpio: string;
    analog: string;
    wireless: string;
    size: string;
  };
  pins: HardwarePinDef[];
  callouts?: HardwareCalloutDef[];
}

export const ROBOTICS_HARDWARE_CATALOG: RoboticsHardwareSpec[] = [
  // ---------- BOARDS (8) ----------
  {
    id: 'arduino-uno-r3',
    name: 'Arduino Uno R3',
    group: 'boards',
    category: 'electronics',
    logicVoltage: '5 V',
    summary: 'Classic 8-bit ATmega328P board with socketed DIP chip, USB-B, barrel jack, and 14+6 GPIO.',
    defaultColor: '#00878f',
    specs: {
      mcu: 'ATmega328P',
      clock: '16 MHz',
      flash: '32 KB',
      ram: '2 KB',
      gpio: '14 + 6',
      analog: '6 × 10-bit',
      wireless: '—',
      size: '68.6 × 53.4 mm',
    },
    pins: [
      { id: '5V', label: '5V', kind: 'power', localPos: [-0.22, 0.25, 0.56] },
      { id: '3V3', label: '3.3V', kind: 'power', localPos: [-0.34, 0.25, 0.56] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [-0.1, 0.25, 0.56] },
      { id: 'VIN', label: 'VIN', kind: 'power', localPos: [0.04, 0.25, 0.56] },
      { id: 'A0', label: 'A0', kind: 'analog', localPos: [0.34, 0.25, 0.56] },
      { id: 'A1', label: 'A1', kind: 'analog', localPos: [0.46, 0.25, 0.56] },
      { id: 'A4', label: 'A4/SDA', kind: 'bus', localPos: [0.76, 0.25, 0.56] },
      { id: 'A5', label: 'A5/SCL', kind: 'bus', localPos: [0.88, 0.25, 0.56] },
      { id: 'D2', label: 'D2', kind: 'digital', localPos: [0.64, 0.25, -0.56] },
      { id: 'D3', label: 'D3~', kind: 'pwm', localPos: [0.52, 0.25, -0.56] },
      { id: 'D5', label: 'D5~', kind: 'pwm', localPos: [0.28, 0.25, -0.56] },
      { id: 'D9', label: 'D9~', kind: 'pwm', localPos: [-0.18, 0.25, -0.56] },
      { id: 'D10', label: 'D10~', kind: 'pwm', localPos: [-0.3, 0.25, -0.56] },
      { id: 'D13', label: 'D13', kind: 'digital', localPos: [-0.66, 0.25, -0.56] },
    ],
    callouts: [
      { number: 1, title: 'ATmega328P Microcontroller', detail: '28-pin socketed 8-bit AVR brain running at 16 MHz.', localPos: [0.32, 0.16, 0.14] },
      { number: 2, title: 'USB-B Connector', detail: 'Provides 5V USB power and sketch upload / UART serial link.', localPos: [-0.95, 0.26, -0.26] },
      { number: 3, title: 'ATmega16U2 USB Bridge', detail: 'Translates USB packets into UART TX/RX serial.', localPos: [-0.48, 0.12, -0.18] },
      { number: 4, title: 'Power Jack (7–12V)', detail: '5.5×2.1 mm center-positive barrel jack for external battery.', localPos: [-0.92, 0.24, 0.36] },
      { number: 5, title: '5V Regulator (NCP1117)', detail: 'Steps 7–12V barrel input down to regulated 5V.', localPos: [-0.62, 0.12, 0.34] },
      { number: 6, title: '47 µF Capacitors', detail: 'Bulk supply filtering cans before & after regulator.', localPos: [-0.46, 0.2, 0.34] },
      { number: 7, title: 'Digital I/O Pins 0–13', detail: '14 digital pins (pins 3, 5, 6, 9, 10, 11 support PWM).', localPos: [0.05, 0.24, -0.56] },
      { number: 8, title: 'POWER Header', detail: '5V, 3.3V, GND, VIN & RESET pins for breadboards.', localPos: [-0.15, 0.24, 0.56] },
      { number: 9, title: 'Analog Inputs A0–A5', detail: '6 channels of 10-bit ADC; A4/A5 double as I²C SDA/SCL.', localPos: [0.6, 0.24, 0.56] },
      { number: 10, title: 'LED "L" (Pin 13)', detail: 'Built-in amber LED wired straight to D13.', localPos: [-0.24, 0.12, -0.35] },
      { number: 11, title: 'TX / RX LEDs', detail: 'Activity indicators pulsing during USB serial traffic.', localPos: [-0.24, 0.12, -0.22] },
      { number: 12, title: 'ON Power LED', detail: 'Green status indicator confirming 5V logic rail.', localPos: [0.68, 0.12, -0.28] },
      { number: 13, title: 'RESET Button', detail: 'Red tactile button restarting the user sketch.', localPos: [-0.88, 0.14, -0.55] },
      { number: 14, title: '16 MHz Quartz Crystal', detail: 'Metal clock can driving accurate timing & millis().', localPos: [-0.46, 0.13, -0.02] },
      { number: 15, title: 'ICSP Header', detail: '6-pin SPI/ISP header for direct AVR programming.', localPos: [0.92, 0.18, 0.0] },
    ],
  },
  {
    id: 'arduino-nano',
    name: 'Arduino Nano',
    group: 'boards',
    category: 'electronics',
    logicVoltage: '5 V',
    summary: 'Breadboard-ready compact ATmega328P module with Mini-USB and 45° TQFP-32 MCU.',
    defaultColor: '#1d4ed8',
    specs: {
      mcu: 'ATmega328P',
      clock: '16 MHz',
      flash: '32 KB',
      ram: '2 KB',
      gpio: '22',
      analog: '8 × 10-bit',
      wireless: '—',
      size: '45 × 18 mm',
    },
    pins: [
      { id: '5V', label: '5V', kind: 'power', localPos: [0.42, 0.16, 0.34] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [0.54, 0.16, 0.34] },
      { id: 'D13', label: 'D13', kind: 'digital', localPos: [-0.48, 0.16, 0.34] },
      { id: 'D9', label: 'D9~', kind: 'pwm', localPos: [-0.08, 0.16, -0.34] },
      { id: 'A4', label: 'A4/SDA', kind: 'bus', localPos: [0.18, 0.16, 0.34] },
      { id: 'A5', label: 'A5/SCL', kind: 'bus', localPos: [0.3, 0.16, 0.34] },
    ],
  },
  {
    id: 'arduino-mega-2560',
    name: 'Arduino Mega 2560 R3',
    group: 'boards',
    category: 'electronics',
    logicVoltage: '5 V',
    summary: 'High-pin-count ATmega2560 workhorse with 54 digital I/O, 16 analog pins, and 256 KB Flash.',
    defaultColor: '#00878f',
    specs: {
      mcu: 'ATmega2560',
      clock: '16 MHz',
      flash: '256 KB',
      ram: '8 KB',
      gpio: '54',
      analog: '16 × 10-bit',
      wireless: '—',
      size: '101.5 × 53.3 mm',
    },
    pins: [
      { id: '5V', label: '5V', kind: 'power', localPos: [-0.4, 0.25, 0.56] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [-0.28, 0.25, 0.56] },
      { id: 'D13', label: 'D13', kind: 'digital', localPos: [-0.72, 0.25, -0.56] },
      { id: 'D9', label: 'D9~', kind: 'pwm', localPos: [-0.24, 0.25, -0.56] },
      { id: 'SDA', label: 'SDA', kind: 'bus', localPos: [0.95, 0.25, -0.56] },
      { id: 'SCL', label: 'SCL', kind: 'bus', localPos: [1.07, 0.25, -0.56] },
    ],
  },
  {
    id: 'esp32-devkit-v1',
    name: 'ESP32 DevKit V1',
    group: 'boards',
    category: 'electronics',
    logicVoltage: '3.3 V',
    summary: 'Dual-core 240 MHz Wi-Fi + Bluetooth SoC with shielded RF can and gold PCB antenna.',
    defaultColor: '#27272a',
    specs: {
      mcu: 'ESP32 (2×LX6)',
      clock: '240 MHz',
      flash: '4 MB',
      ram: '520 KB',
      gpio: '25',
      analog: '15 + 2 DAC',
      wireless: 'Wi-Fi + BLE',
      size: '51 × 28 mm',
    },
    pins: [
      { id: '3V3', label: '3V3', kind: 'power', localPos: [0.46, 0.16, 0.44] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [0.34, 0.16, 0.44] },
      { id: 'D2', label: 'GPIO2', kind: 'pwm', localPos: [-0.14, 0.16, 0.44] },
      { id: 'D21', label: 'SDA/21', kind: 'bus', localPos: [0.08, 0.16, -0.44] },
      { id: 'D22', label: 'SCL/22', kind: 'bus', localPos: [0.22, 0.16, -0.44] },
      { id: 'D18', label: 'GPIO18', kind: 'digital', localPos: [-0.26, 0.16, -0.44] },
    ],
  },
  {
    id: 'nodemcu-esp8266',
    name: 'NodeMCU (ESP8266)',
    group: 'boards',
    category: 'electronics',
    logicVoltage: '3.3 V',
    summary: 'Low-cost ESP-12E Wi-Fi development board with Micro-USB & flash/reset buttons.',
    defaultColor: '#1e3a8a',
    specs: {
      mcu: 'ESP8266EX',
      clock: '80 MHz',
      flash: '4 MB',
      ram: '≈80 KB',
      gpio: '11',
      analog: '1 × 10-bit',
      wireless: 'Wi-Fi 802.11n',
      size: '49 × 24.5 mm',
    },
    pins: [
      { id: '3V3', label: '3V3', kind: 'power', localPos: [-0.36, 0.16, 0.44] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [-0.24, 0.16, 0.44] },
      { id: 'D4', label: 'D4/LED', kind: 'pwm', localPos: [0.24, 0.16, -0.44] },
      { id: 'D1', label: 'D1/SCL', kind: 'bus', localPos: [-0.14, 0.16, -0.44] },
      { id: 'D2', label: 'D2/SDA', kind: 'bus', localPos: [-0.02, 0.16, -0.44] },
    ],
  },
  {
    id: 'raspberry-pi-pico',
    name: 'Raspberry Pi Pico',
    group: 'boards',
    category: 'electronics',
    logicVoltage: '3.3 V',
    summary: 'Dual Cortex-M0+ RP2040 board with programmable PIO and castellated edge pads.',
    defaultColor: '#15803d',
    specs: {
      mcu: 'RP2040 (2×M0+)',
      clock: '133 MHz',
      flash: '2 MB',
      ram: '264 KB',
      gpio: '26',
      analog: '3 × 12-bit',
      wireless: '—',
      size: '51 × 21 mm',
    },
    pins: [
      { id: '3V3', label: '3V3', kind: 'power', localPos: [0.38, 0.12, 0.36] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [0.24, 0.12, 0.36] },
      { id: 'GP15', label: 'GP15', kind: 'pwm', localPos: [0.68, 0.12, -0.36] },
      { id: 'GP4', label: 'GP4/SDA', kind: 'bus', localPos: [-0.22, 0.12, -0.36] },
      { id: 'GP5', label: 'GP5/SCL', kind: 'bus', localPos: [-0.08, 0.12, -0.36] },
    ],
  },
  {
    id: 'stm32-blue-pill',
    name: 'STM32 Blue Pill',
    group: 'boards',
    category: 'electronics',
    logicVoltage: '3.3 V',
    summary: '72 MHz ARM Cortex-M3 STM32F103C8T6 board with yellow boot jumpers and SWD.',
    defaultColor: '#1d4ed8',
    specs: {
      mcu: 'STM32F103C8T6',
      clock: '72 MHz',
      flash: '64 KB',
      ram: '20 KB',
      gpio: '32',
      analog: '10 × 12-bit',
      wireless: '—',
      size: '53 × 22.8 mm',
    },
    pins: [
      { id: '3V3', label: '3V3', kind: 'power', localPos: [0.52, 0.16, 0.36] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [0.4, 0.16, 0.36] },
      { id: 'PC13', label: 'PC13', kind: 'digital', localPos: [-0.52, 0.16, -0.36] },
      { id: 'PB6', label: 'PB6/SCL', kind: 'bus', localPos: [-0.12, 0.16, 0.36] },
      { id: 'PB7', label: 'PB7/SDA', kind: 'bus', localPos: [0.0, 0.16, 0.36] },
    ],
  },
  {
    id: 'raspberry-pi-4',
    name: 'Raspberry Pi 4 Model B',
    group: 'boards',
    category: 'electronics',
    logicVoltage: '3.3 V',
    summary: 'Quad-core 1.5 GHz Linux single-board computer with Gigabit Ethernet, USB 3.0, and 40-pin GPIO.',
    defaultColor: '#166534',
    specs: {
      mcu: 'BCM2711 (4×A72)',
      clock: '1.5 GHz',
      flash: 'microSD',
      ram: '1–8 GB',
      gpio: '26 (40-pin)',
      analog: 'None (Ext ADC)',
      wireless: 'Wi-Fi 5 + BT 5.0',
      size: '85 × 56 mm',
    },
    pins: [
      { id: '5V', label: '5V', kind: 'power', localPos: [-0.66, 0.25, -0.58] },
      { id: '3V3', label: '3.3V', kind: 'power', localPos: [-0.78, 0.25, -0.48] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [-0.54, 0.25, -0.58] },
      { id: 'GPIO18', label: 'GPIO18', kind: 'pwm', localPos: [-0.36, 0.25, -0.58] },
      { id: 'SDA', label: 'GPIO2/SDA', kind: 'bus', localPos: [-0.66, 0.25, -0.48] },
      { id: 'SCL', label: 'GPIO3/SCL', kind: 'bus', localPos: [-0.54, 0.25, -0.48] },
    ],
  },

  // ---------- OUTPUTS (4) ----------
  {
    id: 'led-5mm-module',
    name: '5 mm LED Module',
    group: 'outputs',
    category: 'electronics',
    logicVoltage: '5 V',
    summary: 'Breakout module with integrated current-limiting resistor and 5mm indicator dome.',
    defaultColor: '#ef4444',
    specs: { mcu: 'Passive + Resistor', clock: '—', flash: '—', ram: '—', gpio: 'SIG, VCC, GND', analog: 'PWM dimmable', wireless: '—', size: '24 × 15 mm' },
    pins: [
      { id: 'SIG', label: 'SIG', kind: 'digital', localPos: [-0.34, 0.1, -0.14] },
      { id: 'VCC', label: 'VCC', kind: 'power', localPos: [-0.34, 0.1, 0] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [-0.34, 0.1, 0.14] },
    ],
  },
  {
    id: 'rgb-led-module',
    name: 'RGB LED Module',
    group: 'outputs',
    category: 'electronics',
    logicVoltage: '5 V',
    summary: 'Full-spectrum tri-channel LED dome with individual R, G, and B limiting resistors.',
    defaultColor: '#a855f7',
    specs: { mcu: 'Common-Cathode LED', clock: '—', flash: '—', ram: '—', gpio: 'R, G, B, GND', analog: '3× PWM mix', wireless: '—', size: '26 × 18 mm' },
    pins: [
      { id: 'R', label: 'R', kind: 'pwm', localPos: [-0.36, 0.1, -0.21] },
      { id: 'G', label: 'G', kind: 'pwm', localPos: [-0.36, 0.1, -0.07] },
      { id: 'B', label: 'B', kind: 'pwm', localPos: [-0.36, 0.1, 0.07] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [-0.36, 0.1, 0.21] },
    ],
  },
  {
    id: 'piezo-buzzer-module',
    name: 'Piezo Buzzer Module',
    group: 'outputs',
    category: 'electronics',
    logicVoltage: '5 V',
    summary: 'Transistor-driven acoustic piezo buzzer for tones, alerts, and PWM melodies.',
    defaultColor: '#3f3f46',
    specs: { mcu: 'Active/Passive Piezo', clock: '2–5 kHz', flash: '—', ram: '—', gpio: 'SIG, VCC, GND', analog: 'PWM tone()', wireless: '—', size: '28 × 18 mm' },
    pins: [
      { id: 'SIG', label: 'SIG', kind: 'pwm', localPos: [-0.36, 0.1, -0.14] },
      { id: 'VCC', label: 'VCC', kind: 'power', localPos: [-0.36, 0.1, 0] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [-0.36, 0.1, 0.14] },
    ],
  },
  {
    id: 'oled-ssd1306',
    name: 'OLED Display 0.96" (SSD1306)',
    group: 'outputs',
    category: 'electronics',
    logicVoltage: '3.3–5 V',
    summary: '128×64 crisp high-contrast I²C OLED panel mounted on navy carrier PCB.',
    defaultColor: '#22d3ee',
    specs: { mcu: 'SSD1306', clock: '400 kHz I²C', flash: '1 KB GDRAM', ram: '128×64 px', gpio: 'SDA, SCL', analog: '—', wireless: 'I²C 0x3C', size: '27 × 27 mm' },
    pins: [
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [-0.21, 0.12, -0.44] },
      { id: 'VCC', label: 'VCC', kind: 'power', localPos: [-0.07, 0.12, -0.44] },
      { id: 'SCL', label: 'SCL', kind: 'bus', localPos: [0.07, 0.12, -0.44] },
      { id: 'SDA', label: 'SDA', kind: 'bus', localPos: [0.21, 0.12, -0.44] },
    ],
  },

  // ---------- INPUTS (2) ----------
  {
    id: 'push-button-module',
    name: 'Push-Button Module',
    group: 'inputs',
    category: 'electronics',
    logicVoltage: '5 V',
    summary: 'Tactile 6×6mm switch with red plunger cap and pull-down resistor output.',
    defaultColor: '#dc2626',
    specs: { mcu: 'SPST Momentary', clock: '—', flash: '—', ram: '—', gpio: 'OUT, VCC, GND', analog: 'Digital LOW/HIGH', wireless: '—', size: '24 × 16 mm' },
    pins: [
      { id: 'OUT', label: 'OUT', kind: 'digital', localPos: [-0.34, 0.1, -0.14] },
      { id: 'VCC', label: 'VCC', kind: 'power', localPos: [-0.34, 0.1, 0] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [-0.34, 0.1, 0.14] },
    ],
  },
  {
    id: 'potentiometer-10k',
    name: 'Potentiometer Module (10 kΩ)',
    group: 'inputs',
    category: 'electronics',
    logicVoltage: '5 V',
    summary: 'Precision 10 kΩ rotary analog knob outputting continuous 0–VCC voltage.',
    defaultColor: '#f59e0b',
    specs: { mcu: '10 kΩ Linear Taper', clock: '—', flash: '—', ram: '—', gpio: 'OUT, VCC, GND', analog: '0…VCC continuous', wireless: '—', size: '28 × 22 mm' },
    pins: [
      { id: 'OUT', label: 'OUT', kind: 'analog', localPos: [-0.38, 0.1, -0.14] },
      { id: 'VCC', label: 'VCC', kind: 'power', localPos: [-0.38, 0.1, 0] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [-0.38, 0.1, 0.14] },
    ],
  },

  // ---------- SENSORS (3) ----------
  {
    id: 'hc-sr04-ultrasonic',
    name: 'HC-SR04 Ultrasonic Sensor',
    group: 'sensors',
    category: 'electronics',
    logicVoltage: '5 V',
    summary: 'Dual-transducer 40 kHz acoustic rangefinder measuring 2 cm – 400 cm.',
    defaultColor: '#1d4ed8',
    specs: { mcu: '40 kHz Echo DSP', clock: '4 MHz Xtal', flash: '—', ram: '—', gpio: 'TRIG, ECHO', analog: 'Time-of-Flight', wireless: 'Acoustic', size: '45 × 20 mm' },
    pins: [
      { id: 'VCC', label: 'VCC', kind: 'power', localPos: [-0.21, 0.14, 0.36] },
      { id: 'TRIG', label: 'TRIG', kind: 'digital', localPos: [-0.07, 0.14, 0.36] },
      { id: 'ECHO', label: 'ECHO', kind: 'digital', localPos: [0.07, 0.14, 0.36] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [0.21, 0.14, 0.36] },
    ],
  },
  {
    id: 'dht11-sensor',
    name: 'DHT11 Temp & Humidity Sensor',
    group: 'sensors',
    category: 'electronics',
    logicVoltage: '3.3–5 V',
    summary: 'Digital 1-wire environmental sensor with vented sky-blue capacitive/NTC housing.',
    defaultColor: '#0284c7',
    specs: { mcu: '8-bit Calibrated MCU', clock: '1 Hz sample', flash: '—', ram: '—', gpio: 'DATA, VCC, GND', analog: '20–90% RH / 0–50°C', wireless: '—', size: '28 × 12 mm' },
    pins: [
      { id: 'DATA', label: 'DATA', kind: 'digital', localPos: [-0.36, 0.1, -0.14] },
      { id: 'VCC', label: 'VCC', kind: 'power', localPos: [-0.36, 0.1, 0] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [-0.36, 0.1, 0.14] },
    ],
  },
  {
    id: 'ldr-photoresistor',
    name: 'Photoresistor (LDR) Module',
    group: 'sensors',
    category: 'electronics',
    logicVoltage: '3.3–5 V',
    summary: 'Cadmium-sulfide light sensor with LM393 comparator & threshold trimmer pot.',
    defaultColor: '#ea580c',
    specs: { mcu: 'LM393 Comparator', clock: '—', flash: '—', ram: '—', gpio: 'AO, DO, VCC, GND', analog: 'Analog AO + DO', wireless: '—', size: '32 × 14 mm' },
    pins: [
      { id: 'VCC', label: 'VCC', kind: 'power', localPos: [-0.46, 0.1, -0.21] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [-0.46, 0.1, -0.07] },
      { id: 'DO', label: 'DO', kind: 'digital', localPos: [-0.46, 0.1, 0.07] },
      { id: 'AO', label: 'AO', kind: 'analog', localPos: [-0.46, 0.1, 0.21] },
    ],
  },

  // ---------- ACTUATORS (3) ----------
  {
    id: 'sg90-micro-servo',
    name: 'SG90 Micro Servo',
    group: 'actuators',
    category: 'robotics',
    logicVoltage: '5 V',
    summary: 'Precision 0°–180° geared position actuator with white 4-blade control horn.',
    defaultColor: '#2563eb',
    specs: { mcu: 'Closed-Loop Analog IC', clock: '50 Hz PWM', flash: '—', ram: '—', gpio: 'PWM, VCC, GND', analog: '1.8 kg·cm torque', wireless: '—', size: '22.2 × 11.8 mm' },
    pins: [
      { id: 'PWM', label: 'PWM', kind: 'pwm', localPos: [-0.52, 0.12, -0.14] },
      { id: 'VCC', label: 'VCC', kind: 'power', localPos: [-0.52, 0.12, 0] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [-0.52, 0.12, 0.14] },
    ],
  },
  {
    id: 'tt-gear-motor-wheel',
    name: 'TT Gear Motor + Wheel',
    group: 'actuators',
    category: 'robotics',
    logicVoltage: '3–6 V',
    summary: 'Dual-shaft 1:48 yellow planetary/spur gearbox motor driving a 65mm rubber-tread wheel.',
    defaultColor: '#eab308',
    specs: { mcu: 'Brushed 130 DC + 1:48', clock: '200 RPM @ 6V', flash: '—', ram: '—', gpio: 'M+, M-', analog: '0.8 kg·cm @ 6V', wireless: '—', size: '70 × 22 mm' },
    pins: [
      { id: 'M+', label: 'M+', kind: 'power', localPos: [-0.72, 0.18, -0.1] },
      { id: 'M-', label: 'M-', kind: 'gnd', localPos: [-0.72, 0.18, 0.1] },
    ],
  },
  {
    id: 'l298n-motor-driver',
    name: 'L298N Motor Driver',
    group: 'actuators',
    category: 'robotics',
    logicVoltage: '5 V (up to 35V Motor)',
    summary: 'Dual full H-bridge driver with tall finned heatsink and high-current screw terminals.',
    defaultColor: '#dc2626',
    specs: { mcu: 'ST L298N Dual H-Bridge', clock: 'Up to 40 kHz PWM', flash: '—', ram: '—', gpio: 'IN1–4, ENA/B', analog: '2 A / channel', wireless: '—', size: '43 × 43 mm' },
    pins: [
      { id: 'IN1', label: 'IN1', kind: 'digital', localPos: [0.1, 0.16, 0.56] },
      { id: 'IN2', label: 'IN2', kind: 'digital', localPos: [0.22, 0.16, 0.56] },
      { id: 'ENA', label: 'ENA', kind: 'pwm', localPos: [-0.04, 0.16, 0.56] },
      { id: '12V', label: '+12V', kind: 'power', localPos: [-0.46, 0.22, 0.56] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [-0.34, 0.22, 0.56] },
    ],
  },

  // ---------- POWER & INTERFACE (2) ----------
  {
    id: 'battery-4xaa',
    name: '4 × AA Battery Holder',
    group: 'power',
    category: 'electronics',
    logicVoltage: '6 V Supply',
    summary: 'High-current 4-cell 6V battery bay for external servo and DC motor power rails.',
    defaultColor: '#f59e0b',
    specs: { mcu: '4× AA Series Pack', clock: '—', flash: '—', ram: '—', gpio: '+6V, GND', analog: '≈2500 mAh', wireless: '—', size: '62 × 58 mm' },
    pins: [
      { id: 'VCC', label: '+6V', kind: 'power', localPos: [-0.56, 0.18, -0.14] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [-0.56, 0.18, 0.14] },
    ],
  },
  {
    id: 'logic-level-converter',
    name: 'Logic Level Converter (4-Ch)',
    group: 'interface',
    category: 'electronics',
    logicVoltage: '3.3 V ↔ 5 V',
    summary: '4-channel BSS138 bidirectional I²C/SPI voltage translator linking 3.3V and 5V boards safely.',
    defaultColor: '#dc2626',
    specs: { mcu: '4× BSS138 MOSFET', clock: 'Bi-dir I²C/UART', flash: '—', ram: '—', gpio: 'HV1–4 ↔ LV1–4', analog: '3.3V ↔ 5V', wireless: '—', size: '16 × 13 mm' },
    pins: [
      { id: 'HV', label: 'HV (5V)', kind: 'power', localPos: [0, 0.14, -0.3] },
      { id: 'LV', label: 'LV (3.3V)', kind: 'power', localPos: [0, 0.14, 0.3] },
      { id: 'GND', label: 'GND', kind: 'gnd', localPos: [0.14, 0.14, 0.3] },
      { id: 'HV1', label: 'HV1', kind: 'bus', localPos: [-0.26, 0.14, -0.3] },
      { id: 'LV1', label: 'LV1', kind: 'bus', localPos: [-0.26, 0.14, 0.3] },
    ],
  },
];

export interface HardwareSubPart {
  geom: THREE.BufferGeometry;
  color: string;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  explodeLift?: number;
  calloutNumber?: number;
}

function makeBox(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string,
  opts: Partial<Omit<HardwareSubPart, 'geom' | 'color'>> = {}
): HardwareSubPart {
  const geom = new THREE.BoxGeometry(w, h, d);
  geom.translate(x, y, z);
  return { geom, color, ...opts };
}

function makeCyl(
  rTop: number,
  rBot: number,
  h: number,
  segs: number,
  x: number,
  y: number,
  z: number,
  color: string,
  rot: Vec3 = [0, 0, 0],
  opts: Partial<Omit<HardwareSubPart, 'geom' | 'color'>> = {}
): HardwareSubPart {
  const geom = new THREE.CylinderGeometry(rTop, rBot, h, segs);
  if (rot[0]) geom.rotateX(rot[0]);
  if (rot[1]) geom.rotateY(rot[1]);
  if (rot[2]) geom.rotateZ(rot[2]);
  geom.translate(x, y, z);
  return { geom, color, ...opts };
}

function makePcbNotched(w: number, d: number, thick: number, color: string, notched = false): HardwareSubPart {
  if (!notched) {
    return makeBox(w, thick, d, 0, thick * 0.5, 0, color, { metalness: 0.25, roughness: 0.45 });
  }
  const hw = w * 0.5;
  const hd = d * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hd);
  shape.lineTo(hw - 0.14, -hd);
  shape.lineTo(hw, -hd + 0.12);
  shape.lineTo(hw, hd - 0.22);
  shape.lineTo(hw - 0.1, hd - 0.14);
  shape.lineTo(hw - 0.1, hd);
  shape.lineTo(-hw, hd);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
  geom.rotateX(Math.PI / 2);
  geom.translate(0, thick, 0);
  geom.computeVertexNormals();
  return { geom, color, metalness: 0.28, roughness: 0.42 };
}

function addPinHeaderStrip(
  parts: HardwareSubPart[],
  count: number,
  startX: number,
  stepX: number,
  yBase: number,
  z: number,
  female: boolean,
  calloutNumber?: number
): void {
  const len = (count - 1) * Math.abs(stepX) + 0.12;
  const midX = startX + ((count - 1) * stepX) * 0.5;

  if (female) {
    parts.push(
      makeBox(len, 0.18, 0.11, midX, yBase + 0.09, z, '#111827', {
        roughness: 0.5,
        explodeLift: 0.28,
        calloutNumber,
      })
    );
    for (let i = 0; i < count; i++) {
      const px = startX + i * stepX;
      parts.push(
        makeBox(0.045, 0.03, 0.045, px, yBase + 0.185, z, '#facc15', {
          metalness: 0.85,
          roughness: 0.25,
          explodeLift: 0.28,
        }),
        makeCyl(0.015, 0.015, 0.08, 6, px, yBase - 0.06, z, '#cbd5e1', [0, 0, 0], {
          metalness: 0.85,
        })
      );
    }
  } else {
    parts.push(
      makeBox(len, 0.06, 0.09, midX, yBase + 0.03, z, '#111827', {
        roughness: 0.55,
        explodeLift: 0.22,
        calloutNumber,
      })
    );
    for (let i = 0; i < count; i++) {
      const px = startX + i * stepX;
      parts.push(
        makeCyl(0.016, 0.016, 0.22, 6, px, yBase + 0.1, z, '#eab308', [0, 0, 0], {
          metalness: 0.9,
          roughness: 0.2,
          explodeLift: 0.22,
        })
      );
    }
  }
}

function addIcPackage(
  parts: HardwareSubPart[],
  x: number,
  yBase: number,
  z: number,
  w: number,
  h: number,
  d: number,
  pinsPerSide: number,
  rotY = 0,
  explodeLift = 0.35,
  calloutNumber?: number
): void {
  const chip = new THREE.BoxGeometry(w, h, d);
  if (rotY) chip.rotateY(rotY);
  chip.translate(x, yBase + h * 0.5, z);
  parts.push({ geom: chip, color: '#111827', roughness: 0.5, metalness: 0.15, explodeLift, calloutNumber });

  // Silver pins along Z sides
  if (rotY === 0) {
    for (let i = 0; i < pinsPerSide; i++) {
      const px = x - w * 0.44 + (i / Math.max(1, pinsPerSide - 1)) * w * 0.88;
      parts.push(
        makeBox(0.024, 0.06, 0.04, px, yBase + 0.02, z + d * 0.5 + 0.02, '#cbd5e1', {
          metalness: 0.9,
          roughness: 0.2,
          explodeLift,
        }),
        makeBox(0.024, 0.06, 0.04, px, yBase + 0.02, z - d * 0.5 - 0.02, '#cbd5e1', {
          metalness: 0.9,
          roughness: 0.2,
          explodeLift,
        })
      );
    }
  } else {
    // 4-sided QFP rotated pins
    for (let s = 0; s < 4; s++) {
      const ang = rotY + (s * Math.PI) / 2;
      for (let i = 0; i < Math.min(8, pinsPerSide); i++) {
        const t = ((i + 0.5) / Math.min(8, pinsPerSide) - 0.5) * w * 0.8;
        const lx = Math.cos(ang) * (w * 0.54) - Math.sin(ang) * t;
        const lz = Math.sin(ang) * (w * 0.54) + Math.cos(ang) * t;
        const pinG = new THREE.BoxGeometry(0.04, 0.025, 0.02);
        pinG.rotateY(-ang);
        pinG.translate(x + lx, yBase + 0.015, z + lz);
        parts.push({ geom: pinG, color: '#cbd5e1', metalness: 0.9, explodeLift });
      }
    }
  }
}

function addGoldPads(parts: HardwareSubPart[], coords: [number, number][], y: number): void {
  for (const [px, pz] of coords) {
    parts.push(makeCyl(0.048, 0.048, 0.016, 12, px, y, pz, '#eab308', [0, 0, 0], { metalness: 0.9 }));
  }
}

function addRightAngle3Or4Pins(
  parts: HardwareSubPart[],
  count: number,
  xEdge: number,
  y: number,
  zStep = 0.14
): void {
  const span = count * zStep + 0.06;
  parts.push(makeBox(0.07, 0.09, span, xEdge, y + 0.045, 0, '#111827', { roughness: 0.55 }));
  const z0 = -((count - 1) * zStep) * 0.5;
  for (let i = 0; i < count; i++) {
    parts.push(
      makeCyl(0.016, 0.016, 0.22, 6, xEdge - 0.08, y + 0.045, z0 + i * zStep, '#eab308', [0, 0, Math.PI / 2], {
        metalness: 0.9,
        roughness: 0.2,
      })
    );
  }
}

function collectHardwareSubParts(specId: string): HardwareSubPart[] {
  const parts: HardwareSubPart[] = [];

  switch (specId) {
    case 'arduino-uno-r3': {
      parts.push(makePcbNotched(2.2, 1.48, 0.07, '#00878f', true));
      addGoldPads(parts, [[-0.96, -0.58], [0.96, -0.52], [0.96, 0.58], [-0.4, 0.62]], 0.075);

      // 2. USB-B Connector
      parts.push(
        makeBox(0.42, 0.3, 0.36, -0.95, 0.22, -0.26, '#d4d4d8', { metalness: 0.88, roughness: 0.22, explodeLift: 0.4, calloutNumber: 2 }),
        makeBox(0.08, 0.18, 0.22, -1.13, 0.21, -0.26, '#09090b', { explodeLift: 0.4 })
      );
      // 4. Barrel Jack
      parts.push(
        makeBox(0.4, 0.28, 0.28, -0.92, 0.21, 0.36, '#18181b', { roughness: 0.55, explodeLift: 0.36, calloutNumber: 4 }),
        makeCyl(0.09, 0.09, 0.12, 16, -1.1, 0.21, 0.36, '#09090b', [0, 0, Math.PI / 2], { explodeLift: 0.36 }),
        makeCyl(0.025, 0.025, 0.14, 10, -1.1, 0.21, 0.36, '#eab308', [0, 0, Math.PI / 2], { metalness: 0.9, explodeLift: 0.36 })
      );
      // 1. Socketed DIP-28 ATmega328P
      parts.push(makeBox(1.06, 0.07, 0.34, 0.32, 0.105, 0.14, '#18181b', { roughness: 0.55, explodeLift: 0.18 }));
      addIcPackage(parts, 0.32, 0.135, 0.14, 1.0, 0.09, 0.24, 14, 0, 0.42, 1);
      // 3. ATmega16U2 USB bridge + 14. 16 MHz crystal + 5. NCP1117 regulator
      addIcPackage(parts, -0.48, 0.07, -0.18, 0.18, 0.05, 0.18, 4, Math.PI / 4, 0.25, 3);
      parts.push(makeCyl(0.06, 0.06, 0.16, 12, -0.46, 0.11, -0.01, '#e2e8f0', [0, 0, Math.PI / 2], { metalness: 0.9, roughness: 0.2, explodeLift: 0.28, calloutNumber: 14 }));
      parts.push(makeBox(0.2, 0.06, 0.14, -0.62, 0.1, 0.34, '#111827', { explodeLift: 0.25, calloutNumber: 5 }));
      // 6. Dual 47uF caps
      parts.push(
        makeCyl(0.085, 0.085, 0.22, 16, -0.52, 0.18, 0.16, '#d4d4d8', [0, 0, 0], { metalness: 0.85, roughness: 0.22, explodeLift: 0.32, calloutNumber: 6 }),
        makeCyl(0.085, 0.085, 0.22, 16, -0.32, 0.18, 0.16, '#d4d4d8', [0, 0, 0], { metalness: 0.85, roughness: 0.22, explodeLift: 0.32 })
      );
      // 7, 8, 9. Female header rows
      addPinHeaderStrip(parts, 10, -0.68, 0.12, 0.07, -0.56, true, 7);
      addPinHeaderStrip(parts, 8, 0.56, 0.06, 0.07, -0.56, true);
      addPinHeaderStrip(parts, 6, -0.34, 0.11, 0.07, 0.56, true, 8);
      addPinHeaderStrip(parts, 6, 0.36, 0.11, 0.07, 0.56, true, 9);
      // 10, 11, 12. Status LEDs
      parts.push(
        makeBox(0.07, 0.04, 0.04, -0.24, 0.09, -0.35, '#f59e0b', { emissive: '#f59e0b', emissiveIntensity: 0.9, calloutNumber: 10 }),
        makeBox(0.07, 0.04, 0.04, -0.24, 0.09, -0.22, '#22d3ee', { emissive: '#22d3ee', emissiveIntensity: 0.4, calloutNumber: 11 }),
        makeBox(0.07, 0.04, 0.04, 0.68, 0.09, -0.28, '#22c55e', { emissive: '#22c55e', emissiveIntensity: 1.0, calloutNumber: 12 })
      );
      // 13. Reset switch & 15. ICSP header
      parts.push(
        makeBox(0.16, 0.06, 0.14, -0.88, 0.1, -0.55, '#cbd5e1', { metalness: 0.8, explodeLift: 0.26, calloutNumber: 13 }),
        makeCyl(0.045, 0.045, 0.05, 14, -0.88, 0.15, -0.55, '#ef4444', [0, 0, 0], { explodeLift: 0.26 })
      );
      addPinHeaderStrip(parts, 3, 0.86, 0.09, 0.07, -0.05, false, 15);
      addPinHeaderStrip(parts, 3, 0.86, 0.09, 0.07, 0.05, false);
      break;
    }

    case 'arduino-nano': {
      parts.push(makePcbNotched(1.65, 0.78, 0.06, '#1d4ed8'));
      parts.push(makeBox(0.28, 0.16, 0.24, -0.76, 0.14, 0, '#d4d4d8', { metalness: 0.88, roughness: 0.22, explodeLift: 0.35 }));
      addIcPackage(parts, 0.05, 0.06, 0, 0.34, 0.05, 0.34, 8, Math.PI / 4, 0.35);
      addPinHeaderStrip(parts, 14, -0.68, 0.105, -0.02, 0.31, false);
      addPinHeaderStrip(parts, 14, -0.68, 0.105, -0.02, -0.31, false);
      parts.push(makeBox(0.14, 0.06, 0.12, -0.15, 0.09, -0.16, '#f8fafc', { explodeLift: 0.24 }));
      parts.push(makeBox(0.06, 0.04, 0.04, -0.34, 0.08, 0.14, '#22c55e', { emissive: '#22c55e', emissiveIntensity: 0.85 }));
      break;
    }

    case 'arduino-mega-2560': {
      parts.push(makePcbNotched(2.75, 1.5, 0.07, '#00878f', true));
      parts.push(
        makeBox(0.42, 0.3, 0.36, -1.24, 0.22, -0.26, '#d4d4d8', { metalness: 0.88, explodeLift: 0.38 }),
        makeBox(0.4, 0.28, 0.28, -1.22, 0.21, 0.36, '#18181b', { explodeLift: 0.35 })
      );
      addIcPackage(parts, -0.1, 0.07, 0.02, 0.44, 0.07, 0.44, 12, 0, 0.38);
      addPinHeaderStrip(parts, 18, -0.92, 0.1, 0.07, -0.58, true);
      addPinHeaderStrip(parts, 16, -0.72, 0.1, 0.07, 0.58, true);
      // Signature 2x18 rear female header bank
      addPinHeaderStrip(parts, 16, 1.05, 0.01, 0.07, -0.45, true);
      parts.push(makeBox(0.24, 0.18, 1.15, 1.15, 0.16, 0.0, '#111827', { explodeLift: 0.26 }));
      parts.push(
        makeCyl(0.08, 0.08, 0.2, 16, -0.74, 0.17, 0.2, '#d4d4d8', [0, 0, 0], { metalness: 0.85, explodeLift: 0.3 }),
        makeCyl(0.08, 0.08, 0.2, 16, -0.54, 0.17, 0.2, '#d4d4d8', [0, 0, 0], { metalness: 0.85, explodeLift: 0.3 })
      );
      break;
    }

    case 'esp32-devkit-v1': {
      parts.push(makePcbNotched(1.85, 1.0, 0.06, '#18181b'));
      // Exposed right antenna end with gold PCB serpentine
      parts.push(makeBox(0.32, 0.065, 0.72, 0.72, 0.035, 0, '#09090b'));
      parts.push(makeBox(0.22, 0.072, 0.48, 0.74, 0.036, 0, '#eab308', { metalness: 0.85 }));
      // ESP-WROOM-32 silver RF shield
      parts.push(makeBox(0.68, 0.14, 0.72, 0.24, 0.13, 0, '#cbd5e1', { metalness: 0.9, roughness: 0.22, explodeLift: 0.36 }));
      parts.push(makeBox(0.24, 0.12, 0.22, -0.84, 0.12, 0, '#e2e8f0', { metalness: 0.88, explodeLift: 0.3 }));
      addIcPackage(parts, -0.42, 0.06, 0, 0.18, 0.05, 0.18, 4, 0, 0.25);
      addPinHeaderStrip(parts, 15, -0.72, 0.1, -0.02, 0.42, false);
      addPinHeaderStrip(parts, 15, -0.72, 0.1, -0.02, -0.42, false);
      parts.push(
        makeBox(0.12, 0.06, 0.12, -0.68, 0.09, -0.24, '#e2e8f0', { explodeLift: 0.22 }),
        makeBox(0.12, 0.06, 0.12, -0.68, 0.09, 0.24, '#e2e8f0', { explodeLift: 0.22 }),
        makeBox(0.06, 0.04, 0.04, -0.54, 0.08, 0.22, '#ef4444', { emissive: '#ef4444', emissiveIntensity: 0.9 })
      );
      break;
    }

    case 'nodemcu-esp8266': {
      parts.push(makePcbNotched(1.85, 1.0, 0.06, '#172554'));
      parts.push(makeBox(0.62, 0.14, 0.66, 0.34, 0.13, 0, '#d4d4d8', { metalness: 0.88, roughness: 0.24, explodeLift: 0.36 }));
      parts.push(makeBox(0.22, 0.072, 0.48, 0.78, 0.036, 0, '#eab308', { metalness: 0.85 }));
      parts.push(makeBox(0.24, 0.12, 0.24, -0.84, 0.12, 0, '#cbd5e1', { metalness: 0.88 }));
      addIcPackage(parts, -0.35, 0.06, 0.06, 0.18, 0.05, 0.18, 4, 0, 0.24);
      addPinHeaderStrip(parts, 15, -0.72, 0.1, -0.02, 0.42, false);
      addPinHeaderStrip(parts, 15, -0.72, 0.1, -0.02, -0.42, false);
      parts.push(
        makeBox(0.12, 0.07, 0.12, -0.64, 0.095, -0.25, '#f8fafc', { explodeLift: 0.22 }),
        makeBox(0.12, 0.07, 0.12, -0.64, 0.095, 0.25, '#f8fafc', { explodeLift: 0.22 })
      );
      break;
    }

    case 'raspberry-pi-pico': {
      parts.push(makePcbNotched(1.82, 0.82, 0.06, '#15803d'));
      // Castellated gold edge pads
      for (let i = 0; i < 16; i++) {
        const px = -0.75 + i * 0.1;
        parts.push(
          makeBox(0.055, 0.066, 0.07, px, 0.033, 0.39, '#eab308', { metalness: 0.9 }),
          makeBox(0.055, 0.066, 0.07, px, 0.033, -0.39, '#eab308', { metalness: 0.9 })
        );
      }
      addIcPackage(parts, 0.0, 0.06, 0, 0.28, 0.05, 0.28, 6, Math.PI / 4, 0.34);
      parts.push(
        makeBox(0.24, 0.12, 0.24, -0.82, 0.12, 0, '#cbd5e1', { metalness: 0.88, explodeLift: 0.3 }),
        makeBox(0.14, 0.07, 0.12, -0.42, 0.095, -0.1, '#f8fafc', { explodeLift: 0.25 })
      );
      break;
    }

    case 'stm32-blue-pill': {
      parts.push(makePcbNotched(1.85, 0.84, 0.06, '#1e40af'));
      addIcPackage(parts, 0.05, 0.06, 0, 0.32, 0.055, 0.32, 8, Math.PI / 4, 0.34);
      // Iconic yellow boot jumpers
      parts.push(
        makeBox(0.22, 0.15, 0.18, -0.38, 0.13, -0.1, '#facc15', { roughness: 0.35, explodeLift: 0.28 }),
        makeBox(0.22, 0.15, 0.18, -0.38, 0.13, 0.12, '#facc15', { roughness: 0.35, explodeLift: 0.28 })
      );
      parts.push(
        makeCyl(0.05, 0.05, 0.14, 12, -0.18, 0.1, 0.2, '#e2e8f0', [0, 0, Math.PI / 2], { metalness: 0.9 }),
        makeBox(0.24, 0.12, 0.24, -0.84, 0.12, 0, '#cbd5e1', { metalness: 0.88 })
      );
      addPinHeaderStrip(parts, 16, -0.74, 0.1, -0.02, 0.35, false);
      addPinHeaderStrip(parts, 16, -0.74, 0.1, -0.02, -0.35, false);
      break;
    }

    case 'raspberry-pi-4': {
      parts.push(makePcbNotched(2.4, 1.62, 0.07, '#166534'));
      addGoldPads(parts, [[-1.08, -0.7], [-1.08, 0.7], [0.55, -0.7], [0.55, 0.7]], 0.075);
      // BCM2711 silver SoC heatspreader + LPDDR4 SDRAM
      parts.push(
        makeBox(0.42, 0.08, 0.42, -0.25, 0.11, -0.05, '#e2e8f0', { metalness: 0.88, roughness: 0.2, explodeLift: 0.32 }),
        makeBox(0.32, 0.06, 0.22, -0.25, 0.1, 0.35, '#111827', { explodeLift: 0.25 })
      );
      // Stacked RJ45 + Dual USB 3.0 (blue) + Dual USB 2.0 (black)
      parts.push(
        makeBox(0.55, 0.36, 0.44, 0.96, 0.25, 0.48, '#cbd5e1', { metalness: 0.85, roughness: 0.24, explodeLift: 0.35 }),
        makeBox(0.5, 0.42, 0.38, 0.98, 0.28, -0.02, '#cbd5e1', { metalness: 0.85, explodeLift: 0.35 }),
        makeBox(0.06, 0.3, 0.28, 1.21, 0.28, -0.02, '#2563eb'),
        makeBox(0.5, 0.42, 0.38, 0.98, 0.28, -0.5, '#cbd5e1', { metalness: 0.85, explodeLift: 0.35 }),
        makeBox(0.06, 0.3, 0.28, 1.21, 0.28, -0.5, '#18181b')
      );
      // Dual 20-pin 40-pin GPIO rail
      addPinHeaderStrip(parts, 18, -0.92, 0.09, 0.07, -0.64, false);
      addPinHeaderStrip(parts, 18, -0.92, 0.09, 0.07, -0.52, false);
      // USB-C + Dual Micro-HDMI + AV Jack along bottom edge
      parts.push(
        makeBox(0.24, 0.12, 0.22, -0.82, 0.13, 0.74, '#cbd5e1', { metalness: 0.88 }),
        makeBox(0.2, 0.1, 0.18, -0.45, 0.12, 0.74, '#cbd5e1', { metalness: 0.88 }),
        makeBox(0.2, 0.1, 0.18, -0.15, 0.12, 0.74, '#cbd5e1', { metalness: 0.88 }),
        makeCyl(0.09, 0.09, 0.32, 16, 0.22, 0.16, 0.66, '#18181b', [Math.PI / 2, 0, 0])
      );
      break;
    }

    // ---------- OUTPUTS ----------
    case 'led-5mm-module': {
      parts.push(makePcbNotched(0.66, 0.48, 0.055, '#18181b'));
      addRightAngle3Or4Pins(parts, 3, -0.34, 0.055);
      parts.push(
        makeCyl(0.16, 0.16, 0.07, 20, 0.12, 0.09, 0, '#b91c1c'),
        makeCyl(0.135, 0.135, 0.22, 20, 0.12, 0.23, 0, '#ef4444', [0, 0, 0], { emissive: '#ef4444', emissiveIntensity: 0.75 }),
        { geom: (() => { const g = new THREE.SphereGeometry(0.135, 20, 14); g.translate(0.12, 0.34, 0); return g; })(), color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 0.75 }
      );
      parts.push(makeBox(0.08, 0.04, 0.05, -0.1, 0.075, 0, '#1e293b'));
      break;
    }

    case 'rgb-led-module': {
      parts.push(makePcbNotched(0.7, 0.64, 0.055, '#18181b'));
      addRightAngle3Or4Pins(parts, 4, -0.36, 0.055);
      parts.push(
        makeCyl(0.16, 0.16, 0.07, 20, 0.14, 0.09, 0, '#cbd5e1'),
        makeCyl(0.135, 0.135, 0.22, 20, 0.14, 0.23, 0, '#a855f7', [0, 0, 0], { emissive: '#a855f7', emissiveIntensity: 0.75 }),
        { geom: (() => { const g = new THREE.SphereGeometry(0.135, 20, 14); g.translate(0.14, 0.34, 0); return g; })(), color: '#22d3ee', emissive: '#22d3ee', emissiveIntensity: 0.6 }
      );
      parts.push(
        makeBox(0.09, 0.03, 0.04, -0.1, 0.07, -0.14, '#ef4444'),
        makeBox(0.09, 0.03, 0.04, -0.1, 0.07, 0, '#22c55e'),
        makeBox(0.09, 0.03, 0.04, -0.1, 0.07, 0.14, '#3b82f6')
      );
      break;
    }

    case 'piezo-buzzer-module': {
      parts.push(makePcbNotched(0.7, 0.56, 0.055, '#18181b'));
      addRightAngle3Or4Pins(parts, 3, -0.36, 0.055);
      parts.push(
        makeCyl(0.24, 0.24, 0.28, 24, 0.1, 0.195, 0, '#27272a', [0, 0, 0], { roughness: 0.45 }),
        makeCyl(0.07, 0.07, 0.04, 16, 0.1, 0.325, 0, '#cbd5e1', [0, 0, 0], { metalness: 0.85 })
      );
      break;
    }

    case 'oled-ssd1306': {
      parts.push(makePcbNotched(0.92, 0.94, 0.055, '#1e3a8a'));
      addPinHeaderStrip(parts, 4, -0.21, 0.14, 0.055, -0.39, false);
      // Obsidian glass OLED display panel with lit readout stripe
      parts.push(
        makeBox(0.84, 0.08, 0.62, 0, 0.095, 0.06, '#020617', { roughness: 0.15, metalness: 0.2 }),
        makeBox(0.68, 0.086, 0.1, 0, 0.096, -0.08, '#facc15', { emissive: '#facc15', emissiveIntensity: 0.85 }),
        makeBox(0.68, 0.086, 0.26, 0, 0.096, 0.12, '#22d3ee', { emissive: '#22d3ee', emissiveIntensity: 0.65 }),
        makeBox(0.32, 0.02, 0.12, 0, 0.07, 0.42, '#d97706')
      );
      break;
    }

    // ---------- INPUTS ----------
    case 'push-button-module': {
      parts.push(makePcbNotched(0.66, 0.52, 0.055, '#18181b'));
      addRightAngle3Or4Pins(parts, 3, -0.34, 0.055);
      parts.push(
        makeBox(0.28, 0.12, 0.28, 0.08, 0.115, 0, '#cbd5e1', { metalness: 0.8 }),
        makeBox(0.22, 0.14, 0.22, 0.08, 0.12, 0, '#27272a'),
        makeCyl(0.085, 0.085, 0.16, 18, 0.08, 0.24, 0, '#ef4444', [0, 0, 0], { roughness: 0.35 })
      );
      break;
    }

    case 'potentiometer-10k': {
      parts.push(makePcbNotched(0.74, 0.64, 0.055, '#18181b'));
      addRightAngle3Or4Pins(parts, 3, -0.38, 0.055);
      parts.push(
        makeCyl(0.22, 0.22, 0.16, 20, 0.1, 0.135, 0, '#2563eb'),
        makeCyl(0.11, 0.11, 0.12, 16, 0.1, 0.27, 0, '#cbd5e1', [0, 0, 0], { metalness: 0.85 }),
        makeCyl(0.085, 0.085, 0.26, 16, 0.1, 0.42, 0, '#e2e8f0', [0, 0, 0], { metalness: 0.88 }),
        makeBox(0.04, 0.04, 0.15, 0.1, 0.55, 0.04, '#f97316')
      );
      break;
    }

    // ---------- SENSORS ----------
    case 'hc-sr04-ultrasonic': {
      parts.push(makePcbNotched(1.52, 0.72, 0.06, '#1d4ed8'));
      addPinHeaderStrip(parts, 4, -0.21, 0.14, 0.06, 0.3, false);
      // Twin ultrasonic transducer cylinders
      for (const sx of [-0.46, 0.46]) {
        parts.push(
          makeCyl(0.28, 0.28, 0.4, 24, sx, 0.26, -0.02, '#e2e8f0', [0, 0, 0], { metalness: 0.88, roughness: 0.2 }),
          makeCyl(0.22, 0.22, 0.06, 20, sx, 0.445, -0.02, '#0f172a', [0, 0, 0], { roughness: 0.8 }),
          makeCyl(0.08, 0.08, 0.07, 14, sx, 0.45, -0.02, '#94a3b8', [0, 0, 0], { metalness: 0.8 })
        );
      }
      // 4 MHz silver crystal can
      parts.push(makeCyl(0.055, 0.055, 0.18, 12, 0, 0.11, -0.18, '#e2e8f0', [0, 0, Math.PI / 2], { metalness: 0.9 }));
      break;
    }

    case 'dht11-sensor': {
      parts.push(makePcbNotched(0.7, 0.52, 0.055, '#18181b'));
      addRightAngle3Or4Pins(parts, 3, -0.36, 0.055);
      parts.push(makeBox(0.38, 0.34, 0.42, 0.1, 0.225, 0, '#0284c7', { roughness: 0.35 }));
      // Perforated vent slats
      for (let i = -1; i <= 1; i++) {
        parts.push(makeBox(0.39, 0.04, 0.26, 0.1, 0.225 + i * 0.08, 0, '#082f49'));
      }
      break;
    }

    case 'ldr-photoresistor': {
      parts.push(makePcbNotched(0.92, 0.48, 0.055, '#1d4ed8'));
      addRightAngle3Or4Pins(parts, 4, -0.46, 0.055);
      // Elevated CdS photoresistor head + blue trimmer potentiometer + LM393 chip
      parts.push(
        makeCyl(0.11, 0.11, 0.06, 18, 0.34, 0.22, 0, '#ea580c'),
        makeCyl(0.02, 0.02, 0.16, 6, 0.34, 0.14, 0.05, '#cbd5e1', [0, 0, 0], { metalness: 0.9 }),
        makeCyl(0.02, 0.02, 0.16, 6, 0.34, 0.14, -0.05, '#cbd5e1', [0, 0, 0], { metalness: 0.9 }),
        makeBox(0.24, 0.2, 0.24, -0.06, 0.15, 0.08, '#0284c7'),
        makeCyl(0.055, 0.055, 0.03, 12, -0.06, 0.26, 0.08, '#eab308', [0, 0, 0], { metalness: 0.9 }),
        makeBox(0.18, 0.05, 0.16, -0.12, 0.08, -0.14, '#111827')
      );
      break;
    }

    // ---------- ACTUATORS ----------
    case 'sg90-micro-servo': {
      // Iconic translucent cobalt SG90 body + mounting flange + top gear tower + white cross horn
      parts.push(
        makeBox(0.84, 0.72, 0.44, 0, 0.36, 0, '#2563eb', { roughness: 0.28 }),
        makeBox(1.18, 0.09, 0.44, 0, 0.56, 0, '#2563eb', { roughness: 0.28 }),
        makeCyl(0.21, 0.21, 0.18, 20, 0.2, 0.78, 0, '#1d4ed8'),
        makeCyl(0.09, 0.09, 0.14, 16, 0.2, 0.9, 0, '#f8fafc'),
        makeBox(0.68, 0.06, 0.14, 0.2, 0.96, 0, '#f8fafc'),
        makeBox(0.14, 0.06, 0.68, 0.2, 0.96, 0, '#f8fafc')
      );
      addRightAngle3Or4Pins(parts, 3, -0.52, 0.12);
      break;
    }

    case 'tt-gear-motor-wheel': {
      // Yellow 1:48 TT gearbox + Silver 130 DC Motor + 65mm Black Tire + Yellow 5-spoke Wheel
      parts.push(
        makeBox(0.76, 0.44, 0.42, -0.15, 0.38, 0, '#eab308', { roughness: 0.35 }),
        makeCyl(0.18, 0.18, 0.52, 18, -0.68, 0.38, 0, '#cbd5e1', [0, 0, Math.PI / 2], { metalness: 0.85 }),
        makeBox(0.12, 0.34, 0.32, -0.94, 0.38, 0, '#f8fafc'),
        // Wheel axle + Yellow hub + Black rubber tire
        makeCyl(0.07, 0.07, 0.32, 12, 0.1, 0.38, 0.34, '#f8fafc', [Math.PI / 2, 0, 0]),
        makeCyl(0.5, 0.5, 0.34, 28, 0.1, 0.56, 0.58, '#eab308', [Math.PI / 2, 0, 0]),
        makeCyl(0.64, 0.64, 0.38, 28, 0.1, 0.56, 0.58, '#18181b', [Math.PI / 2, 0, 0], { roughness: 0.85 }),
        makeCyl(0.46, 0.46, 0.41, 24, 0.1, 0.56, 0.58, '#eab308', [Math.PI / 2, 0, 0])
      );
      break;
    }

    case 'l298n-motor-driver': {
      parts.push(makePcbNotched(1.36, 1.36, 0.07, '#dc2626'));
      // Tall multi-fin black heatsink + L298N IC
      parts.push(makeBox(0.76, 0.68, 0.24, 0, 0.41, -0.2, '#18181b', { metalness: 0.65, roughness: 0.35 }));
      for (let i = -2; i <= 2; i++) {
        parts.push(makeBox(0.1, 0.68, 0.18, i * 0.15, 0.41, -0.38, '#27272a', { metalness: 0.7 }));
      }
      // Three blue screw terminal blocks
      parts.push(
        makeBox(0.32, 0.28, 0.26, -0.5, 0.21, 0, '#0284c7'),
        makeBox(0.32, 0.28, 0.26, 0.5, 0.21, 0, '#0284c7'),
        makeBox(0.42, 0.28, 0.26, -0.36, 0.21, 0.52, '#0284c7'),
        // Dual smoothing capacitors
        makeCyl(0.1, 0.1, 0.28, 16, -0.22, 0.21, 0.24, '#18181b'),
        makeCyl(0.1, 0.1, 0.28, 16, 0.1, 0.21, 0.24, '#18181b')
      );
      addPinHeaderStrip(parts, 6, -0.02, 0.09, 0.07, 0.54, false);
      break;
    }

    // ---------- POWER & INTERFACE ----------
    case 'battery-4xaa': {
      parts.push(
        makeBox(1.56, 0.22, 1.44, 0, 0.11, 0, '#18181b', { roughness: 0.6 }),
        makeBox(0.08, 0.38, 1.44, -0.74, 0.19, 0, '#18181b'),
        makeBox(0.08, 0.38, 1.44, 0.74, 0.19, 0, '#18181b')
      );
      for (let i = 0; i < 4; i++) {
        const pz = -0.5 + i * 0.335;
        parts.push(
          makeCyl(0.15, 0.15, 1.05, 18, -0.1, 0.26, pz, '#111827', [0, 0, Math.PI / 2], { roughness: 0.45 }),
          makeCyl(0.152, 0.152, 0.28, 18, 0.35, 0.26, pz, '#f59e0b', [0, 0, Math.PI / 2], { metalness: 0.4 }),
          makeCyl(0.06, 0.06, 0.08, 12, 0.5, 0.26, pz, '#cbd5e1', [0, 0, Math.PI / 2], { metalness: 0.9 })
        );
      }
      addRightAngle3Or4Pins(parts, 2, -0.56, 0.18, 0.26);
      break;
    }

    case 'logic-level-converter': {
      parts.push(makePcbNotched(0.76, 0.68, 0.055, '#dc2626'));
      addPinHeaderStrip(parts, 6, -0.25, 0.1, -0.02, -0.27, false);
      addPinHeaderStrip(parts, 6, -0.25, 0.1, -0.02, 0.27, false);
      for (let i = 0; i < 4; i++) {
        const px = -0.22 + i * 0.145;
        parts.push(
          makeBox(0.08, 0.04, 0.06, px, 0.075, 0, '#111827'),
          makeBox(0.06, 0.03, 0.04, px, 0.07, -0.12, '#0f172a'),
          makeBox(0.06, 0.03, 0.04, px, 0.07, 0.12, '#0f172a')
        );
      }
      break;
    }

    default: {
      parts.push(makeBox(1.2, 0.12, 0.8, 0, 0.06, 0, '#00878f'));
      break;
    }
  }

  return parts;
}

/**
 * Stamps per-vertex RGB color on a non-indexed BufferGeometry so multi-material
 * merged parts preserve distinct PCB, silver, black epoxy, gold, and rubber colors.
 */
export function paintGeometry(geom: THREE.BufferGeometry, hexColor: string): THREE.BufferGeometry {
  const g = geom.index ? geom.toNonIndexed() : geom;
  if (!g.getAttribute('normal')) {
    g.computeVertexNormals();
  }
  if (g.getAttribute('uv')) {
    g.deleteAttribute('uv');
  }
  const pos = g.getAttribute('position');
  const col = new THREE.Color(hexColor);
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return g;
}

export function buildRoboticsHardwareGeometry(id: string): THREE.BufferGeometry {
  const subParts = collectHardwareSubParts(id);
  const painted = subParts.map((sp) => {
    const pg = paintGeometry(sp.geom, sp.color);
    if (pg !== sp.geom) sp.geom.dispose();
    return pg;
  });

  const merged = mergeGeometries(painted, false) ?? new THREE.BoxGeometry(1.2, 0.2, 0.8);
  painted.forEach((p) => p.dispose());
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

export function buildRoboticsHardwareGroup(
  id: string,
  options: { exploded?: number; onCalloutObject?: boolean } = {}
): { group: THREE.Group; disposables: Array<{ dispose: () => void }> } {
  const exploded = Math.max(0, Math.min(1, options.exploded ?? 0));
  const subParts = collectHardwareSubParts(id);
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  for (const sp of subParts) {
    const mat = new THREE.MeshStandardMaterial({
      color: sp.color,
      metalness: sp.metalness ?? 0.2,
      roughness: sp.roughness ?? 0.45,
      emissive: sp.emissive ?? '#000000',
      emissiveIntensity: sp.emissiveIntensity ?? 0,
    });
    const mesh = new THREE.Mesh(sp.geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (exploded > 0 && sp.explodeLift) {
      mesh.position.y += sp.explodeLift * exploded;
    }
    if (sp.calloutNumber !== undefined) {
      mesh.userData.calloutNumber = sp.calloutNumber;
    }
    group.add(mesh);
    disposables.push(sp.geom, mat);
  }

  return { group, disposables };
}
