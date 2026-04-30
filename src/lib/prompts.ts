export function buildTranslationPrompt(
  text: string,
  glossary: Record<string, string>
): string {
  const glossaryLines = Object.entries(glossary)
    .map(([en, ko]) => `- ${en} → ${ko}`)
    .join("\n");

  const glossarySection = glossaryLines
    ? `\n용어 사전 (반드시 이 번역을 사용하세요):\n${glossaryLines}\n`
    : "";

  return `당신은 학술 논문 전문 번역가입니다.
아래 영어 논문 텍스트를 한국어로 번역하세요.

규칙:
- 학술 용어는 영어 원문을 병기하세요 (예: "어텐션 메커니즘(Attention Mechanism)")
- 수식, 변수명, 기호는 그대로 유지하세요
- 자연스러운 한국어 문장으로 번역하세요 (직역 금지)
- 논문의 논리 구조와 뉘앙스를 정확히 보존하세요
- 참고문헌 번호 [1], [2] 등은 그대로 유지하세요
- 번역문만 출력하세요. 설명이나 주석은 넣지 마세요.
${glossarySection}
원문:
${text}`;
}
