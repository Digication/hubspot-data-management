# Các Nguyên Tắc Resonance

Một lý thuyết về trao đổi thông tin có cấu trúc giữa con người và hệ thống AI.

---

## Quan Sát Cốt Lõi

Nhận thức của con người được tối ưu cho việc xác minh, không phải tạo sinh. Con người dễ phản ứng với một điều gì đó cụ thể hơn, như sửa lại, mở rộng hoặc đổi hướng, nhưng lại khó tạo ra một bản trình bày đầy đủ về những gì họ biết từ con số không. Điều này giống với trực giác đứng sau bài toán P vs NP trong độ phức tạp tính toán: niềm tin phổ biến nhưng chưa được chứng minh rằng xác minh một lời giải dễ hơn tạo ra một lời giải.

Sự bất đối xứng này có một hàm ý sâu sắc đối với cách hệ thống AI nên cộng tác với con người: **cách hiệu quả nhất để làm lộ ra điều một người biết không phải là hỏi họ, mà là cho họ thấy một thứ gì đó cụ thể và để họ phản ứng.**

Khi AI tạo ra một đề xuất gần với điều con người biết nhưng chưa hoàn toàn đúng, sự lệch pha đó kích hoạt khả năng gợi nhớ sâu. Con người sửa lỗi, và phần sửa đó mang nhiều thông tin hơn hẳn bất kỳ câu trả lời tự phát nào. Một câu trả lời sai cho một câu hỏi cụ thể khai thác được nhiều tri thức hơn một câu trả lời đúng cho một câu hỏi mơ hồ.

Đó là resonance: một tín hiệu cụ thể từ AI gặp tri thức tiềm ẩn của con người và khuếch đại nó. Việc truyền tải thông tin đạt mức tối đa không phải khi AI đúng, mà khi AI sai một cách cụ thể và hữu hình, vì chính sự lệch đó tạo ra phản hồi giàu thông tin nhất.

---

## Năm Nguyên Tắc

### 1. Hãy Cho Thấy, Đừng Chỉ Hỏi

Mỗi tương tác với con người nên đưa ra một điều gì đó cụ thể để họ phản ứng. Những câu hỏi mở ("bạn muốn gì?", "nội dung này nên gồm những gì?") không cung cấp tín hiệu gợi nhớ và tạo ra kết quả không đầy đủ. Những lời nhắc theo hướng xác minh ("đây là điều tôi nghĩ, sai ở đâu?") kích hoạt hồi tưởng liên tưởng và làm lộ ra tri thức mà con người có nhưng không thể tạo ra ngay theo yêu cầu.

| Cách tiếp cận | Điều bạn nhận được |
|---|---|
| "Hãy mô tả năng lực phân tích của sinh viên này." | Câu trả lời một phần, dừng lại sau 2-3 ý |
| "Tôi đánh giá năng lực phân tích của sinh viên là 'mạnh' dựa trên phần so sánh bộ dữ liệu ở Mục 3, đúng không?" | "Như vậy là còn nhẹ đấy, vì em ấy còn phát hiện ra sai lệch lấy mẫu mà không ai khác nhận ra" |
| "Hướng dẫn onboarding nên bao gồm những gì?" | Danh sách một phần, dừng sau 5-6 mục |
| "Đây là những gì tôi nghĩ hướng dẫn cần có, còn thiếu gì?" | Sửa đổi, bổ sung và những ký ức được gợi lên |
| "Tôi còn nên biết gì nữa?" | "Không có gì" hoặc "Tôi nghĩ là vậy thôi" |
| "Tôi giả định quy trình này khá đơn giản, có đúng không?" | "Thực ra không, có một trường hợp đặc biệt cho người dùng cũ vì..." |

Nguyên tắc này áp dụng ở mọi điểm chạm với con người: phỏng vấn nên đưa ra các đánh giá đề xuất để người phỏng vấn chỉnh sửa; lời nhắc cho portfolio nên đưa ra bản nháp phản tư để sinh viên phản ứng; quy trình tài liệu nên đưa ra dàn ý thay vì hỏi đặc tả.

