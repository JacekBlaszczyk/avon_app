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
                            var oInvoiceModel = new JSONModel({
                                products: [],
                                modifier: 0,
                                modifierCurrency: 0,
                                modifierAmount: "0"
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
                                loggedIn: false,
                                changeSku: false,
                                searchQuery: "",
                                onlyPaired: false,
                                init: true
                            });
                            var oCustomerModel = new JSONModel({
                                date: new Date(),
                                nip: "",
                                companyName: "",
                                street: "",
                                postalCode: "",
                                city: ""
                            })
                            this.getView().setModel(oInvoiceModel, "invoiceModel");
                            this.getView().setModel(oModel, "productsModel");
                            this.getView().setModel(oViewModel, "viewModel");
                            this.getView().setModel(oCustomerModel, "customerModel");
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
                            if (oViewModel.getProperty("/init")) {
                                oViewModel.setProperty("/init", false)                                
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
                                aProducts = [...oModel.getProperty("/allProducts")].filter(el => ((!!el.name && el.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(sValue.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) || (!!el.sku && el.sku.includes(sValue))));
                            oModel.setProperty("/products", aProducts);
                            oModel.setProperty("/productsCount", aProducts.length);

                        },
                        onSearchCatalog: function(oEvent) {
                            var oModel = this.getView().getModel("productsModel"),
                                oViewModel = this.getView().getModel("viewModel"),
                                sValue = oViewModel.getProperty("/searchQuery"),
                                onlyPaired = oViewModel.getProperty("/onlyPaired"),
                                aProducts = [...oModel.getProperty("/allCatalogProducts")].filter(el => (((!!el.name && el.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(sValue.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())) || (!!el.sku && el.sku.includes(sValue))) && (onlyPaired ? !!el.pairedProduct : true)));
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
                                selectedProducts = oModel.getProperty("/allCatalogProducts").filter(el => !!el.pairedProduct && el.priceState === "None"),
                                aTempProducts = [...oModel.getProperty("/changePriceProducts")],
                                aProducts = [...oModel.getProperty("/catalogProducts")],
                                aAllProducts = [...oModel.getProperty("/allCatalogProducts")];
                            selectedProducts.forEach(product => {
                                aTempProducts.push({...product.pairedProduct, boughtPrice: product.finalPrice, newPrice: 0, catalogSku: product.sku });
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
                                product.priceState = newPrice > product.price ? "Error" : newPrice < product.price ? "Success" : "Warning";
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
                            if (!oProduct.pairedProduct || oProduct.pairedProduct._id !== pairedProduct._id) {
                                var iFindIndex = aCatalogProducts.findIndex(el => el.sku === oProduct.sku);
                                aCatalogProducts[iFindIndex].pairedProduct = pairedProduct;
                                oProduct.pairedProduct = pairedProduct;
                                aCatalogProducts[iFindIndex].highlight = "Success";
                                aCatalogProducts[iFindIndex].hasPairedProduct = true;

                            }
                            if (!oAllProduct.pairedProduct || oAllProduct.pairedProduct._id !== pairedProduct._id) {
                                var iFindIndex2 = aAllCatalogProducts.findIndex(el => el.sku === oProduct.sku);
                                aAllCatalogProducts[iFindIndex2].pairedProduct = pairedProduct;
                                oAllProduct.pairedProduct = pairedProduct;
                                aAllCatalogProducts[iFindIndex2].highlight = "Success";
                                aAllCatalogProducts[iFindIndex2].hasPairedProduct = true;

                            }

                            if (oProduct.pairedProduct._id === pairedProduct._id) {
                                aProducts.splice(iIndex, 1);
                            }
                            if (oAllProduct.pairedProduct._id === pairedProduct._id) {
                                aAllProducts.splice(iAllIndex, 1);
                            }
                            oModel.setProperty(path, oProduct);
                            oModel.setProperty("/products", aProducts);
                            oModel.setProperty("/allProducts", aAllProducts);
                            oModel.setProperty("/catalogProducts", aCatalogProducts);
                            oModel.setProperty("/allCatalogProducts", aAllCatalogProducts);
                            oViewModel.refresh(true);
                            // this.onAddToPriceChange();
                            // oViewModel.setProperty("/addToChangePriceEnabled", oModel.getProperty("/allCatalogProducts").findIndex(el => el.pairedProducts.length > 0) > -1);

                        },
                        onPairInvoiceProduct: function(oEvent) {
                            var pairedProduct = oEvent.getParameters().draggedControl.getBindingContext("productsModel").getObject(),
                                oCtx = oEvent.getParameters().droppedControl.getBindingContext("invoiceModel"),
                                oObject = oCtx.getObject(),
                                oModel = this.getView().getModel("productsModel"),
                                oInvoiceModel = this.getView().getModel("invoiceModel");
                            if (!oInvoiceModel.getProperty("hasPairedProduct", oCtx)) {
                                oObject.pairedProduct = pairedProduct;
                                oObject.hasPairedProduct = true;
                                oInvoiceModel.setProperty(oCtx.getPath(), oObject);
                            }
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
                        navToInvoice: function() {
                            this.getView().byId("SplitContainer").to(this.createId("invoice"));
                        },
                        onChangeUpBaselinkerPrices: function() {
                                var selectedProducts = this.getView().byId("changeTable").getSelectedItems()
                                    .filter(el => el.getBindingContext("productsModel").getProperty("priceState") === "Error")
                                    .map(el => {
                                        return { _id: el.getBindingContext("productsModel").getObject()._id, price: el.getBindingContext("productsModel").getObject().newPrice, catalogSku: el.getBindingContext("productsModel").getObject().catalogSku }
                                    }).filter(el => el.price > 0),
                                    oViewModel = this.getView().getModel("viewModel"),
                                    bChangeSku = oViewModel.getProperty("/changeSku"),
                                    oAuthModel = this.getView().getModel("auth"),
                                    userId = oAuthModel.getProperty("/userId");
                                oViewModel.setProperty("/busy", true);
                                $.post({
                                            url: `/route_to_prodsrv/prices?userId=${userId}&changeSku=${bChangeSku}`,
                                            data: JSON.stringify(selectedProducts),
                                            dataType: "text",
                                            success: function(oData) {
                                                    oViewModel.setProperty("/busy", false);
                                                    var countSuccessPrice = JSON.parse(oData).countSuccessPrice;
                                                    var countErrorPrice = JSON.parse(oData).countErrorPrice;
                                                    var countSuccessSku = JSON.parse(oData).countSuccessSku;
                                                    var countErrorSku = JSON.parse(oData).countErrorSku;
                                                    var aProducts = [...this.getView().getModel("productsModel").getProperty("/changePriceProducts")];
                                                    selectedProducts.forEach(product => {
                                                        aProducts.splice(aProducts.findIndex(el => el._id === product._id), 1);
                                                    })
                                                    MessageBox.success(`Pomyślnie zmieniono ceny w ${countSuccessPrice} produktach. ${countErrorPrice} błędów. ${countSuccessSku? `Zmieniono SKU w ${countSuccessSku} produktach.` : ""} ${countSuccessSku && countErrorSku? `${countErrorSku} błędów.` : ""}`);
                this.getView().getModel("productsModel").setProperty("/changePriceProducts", aProducts);
            }.bind(this),
            error: function(oError) {
                oViewModel.setProperty("/busy", false);
                MessageBox.error(JSON.parse(oError.responseText).error);
            }
        });
    },
                        onChangeBaselinkerPrices: function() {
                                var selectedProducts = this.getView().byId("changeTable").getSelectedItems().map(el => {
                                        return { _id: el.getBindingContext("productsModel").getObject()._id, price: el.getBindingContext("productsModel").getObject().newPrice, catalogSku: el.getBindingContext("productsModel").getObject().catalogSku }
                                    }).filter(el => el.price > 0),
                                    oViewModel = this.getView().getModel("viewModel"),
                                    bChangeSku = oViewModel.getProperty("/changeSku"),
                                    oAuthModel = this.getView().getModel("auth"),
                                    userId = oAuthModel.getProperty("/userId");
                                oViewModel.setProperty("/busy", true);
                                $.post({
                                            url: `/route_to_prodsrv/prices?userId=${userId}&changeSku=${bChangeSku}`,
                                            data: JSON.stringify(selectedProducts),
                                            dataType: "text",
                                            success: function(oData) {
                                                    oViewModel.setProperty("/busy", false);
                                                    var countSuccessPrice = JSON.parse(oData).countSuccessPrice;
                                                    var countErrorPrice = JSON.parse(oData).countErrorPrice;
                                                    var countSuccessSku = JSON.parse(oData).countSuccessSku;
                                                    var countErrorSku = JSON.parse(oData).countErrorSku;
                                                    MessageBox.success(`Pomyślnie zmieniono ceny w ${countSuccessPrice} produktach. ${countErrorPrice} błędów. ${countSuccessSku? `Zmieniono SKU w ${countSuccessSku} produktach.` : ""} ${countSuccessSku && countErrorSku? `${countErrorSku} błędów.` : ""}`);
                    this.getView().getModel("productsModel").setProperty("/changePriceProducts", []);
                }.bind(this),
                error: function(oError) {
                    oViewModel.setProperty("/busy", false);
                    MessageBox.error(JSON.parse(oError.responseText).error);
                }
            });
        },
        addPairedProductsToOrder: function() {
            var selectedProducts = [],
            notSelectedProducts = [],
            oViewModel = this.getView().getModel("viewModel"),
                oInvoiceModel = this.getView().getModel("invoiceModel"),
                aProducts = this.getView().byId("invoiceTable").getSelectedItems().map(el => {
                    return el.getBindingContext("invoiceModel").getObject()
                }),
                oAuthModel = this.getView().getModel("auth"),
                userId = oAuthModel.getProperty("/userId"),
                orderNr = oInvoiceModel.getProperty("/orderNr"),
                modifier = oInvoiceModel.getProperty("/modifier") === 0 ? "plus" : "minus",
                modifierAmount,
                modifierCurrency = oInvoiceModel.getProperty("/modifierCurrency") === 0 ? "perc" : "zl";

                try {
                    modifierAmount = parseFloat(oInvoiceModel.getProperty("/modifierAmount").replaceAll(",", "."));
                } catch (err) {
                    modifierAmount = 0;
                }

                if(orderNr){
            
            aProducts.forEach(product => {
                selectedProducts.push({
                            name: product.name,
                            amount: product.amount,
                            price: product.unitPrice
                        });                
            })
            if (selectedProducts.length){
            oViewModel.setProperty("/busy", true);
            $.ajax({
                        url: `/route_to_prodsrv/invoice?userId=${userId}&orderNr=${orderNr}`,
                        type: 'PUT',
                        data: encodeURIComponent(JSON.stringify({
                            selectedProducts,
                            modifier,
                            modifierAmount,
                            modifierCurrency
                        })),
                        dataType: "text",
                        success: function(oData) {
                                oViewModel.setProperty("/busy", false);
                                var invoiceNr = JSON.parse(oData).invoiceNr;
                                MessageBox.success(`Dodano produkty do faktury nr ${invoiceNr}`);
                                oInvoiceModel.setProperty("/products", []);
            }.bind(this),
            error: function(oError) {
            oViewModel.setProperty("/busy", false);
            MessageBox.error(JSON.parse(oError.responseText).error);
            }
            });
        } else {
                MessageBox.error("Nie wybrano żadnych produktów");
            }
        } else {
            MessageBox.error("Podaj numer faktury");
            }
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
            if (isNaN(oProduct.price.replace(",", ".")) || oProduct.price == 0) {
                oProduct.priceState = "Error";
            } else {
                oProduct.priceState = "None";
                oProduct.price = oProduct.price.replace(",", ".");
                oProduct.finalPrice = Math.ceil(parseFloat(oProduct.price) * (100 - oProduct.discount)) / 100
            }
        },
        onProvisionChange: function(oEvent) {
            var oProduct = oEvent.getSource().getBindingContext("productsModel").getObject();
            if (isNaN(oProduct.price.replace(",", "."))) {
                oProduct.priceState = "Error";
            } else {
                oProduct.priceState = "None";
                oProduct.price = oProduct.price.replace(",", ".");
                oProduct.finalPrice = Math.ceil(parseFloat(oProduct.price) * (100 - oProduct.discount)) / 100
            }
        },
        onMarginChange: function(oEvent) {
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
            var oModel = this.getView().getModel("invoiceModel");
            var excelData = {};
            if (file && window.FileReader) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var data = e.target.result;
                    var workbook = XLSX.read(data, {
                        type: 'binary'
                    });
                    workbook.SheetNames.forEach(function(sheetName) {
                        var excelProducts = [...oModel.getProperty("/products")];
                        for (let i = 2; i <= 739; i++) {
                            if (workbook.Sheets[sheetName]["A" + i] && workbook.Sheets[sheetName]["K" + i] && workbook.Sheets[sheetName]["M" + i]) {
                                excelProducts.push({
                                    name: workbook.Sheets[sheetName]["A" + i].v,
                                    amount: workbook.Sheets[sheetName]["K" + i].v,
                                    unitPrice: Math.round(workbook.Sheets[sheetName]["D" + i].v * 100) / 100
                                })
                            }
                        }
                        oModel.setProperty("/products", excelProducts.sort((a, b) => b.amount - a.amount));

                    });
                    // Setting the data to the local model 

                };
                reader.onerror = function(ex) {
                    console.log(ex);
                };
                reader.readAsBinaryString(file);
            }
        },
        handleUploadComplete: function(oEvent) {
			var sResponse = oEvent.getParameter("response"),
            aBaselinkerProducts = this.getView().getModel("productsModel").getProperty("/allProducts"),
				aProducts = JSON.parse(sResponse.replaceAll('<div class="json-formatter-container"></div>', "").replaceAll("<pre>", "").replaceAll('<pre style="word-wrap: break-word; white-space: pre-wrap;">', "").replaceAll("</pre>", "")),
                oViewModel = this.getView().getModel("viewModel");

                oViewModel.setProperty("/busy", false);
			this.getView().getModel("invoiceModel").setProperty("/products", aProducts);

		},
        unpairProduct: function(oEvent){
            var oCtx = oEvent.getSource().getBindingContext("invoiceModel");
            this.getView().getModel("invoiceModel").setProperty("pairedProduct", null, oCtx);
            this.getView().getModel("invoiceModel").setProperty("hasPairedProduct", false, oCtx);
        },
        unpairCatalogProduct: function(oEvent){
            var oCtx = oEvent.getSource().getBindingContext("productsModel");
            var aBaselinkerProducts = [...this.getView().getModel("productsModel").getProperty("/products")];
            var aAllBaselinkerProducts = [...this.getView().getModel("productsModel").getProperty("/allProducts")];
            aBaselinkerProducts.push(this.getView().getModel("productsModel").getProperty("pairedProduct", oCtx));
            aAllBaselinkerProducts.push(this.getView().getModel("productsModel").getProperty("pairedProduct", oCtx));
            this.getView().getModel("productsModel").setProperty("pairedProduct", null, oCtx);
            this.getView().getModel("productsModel").setProperty("hasPairedProduct", false, oCtx);            
            this.getView().getModel("productsModel").setProperty("highlight", "None", oCtx);
            this.getView().getModel("productsModel").setProperty("/products", aBaselinkerProducts);            
            this.getView().getModel("productsModel").setProperty("/allProducts", aAllBaselinkerProducts);
        },

        handleUploadPress: function() {
			var oFileUploader = this.byId("fileUploader");
			oFileUploader.checkFileReadable().then(function() {
				oFileUploader.upload();
			}, function(error) {
				MessageToast.show("The file cannot be read. It may have changed.");
			}).then(function() {
                var oViewModel = this.getView().getModel("viewModel");

                oViewModel.setProperty("/busy", true);
				oFileUploader.clear();
			}.bind(this));
		},
        openCustomerDialog: function(){
            if (!this._oCustomerDialog) {
                // create dialog via fragment factory
                this._oCustomerDialog = sap.ui.xmlfragment("Avon.view.fragment.CustomerDialog", this);
                // connect dialog to view (models, lifecycle)
                this.getView().addDependent(this._oCustomerDialog);
    
            }
    
            this._oCustomerDialog.open();
        }, 
        onCloseDialogCustomer: function(){
            this._oCustomerDialog.close();
        },
        onCreateNewInvoice: function(){
            var selectedProducts = [],
            oViewModel = this.getView().getModel("viewModel"),
                oInvoiceModel = this.getView().getModel("invoiceModel"),
                oCustomerModel = this.getView().getModel("customerModel"),
                oCustomerData = oCustomerModel.getProperty("/"),
                aProducts = this.getView().byId("invoiceTable").getSelectedItems().map(el => {
                    return el.getBindingContext("invoiceModel").getObject()
                }),
                oAuthModel = this.getView().getModel("auth"),
                userId = oAuthModel.getProperty("/userId"),
                modifier = oInvoiceModel.getProperty("/modifier") === 0 ? "plus" : "minus",
                modifierAmount,
                modifierCurrency = oInvoiceModel.getProperty("/modifierCurrency") === 0 ? "perc" : "zl";;
                modifierAmount = parseFloat(oInvoiceModel.getProperty("/modifierAmount").replaceAll(",", "."));
                
            aProducts.forEach(product => {
                if (product.amount){
                selectedProducts.push({
                            name: product.name,
                            amount: product.amount,
                            price: product.unitPrice
                        });
                    }
            })
            if (selectedProducts.length)
            {
                oViewModel.setProperty("/busy", true);
                $.post({
                        url: `/route_to_prodsrv/invoice?userId=${userId}`,
                        data: encodeURIComponent(JSON.stringify({
                            ...oCustomerData,
                            selectedProducts,
                            modifier,
                            modifierAmount,
                            modifierCurrency})),
                        dataType: "text",
                        success: function(oData) {
                                oViewModel.setProperty("/busy", false);
                                var invoiceNr = JSON.parse(oData).invoiceNr;
                                MessageBox.success(`Utworzono fakturę z nr ${invoiceNr}`);
                                this._oCustomerDialog.close();
                                oInvoiceModel.setProperty("/products", []);
            }.bind(this),
            error: function(oError) {
            oViewModel.setProperty("/busy", false);
            MessageBox.error(JSON.parse(oError.responseText).error);
            }
            });
        } else {
            MessageBox.error("Nie wybrano żadnych produktów");
        }
        }
    });

});
