import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  KtobApiService, PublicReaderProfile, ReaderSearchHit, apiFailure,
} from '../core/api/ktob-api.service';

@Component({
  selector: 'app-reader-directory',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './reader-directory.page.html',
  styleUrl: './reader-directory.page.css',
})
export class ReaderDirectoryPage {
  private readonly api=inject(KtobApiService);
  private readonly route=inject(ActivatedRoute);
  readonly query=signal('');
  readonly searching=signal(false);
  readonly loading=signal(false);
  readonly error=signal('');
  readonly people=signal<ReaderSearchHit[]>([]);
  readonly profile=signal<PublicReaderProfile|null>(null);
  readonly attempted=signal(false);
  private version=0;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params=>{
      const name=params.get('username');
      if(name)void this.open(name);
      else { this.version++;this.profile.set(null);this.error.set('');this.loading.set(false); }
    });
  }

  async search(): Promise<void> {
    const q=this.query().trim();
    this.attempted.set(true);this.error.set('');
    if(q.length<2){this.error.set('Search by at least two characters.');return;}
    this.searching.set(true);
    try { this.people.set((await this.api.searchReaders(q)).data); }
    catch(e) { this.error.set(apiFailure(e)); }
    finally {this.searching.set(false);}
  }

  async open(username:string):Promise<void> {
    const current=++this.version;
    this.loading.set(true);this.error.set('');this.profile.set(null);
    try {
      const {data}=await this.api.publicReader(username);
      if(current===this.version)this.profile.set(data);
    }catch(e){if(current===this.version)this.error.set(apiFailure(e));}
    finally{if(current===this.version)this.loading.set(false);}
  }
}