Mục tiêu thiết kế là **cái sai có ích**: tạo ra đầu ra đủ cụ thể để có thể sai một cách có ý nghĩa, vì phần sửa chữa mang nhiều ngữ cảnh hơn phần phê duyệt.

### 2. Lặp Để Mở Rộng Ngữ Cảnh

Mỗi vòng lặp tương tác làm hai việc: cải thiện đầu ra và mở rộng ngữ cảnh sẵn có. Tác dụng thứ hai quan trọng hơn tác dụng thứ nhất.

```
Vòng 1: Ngữ cảnh sẵn có ████░░░░░░    Chất lượng đầu ra ███░░░░░░░
Vòng 2: Ngữ cảnh sẵn có ██████░░░░    Chất lượng đầu ra █████░░░░░
Vòng 3: Ngữ cảnh sẵn có ████████░░    Chất lượng đầu ra ████████░░
Vòng 4: Ngữ cảnh sẵn có ██████████    Chất lượng đầu ra ██████████
```

Chất lượng đầu ra bị giới hạn bởi lượng ngữ cảnh sẵn có. Vòng lặp không chỉ sửa lỗi mà còn dần dần khai thác ra tri thức vốn chưa có ở điểm bắt đầu. Mỗi đề xuất cụ thể là một tín hiệu gợi nhớ, khiến con người bộc lộ thông tin mà họ sẽ không tự nguyện nói ra nếu không được gợi.

Việc mở rộng ngữ cảnh diễn ra qua bốn cơ chế:

- **Gợi nhớ được kích hoạt**: nhìn thấy một đề xuất cụ thể sẽ kích hoạt những ký ức liên quan. Một bản nháp đánh giá hiệu suất viết rằng "đã đóng góp vào dự án Q3" có thể khiến người quản lý nhớ ra: "thực ra họ là người điều phối xử lý sự cố lúc 2 giờ sáng, đó mới là bằng chứng rõ nhất về quyền sở hữu công việc."
- **Ngữ cảnh từ phần chỉnh sửa**: khi con người bác bỏ hoặc chỉnh sửa một đề xuất, lập luận của họ mang theo thông tin mới. Một sinh viên bác bỏ nhận định trong bản nháp portfolio về việc làm sạch dữ liệu và giải thích: "khó khăn thực sự là các danh mục của khách hàng không khớp với bất kỳ hệ phân loại chuẩn nào."
- **Truy vấn đúng vào khoảng trống**: khi AI xác định được một lỗ hổng cụ thể trong tri thức của chính nó, tính cụ thể đó kích hoạt việc gợi nhớ có mục tiêu. "Tôi giả định quy trình này giống nhau cho mọi người dùng, có đúng không?" hiệu quả hơn "còn gì nữa tôi nên biết không?"
- **Mẫu hình sở thích**: những lựa chọn nhất quán của con người qua các vòng lặp, như luôn rút gọn, luôn thêm điều kiện lưu ý, hoặc luôn làm phản hồi cụ thể hơn, sẽ bộc lộ các tiêu chuẩn ngầm.

Phản mẫu ở đây là tích lũy ngữ cảnh mà không cắt tỉa. Mỗi vòng lặp nên giữ lại những sửa đổi, ràng buộc và sở thích còn hiệu lực, nhưng loại bỏ ngữ cảnh đã được xử lý hoặc hấp thụ xong.

### 3. Dần Dần Giành Quyền Tự Chủ

Mức độ tham gia của con người tồn tại trên một phổ:

```
TÁC GIẢ ←── NGƯỜI DUYỆT ←── GIÁM SÁT ←── ĐỊNH HƯỚNG
   ↑             ↑               ↑             ↑
Tạo từ      Duyệt toàn bộ      Chỉ xử lý     Xác định
đầu                           các trường     tiêu chí,
                              hợp leo thang  duyệt bản cuối
```

Phần lớn quy trình AI đặt con người vào vai Tác giả, tức họ tạo đặc tả ban đầu, rồi thành Người duyệt, tức họ kiểm tra mọi thứ. Hệ thống dựa trên resonance bắt đầu với con người ở vai Người duyệt và dần chuyển họ về phía vai Định hướng khi hệ thống chứng minh được sự ăn khớp.

