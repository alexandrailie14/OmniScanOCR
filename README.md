# OmniScan

OmniScan este un spațiu de lucru pentru digitizare, OCR, corectură și export de documente. Proiectul poate fi rulat local de fiecare coleg pe propriul calculator, cu propriile chei Google Cloud și, opțional, cu propriul tunel Cloudflare.

Acest repository este pregătit să fie clonat pe macOS și Windows fără să depindă de căile locale ale unui anumit utilizator.

## Ce conține

- `http://localhost:8050/studio` - interfața principală pentru PDF-uri scanate
- `http://localhost:8050/studio-manuscrise` - interfața pentru manuscrise / handwriting
- `http://localhost:8050/filters` - filtrare și analiză
- `http://localhost:8050/clemens` - interfața Clemens
- `http://localhost:8050/img-ocr` - opțional, doar dacă este adăugat workbench-ul separat în `vendor/pdf-ocr-workbench`

## Costuri și responsabilitate

Fiecare coleg trebuie să folosească:

- propriul cont Google Cloud
- propriul fișier JSON de service account
- propriul token Cloudflare, dacă dorește acces online

Astfel, costurile Google Cloud Vision și orice costuri Cloudflare rămân la persoana care configurează instanța proprie.

Linkuri oficiale utile:

- Git: [https://git-scm.com/downloads](https://git-scm.com/downloads)
- Docker Desktop pentru macOS: [https://docs.docker.com/desktop/setup/install/mac-install/](https://docs.docker.com/desktop/setup/install/mac-install/)
- Docker Desktop pentru Windows: [https://docs.docker.com/desktop/setup/install/windows-install/](https://docs.docker.com/desktop/setup/install/windows-install/)
- Google Cloud Vision pricing: [https://cloud.google.com/vision/pricing](https://cloud.google.com/vision/pricing)
- Google Cloud Vision docs: [https://cloud.google.com/vision/docs](https://cloud.google.com/vision/docs)
- Service accounts: [https://cloud.google.com/iam/docs/service-accounts-create](https://cloud.google.com/iam/docs/service-accounts-create)
- Service account keys: [https://cloud.google.com/iam/docs/keys-create-delete](https://cloud.google.com/iam/docs/keys-create-delete)
- Cloudflare Tunnel docs: [https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)

## Structura repository-ului

```text
webapp/
  backend/                    FastAPI backend
  frontend/                   HTML / CSS / JS
  models/                     modele Kraken
  secrets/                    chei locale, neversionate
  vendor/
    pdf-ocr-workbench/        opțional, pentru /img-ocr
  docker-compose.yml
  Dockerfile
  .env.example
  README.md
```

## Cerințe minime

Toți utilizatorii au nevoie de:

1. Git
2. Docker Desktop
3. un cont Google Cloud, dacă vor OCR Google Vision
4. un fișier JSON de service account Google
5. opțional, un token Cloudflare Tunnel

## Pasul 1: instalarea programelor

### macOS

1. Instalează Git de la [https://git-scm.com/downloads](https://git-scm.com/downloads)
2. Instalează Docker Desktop de la [https://docs.docker.com/desktop/setup/install/mac-install/](https://docs.docker.com/desktop/setup/install/mac-install/)
3. Pornește Docker Desktop și așteaptă până apare că engine-ul rulează
4. Deschide aplicația `Terminal`

### Windows

1. Instalează Git de la [https://git-scm.com/downloads](https://git-scm.com/downloads)
2. Instalează Docker Desktop de la [https://docs.docker.com/desktop/setup/install/windows-install/](https://docs.docker.com/desktop/setup/install/windows-install/)
3. Pornește Docker Desktop și așteaptă până apare că engine-ul rulează
4. Deschide `Windows Terminal` sau `PowerShell`

## Pasul 2: clonarea repository-ului

Înlocuiește URL-ul de mai jos cu URL-ul real al repository-ului tău GitHub.

### macOS

```bash
cd ~
git clone https://github.com/UTILIZATOR/omniscann.git
cd omniscann
```

### Windows

```powershell
cd $HOME
git clone https://github.com/UTILIZATOR/omniscann.git
cd omniscann
```

## Pasul 3: fișierele locale care trebuie completate

În repository există un fișier-model:

- `.env.example`

Fiecare coleg trebuie să creeze:

- `.env`
- `secrets/gcp_key.json`

### macOS

```bash
cp .env.example .env
mkdir -p secrets
mkdir -p vendor/pdf-ocr-workbench
```

### Windows

```powershell
Copy-Item .env.example .env
New-Item -ItemType Directory -Force secrets | Out-Null
New-Item -ItemType Directory -Force vendor\pdf-ocr-workbench | Out-Null
```

## Pasul 4: completarea fișierului `.env`

Deschide fișierul `.env` într-un editor de text și completează valorile.

Exemplu:

```env
APP_PORT=8050
ADMIN_USER=admin
ADMIN_PASS=o-parola-puternica
SECRET_KEY=o-cheie-lunga-si-greu-de-ghicit
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/gcp_key.json
KRAKEN_MODEL_FILENAME=FoNDUE-GD_v2_fr.mlmodel
KRAKEN_DEVICE=cpu
TUNNEL_TOKEN=
```

Ce înseamnă:

- `APP_PORT`: portul local; recomandat `8050`
- `ADMIN_USER`: utilizatorul de autentificare
- `ADMIN_PASS`: parola de autentificare
- `SECRET_KEY`: cheie internă pentru sesiuni
- `GOOGLE_APPLICATION_CREDENTIALS`: las-o exact așa
- `KRAKEN_MODEL_FILENAME`: numele fișierului modelului Kraken din folderul `models/`
- `KRAKEN_DEVICE`: `cpu` este varianta sigură pentru majoritatea calculatoarelor
- `TUNNEL_TOKEN`: se completează doar dacă utilizatorul vrea acces online prin Cloudflare

## Pasul 5: configurarea Google Cloud Vision

Fiecare coleg trebuie să-și facă propriul proiect Google Cloud.

### Pașii de bază

1. Creează sau alege un proiect Google Cloud
2. Activează billing dacă Google îl cere pentru Vision API
3. Activează Cloud Vision API
4. Creează un service account
5. Creează o cheie JSON pentru acel service account
6. Salvează fișierul ca:

```text
secrets/gcp_key.json
```

Documentație oficială:

- Vision docs: [https://cloud.google.com/vision/docs](https://cloud.google.com/vision/docs)
- Service account create: [https://cloud.google.com/iam/docs/service-accounts-create](https://cloud.google.com/iam/docs/service-accounts-create)
- Service account key create: [https://cloud.google.com/iam/docs/keys-create-delete](https://cloud.google.com/iam/docs/keys-create-delete)
- Pricing: [https://cloud.google.com/vision/pricing](https://cloud.google.com/vision/pricing)

Observație importantă:

- dacă nu există `secrets/gcp_key.json`, funcțiile Google OCR nu vor merge
- costurile Google Vision sunt suportate de proprietarul acelui cont Google Cloud

## Pasul 6: configurarea modelului Kraken

Dacă repository-ul conține deja modelul în `models/`, nu mai trebuie făcut nimic.

Dacă nu, utilizatorul trebuie să pună manual fișierul modelului în:

```text
models/
```

și să se asigure că numele lui corespunde cu `KRAKEN_MODEL_FILENAME` din `.env`.

Exemplu:

```text
models/FoNDUE-GD_v2_fr.mlmodel
```

## Pasul 7: pornirea aplicației local

### macOS

```bash
docker compose up --build
```

### Windows

```powershell
docker compose up --build
```

La prima pornire poate dura mult, deoarece Docker descarcă imaginea Python și toate dependențele OCR.

După pornire, aplicația este disponibilă la:

- [http://localhost:8050](http://localhost:8050)

Interfețe:

- [http://localhost:8050/studio](http://localhost:8050/studio)
- [http://localhost:8050/studio-manuscrise](http://localhost:8050/studio-manuscrise)
- [http://localhost:8050/filters](http://localhost:8050/filters)
- [http://localhost:8050/clemens](http://localhost:8050/clemens)

## Pasul 8: rulare în fundal

Dacă utilizatorul vrea să lase aplicația pornită în fundal:

### macOS / Windows

```bash
docker compose up -d --build
```

Pentru a opri aplicația:

```bash
docker compose down
```

Pentru a vedea logurile:

```bash
docker compose logs -f
```

## Pasul 9: acces online opțional prin Cloudflare Tunnel

Acest pas nu este necesar pentru folosirea locală.

Este necesar doar dacă utilizatorul vrea un URL public.

### Ce trebuie făcut

1. utilizatorul își face propriul cont Cloudflare
2. își creează propriul Tunnel
3. obține propriul `TUNNEL_TOKEN`
4. îl pune în `.env`

Exemplu:

```env
TUNNEL_TOKEN=eyJh...
```

Pornirea cu tunnel:

```bash
docker compose --profile tunnel up -d --build
```

Documentație oficială:

- [https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)

## Pasul 10: interfața `img-ocr`

Ruta `/img-ocr` este opțională și depinde de workbench-ul separat `pdf-ocr-workbench`.

Dacă vrei și această interfață:

1. clonează repository-ul `pdf-ocr-workbench`
2. pune-l în:

```text
vendor/pdf-ocr-workbench
```

3. repornește aplicația:

```bash
docker compose up -d --build
```

Dacă acel folder nu conține aplicația workbench, `/img-ocr` nu va fi montat.

## Cum se deschide terminalul

### macOS

- apasă `Command + Space`
- scrie `Terminal`
- apasă `Enter`

### Windows

- apasă tasta `Windows`
- scrie `PowerShell` sau `Windows Terminal`
- apasă `Enter`

## Probleme frecvente

### 1. Docker nu pornește

Verifică dacă Docker Desktop este deschis și complet pornit.

### 2. `Cannot connect to the Docker daemon`

Înseamnă că Docker Desktop nu rulează încă.

### 3. `Login eșuat`

Verifică valorile `ADMIN_USER` și `ADMIN_PASS` din `.env`, apoi repornește:

```bash
docker compose down
docker compose up -d --build
```

### 4. Google OCR nu merge

Verifică:

- există `secrets/gcp_key.json`
- cheia este validă
- Vision API este activată
- există billing activ dacă Google îl cere

### 5. `ailie.uk` sau alt domeniu nu merge

Cloudflare nu este necesar pentru rularea locală. Pentru domeniu public, fiecare coleg trebuie să folosească propriul tunnel și propriul token.

## Ce NU trebuie urcat în Git

Nu se comit:

- `.env`
- `secrets/gcp_key.json`
- conținutul din `data/`
- PDF-uri încărcate de utilizatori
- exporturi TXT / JSON / ZIP

`.gitignore` este deja configurat pentru asta.

## Workflow minim pentru colegi

1. instalează Git și Docker Desktop
2. clonează repository-ul
3. creează `.env`
4. pune cheia Google în `secrets/gcp_key.json`
5. pornește:

```bash
docker compose up --build
```

6. deschide:

```text
http://localhost:8050/studio
```

## Pentru tine, ca owner al repo-ului

După ce verifici că totul este în regulă:

```bash
git add .
git commit -m "Prepare portable OmniScan repository"
git push
```

Dacă vrei, următorul pas pot să-l fac eu aici:

1. să curăț și fișierele vechi redundante (`env.example`, `gitignore`)
2. să adaug directoarele-template `secrets/.gitkeep` și `vendor/pdf-ocr-workbench/.gitkeep`
3. să verific că `docker compose config` iese curat cu noua structură
