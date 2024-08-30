import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { InitialPageComponent } from './features/initial-page/initial-page.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { LoginComponent } from "./features/auth/login/login/login.component";






const routes: Routes = [
  {
    path:"",
    component:InitialPageComponent,
  },
  {
    path: "login",
    component: LoginComponent
  }

  // {
  //   path: "",
  //   children: [
  //     {
  //       path: "",
  //       loadChildren: () =>
  //         import("./features/1-proj/portfolio.module").then(
  //           (m) => m.estruturaModule
  //         ),
  //     },
  //   ],
  // },
 
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
