# SpawnKit Domain Setup

## Domain Registration
- **Domain**: spawnkit.dev
- **Registrar**: Namecheap ($10.98/year)
- **Status**: AVAILABLE ✅

## DNS Configuration (GitHub Pages)

### A Records (required for apex domain)
```
@ → 185.199.108.153
@ → 185.199.109.153  
@ → 185.199.110.153
@ → 185.199.111.153
```

### CNAME Record (www subdomain)
```
www → apocys.github.io
```

### Setup Steps
1. Register spawnkit.dev at Namecheap
2. Update DNS with GitHub IPs above
3. Add custom domain in GitHub Pages settings
4. Wait for DNS propagation (5-60 min)
5. Enable HTTPS in GitHub Pages

## GitHub Pages Custom Domain
- Repository: apocys/spawnkit-v2  
- Settings → Pages → Custom domain: `spawnkit.dev`
- Auto-deploy from main branch

## Final URLs
- **Production**: https://spawnkit.dev
- **Demo**: https://spawnkit.dev/demo.html
- **Download**: https://github.com/apocys/spawnkit-v2/releases

---
*Ready to register domain and go live!*