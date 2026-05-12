---
translation_source: guides/ANGULAR.md
translation_source_hash: db5a73d8ddcd813e9bac7918d3e48e9834f98d5f60e855ace8c2f9df7cc0f0af
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:41:17.528980+00:00
---

# Guide d'adoption NAC3 + Angular

Ce guide permet d'intégrer NAC3 dans une application Angular selon deux approches :

- **Greenfield :** nouveau projet, NAC3 intégré dès `ng new`.
- **Brownfield :** application existante, NAC3 ajouté progressivement, sans réécriture.

Testé avec Angular 17+ (composants standalone, signals, inject).
La forme NgModules (Angular plus ancien) est également couverte. Même package `@nac3/runtime` que React ; la différence réside dans le degré d'intégration idiomatique avec Angular.

---

## 1. Installation

```
npm install @nac3/runtime
```

Angular intègre le package via son pipeline de build standard (esbuild en 17+, webpack pour les versions antérieures). Aucune configuration supplémentaire dans `angular.json`.

---

## 2. Greenfield -- nouveau projet

### 2.1 Démarrer le runtime une seule fois

Dans `main.ts` :

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import '@nac3/runtime';
import '@nac3/runtime/extensions';
// optionnel : import '@nac3/runtime/chat-client';

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)]
}).then(() => {
  // window.NAC est maintenant prêt. Configurer le tenant + la provenance une seule fois.
  if ((window as any).NAC?.setTenantPrefix) {
    (window as any).NAC.setTenantPrefix('demo');
  }
});
```

Pour l'ancien `app.module.ts` (NgModule), les mêmes imports sont à placer dans le fichier de module avant `platformBrowserDynamic().bootstrapModule(...)`.

### 2.2 Service NAC3 -- centraliser l'enregistrement

```ts
// nac.service.ts
import { Injectable, OnDestroy } from '@angular/core';

declare global {
  interface Window { NAC?: any; }
}

export interface NACManifest {
  plugin_slug: string;
  nac_version?: string;
  elements?: Array<{
    id: string; role: string;
    label_i18n?: Record<string, string>;
    actions?: Array<{ verb: string; label_i18n?: Record<string, string> }>;
  }>;
  tabs?: Array<{ nac_id: string; label_i18n?: Record<string, string> }>;
}

@Injectable({ providedIn: 'root' })
export class NacService {
  get runtime() { return window.NAC; }

  register(manifest: NACManifest) {
    if (!this.runtime) {
      console.warn('NAC runtime not ready, skipping register for', manifest.plugin_slug);
      return;
    }
    this.runtime.register(manifest);
  }

  click(id: string)                       { return this.runtime?.click(id); }
  click_by_verb(plugin: string|null, verb: string) { return this.runtime?.click_by_verb(plugin, verb); }
  fill(id: string, value: any)            { return this.runtime?.fill(id, value); }
  tab(plugin: string, tab_key: string)    { return this.runtime?.tab(plugin, tab_key); }
  describe()                              { return this.runtime?.describe(); }
  validate_global()                       { return this.runtime?.validate_global(); }

