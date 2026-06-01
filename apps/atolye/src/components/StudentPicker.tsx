"use client";

import { useEffect, useState } from "react";
import { PField, PSelect } from "@ludenlab/ui";

/* Kayıtlı öğrenciden seç → onPick ile profili aktar. Tüm araçlarda aynı dropdown
   (GET /api/cases → AI-güvenli profil). Elle isim girişi YOK; öğrenci yoksa
   kullanıcıyı Öğrenciler'e yönlendirir. */

export interface PickedStudent {
  id: string;
  code: string; // Ad Soyad
  kademe: string;
  yas: number | null;
  taniProfili: string[];
  guclukDuzeyi: string | null;
  gucluYonler: string | null;
  ilgiAlanlari: string | null;
}

export function StudentPicker({ onPick }: { onPick: (s: PickedStudent) => void }) {
  const [students, setStudents] = useState<PickedStudent[]>([]);
  const [picked, setPicked] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/cases")
      .then((r) => (r.ok ? r.json() : { students: [] }))
      .then((d: { students?: PickedStudent[] }) => {
        if (alive) setStudents(d.students ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <PField label="Öğrenci seç" hint="Araçlar kayıtlı öğrenci üzerinde çalışır.">
      {students.length > 0 ? (
        <PSelect
          value={picked}
          onChange={(e) => {
            setPicked(e.target.value);
            const s = students.find((x) => x.id === e.target.value);
            if (s) onPick(s);
          }}
        >
          <option value="">Öğrenci seçin…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code}
            </option>
          ))}
        </PSelect>
      ) : (
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--poster-ink-2)" }}>
          Henüz öğrenci yok —{" "}
          <a href="/vakalarim" style={{ color: "var(--poster-accent)", fontWeight: 700 }}>
            Öğrenciler
          </a>
          &apos;den ekleyin.
        </p>
      )}
    </PField>
  );
}
