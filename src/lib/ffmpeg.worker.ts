/* eslint-disable @typescript-eslint/no-explicit-any */
import { FFmpeg } from '@ffmpeg/ffmpeg';

const ffmpeg = new FFmpeg();

self.addEventListener('message', async event => {
  const { file, filter } = event.data;

  if (!ffmpeg.loaded) {
    await ffmpeg.load();
  }

  await ffmpeg.writeFile('input.mp4', new Uint8Array(file));

  let filterCmd = '';
  if (filter === 'sepia') {
    filterCmd =
      'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131';
  } else if (filter === 'grayscale') {
    filterCmd = 'format=gray';
  } else if (filter === 'invert') {
    filterCmd = 'negate';
  }

  ffmpeg.on('progress', ({ progress }) => {
    self.postMessage({ progress });
  });

  const command =
    filter !== 'none'
      ? ['-i', 'input.mp4', '-vf', filterCmd, 'output.mp4']
      : ['-i', 'input.mp4', 'output.mp4'];

  await ffmpeg.exec(command);

  const data = (await ffmpeg.readFile('output.mp4')) as any;
  const blob = new Blob([data.buffer], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);

  self.postMessage({ url, progress: 100 });
});
