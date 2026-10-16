// content/validate.ts — 조립된 GameContent의 참조 무결성 검사 (잘못된 id를 개발 중 조기 발견)
import type { Choice, EffectWithOverlay, FlagCondition, GameContent } from '../types';

export class ContentValidationError extends Error {
  constructor(public readonly problems: string[]) {
    super(`콘텐츠 검증 실패 (${problems.length}건):\n- ${problems.join('\n- ')}`);
    this.name = 'ContentValidationError';
  }
}

// 콘텐츠 전체를 검사해 문제 목록을 반환한다. 비어 있으면 정상.
// 검사: 씬/장소/아이템/분기규칙 id 참조, 엔딩 씬 endingType, 이동 그래프 양방향성, 배경 필수값
export function collectContentProblems(content: GameContent): string[] {
  const p: string[] = [];
  const has = (rec: Record<string, unknown>, id: string) => Object.prototype.hasOwnProperty.call(rec, id);

  if (!has(content.scenes, content.startSceneId)) p.push(`startSceneId '${content.startSceneId}' 씬이 없음`);

  // 장소
  for (const place of Object.values(content.places)) {
    if (!place.backgrounds?.morning) p.push(`place '${place.id}': backgrounds.morning 누락(폴백 필수)`);
    const entry = place.entrySceneId ?? `${place.id}_arrival`;
    if (!has(content.scenes, entry)) p.push(`place '${place.id}': 진입 씬 '${entry}' 없음`);
    for (const e of place.connections) {
      if (!has(content.places, e.toPlaceId)) { p.push(`place '${place.id}': 연결 대상 '${e.toPlaceId}' 없음`); continue; }
      const back = content.places[e.toPlaceId].connections.some((r) => r.toPlaceId === place.id);
      if (!back) p.push(`place '${place.id}' → '${e.toPlaceId}' 역방향 edge 없음`);
      if (e.requires) checkCondition(e.requires, `place '${place.id}' edge→${e.toPlaceId}`, content, p);
    }
    if (place.operatingHours && place.operatingHours.from >= place.operatingHours.to) p.push(`place '${place.id}': operatingHours from >= to`);
    for (const a of place.activities) {
      if (a.durationMinutes < 0) p.push(`activity '${a.id}': durationMinutes 음수`);
      if (a.requires) checkCondition(a.requires, `activity '${a.id}'`, content, p);
      checkEffects(a.effects, `activity '${a.id}'`, content, p);
    }
  }

  // 무작위 만남
  for (const enc of content.encounters) {
    if (enc.chance < 0 || enc.chance > 1) p.push(`encounter '${enc.id}': chance는 0~1`);
    for (const placeId of enc.placeIds) if (!has(content.places, placeId)) p.push(`encounter '${enc.id}': 장소 '${placeId}' 없음`);
    if (enc.requires) checkCondition(enc.requires, `encounter '${enc.id}'`, content, p);
  }

  // 씬
  const endingTypes = new Set<string>();
  for (const s of Object.values(content.scenes)) {
    if (!has(content.places, s.placeId)) p.push(`scene '${s.id}': placeId '${s.placeId}' 없음`);
    if (s.isEnding) {
      if (!s.endingType) p.push(`scene '${s.id}': isEnding인데 endingType 없음`);
      else endingTypes.add(s.endingType);
      if (s.choices.length > 0) p.push(`scene '${s.id}': 엔딩 씬은 choices가 비어야 함`);
    }
    // 진입 씬이 아니면 이동 목록이 안 보이므로, 선택지가 없으면 막다른 길이 된다
    const place = content.places[s.placeId];
    const isEntry = place !== undefined && s.id === (place.entrySceneId ?? `${place.id}_arrival`);
    if (!s.isEnding && !isEntry && s.choices.length === 0) p.push(`scene '${s.id}': 진입 씬이 아니므로 choices가 1개 이상 필요 (이동 목록이 보이지 않음)`);
    if (s.triggerCondition) checkCondition(s.triggerCondition, `scene '${s.id}' trigger`, content, p);
    for (const c of [...s.choices, ...(s.snakeChoices ?? [])]) checkChoice(c, s.id, content, p);
  }
  for (const t of ['bad', 'normal', 'happy', 'hidden']) {
    if (!endingTypes.has(t)) p.push(`엔딩 타입 '${t}'에 해당하는 엔딩 씬이 없음`);
  }

  // 분기 규칙
  for (const r of Object.values(content.branchRules)) {
    for (const c of r.cases) {
      if (!has(content.scenes, c.then)) p.push(`branchRule '${r.id}': then '${c.then}' 씬 없음`);
      checkCondition(c.when, `branchRule '${r.id}'`, content, p);
    }
    if (!has(content.scenes, r.fallback)) p.push(`branchRule '${r.id}': fallback '${r.fallback}' 씬 없음`);
  }

  // 아이템 사용 규칙
  for (const r of content.itemUseRules) {
    if (!has(content.items, r.itemId)) p.push(`itemUseRule '${r.id}': itemId '${r.itemId}' 없음`);
    if (r.sceneId && !has(content.scenes, r.sceneId)) p.push(`itemUseRule '${r.id}': sceneId '${r.sceneId}' 없음`);
    if (r.placeId && !has(content.places, r.placeId)) p.push(`itemUseRule '${r.id}': placeId '${r.placeId}' 없음`);
    if (!r.sceneId && !r.placeId) p.push(`itemUseRule '${r.id}': sceneId 또는 placeId 중 하나 필요`);
    if (r.requires) checkCondition(r.requires, `itemUseRule '${r.id}'`, content, p);
    checkEffects(r.effects, `itemUseRule '${r.id}'`, content, p);
  }

  // 아이템 배타 참조
  for (const it of Object.values(content.items)) {
    for (const b of it.blocksItems ?? []) if (!has(content.items, b)) p.push(`item '${it.id}': blocksItems '${b}' 없음`);
  }
  return p;
}

