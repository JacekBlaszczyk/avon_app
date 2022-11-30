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
    return Controller.extend("Avon.MainPage", {
        onInit: function() {
            var oModel = new JSONModel({
                products: [],
                changePriceProducts: [],
                excelProducts: []
            });
            var oViewModel = new JSONModel({
                addToChangePriceEnabled: false,
                changePriceEnabled: false,
                busy: false,
                percentage: false,
                brokeragePercent: "0",
                margin: "0",
                baselinkerToken: "",
                storageId: "",
                loggedIn: false
            });
            this.getView().setModel(oModel, "invoiceModel");
            this.getView().setModel(oModel, "productsModel");
            this.getView().setModel(oViewModel, "viewModel");
        },
        onBeforeRendering: function() {
            if (!this.getView().getModel("auth").getProperty("/loggedIn")) {
                UIComponent.getRouterFor(this).navTo("LoginPage");
            }
        },
        onAfterRendering: function() {

            var oModel = this.getView().getModel("productsModel"),
                oViewModel = this.getView().getModel("viewModel"),
                oAuthModel = this.getView().getModel("auth"),
                userId = oAuthModel.getProperty("/userId");
            oViewModel.setProperty("/busy", true);
            if (userId) {
                $.get({
                    url: `/route_to_prodsrv/products?userId=${userId}`,
                    success: function(oData) {
                        oModel.setProperty("/allProducts", oData.value);
                        oModel.setProperty("/products", oData.value);
                        oModel.setProperty("/productsCount", oData.value.length);
                        $.get({
                            url: `/route_to_prodsrv/catalogue/12?userId=${userId}`,
                            success: function(oData) {
                                oModel.setProperty("/catalogProducts", oData.products.map(el => { return {...el, pairedProducts: [], highlight: "None" } }));
                                oModel.setProperty("/allCatalogProducts", oData.products.map(el => { return {...el, pairedProducts: [], highlight: "None" } }));
                                oViewModel.setProperty("/discounts", [{ key: 10, value: "10%" }, { key: 20, value: "20%" }, { key: oData.discount, value: `${oData.discount}%` }])
                                oViewModel.setProperty("/busy", false);
                            },
                            error: function(oError) {
                                MessageBox.error(JSON.parse(oError.responseText).error);
                                oViewModel.setProperty("/busy", false);
                            }
                        });
                    },
                    error: function(oError) {
                        MessageBox.error(JSON.parse(oError.responseText).error);
                        oViewModel.setProperty("/busy", false);
                    }
                });
            }

        },
        onUploadStart: function(oEvent) {
            var event = oEvent;
        },
        onUpload: function() {
            var uploader = this.getView().byId("upload");
            uploader.checkFileReadable().then(function() {
                uploader.upload();
            }, function(error) {

            })
        },
        onUploadFinished: function(oEvent) {
            var oModel = this.getView().getModel("invoiceModel"),
                aProducts = JSON.parse(oEvent.getParameter("responseRaw"));
            $.get({
                url: "/route_to_prodsrv/products",
                success: function(oData) {
                    var aApiProducts = oData.value;
                    var aTempProducts = [];
                    aProducts.forEach(product => {
                        var found = aApiProducts.find(el => el.sku === product.sku);
                        aTempProducts.push({
                            nameOnInvoice: product.name,
                            priceOnInvoice: product.unitPrice,
                            foundOnBaselinker: !!found,
                            baselinkerName: found ? found.name : "",
                            baselinkerPrice: found ? found.price : 0,
                            imageUrl: found ? found.imageUrl : "",
                            id: found ? found._id : ""
                        })
                    });
                    oModel.setProperty("/products", aTempProducts);
                },
                error: function(oError) {
                    MessageBox.error(JSON.parse(oError.responseText).error);
                }
            });
        },
        formatHighlight: function(aProducts) {
            return (aProducts && aProducts.length) ? "Success" : "None";
        },
        formatHighlightCatalog: function(sName) {
            return !!sName ? "Success" : "None";
        },
        onSearch: function(oEvent) {
            var oModel = this.getView().getModel("productsModel"),
                sValue = oEvent.getParameter("newValue"),
                aProducts = [...oModel.getProperty("/allProducts")].filter(el => ((!!el.name && el.name.toLowerCase().includes(sValue.toLowerCase())) || (!!el.sku && el.sku.includes(sValue))));
            oModel.setProperty("/products", aProducts);
            oModel.setProperty("/productsCount", aProducts.length);

        },
        onSearchCatalog: function(oEvent) {
            var oModel = this.getView().getModel("productsModel"),
                sValue = oEvent.getParameter("newValue"),
                aProducts = [...oModel.getProperty("/allCatalogProducts")].filter(el => ((!!el.name && el.name.toLowerCase().includes(sValue.toLowerCase())) || (!!el.sku && el.sku.includes(sValue))));
            oModel.setProperty("/catalogProducts", aProducts);

        },
        onMainTableSelectionChange: function(oEvent) {
            this.getView().getModel("viewModel").setProperty("/addToChangePriceEnabled", !!oEvent.getSource().getSelectedItems().length)
        },
        onChangePriceTableSelectionChange: function(oEvent) {
            this.getView().getModel("viewModel").setProperty("/changePriceEnabled", !!oEvent.getSource().getSelectedItems().length)
        },
        onAddToPriceChange: function() {
            var oModel = this.getView().getModel("productsModel"),
                selectedProducts = oModel.getProperty("/allCatalogProducts").filter(el => el.pairedProducts.length > 0),
                aTempProducts = [...oModel.getProperty("/changePriceProducts")],
                aProducts = [...oModel.getProperty("/catalogProducts")],
                aAllProducts = [...oModel.getProperty("/allCatalogProducts")];
            selectedProducts.forEach(product => {
                aTempProducts.push(...product.pairedProducts.map(el => { return {...el, boughtPrice: product.finalPrice, newPrice: 0, catalogSku: product.sku } }));
            })

            selectedProducts.forEach(product => {
                aProducts.splice(aProducts.findIndex(el => el.sku === product.sku), 1);
                aAllProducts.splice(aAllProducts.findIndex(el => el.sku === product.sku), 1);
            })
            oModel.setProperty("/catalogProducts", aProducts);
            oModel.setProperty("/allCatalogProducts", aAllProducts);
            oModel.setProperty("/changePriceProducts", aTempProducts.filter((el, idx, arr) => arr.indexOf(el) === idx));
        },
        countPrices: function() {
            var selectedProducts = this.getView().byId("changeTable").getSelectedItems(),
                oViewModel = this.getView().getModel("viewModel"),
                oModel = this.getView().getModel("productsModel"),
                brokeragePercent = parseFloat(oViewModel.getProperty("/brokeragePercent")),
                margin = parseFloat(oViewModel.getProperty("/margin")),
                percentage = oViewModel.getProperty("/percentage");
            selectedProducts.forEach(el => {
                var product = el.getBindingContext("productsModel").getObject(),
                    path = el.getBindingContext("productsModel").getPath(),
                    tempPrice = percentage ? parseFloat(product.boughtPrice) * (1 + margin / 100) : parseFloat(product.boughtPrice) + margin,
                    newPrice = Math.ceil(10 * (tempPrice / (1 - brokeragePercent / 100))) / 10;
                product.newPrice = newPrice;
                oModel.setProperty(path, product);
            })
        },
        onUploadExcel: function(e) {
            this._import(e.getParameter("files") && e.getParameter("files")[0]);
        },
        onPairProduct: function(oEvent) {
            var pairedProduct = oEvent.getParameters().draggedControl.getBindingContext("productsModel").getObject(),
                path = oEvent.getParameters().droppedControl.getBindingContext("productsModel").getPath(),
                oModel = this.getView().getModel("productsModel"),
                oViewModel = this.getView().getModel("viewModel"),
                oDroppedControl = oEvent.getParameter("droppedControl"),
                aProducts = [...oModel.getProperty("/products")],
                aAllProducts = [...oModel.getProperty("/allProducts")],
                aCatalogProducts = [...oModel.getProperty("/catalogProducts")],
                aAllCatalogProducts = [...oModel.getProperty("/allCatalogProducts")],
                oProduct = {...oModel.getProperty(path) },
                oAllProduct = {...oModel.getProperty("/allCatalogProducts").find(el => el.name === oProduct.name) },
                iIndex = aProducts.findIndex(el => el._id === pairedProduct._id),
                iAllIndex = aAllProducts.findIndex(el => el._id === pairedProduct._id);
            if (oProduct.pairedProducts.findIndex(el => el._id === pairedProduct._id) === -1) {
                var iFindIndex = aCatalogProducts.findIndex(el => el.sku === oProduct.sku);
                aCatalogProducts[iFindIndex].pairedProducts.push(pairedProduct);
                aCatalogProducts[iFindIndex].highlight = "Success";

            }
            if (oAllProduct.pairedProducts.findIndex(el => el._id === pairedProduct._id) === -1) {
                var iFindIndex2 = aAllCatalogProducts.findIndex(el => el.sku === oProduct.sku);
                aAllCatalogProducts[iFindIndex2].pairedProducts.push(pairedProduct);
                aAllCatalogProducts[iFindIndex2].highlight = "Success";
            }

            if (oProduct.pairedProducts.findIndex(el => el._id === pairedProduct._id) > -1) {
                aProducts.splice(iIndex, 1);
            }
            if (oAllProduct.pairedProducts.findIndex(el => el._id === pairedProduct._id) > -1) {
                aAllProducts.splice(iAllIndex, 1);
            }
            oModel.setProperty(path, oProduct);
            oModel.setProperty("/products", aProducts);
            oModel.setProperty("/allProducts", aAllProducts);
            oModel.setProperty("/catalogProducts", aCatalogProducts);
            oModel.setProperty("/allCatalogProducts", aAllCatalogProducts);
            oDroppedControl.setSelected(true);
            oDroppedControl.getParent().fireSelectionChange();

            oViewModel.setProperty("/addToChangePriceEnabled", oModel.getProperty("/allCatalogProducts").findIndex(el => el.pairedProducts.length > 0) > -1);

        },
        navToProducts: function() {
            this.getView().byId("SplitContainer").to(this.createId("all"));
        },
        navToPrices: function() {
            this.getView().byId("SplitContainer").to(this.createId("prices"));
        },
        navToCatalog: function() {
            this.getView().byId("SplitContainer").to(this.createId("catalog"));
        },
        onChangeBaselinkerPrices: function() {
            var selectedProducts = this.getView().byId("changeTable").getSelectedItems().map(el => {
                    return { _id: el.getBindingContext("productsModel").getObject()._id, price: el.getBindingContext("productsModel").getObject().newPrice }
                }).filter(el => el.price > 0),
                oAuthModel = this.getView().getModel("auth"),
                userId = oAuthModel.getProperty("/userId");
            oViewModel.setProperty("/busy", true);
            $.post({
                url: `/route_to_prodsrv/prices?userId=${userId}`,
                data: JSON.stringify(selectedProducts),
                dataType: "text",
                success: function(oData) {
                    oViewModel.setProperty("/busy", false);
                    var countSuccess = JSON.parse(oData).countSuccess;
                    var countError = JSON.parse(oData).countError;
                    MessageBox.success(`Pomyślnie zmieniono ceny w ${countSuccess} produktach. ${countError} błędów.`);
                    this.getView().getModel("productsModel").setProperty("/changePriceProducts", []);
                }.bind(this),
                error: function(oError) {
                    oViewModel.setProperty("/busy", false);
                    MessageBox.error(JSON.parse(oError.responseText).error);
                }
            });
        },
        onAddToMaster: function(oEvent) {
            var selectedProduct = oEvent.getSource().getBindingContext("productsModel").getObject(),
                oModel = this.getView().getModel("productsModel"),
                aTempProducts = [...oModel.getProperty("/excelProducts")],
                aProducts = [...oModel.getProperty("/catalogProducts")],
                aAllProducts = [...oModel.getProperty("/allCatalogProducts")];

            aTempProducts.push({ name: selectedProduct.name, price: selectedProduct.discountPrice, pairedProducts: [] });


            aProducts.splice(aProducts.findIndex(el => el.name === selectedProduct.name), 1);
            aAllProducts.splice(aAllProducts.findIndex(el => el.name === selectedProduct.name), 1);
            oModel.setProperty("/catalogProducts", aProducts);
            oModel.setProperty("/allCatalogProducts", aAllProducts);
            oModel.setProperty("/excelProducts", aTempProducts);
            this.getView().byId("catalogTable").removeSelections();
        },
        onAddAllToMaster: function(oEvent) {
            var oModel = this.getView().getModel("productsModel"),
                selectedProducts = oModel.getProperty("/catalogProducts").filter(el => !el.yourName),
                aTempProducts = [...oModel.getProperty("/excelProducts")],
                aProducts = [...oModel.getProperty("/catalogProducts")],
                aAllProducts = [...oModel.getProperty("/allCatalogProducts")];



            selectedProducts.forEach(selectedProduct => {
                aTempProducts.push({ name: selectedProduct.name, price: selectedProduct.price, pairedProducts: [] });
                aProducts.splice(aProducts.findIndex(el => el.name === selectedProduct.name), 1);
                aAllProducts.splice(aAllProducts.findIndex(el => el.name === selectedProduct.name), 1);
            })
            oModel.setProperty("/catalogProducts", aProducts);
            oModel.setProperty("/allCatalogProducts", aAllProducts);
            oModel.setProperty("/excelProducts", aTempProducts);
            this.getView().byId("catalogTable").removeSelections();
        },
        onSelectDiscount: function(oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("productsModel"),
                iDiscount = parseInt(oEvent.getParameter("selectedItem").getKey()),
                oModel = this.getView().getModel("productsModel"),
                iPrice = oModel.getProperty("price", oCtx),
                iDiscountPrice = Math.ceil(iPrice * (100 - iDiscount)) / 100;
            oModel.setProperty("discountPrice", iDiscountPrice, oCtx);
        },
        onPairCatalog: function() {
            var oModel = this.getView().getModel("productsModel"),
                aCatalogProducts = [...oModel.getProperty("/catalogProducts")],
                aProducts = oModel.getProperty("/products");
            aCatalogProducts.forEach(catalogProduct => {
                var found = aProducts.find(el => el.sku === catalogProduct.sku);
                if (found) {
                    catalogProduct.yourName = found.name;
                    catalogProduct.yourPrice = found.price;
                    catalogProduct.imageUrl = found.imageUrl;
                    catalogProduct._id = found._id;
                }
            })
            oModel.setProperty("/catalogProducts", aCatalogProducts);
        },
        onMoveToChangePricesCatalog: function() {
            var oModel = this.getView().getModel("productsModel"),
                aCatalogProducts = [...oModel.getProperty("/catalogProducts")],
                aProducts = aCatalogProducts.filter(el => !!el.yourName),
                aNewProducts = [];
            aProducts.forEach(product => {
                aNewProducts.push({
                    _id: product._id,
                    name: product.name,
                    price: product.yourPrice,
                    boughtPrice: product.price,
                    newPrice: 0
                });
                aCatalogProducts.splice(aCatalogProducts.findIndex(el => el.sku === product.sku), 1);
            });
            oModel.setProperty("/catalogProducts", aCatalogProducts);
            oModel.setProperty("/changePriceProducts", aNewProducts);
        },
        onPriceOrDiscountChange: function(oEvent) {
            var oProduct = oEvent.getSource().getBindingContext("productsModel").getObject();
            if (isNaN(oProduct.price.replace(",", "."))) {
                oProduct.priceState = "Error";
            } else {
                oProduct.priceState = "None";
                oProduct.price = oProduct.price.replace(",", ".");
                oProduct.finalPrice = Math.ceil(parseFloat(oProduct.price) * (100 - oProduct.discount)) / 100
            }
        },
        _import: function(file) {
            var that = this;
            var oModel = this.getView().getModel("productsModel");
            var excelData = {};
            if (file && window.FileReader) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var data = e.target.result;
                    var workbook = XLSX.read(data, {
                        type: 'binary'
                    });
                    workbook.SheetNames.forEach(function(sheetName) {
                        var excelProducts = [...oModel.getProperty("/excelProducts")];
                        for (let i = 8; i <= 218; i++) {
                            if (workbook.Sheets[sheetName]["D" + i] && workbook.Sheets[sheetName]["I" + i]) {
                                excelProducts.push({
                                    name: workbook.Sheets[sheetName]["D" + i].v,
                                    price: parseFloat(workbook.Sheets[sheetName]["I" + i].w.split("zł")[0].trim().replace(",", ".")),
                                    pairedProducts: []
                                })
                            }
                        }
                        oModel.setProperty("/excelProducts", excelProducts);

                    });
                    // Setting the data to the local model 

                };
                reader.onerror = function(ex) {
                    console.log(ex);
                };
                reader.readAsBinaryString(file);
            }
        }
    });

});