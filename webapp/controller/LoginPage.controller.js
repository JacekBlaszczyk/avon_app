sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/ui/core/UIComponent"
], function(Controller, MessageToast, JSONModel, Filter, FilterOperator, MessageBox, UIComponent) {
    "use strict";
    return Controller.extend("Avon.LoginPage", {
        onInit: function() {
            var oViewModel = new JSONModel({
                title: "Zaloguj się",
                registerMode: false,
                listVisible: false,
                tokenState: "None",
                tokenStateText: "",
                tokenEnabled: true,
                registerAvailable: false,
                fullDiscount: true
            });
            this.getView().setModel(oViewModel, "viewModel");
            var oLoginModel = new JSONModel({
                username: "",
                password: "",
                token: ""
            });
            this.getView().setModel(oLoginModel, "loginModel");
        },
        onAfterRendering: function(){
            $.get({
                url: "/route_to_prodsrv/ping"
            });            
            $.get({
                url: "/route_to_invoicesrv/ping"
            });
        },
        onLogin: function() {
            var oLoginModel = this.getView().getModel("loginModel");
            $.post({
                url: "/route_to_prodsrv/login",
                data: JSON.stringify({ username: oLoginModel.getProperty("/username"), password: oLoginModel.getProperty("/password") }),
                dataType: "text",
                success: function(oData) {
                    var oAuthModel = this.getView().getModel("auth");
                    oAuthModel.setProperty("/", {...JSON.parse(oData), loggedIn: true });
                    UIComponent.getRouterFor(this).navTo("MainPage");
                }.bind(this),
                error: function(oError) {
                    MessageBox.error(JSON.parse(oError.responseText).error);
                }
            });
        },
        onCheckToken: function() {
            var oModel = this.getView().getModel("loginModel");
            var oViewModel = this.getView().getModel("viewModel");
            var token = oModel.getProperty("/token");
            var domain = oModel.getProperty("/domain");
            $.post({
                url: "/route_to_prodsrv/check",
                data: JSON.stringify({ token, domain }),
                dataType: "text",
                success: function(oData) {
                    var success = JSON.parse(oData).success;
                    oViewModel.setProperty("/tokenState", success ? "Success" : "Error");

                    oViewModel.setProperty("/tokenStateText", success ? "Poprawny token" : "Niepoprawny token");
                    oViewModel.setProperty("/domainState", success ? "Success" : "Error");

                    oViewModel.setProperty("/domainStateText", success ? "Poprawna domena" : "Niepoprawna domena");
                    this.checkRegisterAvailable();
                }.bind(this),
                error: function(oError) {
                    // your error logic
                }
            });
        },
        switchToRegister: function() {
            var oModel = this.getView().getModel("viewModel");
            oModel.setProperty("/title", "Zarejestruj się");
            oModel.setProperty("/registerMode", true);

        },
        switchToLogin: function() {
            var oModel = this.getView().getModel("viewModel");
            oModel.setProperty("/title", "Zaloguj się");
            oModel.setProperty("/registerMode", false);
        },
        checkRegisterAvailable: function() {
            var oModel = this.getView().getModel("viewModel");
            var oLoginModel = this.getView().getModel("loginModel");
            oModel.setProperty("/registerAvailable", oModel.getProperty("/domainState") === "Success" && oModel.getProperty("/tokenState") === "Success" && !!oLoginModel.getProperty("/username") && !!oLoginModel.getProperty("/password"));
        },
        onTokenChange: function() {
            var oModel = this.getView().getModel("viewModel");
            oModel.setProperty("/registerAvailable", false);
            oModel.setProperty("/tokenState", "None");
        },
        onShowHelp: function() {
            if (!this._oHelpDialog) {
                // create dialog via fragment factory
                this._oHelpDialog = sap.ui.xmlfragment("Avon.view.fragment.TokenHelpDialog", this);
                // connect dialog to view (models, lifecycle)
                this.getView().addDependent(this._oHelpDialog);
    
            }
    
            this._oHelpDialog.open();
        },  
        onShowHelpDomain : function() {
            if (!this._oHelpDomainDialog) {
                // create dialog via fragment factory
                this._oHelpDomainDialog = sap.ui.xmlfragment("Avon.view.fragment.DomainHelpDialog", this);
                // connect dialog to view (models, lifecycle)
                this.getView().addDependent(this._oHelpDomainDialog);
    
            }
    
            this._oHelpDomainDialog.open();
        }, 
        onCloseDialogHelp: function(){
            this._oHelpDialog.close();
        },  
        onCloseDialogDomainHelp: function(){
            this._oHelpDomainDialog.close();
        },   
        onRegister: function() {
            var oLoginModel = this.getView().getModel("loginModel");
            $.post({
                url: "/route_to_prodsrv/register",
                data: JSON.stringify(oLoginModel.getProperty("/")),
                dataType: "text",
                success: function(oData) {
                    var oAuthModel = this.getView().getModel("auth");
                    oAuthModel.setProperty("/", {...JSON.parse(oData), loggedIn: true });
                    UIComponent.getRouterFor(this).navTo("MainPage");
                }.bind(this),
                error: function(oError) {
                    MessageBox.error(JSON.parse(oError.responseText).error);
                }
            });
        }
    });

});
