# AI HR Scanner User Guide

## 1. Mục đích của app

AI HR Scanner là một MVP hỗ trợ HR:

- tạo Job/JD
- upload CV ứng viên
- parse CV sang dữ liệu có cấu trúc
- chấm điểm ứng viên theo rule scoring
- sinh feedback, risks, interview questions

App này là bản MVP local:

- backend: FastAPI
- database: PostgreSQL
- file CV: lưu local
- AI: Gemini
- UI: React

## 2. Chỉ dùng 2 script

Repo hiện đã chuẩn hóa chỉ còn 2 script:

- `start.ps1`
- `stop.ps1`

Không cần nhớ nhiều loại script nữa.

## 3. Cách chạy app

### Chạy app với database sạch

Phù hợp khi:

- muốn test bằng dữ liệu thật
- muốn bắt đầu từ trạng thái sạch
- muốn tự tạo job và tự upload CV

Lệnh chạy:

```powershell
cd e:\Workplace\ai-hr-assistant-tool
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

Sau khi chạy xong, mở:

- UI: `http://127.0.0.1:8000/`
- Swagger: `http://127.0.0.1:8000/docs`

### Dùng flow thật với Gemini

Phù hợp khi:

- muốn tạo JD thật
- muốn upload CV PDF/DOCX thật
- muốn Gemini parse JD/CV và generate feedback thật

Lệnh chạy:

```powershell
cd e:\Workplace\ai-hr-assistant-tool
powershell -ExecutionPolicy Bypass -File .\start.ps1 -GeminiApiKey "YOUR_REAL_GEMINI_KEY"
```

## 4. Trạng thái dữ liệu hiện tại

Script `start.ps1` giờ khởi động app với database sạch theo luồng chuẩn.

Điều đó có nghĩa là:

- không còn auto-seed job demo
- không còn auto-seed candidate demo
- không còn feedback demo dựng sẵn trong lúc start app

Nếu muốn dùng dữ liệu thật:

- cần có Gemini key thật
- cần tự tạo job mới
- cần tự upload CV mới

## 5. Cách mở app

Sau khi app chạy:

1. mở `http://127.0.0.1:8000/`
2. nếu giao diện cũ còn cache, bấm `Ctrl + F5`

## 6. Cách dùng UI

### Sidebar bên trái

- `Dashboard`: màn overview
- `Jobs`: màn chính để xem job và shortlist
- `Candidates`: tập trung vào review ứng viên
- `Evaluations`: bảng tổng hợp điểm
- `Settings`: thông tin cấu hình MVP

### Jobs

Ở màn `Jobs`:

- cột trái trên: danh sách job
- cột trái dưới: shortlist candidate theo job đang chọn
- panel phải: chi tiết candidate đang chọn

Bạn thao tác theo flow:

1. chọn một job
2. chọn một candidate
3. xem score, feedback, risks, parsed CV

### Candidates

Ở màn `Candidates`:

- vẫn dùng job đang chọn hiện tại
- tập trung vào list ứng viên và panel review
- tiện khi bạn muốn duyệt từng người

### Evaluations

Ở màn `Evaluations`:

- xem danh sách ứng viên theo score
- dùng để nhìn nhanh ranking

### Dashboard

Ở màn `Dashboard`:

- xem overview nhanh của job và candidate hiện tại

### Settings

Ở màn `Settings`:

- xem lưu ý về local storage
- AI usage
- scoring model
- demo mode

## 7. Cách đọc màn candidate detail

Khi chọn 1 candidate, panel bên phải sẽ có:

- `Overall score`: điểm normalize về thang 100
- `Score breakdown`: chi tiết điểm skills, experience, domain
- `Recommendation`: strong match / match / weak match / not match
- `Top strengths`
- `Overview`
- `Parsed CV`
- `Score Details`
- `Feedback`
- `Risks`
- `Interview Questions`

### Giải thích điểm số

Có 2 loại điểm:

