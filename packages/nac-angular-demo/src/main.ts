import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

import '@nac3/runtime';
import '@nac3/runtime/extensions';
import '@nac3/runtime/chat-client';

bootstrapApplication(AppComponent).catch((err) => console.error(err));
