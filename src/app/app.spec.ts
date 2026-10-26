import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the toolbar title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const toolbar = compiled.querySelector('mat-toolbar');
    // Mushroom first, then "Level Up" (all screen sizes).
    const title = toolbar?.querySelector('.app-title');
    expect(title?.firstElementChild?.tagName).toBe('IMG');
    expect(title?.textContent?.trim()).toBe('Level Up');
    expect(toolbar?.querySelector('img')?.getAttribute('src')).toBe('images/mushroom-green.png');
  });

  it('should render the feature tabs in order', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const tabs = Array.from(compiled.querySelectorAll('a[mat-tab-link]')).map((a) =>
      a.textContent?.trim(),
    );
    expect(tabs).toEqual(['Training Ground', 'Quest Log']);
  });

  it('has a settings link in the toolbar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('mat-toolbar a[aria-label="Settings"]');
    expect(link?.getAttribute('href')).toBe('/settings');
  });

  it('has a bottom nav for phones with all three sections', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const items = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('nav.bottom-nav a'),
    );
    expect(items.map((a) => [a.querySelector('.bottom-nav-label')?.textContent, a.getAttribute('href')])).toEqual([
      ['Training Ground', '/training'],
      ['Quest Log', '/quests'],
      ['Settings', '/settings'],
    ]);
  });
});