Vị trí của "núm xoay" này được quyết định bởi ngữ cảnh:

| Yếu tố | Cần nhiều tham gia của con người hơn | Nhiều tự chủ hơn |
|---|---|---|
| Số vòng lặp | Những vòng đầu | Những vòng sau |
| Rủi ro miền ứng dụng | Quyết định có hệ quả cao | Tinh chỉnh có hệ quả thấp |
| Mức tự tin của AI | Các bộ đánh giá không đồng thuận | Các bộ đánh giá hoàn toàn đồng thuận |
| Mức độ mới lạ | Lần đầu gặp loại việc này | Tương tự thứ đã được duyệt trước đó |
| Chuyên môn của con người | Con người đang học về miền đó | Con người là chuyên gia miền đó |

**Ràng buộc quan trọng:** quyền tự chủ phải dễ dàng bị thu hồi. Con người luôn phải có thể quay về chế độ duyệt toàn phần mà không gặp ma sát. Niềm tin được xây dựng theo từng vòng lặp và có thể bị rút lại bất cứ lúc nào.

**Ngoại lệ phụ thuộc miền ứng dụng:** có những miền ứng dụng không nên vượt quá vai Người duyệt, bất kể mức tự tin cao đến đâu. Bối cảnh giáo dục, nơi sự tham gia của con người chính là quá trình học; các đánh giá hệ quả cao, nơi tính công bằng đòi hỏi con người phải xem xét mọi quyết định; và những tình huống mà con người là nguồn chân lý duy nhất, đều cần giữ con người ở trạng thái tham gia đầy đủ.

### 4. Đánh Giá Từ Nhiều Góc Nhìn

Một góc nhìn đánh giá duy nhất luôn có điểm mù. Nhiều góc nhìn sẽ phát hiện các vấn đề khác nhau.

Sự khác biệt giữa **lấy trung bình** và **nghị luận** là rất quan trọng:

- **Lấy trung bình** che giấu bất đồng. Điểm số 9, 8 và 3 cho ra trung bình 6,7, tức "mức tự tin vừa phải". Con số 3 đại diện cho một mối lo ngại cụ thể đã bị làm loãng đi.
- **Nghị luận** làm lộ ra bất đồng. Các góc nhìn xem xét mối quan ngại của nhau, nhượng bộ hoặc bảo vệ lập trường, rồi đưa ra một lý do tổng hợp thay vì chỉ một con số.

```
Vòng 1: Mỗi góc nhìn tự đánh giá độc lập
Vòng 2: Mỗi góc nhìn phản hồi mối lo ngại của góc nhìn khác
Vòng 3: Lập trường cuối cùng, đồng ý, nhượng bộ hoặc giữ nguyên bất đồng

Tất cả đồng ý → tiếp tục một cách tự chủ
Bất đồng → leo thang với đúng điểm tranh chấp cụ thể
```

Hãy dùng đánh giá độc lập, kèm báo cáo độ phân tán, cho mục đích đo lường. Hãy dùng nghị luận cho các quyết định, đặc biệt là các quyết định về việc có nên tiếp tục mà không cần con người duyệt hay không.

Các góc nhìn nên được chọn theo miền ứng dụng:

| Miền ứng dụng | Các góc nhìn | Mỗi góc nhìn bắt được gì |
|---|---|---|
| Đánh giá hiện vật | Người phản biện, Bảo thủ, Thực dụng | Trường hợp biên; hồi quy; thay đổi giá trị thấp |
| Đánh giá con người | Tính chặt chẽ, Công bằng, Phát triển | Bằng chứng yếu; thiên lệch; phản hồi không hữu ích |
| Thiết kế phỏng vấn | Chất lượng tín hiệu, Rủi ro thiên lệch, Tính thực tế | Câu hỏi tín hiệu thấp; cách diễn đạt mang tính phân biệt; vượt quá thời lượng |

### 5. Hội Tụ Về Chất Lượng Đã Được Định Nghĩa

