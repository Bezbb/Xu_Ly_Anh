(function () {
  "use strict";

  const state = {
    original: null,
    result: null,
    fileName: "xulyanh",
  };

  const el = {
    fileInput: document.getElementById("fileInput"),
    resetBtn: document.getElementById("resetBtn"),
    downloadBtn: document.getElementById("downloadBtn"),
    applyBtn: document.getElementById("applyBtn"),
    operationSelect: document.getElementById("operationSelect"),
    statusText: document.getElementById("statusText"),
    originalMeta: document.getElementById("originalMeta"),
    resultMeta: document.getElementById("resultMeta"),
    originalCanvas: document.getElementById("originalCanvas"),
    resultCanvas: document.getElementById("resultCanvas"),
    originalHistogram: document.getElementById("originalHistogram"),
    resultHistogram: document.getElementById("resultHistogram"),
    thresholdInput: document.getElementById("thresholdInput"),
    constantInput: document.getElementById("constantInput"),
    gammaInput: document.getElementById("gammaInput"),
    bitInput: document.getElementById("bitInput"),
    edgeInput: document.getElementById("edgeInput"),
    padColorSelect: document.getElementById("padColorSelect"),
    lineDirectionSelect: document.getElementById("lineDirectionSelect"),
  };

  const operations = {
    grayscale: {
      params: [],
      run: (src) => grayscale(src),
    },
    equalize: {
      params: [],
      run: (src) => equalize(src),
    },
    negative: {
      params: [],
      run: (src) => negativeImage(src),
    },
    threshold: {
      params: ["threshold"],
      run: (src) => thresholding(src, readInt(el.thresholdInput, 0, 255, "Ngưỡng")),
    },
    log: {
      params: ["constant"],
      run: (src) => logarithmicTransformation(src, readInt(el.constantInput, 1, 20, "Hằng số C")),
    },
    power: {
      params: ["gamma"],
      run: (src) => powerLawTransforms(src, readFloat(el.gammaInput, 0, 0.99, "Gamma"), 5),
    },
    bitplane: {
      params: ["bit"],
      run: (src) => bitPlaneSlicing(src, readInt(el.bitInput, 0, 7, "Bit")),
    },
    min: {
      params: [],
      run: (src) => minNeighbourhoodImage(src),
    },
    max: {
      params: [],
      run: (src) => maxNeighbourhoodImage(src),
    },
    median: {
      params: [],
      run: (src) => medianImage(src),
    },
    average: {
      params: [],
      run: (src) => averageImage(src),
    },
    weightedAverage: {
      params: [],
      run: (src) => weightAverageImage(src),
    },
    pad: {
      params: ["edge", "padColor"],
      run: (src) => padImage(
        src,
        readInt(el.edgeInput, 1, 200, "Kích thước viền"),
        readInt(el.padColorSelect, 0, 1, "Màu viền")
      ),
    },
    replicate: {
      params: ["edge"],
      run: (src) => replicateBorder(src, readInt(el.edgeInput, 1, 200, "Kích thước viền")),
    },
    laplacian: {
      params: [],
      run: (src) => laplcianFilteredImage(src),
    },
    sharpen: {
      params: [],
      run: (src) => sharpeneImage(src),
    },
    sobel: {
      params: [],
      run: (src) => sobelFilter(src),
    },
    sobelThreshold: {
      params: [],
      run: (src) => sobelFilterWithThesholding(src),
    },
    point: {
      params: [],
      run: (src) => pointDectection(src),
    },
    line: {
      params: ["lineDirection"],
      run: (src) => linesDetection(src, readInt(el.lineDirectionSelect, 1, 4, "Hướng đường")),
    },
    erosion: {
      params: [],
      run: (src) => erosion(src),
    },
    dilation: {
      params: [],
      run: (src) => dilation(src),
    },
    opening: {
      params: [],
      run: (src) => opening(src),
    },
    closing: {
      params: [],
      run: (src) => closing(src),
    },
    boundary: {
      params: [],
      run: (src) => boundaryExtraction(src),
    },
  };

  el.fileInput.addEventListener("change", handleFileInput);
  el.applyBtn.addEventListener("click", applySelectedOperation);
  el.resetBtn.addEventListener("click", resetResult);
  el.downloadBtn.addEventListener("click", downloadResult);
  el.operationSelect.addEventListener("change", updateVisibleParams);

  updateVisibleParams();
  clearCanvas(el.originalCanvas);
  clearCanvas(el.resultCanvas);
  drawEmptyHistogram(el.originalHistogram);
  drawEmptyHistogram(el.resultHistogram);

  function handleFileInput(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = function () {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);

      state.original = context.getImageData(0, 0, canvas.width, canvas.height);
      state.result = cloneImageData(state.original);
      state.fileName = file.name.replace(/\.[^.]+$/, "") || "xulyanh";

      drawImageData(el.originalCanvas, state.original);
      drawImageData(el.resultCanvas, state.result);
      drawHistogram(el.originalHistogram, state.original);
      drawHistogram(el.resultHistogram, state.result);
      updateMeta();
      setControlsEnabled(true);
      setStatus("Đã mở ảnh", "ready");
      URL.revokeObjectURL(url);
    };
    image.onerror = function () {
      URL.revokeObjectURL(url);
      setStatus("Không thể đọc file ảnh", "error");
    };
    image.src = url;
  }

  function applySelectedOperation() {
    if (!state.original) {
      setStatus("Vui lòng mở ảnh trước", "error");
      return;
    }

    const operation = operations[el.operationSelect.value];
    if (!operation) {
      setStatus("Chưa hỗ trợ thuật toán này", "error");
      return;
    }

    try {
      const startedAt = performance.now();
      state.result = operation.run(cloneImageData(state.original));
      drawImageData(el.resultCanvas, state.result);
      drawHistogram(el.resultHistogram, state.result);
      updateMeta();
      const elapsed = Math.max(1, Math.round(performance.now() - startedAt));
      setStatus("Xử lý thành công trong " + elapsed + " ms", "ready");
    } catch (error) {
      setStatus(error.message || "Xử lý thất bại", "error");
    }
  }

  function resetResult() {
    if (!state.original) {
      return;
    }

    state.result = cloneImageData(state.original);
    drawImageData(el.resultCanvas, state.result);
    drawHistogram(el.resultHistogram, state.result);
    updateMeta();
    setStatus("Đã phục hồi ảnh kết quả", "ready");
  }

  function downloadResult() {
    if (!state.result) {
      return;
    }

    el.resultCanvas.toBlob(function (blob) {
      if (!blob) {
        setStatus("Không thể tạo file PNG", "error");
        return;
      }

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = state.fileName + "-processed.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
    }, "image/png");
  }

  function setControlsEnabled(enabled) {
    el.applyBtn.disabled = !enabled;
    el.resetBtn.disabled = !enabled;
    el.downloadBtn.disabled = !enabled;
  }

  function updateVisibleParams() {
    const operation = operations[el.operationSelect.value];
    const active = new Set(operation ? operation.params : []);
    document.querySelectorAll(".param").forEach(function (node) {
      node.classList.toggle("is-visible", active.has(node.dataset.param));
    });
  }

  function updateMeta() {
    el.originalMeta.textContent = state.original ? state.original.width + " x " + state.original.height : "-";
    el.resultMeta.textContent = state.result ? state.result.width + " x " + state.result.height : "-";
  }

  function setStatus(message, type) {
    el.statusText.textContent = message;
    el.statusText.classList.toggle("is-error", type === "error");
    el.statusText.classList.toggle("is-ready", type === "ready");
  }

  function readInt(input, min, max, label) {
    const value = Number.parseInt(input.value, 10);
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new Error(label + " phải nằm trong khoảng " + min + " - " + max);
    }
    return value;
  }

  function readFloat(input, min, max, label) {
    const value = Number.parseFloat(input.value);
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new Error(label + " phải nằm trong khoảng " + min + " - " + max);
    }
    return value;
  }

  function clearCanvas(canvas) {
    const context = canvas.getContext("2d");
    canvas.width = canvas.width || 1;
    canvas.height = canvas.height || 1;
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawImageData(canvas, imageData) {
    const context = canvas.getContext("2d");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    context.putImageData(imageData, 0, 0);
  }

  function drawEmptyHistogram(canvas) {
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawHistogram(canvas, imageData) {
    const context = canvas.getContext("2d");
    const values = histogram(imageData);
    const maxValue = Math.max.apply(null, values) || 1;
    const width = canvas.width;
    const height = canvas.height;
    const leftPad = 12;
    const bottomPad = 30;
    const rightPad = 12;
    const topPad = 12;
    const chartWidth = width - leftPad - rightPad;
    const chartHeight = height - bottomPad - topPad;

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    // Vẽ trục X
    context.strokeStyle = "#000000";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(leftPad, height - bottomPad);
    context.lineTo(width - rightPad, height - bottomPad);
    context.stroke();

    // Vẽ các cột histogram với gradient
    const colors = [
      "#0d88c4", "#ff6b35", "#27ae60", "#e74c3c",
      "#9b59b6", "#f39c12", "#1abc9c", "#34495e"
    ];

    for (let i = 0; i < 256; i++) {
      const barHeight = (values[i] / maxValue) * chartHeight;
      const x = leftPad + (i / 256) * chartWidth;
      const nextX = leftPad + ((i + 1) / 256) * chartWidth;
      const barWidth = Math.max(0.5, nextX - x);
      
      // Chọn màu dựa trên vị trí
      const colorIndex = Math.floor((i / 256) * colors.length);
      context.fillStyle = colors[colorIndex];
      context.globalAlpha = 0.85;
      context.fillRect(x, (height - bottomPad) - barHeight, barWidth, barHeight);
      context.globalAlpha = 1.0;
    }

    // Nhãn trục X
    context.font = "11px Arial, sans-serif";
    context.fillStyle = "#666666";
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillText("Intensity", width / 2, height - 8);
  }

  function cloneImageData(imageData) {
    return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  }

  function createImageData(width, height) {
    const imageData = new ImageData(width, height);
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      data[i] = 255;
    }
    return imageData;
  }

  function indexOf(imageData, x, y) {
    return (y * imageData.width + x) * 4;
  }

  function clampByte(value) {
    if (!Number.isFinite(value)) {
      return 0;
    }
    if (value < 0) {
      return 0;
    }
    if (value > 255) {
      return 255;
    }
    return Math.trunc(value);
  }

  function setPixel(imageData, x, y, red, green, blue, alpha) {
    const index = indexOf(imageData, x, y);
    const data = imageData.data;
    data[index] = clampByte(red);
    data[index + 1] = clampByte(green);
    data[index + 2] = clampByte(blue);
    data[index + 3] = alpha === undefined ? 255 : clampByte(alpha);
  }

  function getColor(imageData, x, y) {
    const index = indexOf(imageData, x, y);
    const data = imageData.data;
    return [data[index], data[index + 1], data[index + 2], data[index + 3]];
  }

  function getFilterValues(src, x, y) {
    return [
      getColor(src, x - 1, y - 1),
      getColor(src, x, y - 1),
      getColor(src, x + 1, y - 1),
      getColor(src, x - 1, y),
      getColor(src, x, y),
      getColor(src, x + 1, y),
      getColor(src, x - 1, y + 1),
      getColor(src, x, y + 1),
      getColor(src, x + 1, y + 1),
    ];
  }

  function sumRgbPerPixel(color) {
    return color[0] + color[1] + color[2];
  }

  function minPixelValue(sum) {
    let position = 0;
    let min = 1000;
    for (let i = 0; i < sum.length; i++) {
      if (sum[i] < min) {
        position = i;
        min = sum[i];
      }
    }
    return position;
  }

  function maxPixelValue(sum) {
    let position = 0;
    let max = 0;
    for (let i = 0; i < sum.length; i++) {
      if (sum[i] > max) {
        position = i;
        max = sum[i];
      }
    }
    return position;
  }

  function grayscale(src) {
    const out = createImageData(src.width, src.height);
    const input = src.data;
    const output = out.data;
    for (let i = 0; i < input.length; i += 4) {
      const grey = input[i];
      output[i] = grey;
      output[i + 1] = grey;
      output[i + 2] = grey;
      output[i + 3] = input[i + 3];
    }
    return out;
  }

  function histogram(src) {
    const hist = new Array(256).fill(0);
    const data = src.data;
    for (let i = 0; i < data.length; i += 4) {
      hist[data[i]]++;
    }
    return hist;
  }

  function equalize(src) {
    const grey = grayscale(src);
    const histo = histogram(grey);
    const out = createImageData(src.width, src.height);
    const cumulative = new Array(256).fill(0);
    cumulative[0] = histo[0];
    for (let i = 1; i < 256; i++) {
      cumulative[i] = cumulative[i - 1] + histo[i];
    }

    const totalPixels = src.width * src.height;
    const map = new Array(256);
    for (let i = 0; i < 256; i++) {
      map[i] = Math.trunc((cumulative[i] * 255.0) / totalPixels);
    }

    const input = grey.data;
    const output = out.data;
    for (let i = 0; i < input.length; i += 4) {
      const value = map[input[i]];
      output[i] = value;
      output[i + 1] = value;
      output[i + 2] = value;
      output[i + 3] = input[i + 3];
    }
    return out;
  }

  function negativeImage(src) {
    const out = createImageData(src.width, src.height);
    const input = src.data;
    const output = out.data;
    for (let i = 0; i < input.length; i += 4) {
      output[i] = 255 - input[i];
      output[i + 1] = 255 - input[i + 1];
      output[i + 2] = 255 - input[i + 2];
      output[i + 3] = input[i + 3];
    }
    return out;
  }

  function thresholding(src, threshold) {
    const out = createImageData(src.width, src.height);
    const input = src.data;
    const output = out.data;
    for (let i = 0; i < input.length; i += 4) {
      output[i] = input[i] > threshold ? 255 : 0;
      output[i + 1] = input[i + 1] > threshold ? 255 : 0;
      output[i + 2] = input[i + 2] > threshold ? 255 : 0;
      output[i + 3] = input[i + 3];
    }
    return out;
  }

  function logarithmicTransformation(src, constant) {
    const out = createImageData(src.width, src.height);
    const input = src.data;
    const output = out.data;
    for (let i = 0; i < input.length; i += 4) {
      output[i] = clampByte(constant * Math.trunc(Math.log(input[i] + 1)));
      output[i + 1] = clampByte(constant * Math.trunc(Math.log(input[i + 1] + 1)));
      output[i + 2] = clampByte(constant * Math.trunc(Math.log(input[i + 2] + 1)));
      output[i + 3] = input[i + 3];
    }
    return out;
  }

  function powerLawTransforms(src, gamma, constant) {
    const out = createImageData(src.width, src.height);
    const input = src.data;
    const output = out.data;
    for (let i = 0; i < input.length; i += 4) {
      output[i] = clampByte(Math.pow(input[i], gamma) * constant);
      output[i + 1] = clampByte(Math.pow(input[i + 1], gamma) * constant);
      output[i + 2] = clampByte(Math.pow(input[i + 2], gamma) * constant);
      output[i + 3] = input[i + 3];
    }
    return out;
  }

  function bitPlaneSlicing(src, constant) {
    const out = createImageData(src.width, src.height);
    const input = src.data;
    const output = out.data;
    const mask = Math.trunc(Math.pow(2, constant));
    for (let i = 0; i < input.length; i += 4) {
      output[i] = input[i] | mask;
      output[i + 1] = input[i + 1] | mask;
      output[i + 2] = input[i + 2] | mask;
      output[i + 3] = input[i + 3];
    }
    return out;
  }

  function minNeighbourhoodImage(src) {
    const out = createImageData(src.width, src.height);
    for (let x = 1; x < src.width - 1; x++) {
      for (let y = 1; y < src.height - 1; y++) {
        const colors = getFilterValues(src, x, y);
        const sums = colors.map(sumRgbPerPixel);
        const color = colors[minPixelValue(sums)];
        setPixel(out, x, y, color[0], color[1], color[2], color[3]);
      }
    }
    return out;
  }

  function maxNeighbourhoodImage(src) {
    const out = createImageData(src.width, src.height);
    for (let x = 1; x < src.width - 1; x++) {
      for (let y = 1; y < src.height - 1; y++) {
        const colors = getFilterValues(src, x, y);
        const sums = colors.map(sumRgbPerPixel);
        const color = colors[maxPixelValue(sums)];
        setPixel(out, x, y, color[0], color[1], color[2], color[3]);
      }
    }
    return out;
  }

  function medianImage(src) {
    const out = createImageData(src.width, src.height);
    for (let x = 1; x < src.width - 1; x++) {
      for (let y = 1; y < src.height - 1; y++) {
        const colors = getFilterValues(src, x, y);
        const sums = colors.map(sumRgbPerPixel).sort(function (a, b) {
          return a - b;
        });
        const value = Math.trunc(sums[4] / 3);
        setPixel(out, x, y, value, value, value, 255);
      }
    }
    return out;
  }

  function averageImage(src) {
    const out = createImageData(src.width, src.height);
    for (let x = 1; x < src.width - 1; x++) {
      for (let y = 1; y < src.height - 1; y++) {
        const colors = getFilterValues(src, x, y);
        let redValue = 0;
        let greenValue = 0;
        let blueValue = 0;
        for (let i = 0; i < 9; i++) {
          redValue += colors[i][0];
          greenValue += colors[i][1];
          blueValue += colors[i][2];
        }
        setPixel(out, x, y, redValue / 9, greenValue / 9, blueValue / 9, 255);
      }
    }
    return out;
  }

  function weightAverageImage(src) {
    const out = createImageData(src.width, src.height);
    for (let x = 1; x < src.width - 1; x++) {
      for (let y = 1; y < src.height - 1; y++) {
        const colors = getFilterValues(src, x, y);
        let redValue = 0;
        let greenValue = 0;
        let blueValue = 0;
        for (let i = 0; i < 9; i++) {
          let coefficient;
          if (i === 4) {
            coefficient = 4;
          } else if (i % 2 === 0) {
            coefficient = 1;
          } else {
            coefficient = 2;
          }
          redValue += colors[i][0] * coefficient;
          greenValue += colors[i][1] * coefficient;
          blueValue += colors[i][2] * coefficient;
        }
        setPixel(out, x, y, redValue / 16, greenValue / 16, blueValue / 16, 255);
      }
    }
    return out;
  }

  function padImage(src, edge, option) {
    const out = createImageData(src.width, src.height);
    const half = Math.trunc(edge / 2);
    const color = option === 1 ? 255 : 0;
    for (let x = 0; x < src.width; x++) {
      for (let y = 0; y < src.height; y++) {
        if (isBorderLikeJava(src, x, y, half)) {
          setPixel(out, x, y, color, color, color, 255);
        } else {
          const old = getColor(src, x, y);
          setPixel(out, x, y, old[0], old[1], old[2], old[3]);
        }
      }
    }
    return out;
  }

  function replicateBorder(src, edge) {
    const out = createImageData(src.width, src.height);
    const half = Math.trunc(edge / 2);
    const sampleX = Math.min(src.width - 1, Math.max(0, half + 1));
    for (let x = 0; x < src.width; x++) {
      for (let y = 0; y < src.height; y++) {
        if (isBorderLikeJava(src, x, y, half)) {
          const color = getColor(src, sampleX, y);
          setPixel(out, x, y, color[0], color[1], color[2], color[3]);
        } else {
          const old = getColor(src, x, y);
          setPixel(out, x, y, old[0], old[1], old[2], old[3]);
        }
      }
    }
    return out;
  }

  function isBorderLikeJava(src, x, y, half) {
    return x < half || x > src.width - half - 1 || y < half || y > src.width - half - 1;
  }

  function laplcianFilteredImage(src) {
    const out = createImageData(src.width, src.height);
    for (let x = 1; x < src.width - 1; x++) {
      for (let y = 1; y < src.height - 1; y++) {
        const colors = getFilterValues(src, x, y);
        let redValue = 0;
        let greenValue = 0;
        let blueValue = 0;
        for (let i = 0; i < 9; i++) {
          let coefficient;
          if (i === 4) {
            coefficient = -4;
          } else if (i % 2 === 0) {
            coefficient = 1;
          } else {
            coefficient = 0;
          }
          redValue += colors[i][0] * coefficient;
          greenValue += colors[i][1] * coefficient;
          blueValue += colors[i][2] * coefficient;
        }
        setPixel(out, x, y, redValue, greenValue, blueValue, 255);
      }
    }
    return out;
  }

  function sharpeneImage(src) {
    const out = createImageData(src.width, src.height);
    for (let x = 1; x < src.width - 1; x++) {
      for (let y = 1; y < src.height - 1; y++) {
        const colors = getFilterValues(src, x, y);
        let redValue = 0;
        let greenValue = 0;
        let blueValue = 0;
        for (let i = 0; i < 9; i++) {
          let coefficient;
          if (i === 4) {
            coefficient = 5;
          } else if (i % 2 === 0) {
            coefficient = -1;
          } else {
            coefficient = 0;
          }
          redValue += colors[i][0] * coefficient;
          greenValue += colors[i][1] * coefficient;
          blueValue += colors[i][2] * coefficient;
        }
        setPixel(out, x, y, redValue, greenValue, blueValue, 255);
      }
    }
    return out;
  }

  function sobelFilter(src) {
    const out = createImageData(src.width, src.height);
    for (let x = 1; x < src.width - 1; x++) {
      for (let y = 1; y < src.height - 1; y++) {
        const sobel = sobelValues(getFilterValues(src, x, y));
        setPixel(out, x, y, sobel[0], sobel[1], sobel[2], 255);
      }
    }
    return out;
  }

  function sobelFilterWithThesholding(src) {
    const threshold = basicGlobalThresholding(src);
    const out = createImageData(src.width, src.height);
    for (let x = 1; x < src.width - 1; x++) {
      for (let y = 1; y < src.height - 1; y++) {
        const sobel = sobelValues(getFilterValues(src, x, y));
        const value = Math.trunc(sobel[0]) >= threshold ? 255 : 0;
        setPixel(out, x, y, value, value, value, 255);
      }
    }
    return out;
  }

  function sobelValues(colors) {
    const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    let redX = 0;
    let redY = 0;
    let greenX = 0;
    let greenY = 0;
    let blueX = 0;
    let blueY = 0;
    for (let i = 0; i < 9; i++) {
      redX += colors[i][0] * gx[i];
      redY += colors[i][0] * gy[i];
      greenX += colors[i][1] * gx[i];
      greenY += colors[i][1] * gy[i];
      blueX += colors[i][2] * gx[i];
      blueY += colors[i][2] * gy[i];
    }
    return [
      clampByte(Math.sqrt(redX * redX + redY * redY)),
      clampByte(Math.sqrt(greenX * greenX + greenY * greenY)),
      clampByte(Math.sqrt(blueX * blueX + blueY * blueY)),
    ];
  }

  function basicGlobalThresholding(src) {
    let sumGrey = 0;
    for (let x = 1; x < src.width; x++) {
      for (let y = 1; y < src.height; y++) {
        sumGrey += getColor(src, x, y)[1];
      }
    }

    let threshold = Math.trunc(sumGrey / (src.height * src.width));
    while (true) {
      let sumGrey1 = 0;
      let sumGrey2 = 0;
      let count1 = 0;
      let count2 = 0;
      for (let x = 0; x < src.width; x++) {
        for (let y = 0; y < src.height; y++) {
          const greyValue = getColor(src, x, y)[1];
          if (greyValue <= threshold) {
            sumGrey1 += greyValue;
            count1++;
          } else {
            sumGrey2 += greyValue;
            count2++;
          }
        }
      }

      if (count1 === 0) {
        count1 = 1;
      }
      if (count2 === 0) {
        count2 = 1;
      }

      const nextThreshold = Math.trunc((Math.trunc(sumGrey1 / count1) + Math.trunc(sumGrey2 / count2)) / 2);
      if (nextThreshold === threshold) {
        break;
      }
      threshold = nextThreshold;
    }
    return threshold;
  }

  function pointDectection(src) {
    const threshold = basicGlobalThresholding(src);
    const out = createImageData(src.width, src.height);
    for (let x = 1; x < src.width - 1; x++) {
      for (let y = 1; y < src.height - 1; y++) {
        const colors = getFilterValues(src, x, y);
        let redValue = 0;
        for (let i = 0; i < 9; i++) {
          redValue += colors[i][0] * (i === 4 ? 8 : -1);
        }
        const value = redValue > threshold ? 255 : 0;
        setPixel(out, x, y, value, value, value, 255);
      }
    }
    return out;
  }

  function getBlackWhiteImage(src) {
    const threshold = basicGlobalThresholding(src);
    const out = createImageData(src.width, src.height);
    for (let x = 0; x < src.width; x++) {
      for (let y = 0; y < src.height; y++) {
        const value = getColor(src, x, y)[1] >= threshold ? 255 : 0;
        setPixel(out, x, y, value, value, value, 255);
      }
    }
    return out;
  }

  function linesDetection(src, flag) {
    const threshold = basicGlobalThresholding(src);
    const out = createImageData(src.width, src.height);
    for (let x = 1; x < src.width - 1; x++) {
      for (let y = 1; y < src.height - 1; y++) {
        const colors = getFilterValues(src, x, y);
        let redValue = 0;
        for (let i = 0; i < 9; i++) {
          redValue += colors[i][0] * lineCoefficient(flag, i);
        }
        const value = redValue > threshold ? 255 : 0;
        setPixel(out, x, y, value, value, value, 255);
      }
    }
    return out;
  }

  function lineCoefficient(flag, index) {
    if (flag === 1) {
      return index === 3 || index === 4 || index === 5 ? 2 : -1;
    }
    if (flag === 2) {
      return index === 2 || index === 4 || index === 6 ? 2 : -1;
    }
    if (flag === 3) {
      return index === 1 || index === 4 || index === 7 ? 2 : -1;
    }
    if (flag === 4) {
      return index === 0 || index === 4 || index === 8 ? 2 : -1;
    }
    return 0;
  }

  function erosion(src) {
    const binary = getBlackWhiteImage(src);
    const out = createImageData(src.width, src.height);
    for (let x = 1; x < src.width - 1; x++) {
      for (let y = 1; y < src.height - 1; y++) {
        const colors = getFilterValues(binary, x, y);
        const fit = colors[1][1] === 255
          && colors[3][1] === 255
          && colors[5][1] === 255
          && colors[4][1] === 255
          && colors[7][1] === 255;
        const value = fit ? 255 : 0;
        setPixel(out, x, y, value, value, value, 255);
      }
    }
    return out;
  }

  function dilation(src) {
    const binary = getBlackWhiteImage(src);
    const out = createImageData(src.width, src.height);
    for (let x = 1; x < src.width - 1; x++) {
      for (let y = 1; y < src.height - 1; y++) {
        const colors = getFilterValues(binary, x, y);
        const hit = colors[1][1] === 255
          || colors[3][1] === 255
          || colors[5][1] === 255
          || colors[4][1] === 255
          || colors[7][1] === 255;
        const value = hit ? 255 : 0;
        setPixel(out, x, y, value, value, value, 255);
      }
    }
    return out;
  }

  function opening(src) {
    return dilation(erosion(src));
  }

  function closing(src) {
    return erosion(dilation(src));
  }

  function boundaryExtraction(src) {
    const eroded = erosion(src);
    const binary = getBlackWhiteImage(src);
    const out = createImageData(src.width, src.height);
    for (let x = 1; x < src.width - 1; x++) {
      for (let y = 1; y < src.height - 1; y++) {
        const original = getColor(binary, x, y);
        const shrunk = getColor(eroded, x, y);
        setPixel(out, x, y, original[0] - shrunk[0], original[1] - shrunk[1], original[2] - shrunk[2], 255);
      }
    }
    return out;
  }
})();