  /* Utilitaire v2.2. */
  bindAction(el: HTMLElement, handler: (ev: Event) => void | Promise<unknown>,
             ctx: { plugin: string; action_id: string }) {
    return this.runtime?.bindAction(el, handler, ctx);
  }
}
```

### 2.3 Décorer les composants

```ts
import { Component, OnInit, ElementRef, inject, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { NacService } from './nac.service';

const INVOICE_MANIFEST = {
  plugin_slug: 'invoice',
  nac_version: '2.2',
  elements: [
    {
      id: 'invoice.client_name', role: 'field',
      label_i18n: { es:'Nombre',en:'Name',pt:'Nome',fr:'Nom',
                    it:'Nome',de:'Name',ja:'名前',zh:'姓名',
                    hi:'naam',ar:'الاسم' }
    },
    {
      id: 'invoice.save', role: 'action',
      actions: [{ verb: 'save', label_i18n: { es:'Guardar',en:'Save',
                  pt:'Salvar',fr:'Sauver',it:'Salva',de:'Speichern',
                  ja:'保存',zh:'保存',hi:'sahejna',ar:'حفظ' } }],
      label_i18n: { es:'Guardar factura',en:'Save invoice',
                    pt:'Salvar fatura',fr:'Sauver facture',
                    it:'Salva fattura',de:'Rechnung speichern',
                    ja:'請求書保存',zh:'保存发票',
                    hi:'invoice sahejen',ar:'حفظ الفاتورة' }
    }
  ]
};

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  template: `
    <article data-nac-plugin="invoice">
      <input type="text"
             data-nac-id="invoice.client_name"
             data-nac-role="field"
             [(ngModel)]="clientName">

      <button #saveBtn
              data-nac-id="invoice.save"
              data-nac-role="action"
              data-nac-action="save"
              (click)="onSave()">
        Save
      </button>
    </article>
  `
})
export class InvoiceFormComponent implements OnInit, AfterViewInit, OnDestroy {
  private nac = inject(NacService);
  @ViewChild('saveBtn', { static: true }) saveBtn!: ElementRef<HTMLButtonElement>;

  clientName = '';
  private unbind: (() => void) | undefined;

  ngOnInit() {
    this.nac.register(INVOICE_MANIFEST);
  }

  ngAfterViewInit() {
    /* v2.2 : bindAction enveloppe le clic + émet l'accusé de réception
       afin que tout agent attendant NAC.click('invoice.save') se résolve proprement. */
    this.unbind = this.nac.bindAction(
      this.saveBtn.nativeElement,
      () => this.onSave(),
      { plugin: 'invoice', action_id: 'invoice.save' }
    );
  }

  ngOnDestroy() {
    this.unbind?.();
  }

  async onSave() {
    // ... votre logique de sauvegarde ...
  }
}
```

### 2.4 NacIdDirective -- le raccourci adapté au brownfield

Pour une décoration répétitive, une directive d'attribut est plus idiomatique en Angular que le triple `data-nac-*` brut. Appliquée une seule fois, la directive positionne les trois attributs :

```ts
// nac-id.directive.ts
import { Directive, ElementRef, Input, OnInit } from '@angular/core';

@Directive({
  selector: '[nacId]',
  standalone: true
})
export class NacIdDirective implements OnInit {
  @Input({ required: true }) nacId!: string;
  @Input() nacRole: 'action' | 'field' | 'tab' | 'option' | 'data-table' | string = 'action';
  @Input() nacAction?: string;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit() {
    const e = this.el.nativeElement;
    e.setAttribute('data-nac-id', this.nacId);
    e.setAttribute('data-nac-role', this.nacRole);
    if (this.nacAction) {
      e.setAttribute('data-nac-action', this.nacAction);
    }
  }
}
```

Utilisation :

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        (click)="onSave()">
  Save
</button>
```

### 2.5 NacActionDirective -- bindAction sans effort

Enveloppe `bindAction` afin que tout gestionnaire `(click)` décoré avec `nacAction` émette automatiquement le contrat d'accusé de réception v2.2 :

```ts
// nac-action.directive.ts
import { Directive, ElementRef, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { NacService } from './nac.service';

@Directive({
  selector: '[nacAction]',
  standalone: true
})
export class NacActionDirective implements OnInit, OnDestroy {
  @Input({ required: true }) nacAction!: { plugin: string; actionId: string };
  private nac = inject(NacService);
  private unbind?: () => void;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit() {
    /* L'élément DOIT déjà avoir un gestionnaire (click) attaché par Angular
       à ce stade. Le nôtre s'y ajoute ; le runtime v2.2 émet l'accusé
       de réception une fois les deux exécutés. */
    this.unbind = this.nac.bindAction(
      this.el.nativeElement,
      () => { /* événement contractuel uniquement -- le (click) utilisateur s'exécute séparément */ },
      { plugin: this.nacAction.plugin, action_id: this.nacAction.actionId }
    );
  }

  ngOnDestroy() { this.unbind?.(); }
}
```

