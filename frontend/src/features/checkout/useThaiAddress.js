// โหลดข้อมูล จังหวัด → อำเภอ → ตำบล (+รหัสไปรษณีย์) จาก /thai-address.json
// รูปแบบไฟล์: [[จังหวัด, [[อำเภอ, [[ตำบล, รหัสไปรษณีย์], ...]], ...]], ...]
// ที่มาข้อมูล: github.com/kongvut/thai-province-data (MIT)
import { useEffect, useState } from 'react';

let cache = null;

export function useThaiAddress() {
  const [data, setData] = useState(cache);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (cache) return;
    fetch('/thai-address.json')
      .then((r) => r.json())
      .then((d) => {
        cache = d;
        setData(d);
      })
      .catch(() => setError(true));
  }, []);

  return { data, error };
}