1. `Raw weighted score`
2. `Normalized score`

Ví dụ:

- Skills: `75 / 80`
- Experience: `20 / 20`
- Domain: `10 / 10`

Tổng raw là:

- `105 / 110`

Sau đó backend normalize về thang 100:

- `95.5 / 100`

Nên nếu thấy `80 + 20 + 10` không bằng `100`, đó là bình thường. App đang tách:

- điểm gốc theo weight
- điểm cuối cùng theo thang 100

## 8. Tạo job mới

Trên UI:

1. bấm `New Job`
2. nhập:
   - `Job title`
   - `Job description`
   - `Experience weight`
   - `Domain weight`
3. bấm `Create Job`

Lưu ý:

- nếu không có Gemini key thật, bước này sẽ fail
- vì backend cần Gemini để parse JD

## 9. Upload CV mới

Trên UI:

1. chọn job trước
2. bấm `Add Candidate` hoặc `Upload CV`
3. chọn file `.pdf` hoặc `.docx`

Backend sẽ chạy:

1. extract text từ file
2. Gemini parse CV
3. backend rule-score theo JD
4. Gemini generate feedback
5. lưu candidate + evaluation

Lưu ý:

- chỉ hỗ trợ `PDF` và `DOCX`
- chưa có OCR
- nếu file scan ảnh mà không có text thì có thể parse fail

## 10. Download CV

Trong panel chi tiết candidate:

1. bấm `Download CV`
2. app sẽ tải file local đã lưu

## 11. Khi nào app đang chạy thật, khi nào đang demo

### Clean mode

Nếu bạn chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

thì:

- UI thật
- API thật
- DB thật
- nhưng database sẽ sạch
- nếu không có Gemini key thật thì tạo job / upload CV thật có thể lỗi

### Live mode

Nếu bạn chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1 -GeminiApiKey "YOUR_REAL_GEMINI_KEY"
```

thì:

- có thể tạo job thật
- có thể upload CV thật
- parse JD/CV thật
- generate feedback thật

## 12. Những lỗi thường gặp

### Mở UI không lên

Kiểm tra:

- Docker Desktop đã mở chưa
- script đã chạy xong chưa
- mở đúng `http://127.0.0.1:8000/`

### UI không đổi sau khi sửa code

Thử:

- `Ctrl + F5`
- hoặc mở tab ẩn danh

### Tạo job bị lỗi

Nguyên nhân thường là:

- chưa truyền Gemini key thật
- Gemini trả JSON lỗi

### Upload CV bị lỗi

Nguyên nhân thường là:

- chưa chọn job
- file không phải PDF/DOCX
- file không extract được text
- chưa có Gemini key thật

## 13. Cách dừng app

```powershell
powershell -ExecutionPolicy Bypass -File .\stop.ps1
```

## 14. Flow khuyến nghị khi demo

### Demo nhanh cho người xem

1. chạy `start.ps1`
2. mở UI
3. tạo một job mới
4. upload CV thật
5. mở candidate detail
6. giải thích:
   - overall score
   - raw weighted score
   - normalized score
   - matched skills
   - missing skills
   - risks
   - interview questions

### Demo flow thật

1. chạy script với Gemini key thật
2. tạo job mới bằng JD thật
3. upload CV thật
4. mở candidate detail
5. xem parsed CV + score + feedback

## 15. Tóm tắt ngắn

Nếu chỉ cần mở app để demo:

```powershell
cd e:\Workplace\ai-hr-assistant-tool
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

Nếu cần dùng AI thật:

```powershell
cd e:\Workplace\ai-hr-assistant-tool
powershell -ExecutionPolicy Bypass -File .\start.ps1 -GeminiApiKey "YOUR_REAL_GEMINI_KEY"
```

Để dừng:

```powershell
powershell -ExecutionPolicy Bypass -File .\stop.ps1
```

Mở:

- `http://127.0.0.1:8000/`
