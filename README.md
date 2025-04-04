# Video Sorcerer - Web-based Video Filter Application

🌍 [Live URL](https://video-sorcerer.vercel.app)

## Overview

Video Sorcerer is a web-based application that allows users to upload videos, apply visual filters, and download the processed results.

## Key Features

- 📤 **Video Upload**: Simple drag-and-drop or file selection interface
- 🎨 **Filter Application**: Apply sepia tone, grayscale, or color inversion effects
- 🧵 **Multi-threaded Processing**: Offloads video processing to a Web Worker
- 📊 **Real-time Progress Tracking**: Visual feedback during processing
- 📩 **Download Capability**: Save processed videos to your device
- 🔄 **Tab-based UI**: Toggle between original and filtered video views

## Technical Implementation

### Architecture

The application follows a modern Nextjs architecture with the following key components:

1. **Main Thread (UI)**: Handles user interactions, manages state, and displays the interface
2. **Worker Thread**: Processes video data using FFmpeg, communicating progress and results back to the main thread

### Technologies Used

- **Nextjs**: Frontend UI framework with functional components and hooks
- **FFmpeg**: Video processing library
- **Web Workers API**: Multi-threading capabilities for performance optimization
- **Shadcn UI Components**: Modern UI elements like Cards, Buttons, and Progress indicators
- **Sonner**: Toast notification system for user feedback
- **Lucide Icons**: Iconography for visual clarity

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- NPM or Bun package manager

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   # or
   npm install
   ```
3. Start the development server:
   ```bash
   bun dev
   # or
   npm run dev
   ```

### Usage

1. Open the application in your browser
2. Click "Select Video" or drag and drop a video file
3. Choose a filter from the dropdown menu
4. Click "Apply Filter" and wait for processing to complete
5. View the filtered video in the "Filtered Video" tab
6. Download the processed video if desired

---

### Vivek Kumar

[LinkedIn](https://www.linkedin.com/in/singhvivek7/) |
[GitHub](https://github.com/singhvivek7)