Utilisation :

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        [nacAction]="{ plugin: 'invoice', actionId: 'invoice.save' }"
        (click)="onSave()">
  Save
</button>
```

(Oui, le sélecteur de directive `nacAction` entre en conflit avec l'entrée abrégée `data-nac-action`. En pratique, vous choisissez l'un des deux patterns pour l'ensemble du projet ; cette section s'adresse aux équipes souhaitant utiliser l'enveloppe bindAction.)

---

## 3. Brownfield -- application existante

Le principe (identique à React) : ne pas tout refactoriser d'un coup.

### 3.1 Ordre d'intervention

1. **Le shell de premier niveau en priorité.** Ajoutez `data-nac-plugin="<your-app-slug>"`
   sur l'élément englobant le plus externe du template de votre `<app-root>`. L'arbre
   de portée du runtime le prend en compte immédiatement.
2. **Les boutons les plus utilisés ensuite.** Enregistrer / annuler / soumettre / supprimer
   sur vos écrans les plus fréquentés. Ajoutez les trois attributs `data-nac-*`
   directement dans le template (ou via `NacIdDirective`).
3. **Vérifiez dans les DevTools.** Exécutez `window.NAC.describe()` depuis la
   console du navigateur. Les boutons doivent apparaître sous votre slug de plugin.
4. **Ajoutez un manifeste.** Uniquement les boutons de l'étape 2, avec des verbes.
   `NAC.click_by_verb()` fonctionne désormais.
5. **Ajoutez les champs et les onglets.** Les inputs reçoivent `role="field"`. Les onglets reçoivent
   `role="tab"` -- **attention** : les ids correspondant à `^tab\.` DOIVENT avoir le role
   `'tab'` conformément à la spec sec 1 + au validateur strict V22-01.

### 3.2 Utilisation avec Angular Material / PrimeNG / Taiga

La plupart des bibliothèques de composants Angular exposent des liaisons d'entrée
de style `[attr.data-nac-*]` ou transfèrent simplement les attributs inconnus vers
l'élément hôte. Deux approches possibles :

**Approche A : liaison d'attribut directe.**

```html
<!-- Material -->
<button mat-raised-button
        [attr.data-nac-id]="'invoice.save'"
        [attr.data-nac-role]="'action'"
        [attr.data-nac-action]="'save'"
        (click)="onSave()">
  Save
</button>
```

**Approche B : NacIdDirective sur l'élément englobant.**

Si la bibliothèque rend un élément hôte et que vous souhaitez NAC3 sur le
bouton interne, encapsulez-le :

```html
<span nacId="invoice.save" nacRole="action" nacAction="save"
      (click)="onSave()">
  <button mat-raised-button>Save</button>
</span>
```

Le runtime NAC3 résout par `data-nac-id`, et non par balise, donc cette
approche fonctionne.

### 3.3 Auto-enregistrement depuis le DOM

Même pattern `autoRegister.watch` que React :

```ts
// in your AppComponent ngAfterViewInit:
const root = document.querySelector('[data-nac-plugin]') as HTMLElement;
if (root && (window as any).NAC?.autoRegister) {
  root.setAttribute('data-nac-watch', '1');
  (window as any).NAC.autoRegister.watch(root, {
    i18n_strict: 'permissive',
    throttleMs: 100
  });
}
```

Passez `i18n_strict` à `'strict'` une fois que votre catalogue de traductions
couvre l'ensemble des 10 locales NAC3.

---

## 4. Routage et cycle de vie

Le snapshot NAC3 reflète **ce qui est actuellement monté**. Avec le routeur Angular,
cela implique :

- Un composant monté lors d'une navigation enregistre son
  manifeste dans `ngOnInit`.
- Un composant démonté lors d'une navigation doit appeler
  `NAC.unregister(plugin_slug)` dans `ngOnDestroy` afin que les plugins obsolètes
  n'apparaissent pas dans le snapshot de l'agent.

```ts
ngOnDestroy() {
  this.nac.runtime?.unregister?.('invoice');
}
```

Pour les composants shell à longue durée de vie (la barre supérieure, la barre latérale),
ne les désenregistrez PAS -- ils doivent toujours être présents dans l'arbre.

---

## 5. Tests

### 5.1 TestBed / Karma

```ts
import { TestBed } from '@angular/core/testing';
import { InvoiceFormComponent } from './invoice-form.component';
import '@nac3/runtime';

