const fileInput = document.getElementById('fileInput');
    const urlInput = document.getElementById('urlInput');
    const loadUrlBtn = document.getElementById('loadUrlBtn');
    const algorithmSelect = document.getElementById('algorithmSelect');
    const sourceSelect = document.getElementById('sourceSelect');
    const thresholdRange = document.getElementById('thresholdRange');
    const thresholdValue = document.getElementById('thresholdValue');
    const gammaRange = document.getElementById('gammaRange');
    const gammaValue = document.getElementById('gammaValue');
    const constantInput = document.getElementById('constantInput');
    const bitPlaneSelect = document.getElementById('bitPlaneSelect');
    const spatialType = document.getElementById('spatialType');
    const kernelSize = document.getElementById('kernelSize');
    const lineDirection = document.getElementById('lineDirection');
    const detectThreshold = document.getElementById('detectThreshold');
    const seedXInput = document.getElementById('seedX');
    const seedYInput = document.getElementById('seedY');
    const applyBtn = document.getElementById('applyBtn');
    const resetBtn = document.getElementById('resetBtn');
    const swapBtn = document.getElementById('swapBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const demoBtn = document.getElementById('demoBtn');
    const statusBox = document.getElementById('status');
    const originalInfo = document.getElementById('originalInfo');
    const resultInfo = document.getElementById('resultInfo');

    const originalCanvas = document.getElementById('originalCanvas');
    const resultCanvas = document.getElementById('resultCanvas');
    const originalCtx = originalCanvas.getContext('2d', { willReadFrequently: true });
    const resultCtx = resultCanvas.getContext('2d', { willReadFrequently: true });
    const histOriginal = document.getElementById('histOriginal');
    const histResult = document.getElementById('histResult');
    const histOriginalCtx = histOriginal.getContext('2d');
    const histResultCtx = histResult.getContext('2d');

    thresholdRange.addEventListener('input', () => thresholdValue.textContent = thresholdRange.value);
    gammaRange.addEventListener('input', () => gammaValue.textContent = (Number(gammaRange.value) / 100).toFixed(2));
    thresholdValue.textContent = thresholdRange.value;
    gammaValue.textContent = (Number(gammaRange.value) / 100).toFixed(2);

    function setStatus(msg) {
      statusBox.textContent = msg;
    }

    function clamp(v, min = 0, max = 255) {
      return Math.max(min, Math.min(max, v));
    }

    function hasImage(canvas) {
      return canvas.width > 0 && canvas.height > 0;
    }

    function copyCanvas(src, dst) {
      dst.width = src.width;
      dst.height = src.height;
      dst.getContext('2d').drawImage(src, 0, 0);
    }

    function updateInfo() {
      originalInfo.textContent = hasImage(originalCanvas) ? `${originalCanvas.width} x ${originalCanvas.height}` : 'Chưa có ảnh';
      resultInfo.textContent = hasImage(resultCanvas) ? `${resultCanvas.width} x ${resultCanvas.height}` : 'Chưa có ảnh';
      if (hasImage(originalCanvas)) drawHistogramFromCanvas(originalCanvas, histOriginalCtx, histOriginal);
      if (hasImage(resultCanvas)) drawHistogramFromCanvas(resultCanvas, histResultCtx, histResult);
    }

    function fitDrawImage(img, canvas, ctx) {
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    function loadImageElement(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Không thể tải ảnh.'));
        img.src = src;
      });
    }

    async function loadFromURL() {
      const url = urlInput.value.trim();
      if (!url) {
        setStatus('Bạn chưa nhập URL ảnh.');
        return;
      }
      try {
        const img = await loadImageElement(url);
        fitDrawImage(img, originalCanvas, originalCtx);
        copyCanvas(originalCanvas, resultCanvas);
        updateInfo();
        setStatus('Đã nạp ảnh từ URL thành công.');
      } catch (err) {
        setStatus('Không nạp được ảnh từ URL. Có thể ảnh bị chặn CORS. Hãy tải ảnh về máy và chọn trực tiếp.');
      }
    }

    function loadFromFile(file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const img = await loadImageElement(e.target.result);
          fitDrawImage(img, originalCanvas, originalCtx);
          copyCanvas(originalCanvas, resultCanvas);
          updateInfo();
          setStatus(`Đã nạp ảnh từ máy: ${file.name}`);
        } catch {
          setStatus('Không thể đọc file ảnh này.');
        }
      };
      reader.readAsDataURL(file);
    }

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) loadFromFile(file);
    });
    loadUrlBtn.addEventListener('click', loadFromURL);

    function getSourceCanvas() {
      const fromOriginal = sourceSelect.value === 'original';
      return fromOriginal ? originalCanvas : resultCanvas;
    }

    function getImageData(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    function putImageData(canvas, imageData) {
      const ctx = canvas.getContext('2d');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      ctx.putImageData(imageData, 0, 0);
    }

    function toGrayValue(r, g, b) {
      return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }

    function cloneImageData(imageData) {
      return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    }

    function grayScale(imageData) {
      const out = cloneImageData(imageData);
      const d = out.data;
      for (let i = 0; i < d.length; i += 4) {
        const g = toGrayValue(d[i], d[i+1], d[i+2]);
        d[i] = d[i+1] = d[i+2] = g;
      }
      return out;
    }

    function negativeImage(imageData) {
      const out = cloneImageData(imageData);
      const d = out.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = 255 - d[i];
        d[i+1] = 255 - d[i+1];
        d[i+2] = 255 - d[i+2];
      }
      return out;
    }

    function thresholdImage(imageData, threshold) {
      const gray = grayScale(imageData);
      const d = gray.data;
      for (let i = 0; i < d.length; i += 4) {
        const val = d[i] >= threshold ? 255 : 0;
        d[i] = d[i+1] = d[i+2] = val;
      }
      return gray;
    }

    function logTransform(imageData, c = 1) {
      const out = cloneImageData(imageData);
      const d = out.data;
      const scale = 255 / Math.log(256);
      for (let i = 0; i < d.length; i += 4) {
        d[i]   = clamp(c * scale * Math.log(1 + d[i]));
        d[i+1] = clamp(c * scale * Math.log(1 + d[i+1]));
        d[i+2] = clamp(c * scale * Math.log(1 + d[i+2]));
      }
      return out;
    }

    function powerLawTransform(imageData, gamma = 1, c = 1) {
      const out = cloneImageData(imageData);
      const d = out.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i]   = clamp(c * 255 * Math.pow(d[i] / 255, gamma));
        d[i+1] = clamp(c * 255 * Math.pow(d[i+1] / 255, gamma));
        d[i+2] = clamp(c * 255 * Math.pow(d[i+2] / 255, gamma));
      }
      return out;
    }

    function bitPlaneSlicing(imageData, bit) {
      const gray = grayScale(imageData);
      const d = gray.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = ((d[i] >> bit) & 1) ? 255 : 0;
        d[i] = d[i+1] = d[i+2] = v;
      }
      return gray;
    }

    function histogramEqualization(imageData) {
      const gray = grayScale(imageData);
      const d = gray.data;
      const hist = new Array(256).fill(0);
      for (let i = 0; i < d.length; i += 4) hist[d[i]]++;
      const total = gray.width * gray.height;
      const cdf = new Array(256).fill(0);
      cdf[0] = hist[0];
      for (let i = 1; i < 256; i++) cdf[i] = cdf[i-1] + hist[i];
      let cdfMin = 0;
      for (let i = 0; i < 256; i++) {
        if (cdf[i] !== 0) { cdfMin = cdf[i]; break; }
      }
      for (let i = 0; i < d.length; i += 4) {
        const v = d[i];
        const eq = Math.round(((cdf[v] - cdfMin) / (total - cdfMin || 1)) * 255);
        d[i] = d[i+1] = d[i+2] = clamp(eq);
      }
      return gray;
    }

    function getGrayMatrix(imageData) {
      const w = imageData.width, h = imageData.height;
      const gray = new Float32Array(w * h);
      const d = imageData.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          gray[y * w + x] = toGrayValue(d[idx], d[idx+1], d[idx+2]);
        }
      }
      return gray;
    }

    function grayMatrixToImage(gray, w, h) {
      const out = new ImageData(w, h);
      const d = out.data;
      for (let i = 0; i < gray.length; i++) {
        const v = clamp(Math.round(gray[i]));
        const idx = i * 4;
        d[idx] = d[idx+1] = d[idx+2] = v;
        d[idx+3] = 255;
      }
      return out;
    }

    function convolveGray(imageData, kernel, divisor = 1, offset = 0, absoluteValue = false) {
      const w = imageData.width, h = imageData.height;
      const src = getGrayMatrix(imageData);
      const dst = new Float32Array(w * h);
      const kSize = Math.sqrt(kernel.length);
      const half = Math.floor(kSize / 2);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let sum = 0;
          for (let ky = -half; ky <= half; ky++) {
            for (let kx = -half; kx <= half; kx++) {
              const px = Math.min(w - 1, Math.max(0, x + kx));
              const py = Math.min(h - 1, Math.max(0, y + ky));
              const kval = kernel[(ky + half) * kSize + (kx + half)];
              sum += src[py * w + px] * kval;
            }
          }
          sum = sum / divisor + offset;
          if (absoluteValue) sum = Math.abs(sum);
          dst[y * w + x] = sum;
        }
      }
      return grayMatrixToImage(dst, w, h);
    }

    function meanFilter(imageData, size = 3) {
      const total = size * size;
      const kernel = new Array(total).fill(1);
      return convolveGray(imageData, kernel, total, 0, false);
    }

    function gaussianFilter(imageData) {
      const kernel = [1,2,1,2,4,2,1,2,1];
      return convolveGray(imageData, kernel, 16, 0, false);
    }

    function medianFilter(imageData, size = 3) {
      const w = imageData.width, h = imageData.height;
      const src = getGrayMatrix(imageData);
      const dst = new Float32Array(w * h);
      const half = Math.floor(size / 2);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const arr = [];
          for (let ky = -half; ky <= half; ky++) {
            for (let kx = -half; kx <= half; kx++) {
              const px = Math.min(w - 1, Math.max(0, x + kx));
              const py = Math.min(h - 1, Math.max(0, y + ky));
              arr.push(src[py * w + px]);
            }
          }
          arr.sort((a, b) => a - b);
          dst[y * w + x] = arr[Math.floor(arr.length / 2)];
        }
      }
      return grayMatrixToImage(dst, w, h);
    }

    function prewittEdge(imageData) {
      const gxKernel = [-1,0,1,-1,0,1,-1,0,1];
      const gyKernel = [-1,-1,-1,0,0,0,1,1,1];
      return gradientMagnitude(imageData, gxKernel, gyKernel);
    }

    function sobelFilter(imageData) {
      const gxKernel = [-1,0,1,-2,0,2,-1,0,1];
      const gyKernel = [-1,-2,-1,0,0,0,1,2,1];
      return gradientMagnitude(imageData, gxKernel, gyKernel);
    }

    function gradientMagnitude(imageData, kx, ky) {
      const w = imageData.width, h = imageData.height;
      const src = getGrayMatrix(imageData);
      const dst = new Float32Array(w * h);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          let gx = 0, gy = 0;
          let idx = 0;
          for (let kyOff = -1; kyOff <= 1; kyOff++) {
            for (let kxOff = -1; kxOff <= 1; kxOff++) {
              const val = src[(y + kyOff) * w + (x + kxOff)];
              gx += val * kx[idx];
              gy += val * ky[idx];
              idx++;
            }
          }
          dst[y * w + x] = Math.sqrt(gx * gx + gy * gy);
        }
      }
      return grayMatrixToImage(dst, w, h);
    }

    function sobelWithThreshold(imageData, t) {
      const sobel = sobelFilter(imageData);
      return thresholdImage(sobel, t);
    }

    function laplacianFiltered(imageData) {
      const kernel = [0,1,0,1,-4,1,0,1,0];
      return convolveGray(imageData, kernel, 1, 128, true);
    }

    function sharpenImage(imageData) {
      const kernel = [0,-1,0,-1,5,-1,0,-1,0];
      return convolveGray(imageData, kernel, 1, 0, false);
    }

    function pointsDetection(imageData, t) {
      const kernel = [-1,-1,-1,-1,8,-1,-1,-1,-1];
      const res = convolveGray(imageData, kernel, 1, 0, true);
      return thresholdImage(res, t);
    }

    function linesDetection(imageData, direction, t) {
      let kernel;
      switch (direction) {
        case 'vertical':
          kernel = [-1,2,-1,-1,2,-1,-1,2,-1];
          break;
        case 'diag45':
          kernel = [-1,-1,2,-1,2,-1,2,-1,-1];
          break;
        case 'diag135':
          kernel = [2,-1,-1,-1,2,-1,-1,-1,2];
          break;
        default:
          kernel = [-1,-1,-1,2,2,2,-1,-1,-1];
      }
      const res = convolveGray(imageData, kernel, 1, 0, true);
      return thresholdImage(res, t);
    }

    function toBinaryMatrix(imageData, threshold = 128) {
      const gray = getGrayMatrix(imageData);
      const binary = new Uint8Array(gray.length);
      for (let i = 0; i < gray.length; i++) binary[i] = gray[i] >= threshold ? 1 : 0;
      return { data: binary, width: imageData.width, height: imageData.height };
    }

    function binaryMatrixToImage(bin, w, h) {
      const out = new ImageData(w, h);
      for (let i = 0; i < bin.length; i++) {
        const v = bin[i] ? 255 : 0;
        const idx = i * 4;
        out.data[idx] = out.data[idx+1] = out.data[idx+2] = v;
        out.data[idx+3] = 255;
      }
      return out;
    }

    function morphology(binObj, op, size = 3) {
      const { data, width: w, height: h } = binObj;
      const radius = Math.floor(size / 2);
      const out = new Uint8Array(data.length);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let acc = op === 'erosion' ? 1 : 0;
          for (let ky = -radius; ky <= radius; ky++) {
            for (let kx = -radius; kx <= radius; kx++) {
              const px = x + kx;
              const py = y + ky;
              const inside = px >= 0 && px < w && py >= 0 && py < h;
              const val = inside ? data[py * w + px] : 0;
              if (op === 'erosion') {
                if (val === 0) { acc = 0; ky = radius + 1; break; }
              } else {
                if (val === 1) { acc = 1; ky = radius + 1; break; }
              }
            }
          }
          out[y * w + x] = acc;
        }
      }
      return { data: out, width: w, height: h };
    }

    function erosion(imageData, threshold = 128, size = 3) {
      const bin = toBinaryMatrix(imageData, threshold);
      const er = morphology(bin, 'erosion', size);
      return binaryMatrixToImage(er.data, er.width, er.height);
    }

    function dilation(imageData, threshold = 128, size = 3) {
      const bin = toBinaryMatrix(imageData, threshold);
      const di = morphology(bin, 'dilation', size);
      return binaryMatrixToImage(di.data, di.width, di.height);
    }

    function opening(imageData, threshold = 128, size = 3) {
      const bin = toBinaryMatrix(imageData, threshold);
      const er = morphology(bin, 'erosion', size);
      const op = morphology(er, 'dilation', size);
      return binaryMatrixToImage(op.data, op.width, op.height);
    }

    function closing(imageData, threshold = 128, size = 3) {
      const bin = toBinaryMatrix(imageData, threshold);
      const di = morphology(bin, 'dilation', size);
      const cl = morphology(di, 'erosion', size);
      return binaryMatrixToImage(cl.data, cl.width, cl.height);
    }

    function boundaryExtraction(imageData, threshold = 128, size = 3) {
      const bin = toBinaryMatrix(imageData, threshold);
      const er = morphology(bin, 'erosion', size);
      const out = new Uint8Array(bin.data.length);
      for (let i = 0; i < out.length; i++) out[i] = bin.data[i] && !er.data[i] ? 1 : 0;
      return binaryMatrixToImage(out, bin.width, bin.height);
    }

    function regionFill(imageData, threshold = 128, seedX = 0, seedY = 0) {
      const bin = toBinaryMatrix(imageData, threshold);
      const { data, width: w, height: h } = bin;
      const x0 = clamp(Math.floor(seedX), 0, w - 1);
      const y0 = clamp(Math.floor(seedY), 0, h - 1);
      const startIdx = y0 * w + x0;
      const target = data[startIdx];
      const fillValue = 1;

      if (target === fillValue) {
        return binaryMatrixToImage(data, w, h);
      }

      const out = new Uint8Array(data);
      const q = [[x0, y0]];
      const visited = new Uint8Array(data.length);
      visited[startIdx] = 1;

      while (q.length) {
        const [x, y] = q.shift();
        const idx = y * w + x;
        if (out[idx] !== target) continue;
        out[idx] = fillValue;
        const nbr = [[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
        for (const [nx, ny] of nbr) {
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const nidx = ny * w + nx;
            if (!visited[nidx] && out[nidx] === target) {
              visited[nidx] = 1;
              q.push([nx, ny]);
            }
          }
        }
      }
      return binaryMatrixToImage(out, w, h);
    }

    function drawHistogramFromCanvas(canvas, ctx, histCanvas) {
      if (!hasImage(canvas)) return;
      const imageData = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
      const gray = grayScale(imageData);
      const hist = new Array(256).fill(0);
      const d = gray.data;
      for (let i = 0; i < d.length; i += 4) hist[d[i]]++;
      const maxVal = Math.max(...hist);

      ctx.clearRect(0, 0, histCanvas.width, histCanvas.height);
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, histCanvas.width, histCanvas.height);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(0, 0, histCanvas.width, histCanvas.height);

      const barW = histCanvas.width / 256;
      for (let i = 0; i < 256; i++) {
        const h = (hist[i] / (maxVal || 1)) * (histCanvas.height - 20);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(i * barW, histCanvas.height - h, Math.max(barW, 1), h);
      }
    }

    function runSelectedAlgorithm() {
      const srcCanvas = getSourceCanvas();
      if (!hasImage(srcCanvas)) {
        setStatus('Chưa có ảnh để xử lý.');
        return;
      }

      const imageData = getImageData(srcCanvas);
      const algo = algorithmSelect.value;
      const threshold = Number(thresholdRange.value);
      const gamma = Number(gammaRange.value) / 100;
      const c = Number(constantInput.value) || 1;
      const bit = Number(bitPlaneSelect.value);
      const size = Number(kernelSize.value);
      const detectT = Number(detectThreshold.value);
      const seedX = Number(seedXInput.value);
      const seedY = Number(seedYInput.value);
      let result;
      let note = '';

      switch (algo) {
        case 'grayscale':
          result = grayScale(imageData);
          note = 'GrayScale Conversion: chuyển ảnh màu sang ảnh xám.';
          break;
        case 'hist_eq':
          result = histogramEqualization(imageData);
          note = 'Histogram Equalization: cân bằng histogram trên ảnh xám.';
          break;
        case 'negative':
          result = negativeImage(imageData);
          note = 'Negative Image: lấy ảnh âm bản.';
          break;
        case 'threshold':
          result = thresholdImage(imageData, threshold);
          note = `Thresholding với T = ${threshold}.`;
          break;
        case 'log':
          result = logTransform(imageData, c);
          note = `Logarithmic transformation với c = ${c}.`;
          break;
        case 'power':
          result = powerLawTransform(imageData, gamma, c);
          note = `Power-law transform với gamma = ${gamma.toFixed(2)}, c = ${c}.`;
          break;
        case 'bit_plane':
          result = bitPlaneSlicing(imageData, bit);
          note = `Bit plane slicing với bit = ${bit}.`;
          break;
        case 'spatial':
          if (spatialType.value === 'mean') {
            result = meanFilter(imageData, size);
            note = `Spatial Filtering: Mean ${size}x${size}.`;
          } else if (spatialType.value === 'median') {
            result = medianFilter(imageData, size);
            note = `Spatial Filtering: Median ${size}x${size}.`;
          } else {
            result = gaussianFilter(imageData);
            note = 'Spatial Filtering: Gaussian 3x3.';
          }
          break;
        case 'edge':
          result = prewittEdge(imageData);
          note = 'Edges Processing: dùng Prewitt để phát hiện biên.';
          break;
        case 'laplacian':
          result = laplacianFiltered(imageData);
          note = 'Laplacian Filtered Image.';
          break;
        case 'sharpen':
          result = sharpenImage(imageData);
          note = 'Sharpened Image: làm sắc ảnh bằng kernel sharpen.';
          break;
        case 'sobel':
          result = sobelFilter(imageData);
          note = 'Sobel Filter.';
          break;
        case 'sobel_threshold':
          result = sobelWithThreshold(imageData, detectT);
          note = `Sobel Filter with Thresholding, T = ${detectT}.`;
          break;
        case 'points':
          result = pointsDetection(imageData, detectT);
          note = `Points Detection, T = ${detectT}.`;
          break;
        case 'lines':
          result = linesDetection(imageData, lineDirection.value, detectT);
          note = `Lines Detection theo hướng ${lineDirection.value}, T = ${detectT}.`;
          break;
        case 'erosion':
          result = erosion(imageData, threshold, size);
          note = `Erosion với threshold = ${threshold}, SE = ${size}x${size}.`;
          break;
        case 'dilation':
          result = dilation(imageData, threshold, size);
          note = `Dilation với threshold = ${threshold}, SE = ${size}x${size}.`;
          break;
        case 'opening':
          result = opening(imageData, threshold, size);
          note = `Opening với threshold = ${threshold}, SE = ${size}x${size}.`;
          break;
        case 'closing':
          result = closing(imageData, threshold, size);
          note = `Closing với threshold = ${threshold}, SE = ${size}x${size}.`;
          break;
        case 'boundary':
          result = boundaryExtraction(imageData, threshold, size);
          note = `Boundary Extraction với threshold = ${threshold}, SE = ${size}x${size}.`;
          break;
        case 'region_fill':
          result = regionFill(imageData, threshold, seedX, seedY);
          note = `Region Filling với threshold = ${threshold}, seed = (${seedX}, ${seedY}).`;
          break;
        default:
          setStatus('Thuật toán chưa được hỗ trợ.');
          return;
      }

      putImageData(resultCanvas, result);
      updateInfo();
      setStatus(`Đã xử lý xong.\n${note}\nNguồn đầu vào: ${sourceSelect.value === 'original' ? 'Ảnh gốc' : 'Ảnh kết quả hiện tại'}.`);
    }

    applyBtn.addEventListener('click', runSelectedAlgorithm);

    resetBtn.addEventListener('click', () => {
      if (!hasImage(originalCanvas)) {
        setStatus('Chưa có ảnh gốc để khôi phục.');
        return;
      }
      copyCanvas(originalCanvas, resultCanvas);
      updateInfo();
      setStatus('Đã khôi phục ảnh kết quả bằng ảnh gốc.');
    });

    swapBtn.addEventListener('click', () => {
      if (!hasImage(resultCanvas)) {
        setStatus('Chưa có ảnh kết quả để thay thành ảnh gốc.');
        return;
      }
      copyCanvas(resultCanvas, originalCanvas);
      updateInfo();
      setStatus('Đã đưa ảnh kết quả thành ảnh gốc mới.');
    });

    downloadBtn.addEventListener('click', () => {
      if (!hasImage(resultCanvas)) {
        setStatus('Chưa có ảnh kết quả để tải.');
        return;
      }
      const a = document.createElement('a');
      a.href = resultCanvas.toDataURL('image/png');
      a.download = 'processed_image.png';
      a.click();
      setStatus('Đã tạo file tải ảnh kết quả.');
    });

    resultCanvas.addEventListener('click', (e) => {
      if (!hasImage(resultCanvas)) return;
      const rect = resultCanvas.getBoundingClientRect();
      const scaleX = resultCanvas.width / rect.width;
      const scaleY = resultCanvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);
      seedXInput.value = x;
      seedYInput.value = y;
      setStatus(`Đã lấy seed point từ canvas kết quả: (${x}, ${y}).`);
    });

    function generateDemoImage() {
      const w = 640, h = 420;
      originalCanvas.width = w;
      originalCanvas.height = h;
      const ctx = originalCtx;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0ea5e9');
      grad.addColorStop(0.5, '#f59e0b');
      grad.addColorStop(1, '#ef4444');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(140, 100, 50, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111827';
      ctx.fillRect(270, 80, 180, 100);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(300, 110, 120, 40);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(70, 330);
      ctx.lineTo(580, 260);
      ctx.stroke();

      ctx.fillStyle = '#000000';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(40 + i * 90, 350 - i * 22, 26, 26);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px Arial';
      ctx.fillText('DEMO', 245, 245);

      copyCanvas(originalCanvas, resultCanvas);
      updateInfo();
      setStatus('Đã nạp ảnh demo để bạn test nhanh các thuật toán.');
    }

    demoBtn.addEventListener('click', generateDemoImage);
    generateDemoImage();
