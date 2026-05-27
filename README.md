# XuLyAnh Web

Ung dung web tinh dung Canvas de xu ly anh so. Du an goc la Java Swing/NetBeans; logic thuat toan da duoc port sang JavaScript va phan Java goc da duoc loai bo de du an gon hon.

## Cach chay

Mo truc tiep file:

```powershell
start web\index.html
```

Hoac mo `web/index.html` bang trinh duyet.

Khong can cai NetBeans, JDK, JFreeChart hay chay server.

## Cau truc

- `web/index.html`: giao dien chinh.
- `web/styles.css`: giao dien va responsive layout.
- `web/app.js`: logic xu ly anh bang Canvas/ImageData.

## Thuat toan da port

- GrayScale Conversion Image
- Histogram Equalization (Biểu đồ phân bố độ sáng, giúp cải thiện độ tương phản của ảnh)
  - **Chi tiết:** Hiển thị 2 biểu đồ (ảnh gốc & kết quả) với độ phân giải 256 mức xám
  - **Chức năng:** Phân tích phân bố pixel trong từng kênh màu (R, G, B)
  - **Kích thước:** 512px x 180px, tỷ lệ 1:1 cho mỗi giá trị pixel
- Negative Image
- Thresholding
- Logarithmic transformation
- Power law transforms
- Bit plane slicing
- Min, Max, Median, Average, Weighted Average filter
- Pad border va Replicate border
- Laplcian Filtered Image
- Sharpened Image
- Sobel Filter
- Soble Filter with Thresholding
- Points Detection
- Lines Detection
- Erosion
- Dilation
- Opening
- Closing
- Boundary Extraction