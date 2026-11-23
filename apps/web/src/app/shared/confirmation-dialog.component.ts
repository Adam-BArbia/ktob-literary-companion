import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  input,
  output,
} from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'ktob-confirmation-dialog',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<dialog
    #dialog
    class="confirmation-dialog"
    [attr.aria-labelledby]="dialogId + '-title'"
    [attr.aria-describedby]="dialogId + '-description'"
    (cancel)="cancel($event)"
    (close)="onClosed()"
  >
    <span class="confirmation-icon"><ktob-icon [name]="icon()" [size]="26" /></span>
    <h2 [id]="dialogId + '-title'">{{ title() }}</h2>
    <p [id]="dialogId + '-description'">{{ description() }}</p>
    <div class="dialog-actions">
      <button
        type="button"
        class="btn btn-secondary"
        autofocus
        [disabled]="busy()"
        (click)="close()"
      >
        {{ cancelLabel() }}</button
      ><button type="button" class="btn btn-primary" [disabled]="busy()" (click)="confirmed.emit()">
        {{ busy() ? 'Saving…' : confirmLabel() }}
      </button>
    </div>
  </dialog>`,
  styles: `
    :host {
      display: contents;
    }
    .confirmation-dialog {
      border: 1px solid #dfe4dc;
      border-radius: 18px;
      padding: 32px;
      max-width: 460px;
      width: calc(100% - 32px);
      margin: auto;
      background: #fffefa;
      color: #253a33;
      box-shadow: 0 30px 90px #132d352b;
    }
    .confirmation-dialog::backdrop {
      background: #182b268c;
      backdrop-filter: blur(3px);
    }
    .confirmation-icon {
      display: grid;
      place-items: center;
      width: 55px;
      height: 55px;
      border-radius: 50%;
      background: #edf1e9;
      color: #244b43;
      margin-bottom: 20px;
    }
    .confirmation-dialog h2 {
      font: 400 30px/1.2 var(--font-serif);
      letter-spacing: -0.03em;
    }
    .confirmation-dialog p {
      font-size: 14px;
      line-height: 1.8;
      color: #64736b;
      margin-top: 15px;
      overflow-wrap: anywhere;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 28px;
    }
    .dialog-actions .btn {
      font-size: 12px;
      flex: 1;
      padding-inline: 12px;
    }
    @media (max-width: 420px) {
      .confirmation-dialog {
        padding: 25px;
      }
      .dialog-actions {
        flex-direction: column-reverse;
      }
    }
  `,
})
export class ConfirmationDialogComponent {
  @ViewChild('dialog') private dialog?: ElementRef<HTMLDialogElement>;
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Keep it');
  readonly icon = input('archive');
  readonly busy = input(false);
  readonly confirmed = output<void>();
  readonly closed = output<void>();
  readonly dialogId = `confirmation-${++nextDialogId}`;
  private previousFocus: HTMLElement | null = null;
  open(trigger: EventTarget | null = null): void {
    this.previousFocus = trigger instanceof HTMLElement ? trigger : null;
    this.dialog?.nativeElement.showModal();
  }
  close(): void {
    this.dialog?.nativeElement.close();
  }
  cancel(event: Event): void {
    if (this.busy()) event.preventDefault();
  }
  onClosed(): void {
    if (this.previousFocus?.isConnected) this.previousFocus.focus();
    this.previousFocus = null;
    this.closed.emit();
  }
}
let nextDialogId = 0;
