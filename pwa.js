/* FASTCARE E-learning — PWA: đăng ký Service Worker + nút "Cài ứng dụng".
   Nút cài đặt nằm ở thanh đầu trang (giống mẫu Kem gửi): hiện khi trình duyệt
   cho phép cài (Android/Chrome) hoặc khi là iPhone (hướng dẫn thêm vào màn
   hình chính). Ẩn hẳn khi app đã được cài (mở ở chế độ standalone). */
(function () {
  // 1) Đăng ký Service Worker (chỉ khi trình duyệt hỗ trợ + chạy qua https).
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }

  var btn = document.getElementById('installAppBtn');
  if (!btn) return;

  // Đã cài rồi (mở từ icon app) thì không hiện nút nữa.
  var isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  if (isStandalone) return;

  var deferredPrompt = null;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  // Android/Chrome: trình duyệt báo "có thể cài" thì hiện nút.
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    btn.hidden = false;
  });

  // iPhone/iPad: Safari không có beforeinstallprompt — hiện nút kèm hướng dẫn.
  if (isIOS) btn.hidden = false;

  btn.addEventListener('click', function () {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () {
        deferredPrompt = null;
        btn.hidden = true;
      });
      return;
    }
    if (isIOS) {
      alert('Để cài app FASTCARE trên iPhone:\n1. Bấm nút Chia sẻ (hình vuông có mũi tên lên) ở thanh dưới Safari.\n2. Chọn "Thêm vào Màn hình chính".\n3. Bấm "Thêm" ở góc phải trên.');
      return;
    }
    alert('Trình duyệt này chưa hỗ trợ cài trực tiếp. Bạn mở web bằng Chrome trên điện thoại rồi bấm lại nút "Cài ứng dụng" nhé.');
  });

  // Đã cài xong thì ẩn nút (trường hợp mở lại bằng trình duyệt sau khi cài).
  window.addEventListener('appinstalled', function () { btn.hidden = true; });
})();