Hãy định nghĩa "xong" trước khi bắt đầu, không phải sau đó. Một rubric với các chiều đánh giá rõ ràng và các mốc chấm điểm cụ thể sẽ biến cảm giác chủ quan kiểu "có vẻ xong rồi" thành tiêu chí hội tụ khách quan.

Rubric phục vụ ba mục đích:
1. **Đánh giá có hệ thống**: mọi chiều đánh giá đều được kiểm tra ở mọi vòng lặp, chứ không chỉ những gì tình cờ lọt vào mắt con người
2. **Tiến bộ đo được**: điểm trước và sau cho thấy thay đổi có giúp ích hay không
3. **Phát hiện hội tụ**: khi không còn vấn đề đáng kể nào, quy trình hoàn tất

Việc xây dựng rubric cần chặt chẽ:
- **Phân tích các bên liên quan**: xác định mọi bên bị ảnh hưởng bởi đầu ra, không chỉ khán giả chính. Một portfolio sinh viên có các bên liên quan ngoài chính sinh viên, như giảng viên chấm điểm, chương trình đào tạo đánh giá kết quả, và nhà tuyển dụng tương lai đọc nó. Một thông báo lỗi có người dùng cuối, lập trình viên đang debug, đội vận hành giám sát hệ thống và người rà soát bảo mật.
- **Phân tích mode lỗi**: điều gì xảy ra khi đầu ra kém? Hệ quả thực tế là gì? Một đánh giá mơ hồ làm hại sinh viên vì không có phản hồi hành động được, và làm hại chương trình vì không có bằng chứng học tập. Một tài liệu gây hiểu lầm làm hại người đọc và mọi mắt xích phía sau.
- **Chọn chiều đánh giá**: 5-7 chiều bao phủ các mối quan ngại lộ ra từ phân tích bên liên quan và mode lỗi
- **Mốc chấm điểm**: ví dụ cụ thể cho mức 0/10, 5/10 và 10/10 ở mỗi chiều

Hội tụ có hai giai đoạn. **Mở rộng** ở những vòng đầu: đầu ra phải bao phủ hết các chủ đề liên quan, và tín hiệu hội tụ là không còn lỗ hổng lớn nào. **Tinh chỉnh** ở các vòng sau: mọi chiều đều đạt chất lượng chấp nhận được, và tín hiệu hội tụ là không còn vấn đề nghiêm trọng cao nào. Sự chuyển pha này diễn ra tự nhiên khi rubric chuyển từ việc tìm cái còn thiếu sang việc tìm cái còn yếu.

Phán đoán của con người luôn ghi đè các chỉ số. "Đủ tốt" vẫn là một điều kiện dừng hợp lệ, bất kể điểm số nói gì.

---

## Cơ Chế Resonance Chi Tiết

### Vì Sao Cái Sai Lại Có Ích

Khi AI tạo ra đầu ra hoàn toàn đúng, con người nói "đúng" và không có thông tin mới nào đi vào hệ thống. Khi AI tạo ra đầu ra hoàn toàn sai, con người nói "không", nhưng lại không có tín hiệu gợi nhớ nào để giải thích lý do. Khi AI tạo ra đầu ra **sai một cách cụ thể, hữu hình trong một miền mà con người hiểu rõ**, sự lệch đó kích hoạt gợi nhớ sâu:

```
AI: "Việc bạn nhấn mạnh học tập chủ động được thể hiện qua lần
     thiết kế lại phòng thí nghiệm trong BIO 301."
Con người: "Việc thiết kế lại phòng thí nghiệm là một ví dụ tốt,
     nhưng bằng chứng mạnh hơn là dữ liệu dọc theo thời gian:
     những sinh viên học BIO 301 phiên bản tôi thiết kế lại có kết quả
     ở BIO 401 tốt hơn 15% vào năm sau. Tôi cũng triển khai
     hình thức dạy học đồng đẳng trong seminar nâng cao."
```

Nhận định chưa đầy đủ của AI đã gợi ra bằng chứng mạnh hơn, tức dữ liệu dọc theo thời gian, và một đổi mới thứ hai, tức dạy học đồng đẳng, mà giảng viên trước đó chưa hề nhắc trong ghi chú của họ. Không nội dung nào trong số đó có trong đầu vào ban đầu. Cái sai chính là tín hiệu gợi.

