import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Book, PhonicsCurriculumTier, StudentUser } from "../types";
import {
  getClassCardDeckForLevel,
  getPhonicsModuleForLevel
} from "../data/phonicsCurriculum";
import { PhonicsShellStudio } from "./curriculum/PhonicsShellStudio";
import { ClassCardStudio } from "./curriculum/ClassCardStudio";
import { AgeTrackStudio } from "./curriculum/AgeTrackStudio";

interface CurriculumPlaygroundProps {
  user: StudentUser;
  book?: Book;
  phonicsCurriculum?: PhonicsCurriculumTier[];
  initialSubview?: "hub" | "phonics" | "classcard" | "upper";
  onBackHome: () => void;
  onCompleteAgeTrack?: () => Promise<void> | void;
}

export const CurriculumPlayground: React.FC<CurriculumPlaygroundProps> = ({
  user,
  book,
  phonicsCurriculum,
  initialSubview = "hub",
  onBackHome,
  onCompleteAgeTrack
}) => {
  const phonicsModule = useMemo(
    () => getPhonicsModuleForLevel(user.level, phonicsCurriculum),
    [user.level, phonicsCurriculum]
  );

  const classCardDeck = useMemo(() => {
    const mode = user.classcard_mode || "both";
    const baseDeck = getClassCardDeckForLevel(user.level, phonicsCurriculum);
    const filteredBase =
      mode === "book_only"
        ? baseDeck.filter((c) => !c.fromPhonics)
        : baseDeck;

    if (mode === "phonics_only" || !book?.vocab?.length) {
      return filteredBase;
    }

    const seen = new Set(filteredBase.map((c) => c.word.toLowerCase()));
    const bookCards = (book.vocab || [])
      .filter((v) => v.word && v.meaning_kr && !seen.has(v.word.toLowerCase()))
      .slice(0, 8)
      .map((v) => ({
        word: v.surface || v.word,
        meaning: v.meaning_kr,
        example: v.popo_tip || `《${book.title}》 핵심 단어`,
        fromPhonics: false,
        category: "원서 단어"
      }));

    return mode === "book_only" ? [...bookCards, ...filteredBase] : [...filteredBase, ...bookCards];
  }, [user.level, user.classcard_mode, book, phonicsCurriculum]);

  const [subview, setSubview] = useState<"hub" | "phonics" | "classcard" | "upper">(initialSubview);

  useEffect(() => {
    setSubview(initialSubview);
  }, [initialSubview]);

  const handleBackClick = () => {
    if (subview === "hub" || subview === "upper") {
      onBackHome();
    } else {
      setSubview("hub");
    }
  };

  return (
    <div className="space-y-5">
      <div className="pb-3 border-b border-[#e8dfd1] flex items-center justify-between">
        <button
          type="button"
          onClick={handleBackClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {subview === "hub" || subview === "upper" ? "내 학습 맵으로" : "훈련소 메뉴로"}
        </button>
        <span className="text-xs font-bold text-slate-600">
          {user.name} · {user.grade_label} ({user.level}) 맞춤 훈련소
        </span>
      </div>

      {subview === "hub" && (
        <div className="py-2 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {user.level} · {user.grade_label} 맞춤 집중 훈련소
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              오늘 진행할 학습 카드를 선택하면 전용 화면으로 이동합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4 bg-slate-50/50">
              <div className="space-y-2">
                <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-sky-700">
                  {phonicsModule.tierLabel} 파닉스
                </span>
                <h3 className="text-lg font-bold text-slate-900">{phonicsModule.unitTitle}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{phonicsModule.unitDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => setSubview("phonics")}
                className="w-full py-2.5 px-4 rounded-xl btn-water-glass text-sm font-bold inline-flex items-center justify-center gap-1.5"
              >
                파닉스 시작하기
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4 bg-slate-50/50">
              <div className="space-y-2">
                <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                  Level {user.classcard_level || 2} / 26 · 파닉스 단어 포함
                </span>
                <h3 className="text-lg font-bold text-slate-900">초등필수 클카 단어 &amp; 퀴즈</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  방금 익힌 {phonicsModule.tierLabel} 파닉스 단어와 필수 어휘 {classCardDeck.length}개를 카드로 배우고 퀴즈로 복습합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubview("classcard")}
                className="w-full py-2.5 px-4 rounded-xl btn-water-glass text-sm font-bold inline-flex items-center justify-center gap-1.5"
              >
                클카 단어장 열기
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4 bg-slate-50/50">
              <div className="space-y-2">
                <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                  7세 · 8세 · 9세 연령별 맞춤
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  연령별 유창성 · 문장 훈련
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  7세 알파벳·쉐도잉, 8세 파닉스·단어 인지, 9세 품사·1~3형식 문장 말하기를 연습합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubview("upper")}
                className="w-full py-2.5 px-4 rounded-xl btn-water-glass text-sm font-bold inline-flex items-center justify-center gap-1.5"
              >
                맞춤 훈련 열기
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {subview === "phonics" && (
        <PhonicsShellStudio
          initialStageNum={user.classcard_level || 2}
          onOpenClassCard={() => setSubview("classcard")}
        />
      )}

      {subview === "classcard" && (
        <ClassCardStudio
          classcardLevel={user.classcard_level || 2}
          classCardDeck={classCardDeck}
          onBackToHub={() => setSubview("hub")}
        />
      )}

      {subview === "upper" && (
        <AgeTrackStudio studentAge={user.age || 8} onCompleteToday={onCompleteAgeTrack} />
      )}
    </div>
  );
};
