'use client';

export const initWorker = () => {
  const workerCode = `
  self.onmessage = async function(e) {
    const { frameImageData, width, height, filter } = e.data;
    
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    switch(filter) {
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
    
    const imageData = new ImageData(
      new Uint8ClampedArray(frameImageData),
      width,
      height
    );
    
    const bitmap = await createImageBitmap(imageData);
    
    ctx.drawImage(bitmap, 0, 0);
    
    const filteredImageData = ctx.getImageData(0, 0, width, height);
    
    self.postMessage({
      filteredFrameData: filteredImageData.data.buffer
    }, [filteredImageData.data.buffer]);
  };
`;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};
