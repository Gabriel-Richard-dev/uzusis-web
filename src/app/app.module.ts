import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {SharedModule} from './shared/shared.module';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { ComponentsModule } from './shared/components/components.module';
import { FeaturesModule } from './features/features.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';







@NgModule({
    declarations: [
        AppComponent,

        
        
      
       
    ],
    imports: [
        BrowserModule,
        HttpClientModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule ,
        ComponentsModule,
        FeaturesModule,
        NgbModule
        
        
      
    ],
    providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true
        }
      ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
