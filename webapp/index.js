sap.ui.define([
	"sap/ui/core/mvc/XMLView"
], function (XMLView) {
	"use strict";
		new sap.m.Shell({
			app: new sap.ui.core.ComponentContainer({
				height : "100%",
				name : "Avon"
			})
		}).placeAt("content");
	

	XMLView.create({viewName: "Avon.view.App"}).then(function (oView) {
		oView.placeAt("content");
	});
});