Một ví dụ thứ hai ở miền khác:

```
AI: "Quy trình khôi phục khá đơn giản, chỉ cần khởi động lại dịch vụ
     từ bản sao lưu."
Con người: "Không, việc khôi phục phụ thuộc vào việc khóa đã được xoay chưa.
     Nếu đã xoay rồi, bạn phải nhập lại cặp khóa cũ thông qua một
     phiếu hỗ trợ. Nếu chưa xoay, bạn chỉ cần chuyển ngược lại."
```

Giả định sai của AI, rằng mọi thứ "đơn giản", đã kích hoạt một phần đính chính chi tiết với hai nhánh xử lý và một yếu tố quyết định mà con người biết nhưng không nghĩ đến việc nói ra từ đầu.

Đó là lý do các bản nháp nên **cố ý cụ thể thay vì thận trọng đến mức mơ hồ**. Một bản nháp mơ hồ, như "quy trình nên được ghi chép lại", chỉ tạo ra phản ứng mơ hồ, như "đúng, nên vậy". Một bản nháp cụ thể, như "khôi phục: khởi động lại từ bản sao lưu", sẽ kích hoạt một phần sửa chữa cụ thể mang theo thông tin thực.

### Ranh Giới Của Cái Sai Có Ích

Cái sai chỉ có ích trong một khoảng nhất định. Nếu đầu ra của AI quá xa thực tế đến mức con người không thể ánh xạ nó với tri thức của họ, sự lệch đó sẽ không kích hoạt gợi nhớ mà chỉ gây bối rối hoặc bị gạt đi. Một bản nháp đánh giá sinh viên dựa trên năng lực của một môn học hoàn toàn khác, hoặc một tài liệu giả định một stack công nghệ không liên quan đến dự án, sẽ không tạo ra phản ứng hữu ích nào. AI cần đủ ngữ cảnh để *sai một cách hợp lý*, chứ không phải *sai hoàn toàn vô căn cứ*.

Điều này có nghĩa là:
- Việc tạo ra từ con số không hoạt động tốt nhất khi AI có ngữ cảnh nền để neo cho lần thử đầu tiên
- Những tương tác đầu tiên nên thu thập đủ ngữ cảnh để các đề xuất sau rơi vào vùng sai có ích
- Với các miền mà AI hoàn toàn không có ngữ cảnh, cần nhiều trao đổi ban đầu hơn trước khi các đề xuất cụ thể có thể kích hoạt resonance hữu ích

### Vì Sao Vòng Lặp Tạo Hiệu Ứng Cộng Dồn

Mỗi vòng lặp không chỉ sửa lỗi mà còn làm tăng diện tích bề mặt cho resonance. Ở vòng 1, AI chỉ có đầu vào ban đầu của con người. Đến vòng 3, nó có đầu vào ban đầu cộng với mọi phần sửa đổi, bổ sung, sở thích và chi tiết thực tế đã lộ ra trong hai vòng duyệt trước đó.

Các đề xuất ở vòng 3 tốt hơn không chỉ vì lỗi đã được sửa, mà còn vì AI có nhiều ngữ cảnh hơn để tạo ra các đề xuất *gần đúng hơn*, nghĩa là gần hơn với vùng sai có ích, từ đó kích hoạt những phần sửa đổi còn cụ thể hơn nữa. Vòng lặp có hiệu ứng cộng dồn: nhiều ngữ cảnh hơn dẫn đến đề xuất tốt hơn; đề xuất tốt hơn kích hoạt phản ứng phong phú hơn; phản ứng phong phú hơn lại cung cấp thêm ngữ cảnh.

---

## Các Miền Ứng Dụng

Các nguyên tắc Resonance áp dụng cho bất kỳ miền nào mà:
1. Con người sở hữu tri thức mà họ không thể diễn đạt trọn vẹn ngay theo yêu cầu
2. AI có thể tạo ra đầu ra cụ thể để con người phản ứng
3. Chất lượng của đầu ra có thể được định nghĩa và đo lường
4. Việc lặp lại giúp cải thiện kết quả

