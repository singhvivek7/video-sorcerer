'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { ArrowDownToLine, Upload, Settings, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent } from '@/components/ui/tabs';

import { Label } from '@/components/ui/label';
import { initWorker } from '@/lib/canvas.worker';

type VideoFilter = 'none' | 'sepia' | 'grayscale' | 'invert';
type Resolution = '1080p' | '720p' | '540p';

const VideoEditor = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<VideoFilter>('none');
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [fps, setFps] = useState(30);
  const [resolution, setResolution] = useState<Resolution>('720p');
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const downloadRef = useRef<HTMLAnchorElement | null>(null);
  const rafId = useRef<number | null>(null);
  const exportWorkerRef = useRef<Worker | null>(null);

  const videoUrl = useMemo(() => {
    return videoFile ? URL.createObjectURL(videoFile) : null;
  }, [videoFile]);

  const getCanvasDimensions = () => {
    const aspectRatio = 16 / 9;
    let height = 0;

    switch (resolution) {
      case '1080p':
        height = 1080;
        break;
      case '720p':
        height = 720;
        break;
      case '540p':
        height = 540;
        break;
    }

    const width = Math.round(height * aspectRatio);
    return { width, height };
  };

  const applyCanvasFilter = (ctx: CanvasRenderingContext2D) => {
    switch (filter) {
      case 'sepia':
        ctx.filter = 'sepia(100%)';
        break;
      case 'grayscale':
        ctx.filter = 'grayscale(100%)';
        break;
      case 'invert':
        ctx.filter = 'invert(100%)';
        break;
      default:
        ctx.filter = 'none';
    }
  };

  const renderFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    applyCanvasFilter(ctx);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (previewPlaying && !video.paused && !video.ended) {
      rafId.current = requestAnimationFrame(renderFrame);
    }
  };

  const togglePlayPreview = () => {
    if (!videoRef.current) return;

    if (previewPlaying) {
      videoRef.current.pause();
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    } else {
      videoRef.current.play();
      renderFrame();
    }

    setPreviewPlaying(!previewPlaying);
  };

  const handleVideoLoaded = () => {
    if (!canvasRef.current || !videoRef.current) return;

    const { width, height } = getCanvasDimensions();
    canvasRef.current.width = width;
    canvasRef.current.height = height;

    renderFrame();
  };

  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }

      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }

      if (exportWorkerRef.current) {
        exportWorkerRef.current.terminate();
        exportWorkerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current && videoRef.current) {
      renderFrame();
    }
  }, [filter]);

  useEffect(() => {
    if (canvasRef.current && videoRef.current) {
      const { width, height } = getCanvasDimensions();
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      renderFrame();
    }
  }, [resolution]);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }

      setVideoFile(file);
      setPreviewPlaying(false);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }

      toast.success('Video uploaded', {
        description: `${file.name} (${(file.size / (1024 * 1024)).toFixed(
          2
        )} MB)`,
        icon: <Upload className="h-4 w-4" />,
        duration: 3000,
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const exportVideo = async () => {
    if (!videoFile || !videoRef.current) return;

    setExporting(true);
    setExportProgress(0);

    const worker = initWorker();

    try {
      const { width, height } = getCanvasDimensions();

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = width;
      outputCanvas.height = height;
      const outputCtx = outputCanvas.getContext('2d');
      if (!outputCtx) return;

      const stream = outputCanvas.captureStream(fps);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 50_00_000,
      });

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const recordingPromise = new Promise(resolve => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          resolve(url);
        };
      });

      mediaRecorder.start();

      const video = videoRef.current;
      const duration = video.duration;
      const totalFrames = Math.ceil(duration * fps);
      const frameInterval = 1 / fps;

      for (let i = 0; i < totalFrames; i++) {
        const currentTime = i * frameInterval;
        if (currentTime > duration) break;

        video.currentTime = currentTime;
        await new Promise(resolve => {
          const seekHandler = () => {
            video.removeEventListener('seeked', seekHandler);
            resolve(null);
          };
          video.addEventListener('seeked', seekHandler);
        });

        tempCtx.drawImage(video, 0, 0, width, height);
        const frameData = tempCtx.getImageData(0, 0, width, height);

        const filteredData = await new Promise(resolve => {
          worker.onmessage = e => resolve(e.data.filteredFrameData);
          worker.postMessage(
            {
              frameImageData: frameData.data.buffer,
              width,
              height,
              filter,
            },
            [frameData.data.buffer]
          );
        });

        const filteredImageData = new ImageData(
          new Uint8ClampedArray(filteredData as ArrayBuffer),
          width,
          height
        );

        outputCtx.putImageData(filteredImageData, 0, 0);

        const progress = ((i + 1) / totalFrames) * 100;
        setExportProgress(progress);

        await new Promise(resolve => setTimeout(resolve, 0));
      }

      mediaRecorder.stop();
      const url = await recordingPromise;

      // Download the video
      if (downloadRef.current) {
        downloadRef.current.href = url as string;
        downloadRef.current.download = `${
          filter !== 'none' ? filter + '-' : ''
        }${resolution}-${fps}fps-video.webm`;
        downloadRef.current.click();

        toast.success('Export complete', {
          description: `Video processed with ${
            filter !== 'none' ? filter : 'no'
          } filter at ${resolution}, ${fps} FPS`,
          icon: <ArrowDownToLine className="h-4 w-4" />,
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed', {
        description:
          (error as Error).message ||
          'There was an error processing your video',
        duration: 4000,
      });
    } finally {
      setExporting(false);
      setExportProgress(null);
      worker.terminate();
    }
  };

  return (
    <div className="flex flex-col items-center p-5 min-h-screen bg-background">
      <Toaster position="bottom-right" richColors closeButton />
      <Card className="w-full max-w-4xl shadow-lg pt-0">
        <CardHeader className="bg-gradient-to-r from-chart-2 to-chart-3 text-background rounded-t-lg p-5">
          <CardTitle className="text-2xl font-bold">
            Flam Assignment - The Video Sorcerer Challenge
          </CardTitle>
          <CardDescription className="text-blue-100">
            Preview, transform, and export your videos with custom filters,
            resolutions, and FPS
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <Input
            type="file"
            ref={fileInputRef}
            accept="video/*"
            onChange={handleUpload}
            className="hidden"
          />
          {!videoFile ? (
            <div
              className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={triggerFileInput}>
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">
                Upload a video
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Click or drag and drop your video file
              </p>
              <Button variant="outline" onClick={triggerFileInput}>
                Select Video
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="preview" className="w-full">
              <TabsContent value="preview" className="space-y-4">
                <div className="bg-black rounded-lg overflow-hidden relative">
                  <video
                    ref={videoRef}
                    src={videoUrl ?? ''}
                    className="hidden"
                    onLoadedMetadata={handleVideoLoaded}
                    onTimeUpdate={renderFrame}
                    onEnded={() => setPreviewPlaying(false)}
                  />

                  <canvas
                    ref={canvasRef}
                    className="w-full h-auto max-h-96 mx-auto"
                  />

                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={togglePlayPreview}
                      className="opacity-80 hover:opacity-100">
                      {previewPlaying ? (
                        <>
                          <Pause className="h-4 w-4 mr-1" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" /> Play
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="mb-2 block">Filter</Label>
                      <Select
                        onValueChange={val => setFilter(val as VideoFilter)}
                        defaultValue="none">
                        <SelectTrigger>
                          <SelectValue placeholder="Select Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Filter</SelectItem>
                          <SelectItem value="sepia">Sepia Tone</SelectItem>
                          <SelectItem value="grayscale">
                            Black & White
                          </SelectItem>
                          <SelectItem value="invert">Color Invert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="mb-2 block">Resolution</Label>
                      <Select
                        onValueChange={val => setResolution(val as Resolution)}
                        defaultValue="720p">
                        <SelectTrigger>
                          <SelectValue placeholder="Select Resolution" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                          <SelectItem value="720p">720p (HD)</SelectItem>
                          <SelectItem value="540p">540p (SD)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="mb-2 block">FPS: {fps}</Label>
                      <Select
                        onValueChange={val => setFps(Number(val))}
                        defaultValue="30">
                        <SelectTrigger>
                          <SelectValue placeholder="Select FPS" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 FPS</SelectItem>
                          <SelectItem value="60">60 FPS</SelectItem>
                          <SelectItem value="120">120 FPS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
                    <Button variant="outline" onClick={triggerFileInput}>
                      Change Video
                    </Button>

                    <Button
                      onClick={exportVideo}
                      disabled={exporting}
                      variant="default"
                      className="bg-green-600 hover:bg-green-700">
                      {exporting ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white"></div>
                          <span>Exporting Video...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <ArrowDownToLine className="h-4 w-4" />
                          <span>Export Video</span>
                        </div>
                      )}
                    </Button>
                  </div>

                  {exporting && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Settings className="h-4 w-4 text-blue-500 animate-spin" />
                        <span className="text-sm font-medium text-blue-500">
                          Processing Video Frames
                        </span>
                      </div>
                      <Progress value={exportProgress ?? 0} className="h-2" />
                      <p className="text-sm text-center text-gray-500">
                        {exportProgress !== null
                          ? `${Number(exportProgress).toFixed(0)}% complete`
                          : 'Preparing...'}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          <a ref={downloadRef} style={{ display: 'none' }}>
            Download
          </a>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoEditor;
