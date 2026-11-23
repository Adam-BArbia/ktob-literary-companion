# KTOB UI design guide

## Intent

A calm, editorial reading room: warm paper, forest-green actions, restrained terracotta accents, and expressive serif headings. Prioritize real reading tasks over implementation milestones or feature promotion. Keep library, discovery, registration, and account editing obvious and complete.

## Tokens

| Role | Value |
| --- | --- |
| App background | `#f8f7f3` |
| Paper | `#fffefa` |
| Main ink | `#253a33` |
| Primary action | `#244b43` |
| Primary hover | `#183b33` |
| Muted ink | `#64736b` |
| Dividers | `#dfe4dc` |
| Sage surface | `#edf1e9` |
| Terracotta accent | `#a45e3d` |

Use system sans for navigation, controls and reading copy; use the editorial serif stack for headings and typographic book artwork. Headings scale fluidly. Keep long text measure constrained and use generous spacing around primary actions. Use one clear primary action per region.

## Shared patterns

- Use `.btn`, `.field-label`, `.field-input`, `.field-error`, `.notice`, `.eyebrow`, and `.page-heading` rather than rebuilding controls per screen.
- Use the SVG IconComponent consistently; decorative icons do not repeat accessible labels.
- BookCoverComponent creates original typographic artwork. It must not suggest an actual publisher cover or a saved record. Real title/author information appears outside the decorative component.
- The public home page's classic selections are editorial search links, never user-library entries or personalized recommendations.
- Keep unavailable features truthful and secondary. No fake metrics, reviews, reading progress, consent controls, or social sign-in options.

## Interaction and accessibility

Use semantic headings, visible keyboard focus, a skip link, programmatic labels and field-associated errors. Submit invalid forms with a focused summary or first invalid field. Preserve entered information on recoverable failures. Distinguish loading, empty, error and success states; do not turn failures into empty arrays presented as success.

Registration has its own route and real Supabase flow. Require a matching confirmation and at least eight password characters. Do not add a mandatory questionnaire or consent gate. Show email-confirmation guidance and rate-limited resend feedback. Validate post-auth return URLs as same-origin internal paths.

Archive uses a native modal dialog with an initial safe action, Escape/cancel behavior and focus restoration. Explain that archiving preserves the record. Restore and undo use the actual backend endpoint.

Mobile layouts stack and reduce decorative density; form text remains at least 16px on small screens. Layouts must work at 320px without horizontal overflow. Honor reduced motion. Do not hide essential actions behind hover.

## Implementation boundaries

Use standalone lazy routes, typed services and signals; load the Supabase SDK after public runtime configuration is valid. Keep database credentials and privileged keys outside the browser. The backend remains authoritative for ownership and JWT checks.

## Validation

Build with the unchanged production bundle/style budgets. Behavior tests cover real SDK integration boundaries (mocked transport), invalid submissions, confirmation states, safe navigation, profile persistence requests, manual-save retry, archive/restore/undo, and failure preservation. Visual inspection must separately check desktop and mobile home/auth layouts; a passing unit test does not prove email delivery or a production authenticated database round trip.

## Reference guidance

- Angular accessibility: https://angular.dev/best-practices/a11y
- Angular form validation: https://angular.dev/guide/forms/form-validation
- W3C form labeling: https://www.w3.org/WAI/tutorials/forms/labels/
- W3C validation feedback: https://www.w3.org/WAI/tutorials/forms/validation/
