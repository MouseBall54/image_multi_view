# compareX 기여 가이드라인

compareX 프로젝트에 관심을 갖고 기여해주셔서 감사합니다. 버그 리포트, 기능 제안, 코드 개선 등 모든 종류의 기여를 환영합니다.

이 문서가 여러분의 기여 과정을 돕기 위한 가이드라인을 제공합니다.

## 💬 시작하기 전에

아이디어나 질문이 있다면 먼저 [GitHub Discussions](https://github.com/MouseBall54/image_multi_view/discussions)를 통해 다른 사용자, 기여자들과 논의해보는 것을 권장합니다.

## 🐛 버그 리포트

버그를 발견했다면 [GitHub Issues](https://github.com/MouseBall54/image_multi_view/issues)에 "Bug report" 템플릿을 사용하여 이슈를 생성해주세요. 이슈 작성 시 아래 정보를 포함하면 문제 해결에 큰 도움이 됩니다.

- **버그 요약**: 어떤 문제가 발생했는지 명확하게 설명해주세요.
- **재현 방법**: 버그를 재현할 수 있는 구체적인 단계를 순서대로 작성해주세요.
- **기대했던 결과**: 원래 기대했던 동작은 무엇이었나요?
- **실제 결과**: 실제로 어떤 현상이 발생했나요? (스크린샷이나 GIF 포함 시 매우 유용)
- **사용 환경**: 운영체제(Windows/macOS/Linux), 앱 버전 등

## ✨ 기능 제안

새로운 기능이나 개선 아이디어가 있다면 "Feature request" 템플릿을 사용하여 이슈를 생성해주세요.

- **문제점**: 제안하는 기능이 어떤 문제나 불편함을 해결할 수 있는지 설명해주세요.
- **해결 방안**: 아이디어를 구체적으로 설명해주세요. (UI/UX 스케치 포함 시 환영)
- **대안**: 혹시 고려해본 다른 해결책이 있다면 함께 공유해주세요.

## 🚀 코드 기여 (Pull Request)

코드 기여는 아래 절차를 따라 진행해주세요.

1.  **저장소 Fork**: 이 저장소를 자신의 계정으로 Fork합니다.
2.  **브랜치 생성**: 목적에 맞는 이름으로 새로운 브랜치를 생성합니다.
    -   기능 추가: `feature/새-기능-이름` (예: `feature/batch-export`)
    -   버그 수정: `fix/수정-내용` (예: `fix/rendering-crash`)
    ```bash
    git checkout -b feature/amazing-feature
    ```
3.  **코드 수정 및 커밋**: 코드를 수정하고, 변경 내역을 명확히 알 수 있도록 커밋 메시지를 작성합니다.
    ```bash
    git commit -m "Feat: Amazing Feature 추가"
    ```
4.  **Fork된 저장소로 Push**: 작업한 브랜치를 자신의 Fork된 저장소에 Push합니다.
    ```bash
    git push origin feature/amazing-feature
    ```
5.  **Pull Request (PR) 생성**: 원본 저장소의 `main` 브랜치를 대상으로 Pull Request를 생성합니다. PR 메시지에는 어떤 변경사항이 있었는지 상세히 기술해주세요.

## 🎨 코드 스타일

- 이 프로젝트는 별도의 Linter(ESLint, Prettier)를 강제하지 않습니다.
- 하지만 프로젝트 전반의 코드 스타일과 일관성을 유지해주세요.
- **TypeScript**의 `strict` 모드를 준수하며, `npm run lint` 실행 시 타입 에러가 없어야 합니다.
- React 컴포넌트는 함수형 컴포넌트와 Hooks를 사용합니다.
- 상태 관리는 `Zustand`를 중심으로 이루어집니다.

## 📄 라이선스

모든 기여물은 MIT License에 따라 라이선스가 부여됩니다. Pull Request를 제출하는 것은 이 조건에 동의하는 것으로 간주합니다.

다시 한번 기여에 감사드립니다!