describe('InvoiceFormComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InvoiceFormComponent]
    });
  });

  it('save button drives via NAC', async () => {
    const fixture = TestBed.createComponent(InvoiceFormComponent);
    fixture.detectChanges();

    let acked = false;
    document.addEventListener('nac:action:succeeded', () => { acked = true; });

    await (window as any).NAC.click('invoice.save');

    expect(acked).toBe(true);
  });
});
```

### 5.2 Playwright (e2e)

Identique au guide React :

```ts
import { test, expect } from '@playwright/test';

test('invoice save', async ({ page }) => {
  await page.goto('/invoices/new');
  await page.evaluate(() => (window as any).NAC.fill('invoice.client_name', 'Acme'));
  await page.evaluate(() => (window as any).NAC.click('invoice.save'));
  await expect(page.getByText('Invoice saved')).toBeVisible();
});
```

---

## 6. Pièges courants

- **Ids obsolètes dans `*ngFor`.** Si vous construisez des ids à partir de l'index
  (`data-nac-id="row.{{i}}"`), les agents ayant mis en cache un id échouent lors d'un
  réordonnancement. Utilisez des clés stables (ids de base de données).
- **Détection de changements et boucles d'enregistrement.** N'enregistrez PAS le
  manifeste dans `ngOnChanges` ni dans un getter exécuté à chaque cycle de détection de changements.
  `ngOnInit` une seule fois est le bon endroit.
- **Mode strict + zone.js.** Les événements NAC3 transitent par le document global ;
  ils ne sont PAS zone-aware par défaut. Si vous avez besoin d'une gestion zone-aware,
  encapsulez votre écouteur :
  ```ts
  this.zone.run(() => { /* respond to nac:action:succeeded */ });
  ```
- **SSR (Angular Universal).** NAC3 est réservé au navigateur. Protégez le
  service :
  ```ts
  if (isPlatformBrowser(this.platformId)) {
    this.nac.register(...);
  }
  ```

---

## 7. Checklist de mise en production

Avant de livrer :

1. Remplacez `i18n_strict: 'permissive'` par `'strict'`. La CI détecte ainsi
   les traductions manquantes.
2. Exécutez `npx @nac3/runtime validate ./src` -- attendez zéro résultat de sévérité erreur.
3. Définissez `(window as any).NAC.STRICT_VALIDATION = true` dans votre
   démarrage en production pour que les vérifications à l'enregistrement v2.2 (manifest_role_unknown,
   etc.) lèvent des exceptions.
4. Depuis un test Playwright, vérifiez que `NAC.validate_global()` retourne
   `[]`.
5. Multi-tenant : signez les manifestes côté serveur avec HMAC et appelez
   `NAC.set_provenance_secret()` depuis du code authentifié.

---

## 8. Pour aller plus loin

- `SPEC.md` pour le contrat complet.
- `guides/REACT.md` pour la comparaison inter-frameworks.
- `guides/LLM_WIRING.md` pour le backend intermédiaire.
- `SECURITY.md` pour le modèle de menace.
- Les démos sur yujin.app/nac-spec/ (`example.php` référence v1.9 ;
  `example-v20-full.php` migration brownfield ; `example-v21-data-table.php`
  tableau de données + chat).

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/ANGULAR.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
