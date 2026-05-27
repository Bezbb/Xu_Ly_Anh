# XuLyAnh Web

Ứng dụng web tĩnh dùng Canvas để xử lý ảnh số. Dự án gốc là Java Swing/NetBeans; logic thuật toán đã được port sang JavaScript và phần Java gốc đã được loại bỏ để dự án gọn hơn.

## Cách chạy

Mở trực tiếp file:

```powershell
start web\index.html
```

Hoặc mở `web/index.html` bằng trình duyệt.

Không cần cài NetBeans, JDK, JFreeChart hay chạy server.

## Cấu trúc

- `web/index.html`: giao diện chính.
- `web/styles.css`: giao diện và responsive layout.
- `web/app.js`: logic xử lý ảnh bằng Canvas/ImageData.

## Mô tả thuật toán sử dụng

Dự án xử lý ảnh trực tiếp trên từng pixel của `ImageData`. Mỗi pixel gồm 4 kênh RGBA; các thuật toán chủ yếu thay đổi 3 kênh màu R, G, B và giữ lại kênh alpha.

### 1. Biến đổi mức xám và cường độ sáng

- **GrayScale Conversion Image:** chuyển ảnh màu về ảnh xám bằng cách lấy giá trị kênh R làm mức xám, sau đó gán cùng giá trị này cho cả 3 kênh R, G, B.
- **Negative Image:** tạo ảnh âm bản bằng công thức `newValue = 255 - oldValue` cho từng kênh màu. Vùng sáng sẽ thành tối và vùng tối sẽ thành sáng.
- **Thresholding:** nhị phân hóa ảnh theo ngưỡng do người dùng nhập. Pixel lớn hơn ngưỡng được gán 255, pixel nhỏ hơn hoặc bằng ngưỡng được gán 0.
- **Logarithmic transformation:** biến đổi cường độ theo công thức gần đúng `s = C * log(r + 1)`. Thuật toán này làm nổi bật các vùng tối và nén bớt chênh lệch ở vùng sáng.
- **Power law transforms:** biến đổi gamma theo công thức `s = C * r^gamma`. Trong ứng dụng, `C = 5` và `gamma` do người dùng nhập, giúp điều chỉnh độ sáng/tông tương phản của ảnh.
- **Bit plane slicing:** tác động vào mặt phẳng bit được chọn bằng mặt nạ `2^bit`. Cách này dùng để quan sát hoặc làm nổi bật thông tin nằm trong từng lớp bit của giá trị pixel.

### 2. Histogram

- **Histogram:** đếm số lượng pixel theo 256 mức xám từ 0 đến 255. Ứng dụng vẽ histogram cho ảnh gốc và ảnh kết quả để so sánh phân bố độ sáng.
- **Histogram Equalization:** cân bằng histogram bằng cách tính tần suất tích lũy, tạo bảng ánh xạ mới `map[i] = cumulative[i] * 255 / totalPixels`, rồi thay mỗi mức xám cũ bằng mức xám mới. Kết quả thường có độ tương phản rõ hơn, nhất là với ảnh có dải sáng hẹp.

### 3. Lọc lân cận 3x3

Các bộ lọc này đọc cửa sổ 3x3 quanh mỗi pixel, tính giá trị mới cho pixel trung tâm, và bỏ qua biên ngoài cùng của ảnh.

- **Min neighbourhood filter:** chọn pixel có tổng `R + G + B` nhỏ nhất trong cửa sổ 3x3. Kết quả làm nổi bật vùng tối và có tác dụng gần giống phép co trên ảnh sáng.
- **Max neighbourhood filter:** chọn pixel có tổng `R + G + B` lớn nhất trong cửa sổ 3x3. Kết quả làm nổi bật vùng sáng và có tác dụng gần giống phép giãn.
- **Median filter:** sắp xếp các tổng `R + G + B` trong cửa sổ 3x3, lấy giá trị ở giữa rồi gán thành mức xám. Bộ lọc này thường dùng để giảm nhiễu muối tiêu.
- **Average filter:** tính trung bình cộng 9 pixel lân cận cho từng kênh màu. Ảnh kết quả mềm hơn nhưng có thể bị mờ.
- **Weighted average filter:** tính trung bình có trọng số với ma trận:

```text
1 2 1
2 4 2
1 2 1
```

Tổng trọng số là 16. Bộ lọc này làm trơn ảnh nhưng giữ vai trò của pixel trung tâm cao hơn average filter.

### 4. Xử lý biên ảnh

- **Pad border:** thay vùng biên bằng màu đen hoặc trắng theo kích thước viền người dùng chọn.
- **Replicate border:** thay vùng biên bằng màu lấy từ một cột mẫu bên trong ảnh, giúp mô phỏng cách lặp lại giá trị biên khi xử lý ảnh.

### 5. Phát hiện biên và làm sắc nét

- **Laplacian Filtered Image:** dùng mặt nạ Laplacian 3x3 với tâm `-4`, bốn góc `1`, các vị trí còn lại `0`. Thuật toán đáp ứng mạnh tại nơi cường độ thay đổi nhanh, nên dùng để phát hiện biên.
- **Sharpened Image:** dùng mặt nạ làm sắc nét với tâm `5`, bốn góc `-1`, các vị trí còn lại `0`. Kết quả tăng độ rõ của chi tiết và đường biên.
- **Sobel Filter:** dùng hai mặt nạ Sobel `Gx` và `Gy` để tính biên theo trục ngang/dọc, sau đó lấy độ lớn gradient `sqrt(Gx^2 + Gy^2)` cho từng kênh màu.
- **Sobel Filter with Thresholding:** sau khi tính Sobel, ứng dụng thêm ngưỡng tự động bằng basic global thresholding để chuyển kết quả biên về ảnh nhị phân đen/trắng.

### 6. Phát hiện điểm và đường

- **Basic global thresholding:** tính ngưỡng ban đầu từ mức xám trung bình, sau đó lặp lại việc chia pixel thành hai nhóm nhỏ hơn/lớn hơn ngưỡng. Ngưỡng mới bằng trung bình của hai giá trị trung bình nhóm; quá trình dừng khi ngưỡng không đổi nữa.
- **Points Detection:** dùng mặt nạ có tâm `8` và các điểm xung quanh `-1`. Nếu đáp ứng lớn hơn ngưỡng tự động thì pixel được xem là điểm nổi bật.
- **Lines Detection:** dùng các mặt nạ phát hiện đường theo 4 hướng: ngang, dọc, 45 độ và -45 độ. Các pixel nằm trên hướng cần phát hiện có hệ số `2`, các pixel còn lại có hệ số `-1`, sau đó so sánh với ngưỡng tự động.

### 7. Hình thái học ảnh nhị phân

Trước khi thực hiện các phép hình thái học, ảnh được chuyển về đen/trắng bằng basic global thresholding. Phần tử cấu trúc dạng dấu cộng gồm pixel trung tâm và 4 lân cận trên, dưới, trái, phải.

- **Erosion:** pixel kết quả là trắng khi pixel trung tâm và cả 4 lân cận trong phần tử cấu trúc đều trắng. Phép này làm co vùng trắng và loại bỏ chi tiết nhỏ.
- **Dilation:** pixel kết quả là trắng khi pixel trung tâm hoặc một trong 4 lân cận là trắng. Phép này làm giãn vùng trắng và nối các vùng gần nhau.
- **Opening:** thực hiện erosion rồi dilation. Thường dùng để loại nhiễu trắng nhỏ và làm tròn biên ngoài.
- **Closing:** thực hiện dilation rồi erosion. Thường dùng để lấp lỗ nhỏ và nối các khe đứt trong đối tượng.
- **Boundary Extraction:** lấy ảnh nhị phân gốc trừ đi ảnh đã erosion. Phần còn lại chính là biên của đối tượng.