Các nguyên tắc này biểu hiện khác nhau ở từng miền:

| Miền ứng dụng | Resonance trông như thế nào | Vòng lặp tạo ra điều gì |
|---|---|---|
| **Tạo và cải thiện hiện vật** | Đưa ra bản nháp, để con người chỉnh sửa. Đánh giá theo rubric chất lượng. | Tài liệu, mã nguồn, đặc tả, được cải thiện hoặc tạo mới từ đầu |
| **Đánh giá và thẩm định** | Đưa ra bản nháp đánh giá, để người đánh giá tinh chỉnh. Kiểm tra tính nhất quán trong cả lô. | Các đánh giá công bằng, đầy đủ, dựa trên bằng chứng |
| **Khai thác tri thức** | Đưa ra diễn giải có cấu trúc về điều chuyên gia biết, rồi để họ chỉnh sửa. | Quy trình được ghi chép, khung ra quyết định, tri thức tổ chức |
| **Hỗ trợ ra quyết định** | Đưa ra quyết định đề xuất kèm lý do, rồi để người ra quyết định điều chỉnh. | Các quyết định được thông tin đầy đủ hơn với lập luận rõ ràng |

Mỗi miền có những ràng buộc riêng, như giáo dục cần giữ nguyên quá trình học của con người; đánh giá cần công bằng và nhất quán; quyết định hệ quả cao cần con người duyệt đầy đủ, nhưng cơ chế cốt lõi vẫn giống nhau: **đưa ra một thứ gì đó cụ thể, ghi nhận phản ứng, rồi lặp lại.**

---

## Hệ Phân Cấp

```
Nguyên Tắc Resonance (tài liệu này)
  │
  ├── Refine: hiện vật, tạo mới và cải thiện
  │   Áp dụng resonance vào tài liệu, mã nguồn, đặc tả và nội dung có cấu trúc.
  │   Vòng lặp tạo ra và cải thiện hiện vật thông qua các chu kỳ theo rubric.
  │
  ├── Assess: đánh giá, năng lực, portfolio, bài làm của sinh viên
  │   Áp dụng resonance vào quy trình đánh giá con người.
  │   Vòng lặp cấu trúc hóa việc đánh giá, đảm bảo tính nhất quán
  │   và tạo ra phản hồi dựa trên bằng chứng.
  │
  └── (các nhánh đồng cấp trong tương lai khi nguyên tắc được xác thực ở miền mới)
```

Refine và Assess là hai nhánh đồng cấp, không phải quan hệ cha con. Chúng chia sẻ năm nguyên tắc giống nhau nhưng có vòng lặp khác nhau, ràng buộc khác nhau và bộ máy chuyên biệt theo miền khác nhau. Mỗi nhánh vừa xác thực vừa tinh chỉnh các nguyên tắc thông qua việc sử dụng.

---

## Resonance Không Phải Là Gì

- **Không phải sự thay thế cho phán đoán của con người.** Các nguyên tắc này cấu trúc hóa cách con người và AI trao đổi thông tin. Chúng không thay thế vai trò của con người trong việc quyết định điều gì quan trọng, điều gì là đủ tốt hoặc khi nào nên dừng lại.
- **Không phải lúc nào cũng áp dụng được.** Công việc có tính sáng tạo rất cao, nơi mục tiêu là tạo bất ngờ chứ không phải hội tụ, các tác vụ vật lý thời gian thực và các đánh giá hoàn toàn chủ quan đều kháng cự cách tiếp cận dựa trên rubric.
- **Không đảm bảo khai thác được toàn bộ tri thức.** Vòng lặp làm lộ ra nhiều tri thức hơn so với câu hỏi mở, nhưng không thể làm lộ ra tri thức mà con người không có. Nó cải thiện khả năng truy xuất tri thức của con người, chứ không tạo ra tri thức mới cho con người.
- **Không phải một quy trình cố định.** Năm nguyên tắc là các hướng dẫn thiết kế, không phải một phương pháp luận cứng nhắc. Các miền khác nhau sẽ triển khai chúng bằng những vòng lặp, nhịp độ và ràng buộc khác nhau.
