sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox"
], function(Controller, MessageToast, JSONModel, Filter, FilterOperator, MessageBox) {
    "use strict";
    return Controller.extend("Avon.App", {
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
        onAfterRendering: function() {

            var oModel = this.getView().getModel("productsModel"),
                oViewModel = this.getView().getModel("viewModel");
            // oViewModel.setProperty("/busy", true);
            $.get({
                url: "/route_to_prodsrv/products",
                success: function(oData) {
                    oModel.setProperty("/allProducts", oData.value);
                    oModel.setProperty("/products", oData.value);
                    oModel.setProperty("/productsCount", oData.value.length);
                    $.get({
                        url: "/route_to_prodsrv/catalogue_new",
                        success: function(oData) {
                            oModel.setProperty("/catalogProducts", oData.products);
                            oModel.setProperty("/allCatalogProducts", oData.products);
                            oViewModel.setProperty("/busy", false);
                        },
                        error: function(oError) {
                            // your error logic
                        }
                    });
                },
                error: function(oError) {
                    // your error logic
                }
            });

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
                    // your error logic
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
        onMainTableSelectionChange: function(oEvent) {
            this.getView().getModel("viewModel").setProperty("/addToChangePriceEnabled", !!oEvent.getSource().getSelectedItems().length)
        },
        onChangePriceTableSelectionChange: function(oEvent) {
            this.getView().getModel("viewModel").setProperty("/changePriceEnabled", !!oEvent.getSource().getSelectedItems().length)
        },
        onAddToPriceChange: function() {
            var selectedProducts = this.getView().byId("leftTable").getSelectedItems().map(el => {
                    return {...el.getBindingContext("productsModel").getObject() }
                }),
                oModel = this.getView().getModel("productsModel"),
                aTempProducts = [...oModel.getProperty("/changePriceProducts")],
                aProducts = [...oModel.getProperty("/excelProducts")];
            selectedProducts.forEach(product => {
                aTempProducts.push(...product.pairedProducts.map(el => { return {...el, boughtPrice: product.price, newPrice: 0 } }));
            })

            selectedProducts.forEach(product => {
                aProducts.splice(aProducts.findIndex(el => el.name === product.name), 1);
            })
            oModel.setProperty("/excelProducts", aProducts);
            oModel.setProperty("/changePriceProducts", aTempProducts);
            this.getView().byId("leftTable").removeSelections();
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
                oDroppedControl = oEvent.getParameter("droppedControl"),
                aProducts = [...oModel.getProperty("/products")],
                aAllProducts = [...oModel.getProperty("/allProducts")],
                oProduct = {...oModel.getProperty(path) },
                iIndex = aProducts.findIndex(el => el._id === pairedProduct._id),
                iAllIndex = aAllProducts.findIndex(el => el._id === pairedProduct._id);
            oProduct.pairedProducts.push(pairedProduct);
            aProducts.splice(iIndex, 1);
            aAllProducts.splice(iAllIndex, 1);
            oModel.setProperty(path, oProduct);
            oModel.setProperty("/products", aProducts);
            oModel.setProperty("/allProducts", aAllProducts);
            oDroppedControl.setSelected(true);
            oDroppedControl.getParent().fireSelectionChange();
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
            }).filter(el => el.price > 0);
            $.post({
                url: "/route_to_prodsrv/prices",
                data: JSON.stringify(selectedProducts),
                dataType: "text",
                success: function(oData) {
                    var count = JSON.parse(oData).count;
                    MessageBox.success(`Pomyślnie zmieniono ceny w ${count} produktach.`);
                    this.getView().getModel("productsModel").setProperty("/changePriceProducts", []);
                }.bind(this),
                error: function(oError) {
                    // your error logic
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
        onSearchCatalog: function(oEvent) {
            var oModel = this.getView().getModel("productsModel"),
                sValue = oEvent.getParameter("newValue"),
                aProducts = [...oModel.getProperty("/allCatalogProducts")].filter(el => !!el.name && el.name.toLowerCase().includes(sValue.toLowerCase()));
            oModel.setProperty("/catalogProducts", aProducts);

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
        onLogin: function() {
            this.getView().getModel("viewModel").setProperty("/loggedIn", true);
            this.getView().getModel("viewModel").refresh();
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