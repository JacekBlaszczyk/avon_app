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
            $.post({
                url: "/route_to_prodsrv/check",
                data: JSON.stringify({ token }),
                dataType: "text",
                success: function(oData) {
                    var success = JSON.parse(oData).success;
                    if (success) {
                        oModel.setProperty("/inventoryId", JSON.parse(oData).inventoryId);
                        oModel.setProperty("/priceGroupId", JSON.parse(oData).priceGroupId);
                    }
                    oViewModel.setProperty("/tokenState", success ? "Success" : "Error");

                    oViewModel.setProperty("/tokenStateText", success ? "Poprawny token" : "Niepoprawny token");
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
            oModel.setProperty("/registerAvailable", oModel.getProperty("/tokenState") === "Success" && !!oLoginModel.getProperty("/username") && !!oLoginModel.getProperty("/password"));
        },
        onTokenChange: function() {
            var oModel = this.getView().getModel("viewModel");
            oModel.setProperty("/registerAvailable", false);
            oModel.setProperty("/tokenState", "None");
        },
        onRegister: function() {
            var oLoginModel = this.getView().getModel("loginModel");
            var fullDiscount = this.getView().getModel("viewModel").getProperty("/fullDiscount");
            $.post({
                url: "/route_to_prodsrv/register",
                data: JSON.stringify({...oLoginModel.getProperty("/"), discount: fullDiscount ? 40 : 35 }),
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