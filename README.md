# 📊 Video Analyzer

AI-powered YouTube video analysis tool for medical and health content creators. Get actionable insights on CTR, retention, thumbnails, and titles.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-green)

## ✨ Features

- **Step-by-step Analysis Workflow** - Guided process through 5 analysis stages
- **Screenshot Upload** - Drag & drop or click to upload YouTube Studio screenshots
- **AI-Powered Insights** - Deep analysis using GPT-4o with custom master prompt
- **Medical Content Focused** - Benchmarks and recommendations for health/medical niche
- **Session Persistence** - Conversation history maintained throughout analysis
- **Modern Dark UI** - Beautiful, responsive interface

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. **Clone or download the project**

2. **Install dependencies**
   ```bash
   cd video-analyzer
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the app**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
video-analyzer/
├── app/
│   ├── api/
│   │   ├── analyze/
│   │   │   └── route.ts      # AI analysis endpoint
│   │   └── upload/
│   │       └── route.ts      # File upload endpoint
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Main chat interface
│   └── page.module.css       # Page-specific styles
├── lib/
│   └── masterPrompt.ts       # AI master prompt configuration
├── public/
│   └── uploads/              # Uploaded screenshots (auto-created)
├── .env.example              # Environment variables template
├── next.config.js            # Next.js configuration
├── package.json              # Dependencies
└── tsconfig.json             # TypeScript configuration
```

## 🔧 Configuration

### Master Prompt

The AI behavior is controlled by the master prompt in `lib/masterPrompt.ts`. You can customize:

- Analysis workflow steps
- Benchmark standards
- Communication style
- Industry-specific metrics

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | Required |
| `OPENAI_MODEL` | Model to use | `gpt-4o` |

## 📖 How It Works

### 5-Step Analysis Workflow

1. **Basic Information** - Video title, duration, publish date, topic description
2. **Screenshot Analytics** - Views, CTR, AVD, Impressions from YouTube Studio
3. **Audience Retention** - Retention graph analysis, drop-off points
4. **Thumbnail & Title** - Visual analysis and A/B testing suggestions
5. **Final Report** - Comprehensive report with actionable recommendations

### Benchmarks (Medical/Health Niche)

- Good CTR: 6-12%
- Excellent CTR: 12%+
- Good retention: 40-50% (long-form), 70%+ (shorts)
- Good AVD: 50%+ of video length
- Healthy growth: 100+ views/day after first week

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Self-hosted

```bash
npm run build
npm run start
```

## 🔒 Security Notes

- API key is stored server-side only (never exposed to client)
- Uploaded images are stored locally in `public/uploads/`
- Consider adding rate limiting for production
- Consider using cloud storage (S3/R2) for uploads in production

## 🛠 Customization

### Changing the AI Model

Edit `.env.local`:
```
OPENAI_MODEL=gpt-4-turbo
```

### Modifying the Workflow

Edit `lib/masterPrompt.ts` to customize:
- Analysis steps
- Questions asked
- Report format
- Benchmark values

### Styling

The app uses CSS modules with CSS variables. Main theme colors are in `app/globals.css`.

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