// 문제가 있으면 예외를 던진다 (loadContent에서 사용).
export function validateContent(content: GameContent): void {
  const problems = collectContentProblems(content);
  if (problems.length) throw new ContentValidationError(problems);
}

function checkChoice(c: Choice, sceneId: string, content: GameContent, p: string[]) {
  const where = `scene '${sceneId}' choice '${c.id}'`;
  if (c.nextSceneId && !(c.nextSceneId in content.scenes)) p.push(`${where}: nextSceneId '${c.nextSceneId}' 없음`);
  if (c.resolveNextScene && !(c.resolveNextScene in content.branchRules)) p.push(`${where}: branchRule '${c.resolveNextScene}' 없음`);
  const finishes = c.effects?.some((e) => e.type === 'finish' || e.type === 'goToScene');
  if (!c.nextSceneId && !c.resolveNextScene && !finishes) p.push(`${where}: 다음 씬이 정해지지 않음 (nextSceneId/resolveNextScene/goToScene/finish 중 하나 필요)`);
  if (c.requires) checkCondition(c.requires, where, content, p);
  checkEffects(c.effects, where, content, p);
}

function checkEffects(effects: EffectWithOverlay[] | undefined, where: string, content: GameContent, p: string[]) {
  for (const e of effects ?? []) {
    if ((e.type === 'addItem' || e.type === 'removeItem') && !(e.itemId in content.items)) p.push(`${where}: 아이템 '${e.itemId}' 없음`);
    if (e.type === 'goToScene' && !(e.sceneId in content.scenes)) p.push(`${where}: goToScene '${e.sceneId}' 없음`);
    if (e.type === 'nextDay' && e.wakePlaceId && !(e.wakePlaceId in content.places)) p.push(`${where}: wakePlaceId '${e.wakePlaceId}' 없음`);
  }
}

function checkCondition(c: FlagCondition, where: string, content: GameContent, p: string[]) {
  switch (c.type) {
    case 'hasItem': case 'notItem':
      if (!(c.itemId in content.items)) p.push(`${where}: 조건의 아이템 '${c.itemId}' 없음`); break;
    case 'visited':
      if (!(c.placeId in content.places)) p.push(`${where}: 조건의 장소 '${c.placeId}' 없음`); break;
    case 'and': case 'or': c.conditions.forEach((x) => checkCondition(x, where, content, p)); break;
    case 'not': checkCondition(c.condition, where, content, p); break;
    default: break;
  }
}
