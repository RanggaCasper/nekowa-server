# WhatsApp Gateway Multi-Device API

![WhatsApp Gateway](https://img.shields.io/badge/WhatsApp-Gateway-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)

WhatsApp Gateway dengan dukungan Multi-Device menggunakan Baileys. API ini memungkinkan Anda untuk mengirim dan menerima pesan WhatsApp melalui HTTP REST API.

## 🚀 Fitur

- ✅ **Multi-Device Support** - Mendukung WhatsApp Multi-Device
- ✅ **Session Management** - Kelola multiple session WhatsApp
- ✅ **Media Support** - Kirim gambar, video, audio, dokumen, dan lokasi
- ✅ **Broadcast Messages** - Kirim pesan ke multiple nomor
- ✅ **Webhook Support** - Terima notifikasi real-time
- ✅ **QR Code Authentication** - Mudah untuk setup
- ✅ **Auto Reconnect** - Otomatis reconnect saat disconnected

## 📋 Prerequisites

- Node.js >= 16.0.0
- npm atau yarn
- WhatsApp account

## 🛠️ Installation

1. Clone repository
```bash
git clone https://github.com/RanggaCasper/nekowa-server.git
cd nekowa-server
```

2. Install dependencies
```bash
npm install
```

3. Copy environment file
```bash
cp .env.example .env
```

4. Start the server
```bash
npm start
```

## 🔧 Quick Start

### 1. Buat Session Baru

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "my-session"}'
```

### 2. Dapatkan QR Code

```bash
curl http://localhost:3000/api/sessions/my-session
```

### 3. Scan QR Code dengan WhatsApp

Scan QR code yang diterima dengan aplikasi WhatsApp di ponsel Anda.

### 4. Kirim Pesan

```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "my-session",
    "number": "6281234567890",
    "message": "Hello from WhatsApp Gateway!"
  }'
```

## 📖 API Endpoints

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | Get all sessions |
| POST | `/api/sessions` | Create new session |
| GET | `/api/sessions/{sessionId}` | Get session status |
| DELETE | `/api/sessions/{sessionId}` | Delete session |
| POST | `/api/sessions/{sessionId}/logout` | Logout session |
| POST | `/api/sessions/{sessionId}/refresh` | Refresh session |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/send-message` | Send text message |
| POST | `/api/send-image` | Send image message |
| POST | `/api/send-document` | Send document |
| POST | `/api/send-audio` | Send audio/voice note |
| POST | `/api/send-video` | Send video |
| POST | `/api/send-location` | Send location |
| POST | `/api/broadcast` | Broadcast message |

### Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/check-number/{sessionId}/{number}` | Check if number is on WhatsApp |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhook/{sessionId}` | Receive webhook messages |

## 💡 Examples

### Send Text Message

```javascript
const response = await fetch('http://localhost:3000/api/send-message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId: 'my-session',
    number: '6281234567890',
    message: 'Hello World!'
  })
});
```

### Send Image with Caption

```javascript
const response = await fetch('http://localhost:3000/api/send-image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId: 'my-session',
    number: '6281234567890',
    imageUrl: 'https://example.com/image.jpg',
    caption: 'Check out this image!'
  })
});
```

### Broadcast Message

```javascript
const response = await fetch('http://localhost:3000/api/broadcast', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId: 'my-session',
    numbers: ['6281234567890', '6281234567891', '6281234567892'],
    message: 'Hello everyone!',
    delay: 1000 // 1 second delay between messages
  })
});
```

## 🔒 Security

- Pastikan untuk mengamankan API dengan authentication jika digunakan di production
- Gunakan HTTPS untuk semua komunikasi
- Validasi input dengan baik
- Implementasikan rate limiting

## ⚙️ Configuration

Konfigurasi dapat dilakukan melalui file `.env`:

```env
PORT=3000
NODE_ENV=development
```

## 🐛 Troubleshooting

### Session tidak terkoneksi
- Pastikan QR code sudah di-scan dengan benar
- Check status session di `/api/sessions/{sessionId}`
- Coba refresh session dengan endpoint refresh

### Error saat mengirim pesan
- Pastikan session dalam status connected
- Verifikasi nomor tujuan dengan `/api/check-number`
- Check format nomor (gunakan country code)

## 🙏 Acknowledgments

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API library
- [Express.js](https://expressjs.com/) - Web framework

---

⭐ **Jangan lupa untuk memberikan star jika project ini membantu Anda!**
