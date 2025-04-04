'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { ArrowDownToLine, Upload, Wand2, Cpu, Monitor } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type VideoFilter = 'none' | 'sepia' | 'grayscale' | 'invert';

const VideoEditor = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [filter, setFilter] = useState<VideoFilter>('none');
  const [processing, setProcessing] = useState(false);
  const [filteredVideoUrl, setFilteredVideoUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const downloadRef = useRef<HTMLAnchorElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const videoUrl = useMemo(() => {
    return videoFile ? URL.createObjectURL(videoFile) : null;
  }, [videoFile]);

  useEffect(() => {
    // cleaning video URL
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !workerRef.current) {
      toast.info('[WORKER] Setting up worker thread', {
        description: 'Initializing FFmpeg processing capabilities',
        icon: <Cpu className="h-4 w-4" />,
        duration: 3000,
      });

      workerRef.current = new Worker(
        new URL('@/lib/ffmpeg.worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = event => {
        toast.info('Main thread update', {
          description: 'Received data from worker thread',
          icon: <Monitor className="h-4 w-4" />,
          duration: 2000,
          id: 'main-thread-update',
        });

        if (event.data.progress !== undefined) {
          setProgress(event.data.progress * 100);

          if (event.data.progress === 0) {
            toastIdRef.current = toast.loading(
              '[WORKER] Processing video in worker thread',
              {
                description: 'Starting filter application',
                icon: <Cpu className="h-4 w-4" />,
              }
            );
          }
        }

        if (event.data.url) {
          setFilteredVideoUrl(event.data.url);
          setProcessing(false);
          setProgress(null);

          if (toastIdRef.current) {
            toast.dismiss(toastIdRef.current);
            toastIdRef.current = null;
          }

          toast.success('Filter applied successfully', {
            description: `Video processed with ${
              filter !== 'none' ? filter : 'no'
            } filter`,
            icon: <Wand2 className="h-4 w-4" />,
            duration: 4000,
          });

          toast.info('Returned to main thread', {
            description: 'Worker thread processing complete',
            icon: <Monitor className="h-4 w-4" />,
            duration: 3000,
          });
        }
      };

      toast.success('[WORKER] Worker thread ready', {
        description: 'FFmpeg worker initialized successfully',
        icon: <Cpu className="h-4 w-4" />,
        duration: 3000,
      });
    }

    return () => {
      if (workerRef.current) {
        toast.info('[WORKER] Terminating worker thread', {
          description: 'Cleaning up resources',
          icon: <Cpu className="h-4 w-4" />,
          duration: 3000,
        });

        workerRef.current.terminate();
        workerRef.current = null;
      }

      if (filteredVideoUrl) {
        URL.revokeObjectURL(filteredVideoUrl);
      }
    };
  }, []);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }

      setVideoFile(file);
      setFilteredVideoUrl(null);
      setProgress(null);
      setProcessing(false);

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

  const applyFilterEffect = () => {
    if (!videoFile || !workerRef.current) return;

    setProcessing(true);

    toast.info('[WORKER] Starting worker thread processing', {
      description: `Sending video data to worker thread for ${filter} filter application`,
      icon: <Cpu className="h-4 w-4" />,
      duration: 3000,
    });

    const reader = new FileReader();
    reader.readAsArrayBuffer(videoFile);
    reader.onload = () => {
      toast.info('Main thread action', {
        description: 'Sending data to worker thread',
        icon: <Monitor className="h-4 w-4" />,
        duration: 2000,
      });

      workerRef.current?.postMessage({ file: reader.result, filter });
    };
  };

  const downloadFilteredVideo = () => {
    if (downloadRef.current && filteredVideoUrl) {
      downloadRef.current.href = filteredVideoUrl;
      downloadRef.current.download = `filtered-${filter}-video.mp4`;
      downloadRef.current.click();

      toast.success('Download started', {
        description: `filtered-${filter}-video.mp4`,
        icon: <ArrowDownToLine className="h-4 w-4" />,
        duration: 3000,
      });
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
            Upload, transform, and download your videos with custom filters
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
            <Tabs defaultValue="original" className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="original">Original Video</TabsTrigger>
                <TabsTrigger value="filtered" disabled={!filteredVideoUrl}>
                  Filtered Video
                </TabsTrigger>
              </TabsList>

              <TabsContent value="original" className="space-y-4">
                <div className="bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    src={videoUrl ?? ''}
                    key="original-video"
                    controls
                    playsInline
                    className="w-full h-auto max-h-96 mx-auto"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <Select
                    onValueChange={val => setFilter(val as VideoFilter)}
                    defaultValue="none">
                    <SelectTrigger>
                      <SelectValue placeholder="Select Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Filter</SelectItem>
                      <SelectItem value="sepia">Sepia Tone</SelectItem>
                      <SelectItem value="grayscale">Black & White</SelectItem>
                      <SelectItem value="invert">Color Invert</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={applyFilterEffect}
                    className="md:col-span-2"
                    disabled={processing}
                    variant="default">
                    {processing ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white"></div>
                        <span>Processing in Worker Thread...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Wand2 className="h-4 w-4" />
                        <span>
                          Apply {filter !== 'none' ? filter : ''} Filter
                        </span>
                      </div>
                    )}
                  </Button>
                </div>

                {processing && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Cpu className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-500">
                        Worker Thread Processing
                      </span>
                    </div>
                    <Progress value={progress ?? 0} className="h-2" />
                    <p className="text-sm text-center text-gray-500">
                      {progress !== null
                        ? `${Number(progress).toFixed(0)}% complete`
                        : 'Preparing...'}
                    </p>
                  </div>
                )}

                <div className="flex justify-end mt-4">
                  <Button variant="outline" onClick={triggerFileInput}>
                    Change Video
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="filtered" className="space-y-4">
                {filteredVideoUrl && (
                  <>
                    <div className="bg-black rounded-lg overflow-hidden">
                      <video
                        key="filtered-video"
                        controls
                        playsInline
                        className="w-full h-auto max-h-96 mx-auto">
                        <source src={filteredVideoUrl} />
                        Your browser does not support the video tag.
                      </video>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-green-500" />
                        <p className="text-sm text-gray-500">
                          {filter !== 'none'
                            ? `${
                                filter.charAt(0).toUpperCase() + filter.slice(1)
                              }`
                            : 'No'}{' '}
                          filter applied (Back on Main Thread)
                        </p>
                      </div>
                      <Button
                        onClick={downloadFilteredVideo}
                        variant="default"
                        className="bg-green-600 hover:bg-green-700">
                        <div className="flex items-center space-x-2">
                          <ArrowDownToLine className="h-4 w-4" />
                          <span>Download Filtered Video</span>
                        </div>
                      </Button>
                    </div>
                  </>
                )}
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
