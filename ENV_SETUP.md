# Environment Variables Setup

## .env.local Dosyası Oluştur

### Konum
```
/Users/ahmetbugrakurnaz/Desktop/stellaristanbul /frontend-pro/.env.local
```

### İçerik
```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://devbugrakurnaz_db_user:Bugra.0601@web3.6ev8mrh.mongodb.net/argus?retryWrites=true&w=majority

# API Configuration
NEXT_PUBLIC_API_URL=/api

# Stellar Network
NEXT_PUBLIC_STELLAR_NETWORK=testnet

# OpenAI (Optional - for AI explanations)
OPENAI_API_KEY=

# Anthropic Claude (Alternative to OpenAI)
ANTHROPIC_API_KEY=
```

---

## Manuel Oluşturma

### Terminal'de:
```bash
cd /Users/ahmetbugrakurnaz/Desktop/stellaristanbul\ /frontend-pro

cat > .env.local << 'EOF'
MONGODB_URI=mongodb+srv://devbugrakurnaz_db_user:Bugra.0601@web3.6ev8mrh.mongodb.net/argus?retryWrites=true&w=majority
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_STELLAR_NETWORK=testnet
OPENAI_API_KEY=
EOF
```

### Veya Manuel:
1. Frontend-pro klasöründe `.env.local` dosyası oluştur
2. Yukarıdaki içeriği yapıştır
3. Kaydet

---

## Kontrol

```bash
# Dosya var mı?
ls -la .env.local

# İçeriği kontrol
cat .env.local
```

---

## Güvenlik

⚠️ **ÖNEMLİ:**
- `.env.local` dosyası `.gitignore`'da
- Asla GitHub'a push etme
- Production'da Vercel'de env variables set et

---

## Sonraki Adım

.env.local oluşturulduktan sonra:
1. Frontend'i yeniden başlat (npm run dev)
2. MongoDB connection test et
3. API routes çalışacak

Şimdi manuel olarak .env.local dosyasını oluştur ve söyle!

