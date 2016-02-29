// Pull in your favorite version of jquery 
require({ 
	packages: [{ name: "jquery", location: "http://ajax.googleapis.com/ajax/libs/jquery/2.1.0/", main: "jquery.min" }] 
});
// Bring in dojo and javascript api classes as well as config.json and content.html
define([
	"dojo/_base/declare", "framework/PluginBase", "esri/layers/FeatureLayer", "esri/symbols/SimpleLineSymbol", 
	"esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleMarkerSymbol",  "esri/SpatialReference", 
	"esri/tasks/Geoprocessor", "esri/tasks/IdentifyTask", "esri/tasks/IdentifyParameters", "esri/graphic", "esri/InfoTemplate", "dojo/_base/Color", 	
	"dijit/layout/ContentPane", "dijit/form/HorizontalSlider","dijit/registry", "dojo/_base/array", "dojo/dom", "dojo/dom-class", "dojo/dom-style", 
	"dojo/dom-construct", "dojo/dom-geometry", "dojo/_base/lang", "dojo/on", "dojo/parser", 
	"plugins/barrier-prioritization/js/ConstrainedMoveable", "dojo/text!./config.json", "jquery",
	"dojo/text!./html/legend.html", "dojo/text!./html/content.html", "dijit/TooltipDialog", 
	"dijit/popup", "plugins/barrier-prioritization/js/jquery-ui-1.11.0/jquery-ui", 
    "dojox/grid/DataGrid", "dojo/data/ItemFileReadStore"
],
function ( declare, PluginBase, FeatureLayer, SimpleLineSymbol, SimpleFillSymbol, SimpleMarkerSymbol, 
			SpatialReference, Geoprocessor,  IdentifyTask, IdentifyParameters, Graphic, InfoTemplate, Color, ContentPane, HorizontalSlider, 
			registry, arrayUtils, dom, domClass, domStyle, domConstruct, domGeom, lang, on, parser,
			ConstrainedMoveable, config, $, legendContent, content, TooltipDialog, popup, ui,  DataGrid,  
			ItemFileReadStore) {
		return declare(PluginBase, {
			toolbarName: "Aquatic Barrier Prioritization", showServiceLayersInLegend: true, allowIdentifyWhenActive: false, rendered: false, resizable: true,
			// First function called when the user clicks the pluging icon. Defines the default JSON and plugin size
			initialize: function (frameworkParameters) {
				declare.safeMixin(this, frameworkParameters);
				domClass.add(this.container, "claro");
				this.con = dom.byId('plugins/barrier-prioritization-0');
				this.con1 = dom.byId('plugins/barrier-prioritization-1');
				if (this.con1 != undefined){
					domStyle.set(this.con1, "width", "365px");
					domStyle.set(this.con1, "height", "250px");

				}else{
					domStyle.set(this.con, "width", "365px");
					domStyle.set(this.con, "height", "250px");
				}	
				this.config = dojo.eval("[" + config + "]")[0];	
				this.items = [];
				this.itemsFiltered = [];
				this.atRow = [];
				this.gp = new esri.tasks.Geoprocessor(this.config.gpURL);
				this.gp.setUpdateDelay(200); //status check in milliseconds;
				parser.parse(); 
				
			},
			// Called after initialize at plugin startup (why all the tests for undefined). Also called after deactivate when user closes app by clicking X. 
			hibernate: function () {
				this.small = "yes";
				if (this.appDiv != undefined){
					$('#' + this.appDiv.id).hide();
					$('#' + this.appDiv.id + 'leftSide, #' + this.appDiv.id + 'rightSide').css('display', 'none');
					$('#' + this.appDiv.id + 'bottomDiv').hide();
					$('#' + this.appDiv.id + 'clickTitle').show();
				}
				if (this.dynamicLayer != undefined)  {
					this.dynamicLayer.setVisibility(false);
					this.map.graphics.clear();
				}
				if (this.fc != undefined){
					this.fc.clear();
				}
				if (this.map != undefined){
					this.map.graphics.clear();
				}
				if ("#" + this.appDiv.id + "gpResultTable"){
					$("#" + this.appDiv.id + "gpResultTable").empty();
					$('input:radio[name="stateRadio"]').filter('[value="inputs"]').prop('checked', true);
				}
				$("#" + this.appDiv.id + "gpResultTableDivContainer").hide();
				$('#' + this.appDiv.id + 'toggleResultsDiv').hide();
				$("#" + this.appDiv.id + "topRadioDiv").hide();
                this.map.removeLayer(this.gpResLayer);
                this.mapSide = this.appDiv.id.replace("dijit_layout_ContentPane_", "");			
				//$('#legend-container-' + this.mapSide).removeClass("hideLegend");
				
				//clear GP status and reset metirc weights
				$("#" + this.appDiv.id +"gpStatusReport").html("");
				$("#" + this.appDiv.id +"gpStatusReportHead").css('display', 'none');
			    $("input[id^=" + this.appDiv.id + "weightIn]").each(lang.hitch(this, function(i, v){
                    v.value = 0;   
                    $('#' + v.id).removeClass('weighted');         
                }));
                $('#'+ this.appDiv.id +"currWeight").html('0');
                $('#'+ this.appDiv.id +"currWeight").css('color', 'red');
                $('#' + this.appDiv.id + 'dlCSV').css('display', 'none');
			},
			// Called after hibernate at app startup. Calls the render function which builds the plugins elements and functions.   
			
			activate: function () {
			    console.log(this.con1);
				// Hide framework default legend
				if (this.con1 == null){this.mapSide=0;}
				else{this.mapSide = 1;}       
               // $('#legend-container-' + this.mapSide).addClass("hideLegend");

				if (this.rendered == false) {
					this.rendered = true;							
					this.render();
					this.dynamicLayer.setVisibility(true);
				} else {
					if (this.dynamicLayer != undefined)  {
						this.dynamicLayer.setVisibility(true);	
					}
					if (this.small == "yes"){
						this.con = dom.byId('plugins/barrier-prioritization-0');
						this.con1 = dom.byId('plugins/barrier-prioritization-1');
						if (this.con1 != undefined){
							domStyle.set(this.con1, "width", "365px");
							domStyle.set(this.con1, "height", "260px");
						}else{
							domStyle.set(this.con, "width", "365px");
							domStyle.set(this.con, "height", "260px");
						}
						$('#' + this.appDiv.id).css('height', '20');
						$('#' + this.appDiv.id).show();
					}	
				}
                    
			},

			// Called when user hits the minimize '_' icon on the pluging. Also called before hibernate when users closes app by clicking 'X'.
			deactivate: function () {
				this.small = "no";
			},	
			// Called when user hits 'Save and Share' button. This creates the url that builds the app at a given state using JSON. 
			// Write anything to you config.json file you have tracked during user activity.		
			getState: function () {
				this.config.extent = this.map.geographicExtent;
				this.config.stateSet = "yes";
				// Get OBJECTIDs of filtered items
				if ( this.itemsFiltered.length > 0 ){
					$.each(this.itemsFiltered, lang.hitch(this,function(i,v){
						this.config.filteredIDs.push(v.OBJECTID);
					}));
				}	
				var state = new Object();
				state = this.config;
				return state;
			},
			// Called before activate only when plugin is started from a getState url. 
			//It's overwrites the default JSON definfed in initialize with the saved stae JSON.
			setState: function (state) {
				this.config = state;
			},
			// Resizes the plugin after a manual or programmatic plugin resize so the button pane on the bottom stays on the bottom.
			// Tweak the numbers subtracted in the if and else statements to alter the size if it's not looking good.
			resize: function(w, h) {
				cdg = domGeom.position(this.container);
				if (cdg.h == 0) { this.sph = this.height - 80; }
				else { this.sph = cdg.h - 62; }
				if ($("#" + this.appDiv.id).width() < 550){
					$("#" + this.appDiv.id + "rightSide").css("visibility","hidden");
				}
				if ($("#" + this.appDiv.id).width() >= 550){
					$("#" + this.appDiv.id + "rightSide").css("visibility","visible");
				}
				domStyle.set(this.appDiv.domNode, "height", this.sph + "px"); 
			},
			// Called by activate and builds the plugins elements and functions
			
			
			render: function() {			    
				//set up window popup for metric defintiions		
				window.windowPopup = function(mylink, windowname){
				if (! window.focus)return true;
					var href;
				if (typeof(mylink) == 'string')
				   href=mylink;
				else
				   href=mylink.href;
				winPop = window.open(href, windowname, 'width=660,height=590,scrollbars=yes');
				winPop.moveTo(400, 200);
				return false;
				};

				this.graphicMouseovers = 0;
				this.keepInfoWindow = "no";   
                this.activateIdentify = true;
                
				// Info icon src
				this.info = "data:image/png;base64,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";	
				// Define Content Pane		
				this.appDiv = new ContentPane({});
				parser.parse();
				dom.byId(this.container).appendChild(this.appDiv.domNode);					
				// Get html from content.html, prepend appDiv.id to html element id's, and add to appDiv
				var idUpdate = content.replace(/id='/g, "id='" + this.appDiv.id);	
				$('#' + this.appDiv.id).html(idUpdate);

				
				//set listeners to change state between inputs and result table
				$('#' + this.appDiv.id + 'stateRadioForm').on('change',lang.hitch(this, function(){
					
					selectedVal= $('input[name=stateRadio]:checked', '#' + this.appDiv.id + 'stateRadioForm').val();
					
					if (selectedVal==="results"){
						$('#' + this.appDiv.id + 'leftSide').hide();
						$('#' + this.appDiv.id + 'rightSide').hide();
						$('#' + this.appDiv.id + 'gpResultTableDivContainer').show();
						
						$('#' + this.appDiv.id + 'toggleResultsDiv').show();
					}
					if (selectedVal==="inputs"){
						$('#' + this.appDiv.id + 'leftSide').show();
						$('#' + this.appDiv.id + 'rightSide').css('display', 'inline-block');
						$('#' + this.appDiv.id + 'rightSide').show();
						$('#' + this.appDiv.id + 'gpResultTableDivContainer').hide();
						$('#' + this.appDiv.id + 'toggleResultsDiv').hide();					
					}
				}));				
			
				
				
				// Custom legend
				// Get the parent element of the map for placement
				var a = $('#' + $(this.map).attr('id')).parent();
				// Use legend.html to build the elements in the ContentPane - update the ids with this.appDiv
				var legHTML = legendContent.replace(/id='/g, "id='" + this.appDiv.id);
				this.legendWin = new ContentPane({ id: this.appDiv.id + "myLegendDiv", innerHTML: legHTML	});
				// Add legend window to maps parent and add class for symbology
				dom.byId(a[0]).appendChild(this.legendWin.domNode);
				$('#' + this.appDiv.id + 'myLegendDiv').addClass('myLegendDiv');
				$('#' + this.appDiv.id + 'myLegendDiv').hide();
				// Make legend div movable
				var p = new ConstrainedMoveable( dom.byId(this.legendWin.id), {
					handle: dom.byId(this.appDiv.id + "myLegendHeader"), within: true
				});
				
				// Click handler to close legend
				$('#' + this.appDiv.id + 'myLegendDiv .myLegendCloser' ).on('click',lang.hitch(this,function(){
					$('#' + this.appDiv.id + 'myLegendDiv').hide();
				}));
				
				// Add dynamic map service
				this.dynamicLayer = new esri.layers.ArcGISDynamicMapServiceLayer(this.config.url);
				this.map.addLayer(this.dynamicLayer);
				if (this.config.visibleLayers != []){	
					this.dynamicLayer.setVisibleLayers(this.config.visibleLayers);   
				}

				
				//GP Analysis iterator
				this.gpIterator = 1;
				
				//Get started button and open tool UI
				$('#' + this.appDiv.id +"start").on('click',lang.hitch(this,function(evt){				
					this.mapSide = evt.currentTarget.id;
					//Resize main container - check which side first
					if (this.mapSide == "dijit_layout_ContentPane_1start"){
						this.useCon = this.con1;
						this.mapID ="map-1";
                        console.log(this.mapID);
					}else{
						this.useCon = this.con;
						this.mapID = "map-0";
                        console.log(this.mapID);
					}
					if ($(this.useCon).width() != 580){
						$( this.useCon ).animate({
							width: "580",
							height: "573px"
						}, 500 , lang.hitch(this,function() {
							$('#' + this.appDiv.id + 'leftSide, #' + this.appDiv.id + 'rightSide').css('display', 'inline-block');
							$("#" + this.appDiv.id + "rightSide").show();
							$('#' + this.appDiv.id + 'bottomDiv').show();
							$('#' + this.appDiv.id + 'topRadioDiv').show();
							this.resize();	
						}));
						$('#' + this.appDiv.id + 'toggleResultsDiv').hide();
						$('#' + this.appDiv.id + "clickTitle").hide();
					
						
					}
				}));
				
				
                //Identify functionality...     
                this.identifyRes = new IdentifyTask(this.config.url);
                this.identifyParams = new IdentifyParameters();
                this.identifyParams.tolerance = 3;
                this.identifyParams.returnGeometry = true;
                this.identifyParams.layerIds = [0];
                this.identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
                this.identifyParams.width = this.map.width;
                this.identifyParams.height = this.map.height;

                dojo.connect(this.map, "onClick", lang.hitch(this, function(evt) {  
                    if (this.activateIdentify == true){     
                        console.log(this.mapID);          
                        this.identifyParams.geometry = evt.mapPoint;
                        this.identifyParams.mapExtent = this.map.extent;
                        this.identifyParams.layerIds = [0];                  
                        this.deferred = this.identifyRes       
                            .execute(this.identifyParams)
                            .addCallback(lang.hitch(this, function (response) {
                            return arrayUtils.map(response, lang.hitch(this, function (idResult) {
                                this.IdentifyFeature = idResult.feature;
                                this.idContent = "";
                                $.each(idResult.feature.attributes, lang.hitch(this, function(k, v){
                                    //HTML for identify popup -- loop through and include all fields except those in plugin-config blakclist
                                    if ($.inArray(k, this.config.idBlacklist) == -1){
                                        this.idContent = this.idContent + "<b>" + k + "</b> : " + v + "<hr>";
                                    }
                                }));
                                console.log(this.idContent);
                                this.identJSON = {
                                    title: "SiteID: ${SiteID}",
                                    content: this.idContent
                                };
                                this.popupInfoTemplate = new esri.InfoTemplate(this.identJSON);
                                this.IdentifyFeature.setInfoTemplate(this.popupInfoTemplate);
                                return this.IdentifyFeature;
                                console.log(this.IdentifyFeature);
    
                           }));
                         }));
                         this.map.infoWindow.setFeatures([this.deferred]);
                         this.map.infoWindow.show(this.identifyParams.geometry);
                    };
                }));
              
				
				
                //toggle dynamic layer 
                $('#' + this.appDiv.id + 'toggleLayer').on('change', lang.hitch(this, function(evt){             
                        var ischecked = $('#' + this.appDiv.id + 'toggleLayer').is(':checked');
                        if (ischecked) {
                            this.dynamicLayer.setVisibleLayers(this.config.visibleLayers);
                            this.activateIdentify = true;
                                           
                        }
                        if (!ischecked){this.dynamicLayer.setVisibleLayers([-1]);
                            this.activateIdentify = false;
                        }                        
                })); 				
				
				//toggle results graphics
                $('#' + this.appDiv.id + 'toggleResults').on('change', lang.hitch(this, function(evt){             
                        var ischecked = $('#' + this.appDiv.id + 'toggleResults').is(':checked');
                        if (ischecked) {
                            this.map.graphics.show(); 
                            this.gpResLayer.show();
                        }
                        if (!ischecked){
                            this.map.graphics.hide();
                            this.gpResLayer.hide();
                        }                        
                })); 
				
				//hide filter input if not checked
				$('#' + this.appDiv.id + 'filterBarriers').on('change', lang.hitch(this, function(evt){    	
						var ischecked = $('#' + this.appDiv.id +"filterBarriers").is(':checked');
						if (ischecked) {$("#" + this.appDiv.id + "userFilter").show();}
						if (!ischecked){$("#" + this.appDiv.id + "userFilter").hide();}
				}));				
				
				//hide remove barriers if not checked	
				$('#' + this.appDiv.id + 'runSumStats').on('change', lang.hitch(this, function(evt){    

						var ischecked = $('#' + this.appDiv.id +"runSumStats").is(':checked');
						if (ischecked) {
							$("#" + this.appDiv.id + "summarizeBy").show();
							$("#" + this.appDiv.id + "summaryStatField").show();
						}
						if (!ischecked){
							$("#" + this.appDiv.id + "summarizeBy").hide();
							$("#" + this.appDiv.id + "summaryStatField").hide();
						}	
				}));	
				
				//hide summary stats inputs if not checked	
				$('#' + this.appDiv.id + 'removeBarriers').on('change', lang.hitch(this, function(evt){    
						var ischecked = $('#' + this.appDiv.id +"removeBarriers").is(':checked');
						if (ischecked) {$("#" + this.appDiv.id + "barriers2Remove").show();}
						if (!ischecked){$("#" + this.appDiv.id + "barriers2Remove").hide();}	
				}));
				
				//set up metric weight tabs
				jQuery('.tabs .tab-links a').on('click', function(e)  {
					tabIDprefix = this.id.split("tab")[0];
					mapSide = tabIDprefix.replace("weightIn", "");
					
					var currentAttrValue = mapSide + jQuery(this).attr('href');
					currentAttrValue = "#" + currentAttrValue;
					// Show/Hide Tabs
					jQuery('.tabs ' + currentAttrValue).show().siblings().hide();
			 
					// Change/remove current tab to active
					jQuery(this).parent('li').addClass('active').siblings().removeClass('active');
			 
					e.preventDefault();
				});
				
				//set up listener for change to metric weight inputs
				$("input[id^=" +  this.appDiv.id + 'weightIn]').on('input', lang.hitch(this, function(e){					
					e.currentTarget.value = parseInt(e.currentTarget.value);
					this.gpVals = {};
					this.weights = $("input[id^=" + this.appDiv.id + "weightIn]").each(lang.hitch(this, function(i, v){
						if (isNaN(parseFloat(v.value)) == true){v.id = 0;} 
						else{this.gpVals[v.id] = v.value;}      
						this.gpVals[v.id] = v.value;
						if (parseFloat(v.value) > 0){$('#' + v.id).addClass('weighted');}
						else{$('#' + v.id).removeClass('weighted');}								
					}));
					this.sumWeights = metricWeightCalculator(this.gpVals);
					
					$('#'+ this.appDiv.id + "currWeight").text(this.sumWeights);
					if (this.sumWeights !=100){
						
						$('#'+ this.appDiv.id +"currWeight").css('color', 'red');
					}
					if (this.sumWeights ==100){
						$('#'+ this.appDiv.id +"currWeight").css('color', 'green');
					} 
				}));

				//apply consensus weights
				$('#' + this.appDiv.id +"applyDefaultDiadromous").on('click',lang.hitch(this,function(e){	
					for (var key in this.config.diadromous) {
						if (this.config.diadromous.hasOwnProperty(key)) {
							$("#" + this.appDiv.id + "weightIn-" + key).val(this.config.diadromous[key]);
						}
					this.gpVals = {};
					this.weights = $("input[id^=" + this.appDiv.id + "weightIn]").each(lang.hitch(this, function(i, v){
						this.gpVals[v.id] = v.value;
						if (parseFloat(v.value) > 0){$('#' + v.id).addClass('weighted');}
                        else{$('#' + v.id).removeClass('weighted');}    				
					}));
					this.sumWeights = metricWeightCalculator(this.gpVals);
					$('#'+ this.appDiv.id + "currWeight").text(this.sumWeights);
					if (this.sumWeights !=100){$('#'+ this.appDiv.id +"currWeight").css('color', 'red');}
					if (this.sumWeights ==100){$('#'+ this.appDiv.id +"currWeight").css('color', 'green');} 
					}
				}));
				
			 
				$('#' + this.appDiv.id +"applyDefaultResident").on('click',lang.hitch(this,function(e){	
					for (var key in this.config.resident) {
						if (this.config.resident.hasOwnProperty(key)) {
							$("#" + this.appDiv.id + "weightIn-" + key).val(this.config.resident[key]);
						}
					this.gpVals = {};
					this.weights = $("input[id^=" + this.appDiv.id + "weightIn]").each(lang.hitch(this, function(i, v){
						this.gpVals[v.id] = v.value;	
					    if (parseFloat(v.value) > 0){$('#' + v.id).addClass('weighted');}
                        else{$('#' + v.id).removeClass('weighted');}			
					}));
					this.sumWeights = metricWeightCalculator(this.gpVals);
					$('#'+ this.appDiv.id + "currWeight").text(this.sumWeights);
					if (this.sumWeights !=100){$('#'+ this.appDiv.id +"currWeight").css('color', 'red');}
					if (this.sumWeights ==100){$('#'+ this.appDiv.id +"currWeight").css('color', 'green');} 
					}
				}));
				
				//clear all metric weights
				$('#' + this.appDiv.id +"applyZeroWeight").on('click',lang.hitch(this,function(e){ 
    			    $("input[id^=" + this.appDiv.id + "weightIn]").each(lang.hitch(this, function(i, v){
                        v.value = 0;
                        $('#' + v.id).removeClass('weighted');            
                    }));
                    $('#'+ this.appDiv.id +"currWeight").html('0');
                    $('#'+ this.appDiv.id +"currWeight").css('color', 'red');
                }));
				
				
				//prepare and pass the GP request object to gpURL
				$('#' + this.appDiv.id +"submitButton").on('click',lang.hitch(this,function(e){
					$('#' + this.appDiv.id + 'dlCSV').css('display', 'none');
					this.gpVals = {};
					this.weights = $("input[id^=" + this.appDiv.id + "weightIn]").each(lang.hitch(this, function(i, v){
						this.gpVals[v.id] = v.value;				
					}));
					this.sumWeights = metricWeightCalculator(this.gpVals);
					console.log(this.gpVals);
					this.sumWeights = metricWeightCalculator(this.gpVals);
					if (this.sumWeights != 100){
						alert("Metric weights must sum to 100");
					}
					else{
						//clear old map graphics and results table
						this.map.graphics.clear();
						this.tableHTML = "";
						// $("#" + this.appDiv.id + "gpResultTable > tbody").html(''); 
						// $("#" + this.appDiv.id + "gpResultTable > thead").html('<tr></tr>');
						this.tableHTML = "<table  id='" + this.appDiv.id + "gpResultTable' class='tablesorter'><thead> <tr></tr></thead><tbody ></tbody></table>";
						$("#" + this.appDiv.id + "gpResultTable").html(this.tableHTML);
						if (this.gpIterator >1){											
    						require(["jquery", "plugins/barrier-prioritization/js/jquery.tablesorter.combined"],lang.hitch(this,function($) {
    						 $("#" + this.appDiv.id + "gpResultTable").trigger("destroy");
    						}));
						}
                        $("#" + this.appDiv.id + "gpResultTable").html(this.tableHTML);						
						console.log($("#" + this.appDiv.id + "gpResultTable"));
						
						this.requestObject = {};				
						if($("#" + this.appDiv.id + "filterBarriers").is(':checked')){this.filterBarr = true;}
						else{this.filterBarr = false;}

						if ($("#" + this.appDiv.id + "userFilter").val() != ""){
						  this.filter = $("#" + this.appDiv.id + "userFilter").val();
						}
						else{this.filter = "";}
						if($("#" + this.appDiv.id + "removeBarriers").is(':checked')){this.removeBarr = true;}
						else{this.removeBarr = false;}
						this.removeIDs = $("#" + this.appDiv.id + "barriers2Remove").val();

						if($("#" + this.appDiv.id + "runSumStats").is(':checked')){this.runSumStats = true;}
						else{this.runSumStats = false;}
						this.summarizeBy = $("#" + this.appDiv.id + "summarizeBy").val();
						this.sumStatField = $("#" + this.appDiv.id + "summaryStatField").val();
						
						this.requestObject["FilterBarriers"] = this.filterBarr;
						this.requestObject["UserFilter"] = this.filter;
						this.requestObject["ModelRemoval"] = this.removeBarr;
						this.requestObject["Barriers_for_Modeled_Removal"] = this.removeIDs;
						this.requestObject["Run_Watershed_Summary_Stats"] = this.runSumStats;
						this.requestObject["Summarize_By"] = this.summarizeBy;
						this.requestObject["Summary_Stat_Field"] = this.sumStatField;
						this.weightIterator = 1;

						$("#" + this.appDiv.id + "gpResultTable tr:first").append("<th class='SiteID'>SiteID</th>");
						$("#" + this.appDiv.id + "gpResultTable tr:first").append("<th>Tier</th>");
						$("#" + this.appDiv.id + "gpResultTable tr:first").append("<th>FinalRank</th>");
						$.each(this.gpVals, lang.hitch(this, function(metric, weight){
							if (weight >0){
								var mNum = "Metric_" + this.weightIterator;
								var mWeight = mNum + "_Weight";
								var mOrder = mNum + "_Order";
								var mLogTrans = mNum + "_Log_Transform";
								var m = metric.replace(this.appDiv.id + "weightIn-", "");
							    var prettyM = this.config.metricNames[m];
								this.requestObject[mNum] = m;
								this.requestObject[mWeight] = weight;
								this.requestObject[mOrder] = this.config.metricOrder[m];
								this.requestObject[mLogTrans] = "No";
								this.weightIterator ++; 
								$("#" + this.appDiv.id + "gpResultTable tr:first").append("<th>" + prettyM +"</th>");
							}
						}));

						console.log(this.requestObject);
						this.statusCallbackIterator = 0;
						
						this.gp.submitJob(this.requestObject, lang.hitch(this,completeCallback), lang.hitch(this,statusCallback), function(error){
							alert(error);
						});
						
						//disable Submit button so a second analyiss can't be run until the first is finished
						$('#' + this.appDiv.id +"submitButton").addClass('submitButtonRunning');
                        $('#' + this.appDiv.id +"submitButton").prop('disabled', true);
					}
				}));
		
				//GP status
				function statusCallback(jobInfo) {
					this.status = jobInfo.jobStatus;
					
					if(this.status === "esriJobFailed"){
						alert("There was a problem running the analysis.  Please try again. " + this.status);
						
						//re-enable Submit button for subsequent analyses
                        $('#' + this.appDiv.id +"submitButton").removeClass('submitButtonRunning');
                        $('#' + this.appDiv.id +"submitButton").prop('disabled', false);
					}
					else{
						$("#" + this.appDiv.id +"gpStatusReportHead").css("display", "block");
					
						if(this.statusCallbackIterator === 0){console.log("Analysis begun!");}
						if (jobInfo.messages.length > 0){
							this.messages = jobInfo.messages;
							this.count = this.messages.length;

							this.index = this.count-1;					
							if (this.count>0) {
								this.message = this.messages[this.index].description;
							}
							if ((this.message != this.updateMessage) && (typeof this.message != 'undefined')){
								$("#" + this.appDiv.id +"gpStatusReport").html(this.message);
								this.updateMessage = this.message;
							}
						}
						this.statusCallbackIterator ++;
					}
				}
				
				//GP complete            
				function completeCallback(jobInfo){
						$("#" + this.appDiv.id +"gpStatusReport").html("Transferring data from server...");
						// Get result as map service -- needed for larger datasets and easy way to get legend
                        this.resMapServURLRoot = this.config.gpURL.replace("GPServer/Prioritize", "MapServer/jobs/");
                        this.resMapServ =  (this.resMapServURLRoot + jobInfo.jobId);
						this.gpResLayer = new esri.layers.ArcGISDynamicMapServiceLayer(this.resMapServ);
                        this.gpResLayer.opacity = 0.8;
                        this.map.addLayer(this.gpResLayer);
                        
						// Get result JSON for graphics and linked table
						this.gp.getResultData(jobInfo.jobId, "Result", lang.hitch(this,displayResult));
						this.statusCallbackIterator = 0;

				}
		
				//Display GP Result
				
				function displayResult(result, messages){
					this.itJSON = {title: "SiteID: ${SiteID}",content: "Tier: ${Tier}<br>Seqential Result: ${FinalRank}"};
					this.resInfoTemplate = new esri.InfoTemplate(this.itJSON);
					
					$("#" + this.appDiv.id +"gpStatusReport").html("Drawing results...");
					console.log("Displaying result!");
					this.Tier1Sym = new SimpleMarkerSymbol(this.config.Tier1Sym);
					this.Tier2Sym = new SimpleMarkerSymbol(this.config.Tier2Sym);
					this.Tier3Sym = new SimpleMarkerSymbol(this.config.Tier3Sym);
					this.Tier4Sym = new SimpleMarkerSymbol(this.config.Tier4Sym);
					this.Tier5Sym = new SimpleMarkerSymbol(this.config.Tier5Sym);
					this.Tier6Sym = new SimpleMarkerSymbol(this.config.Tier6Sym);
					this.Tier7Sym = new SimpleMarkerSymbol(this.config.Tier7Sym);
					this.Tier8Sym = new SimpleMarkerSymbol(this.config.Tier8Sym);
					this.Tier9Sym = new SimpleMarkerSymbol(this.config.Tier9Sym);
					this.Tier10Sym = new SimpleMarkerSymbol(this.config.Tier10Sym);
					this.Tier11Sym = new SimpleMarkerSymbol(this.config.Tier11Sym);
					this.Tier12Sym = new SimpleMarkerSymbol(this.config.Tier12Sym);
					this.Tier13Sym = new SimpleMarkerSymbol(this.config.Tier13Sym);
					this.Tier14Sym = new SimpleMarkerSymbol(this.config.Tier14Sym);
					this.Tier15Sym = new SimpleMarkerSymbol(this.config.Tier15Sym);
					this.Tier16Sym = new SimpleMarkerSymbol(this.config.Tier16Sym);
					this.Tier17Sym = new SimpleMarkerSymbol(this.config.Tier17Sym);
					this.Tier18Sym = new SimpleMarkerSymbol(this.config.Tier18Sym);
					this.Tier19Sym = new SimpleMarkerSymbol(this.config.Tier19Sym);
					this.Tier20Sym = new SimpleMarkerSymbol(this.config.Tier20Sym);
					
					var c = [];
					var cStr = "";
					var cStr2 = "";
					this.features = result.value.features;		
					for (var f=0, fl=this.features.length; f<fl; f++) {
						this.feature = this.features[f];
						if (this.feature.attributes.Tier ==1){this.feature.setSymbol(this.Tier1Sym);}
						else if (this.feature.attributes.Tier ==2){this.feature.setSymbol(this.Tier2Sym);}
						else if (this.feature.attributes.Tier ==3){this.feature.setSymbol(this.Tier3Sym);}
						else if (this.feature.attributes.Tier ==4){this.feature.setSymbol(this.Tier4Sym);}
						else if (this.feature.attributes.Tier ==5){this.feature.setSymbol(this.Tier5Sym);}
						else if (this.feature.attributes.Tier ==6){this.feature.setSymbol(this.Tier6Sym);}
						else if (this.feature.attributes.Tier ==7){this.feature.setSymbol(this.Tier7Sym);}
						else if (this.feature.attributes.Tier ==8){this.feature.setSymbol(this.Tier8Sym);}
						else if (this.feature.attributes.Tier ==9){this.feature.setSymbol(this.Tier9Sym);}
						else if (this.feature.attributes.Tier ==10){this.feature.setSymbol(this.Tier10Sym);}
						else if (this.feature.attributes.Tier ==11){this.feature.setSymbol(this.Tier11Sym);}
						else if (this.feature.attributes.Tier ==12){this.feature.setSymbol(this.Tier12Sym);}
						else if (this.feature.attributes.Tier ==13){this.feature.setSymbol(this.Tier13Sym);}
						else if (this.feature.attributes.Tier ==14){this.feature.setSymbol(this.Tier14Sym);}
						else if (this.feature.attributes.Tier ==15){this.feature.setSymbol(this.Tier15Sym);}
						else if (this.feature.attributes.Tier ==16){this.feature.setSymbol(this.Tier16Sym);}
						else if (this.feature.attributes.Tier ==17){this.feature.setSymbol(this.Tier17Sym);}
						else if (this.feature.attributes.Tier ==18){this.feature.setSymbol(this.Tier18Sym);}
						else if (this.feature.attributes.Tier ==19){this.feature.setSymbol(this.Tier19Sym);}
						else {this.feature.setSymbol(this.Tier20Sym);}
						
						this.feature.setInfoTemplate(this.resInfoTemplate);
						this.map.graphics.add(this.feature);
						//this.attributeArray.push({items:this.feature.attributes})

						var row = this.feature.attributes;
						c.push("<tr>");
						c.push("<td>" + row.SiteID + "</td>");
						c.push("<td>" + row.Tier + "</td>");
						c.push("<td>" + row.FinalRank + "</td>");
						for (var iterator=1, wi= this.weightIterator; iterator<wi; iterator++){
							var metric = this.requestObject["Metric_" + iterator];
							for (var attr in this.feature.attributes){			
								if (attr == metric){
									c.push("<td>" + row[metric] + "</td>");
								}
							}
						}
						c.push("</tr>");
                     
					}
					cStr = c.toString();
					cStr2 = cStr.replace(/,/g, "");
					$("#" + this.appDiv.id + "gpResultTable > tbody:last-child").append(cStr2);
					
					//Set up tablesorter           
					require(["jquery", "plugins/barrier-prioritization/js/jquery.tablesorter.combined"],lang.hitch(this,function($) {
        						$("#" + this.appDiv.id + "gpResultTable").tablesorter({
                                widthFixed : true,
                                headerTemplate : '{content} {icon}', // Add icon for various themes
        
                                widgets: [ 'zebra', 'stickyHeaders', 'filter' ], 
                                theme: 'blue',
                                
                                widgetOptions: {
                                    //jQuery selector or object to attach sticky header to
                                    stickyHeaders_attachTo: '.gpResultTableDivContainer',
                                    stickyHeaders_includeCaption: false, // or $('.wrapper')   
                                    filter_placeholder: { search : 'Filter...' },
                                    filter_startsWith  : true,
                                    filter_cssFilter   : 'tablesorter-filter',
                                    filter_ignoreCase  : true,
                            }
						});
									
						
						console.log("tablesort initialized");
						$('#' + this.appDiv.id + 'gpResultTable').trigger("update");
						
						var sorting = [[2,0]]; 
						
						setTimeout(lang.hitch(this,function () {
							$("#" + this.appDiv.id + "gpResultTable").trigger("sorton", [sorting]);
						}, 100));	
					
					
					
					}));
					
					//re-enable Submit button for subsequent analyses
					$('#' + this.appDiv.id +"submitButton").removeClass('submitButtonRunning');
                    $('#' + this.appDiv.id +"submitButton").prop('disabled', false);
					

					//zoom to barrier when row in result table is clicked
					$("#" + this.appDiv.id + "gpResultTable tr").click(lang.hitch(this, function(evt) {
						this.hlSym= new SimpleMarkerSymbol( SimpleMarkerSymbol.STYLE_CIRCLE, 20, new SimpleLineSymbol(
							SimpleLineSymbol.STYLE_SOLID, new Color([255,0,255]), 3 ), new Color([125,125,125,0.15]));
						this.row = evt.currentTarget;
						$('tr').removeClass('selected');
						$(this.row).addClass('selected');
						this.selectedRow = $(this.row);					
						this.td = this.selectedRow.children('td');
						this.siteID = this.td.eq(0).text();
						
						//add attributes to highlight graphic so hover infoTemplate works 
						$.each(this.map.graphics.graphics, (lang.hitch(this, function(i, graphic){
							if (graphic.attributes.SiteID == this.siteID){
								if (this.highlightGraphic){
									this.map.graphics.remove(this.highlightGraphic);
								}
								this.highlightGraphic = new Graphic(graphic.geometry, this.hlSym);
								this.map.graphics.add(this.highlightGraphic);
								this.highlightGraphic.attributes = graphic.attributes;
                                this.highlightGraphic.setInfoTemplate(this.resInfoTemplate);
								//this.highlightGraphic.getDojoShape().moveToBack();
								
								//var zoomLev = this.map.getLevel() +  3;
								//var zoomLev = this.map.getMaxZoom() - 2; 
								var pointGeo = this.highlightGraphic.geometry;
							
								this.map.centerAndZoom(pointGeo, 14);
							}
							
						})));					
					}));
					
					//show results table and check radio button
					$("#" + this.appDiv.id +"gpStatusReport").html("Analysis complete...");
					$('#' + this.appDiv.id + 'leftSide').hide();
					$('#' + this.appDiv.id + 'rightSide').hide();
					$('#' + this.appDiv.id + 'toggleResultsDiv').show();
					$('#' + this.appDiv.id + 'gpResultTableDivContainer').show();
					$('input:radio[name="stateRadio"]').filter('[value="results"]').prop('checked', true);
					$('#' + this.appDiv.id + 'dlCSV').css('display', 'block');
					
					//result graphic tooltip -- all of the "keepInfoWindow logic is to 
					//deal with separate hover popups and click popups
					dojo.connect(this.map.graphics, "onClick", lang.hitch(this, function(evt) { 
					   this.keepInfoWindow = "yes";

					  }));   
					
					dojo.connect(this.map.graphics, "onMouseOver", lang.hitch(this, function(evt) {	
					    this.graphicMouseovers  +=1;
					    if (this.keepInfoWindow == "no"|| this.graphicMouseovers >5){			    
    						this.g = evt.graphic;
    						this.map.infoWindow.setContent(this.g.getContent());
    						this.map.infoWindow.setTitle(this.g.getTitle());
    						this.map.infoWindow.show(evt.screenPoint,this.map.getInfoWindowAnchor(evt.screenPoint));    
    						this.keepInfoWindow="no";
						}
					}));
					
					dojo.connect(this.map.graphics, "onMouseOut", lang.hitch(this, function(evt) {        
					   if (this.keepInfoWindow == "no" || this.graphicMouseovers >5){		       
					       this.map.infoWindow.hide();
					       this.graphicMouseovers =0;
					   }

					}));
					
					

					
					
					//result graphic zoom to table row  
					dojo.connect(this.map.graphics, "onClick", lang.hitch(this, function(evt) {
                       
                        this.resultID2 =  String(evt.graphic.attributes.SiteID);
                        $("#"+ this.appDiv.id + "gpResultTable tr").each(lang.hitch(this, function(i, r){
                            if ($(r).find("td:first").text() === this.resultID2){
                                this.selRowIndex = ($(r).prevAll().length)+2;
                            }
                        }));
                        // console.log(this.resultID2 + " has sel row index= " + this.selRowIndex);
                        
                        this.selRow = $("#"+ this.appDiv.id + "gpResultTable").find('tr')
                            .removeClass('selected')
                            .eq(this.selRowIndex)
                            .addClass('selected');
                        $("#"+ this.appDiv.id + "gpResultTableDivContainer").animate({scrollTop: 0}, 0);                
                        this.scrollToVal = (this.selRow.offset().top - ($("#"+ this.appDiv.id + "gpResultTableDivContainer").height()));
                        // console.log('this.scroll to val = ' + this.scrollToVal);
                        // console.log("selected row offset top = " + this.selRow.offset().top);
                        // console.log("div height = " + $("#"+ this.appDiv.id + "gpResultTableDivContainer").height());                         
                        $("#"+ this.appDiv.id + "gpResultTableDivContainer").animate({scrollTop: this.scrollToVal});
                        
                        //set highlight symbology
                        if (this.highlightGraphic){
                            this.map.graphics.remove(this.highlightGraphic);
                        }
                        this.hlSym= new SimpleMarkerSymbol( SimpleMarkerSymbol.STYLE_CIRCLE, 20, new SimpleLineSymbol(
                        SimpleLineSymbol.STYLE_SOLID, new Color([255,0,255]), 3 ), new Color([125,125,125,0.15]));
                        this.highlightGraphic = new Graphic(evt.graphic.geometry, this.hlSym);
                        this.map.graphics.add(this.highlightGraphic);
                        this.highlightGraphic.attributes = evt.graphic.attributes;
                        this.highlightGraphic.setInfoTemplate(this.resInfoTemplate);
                        
                    }));
                    
					
					this.gpIterator ++;
				}
				
				function scrollIntoView(element, container) {
                    var containerTop = $(container).scrollTop(); 
                    var containerBottom = containerTop + $(container).height(); 
                    var elemTop = element.offsetTop;
                    var elemBottom = elemTop + $(element).height(); 
                    if (elemTop < containerTop) {
                        $(container).scrollTop(elemTop);
                    } else if (elemBottom > containerBottom) {
                        $(container).scrollTop(elemBottom - $(container).height());
                    }
                }
								
				//calculate current metric weights
				function metricWeightCalculator(gpVals){
 					var sumWeights = 0; 
					for (key in gpVals) {
						if (isNaN(gpVals[key])){
							console.log("Warning! Must input integers!");
						}
						sumWeights = sumWeights + parseInt(gpVals[key], 10); 
					}
					return sumWeights;
				}
				
				
				// Print and CSV clicks
				$('#' + this.appDiv.id + 'printReport').on('click',lang.hitch(this,function(e) { 
					alert("Print Report is coming soon. Brace yourself, it's going to be awesome!");
				}));
				$('#' + this.appDiv.id + 'dlCSV').on('click',lang.hitch(this,function(e) { 
				    require(["jquery", "plugins/barrier-prioritization/js/jquery.tabletoCSV"],lang.hitch(this,function($) {
                             $("#" + this.appDiv.id + "gpResultTable").tableToCSV();
                    }));
				}));
				
				this.rendered = true;				
			
			},
			

			// Build tabele rows based on map click or itemsFiltered objects
			updateTable: function (items){
				console.log("Update Table!");
				// Show/hide message that no results were found 
				if (items.length == 0){
					$('#' + this.appDiv.id + 'selectNone').slideDown('fast');
				}else{
					$('#' + this.appDiv.id + 'selectNone').slideUp('fast');
				}
				// Clear table rows
				$('#' + this.appDiv.id + 'myTable tbody tr').remove();
				// Sort items by Display_Name
				function compare(a,b) {
					if (a.Display_Name < b.Display_Name){
						return -1;
					}
					if (a.Display_Name > b.Display_Name){
						return 1;
					}	
					return 0;
				}
				items = items.sort(compare);
				// Add rows
				$.each(items, lang.hitch(this,function(i,v){
					var newRow ="<tr class='tr' id='" + this.appDiv.id + "row-" + i + "'><td>" + v.Display_Name + "</td><td>" + v.TAXON + "</td></tr>" ;
					$('#' + this.appDiv.id + 'myTable tbody').append(newRow);
				}));
				
				// Update table
				require(["jquery", "plugins/barrier-prioritization/js/jquery.tablesorter"],lang.hitch(this,function($) {
					$('#' + this.appDiv.id + 'gpResultTable').trigger("update");					
				}));
				
				console.log($('#' + this.appDiv.id + 'myTable').height());
				$('#' + this.appDiv.id + 'clickTitle').html('Species in Selected Hexagon');
				$('#' + this.appDiv.id + 'spDetailsHeader').html('<img src="plugins/barrier-prioritization/images/leftArrow.png" width="20" alt="left arrow">  Click Rows for Species Details');
				//Resize main container - check which side first
				if (this.mapSide == "map-1_container"){
					this.useCon = this.con1;
					console.log("right side map");
				}else{
					this.useCon = this.con;
					console.log("left side map");
				}
				if ($(this.useCon).width() < 300){
					$( this.useCon ).animate({
						width: "580",
						height: "573px"
					}, 500 , lang.hitch(this,function() {
						$('#' + this.appDiv.id + 'myTable, #' + this.appDiv.id + 'leftSide').css('display', 'block');
						$('#' + this.appDiv.id + 'myTable, #' + this.appDiv.id + 'rightSide').css('display', 'inline-block');
						$('#' + this.appDiv.id + 'bottomDiv').show();
						this.resize();	
					}));
					
				}	
				if (this.config.stateSet == "yes"){
					$("#" + this.appDiv.id + "myTable tr:contains('"+ this.config.speciesRow +"')").css("background-color", "#abcfe1");		
					// check if species details was visible for setState
					if (this.config.detailsVis == "inline-block"){
						console.log(this.config.speciesRow);
						$.each(this.items, lang.hitch(this,function(i,v){
							if (v.Display_Name == this.config.speciesRow){
								this.atRow = this.items[i];
								return false;
							}	
						}));
						this.updateSpeciesDetails();
					}	
					// Update dropdown menu selections from previous session
					$("#" + this.appDiv.id + "ch-TAXON").val(this.config.filter[1].value).trigger("chosen:updated");
					$("#" + this.appDiv.id + "ch-MAX_habavail_up60").val(this.config.filter[2].value).trigger("chosen:updated");
					$("#" + this.appDiv.id + "ch-fut_rpatch_ratio_cls").val(this.config.filter[3].value).trigger("chosen:updated");
					$("#" + this.appDiv.id + "ch-Cons_spp").val(this.config.filter[4].value).trigger("chosen:updated");
					if (this.config.filter[0].value.length > 0){
						$("#" + this.appDiv.id + "ch-Associations").val(this.config.filter[0].value).trigger("chosen:updated");
					}
					this.config.stateSet = "no";
				}
			}, 
			
			
			// Build legend from JSON request
			buildLegend: function(){
				// Refresh Legend div content and height and width
				var hmw = { height: '235px', minWidth: '150px' };
				$('#' + this.appDiv.id + 'myLegendDiv').css(hmw);
				$('#' + this.appDiv.id + 'mySpeciesLegend').html('');
				$.getJSON( this.config.url +  "/legend?f=pjson&callback=?", lang.hitch(this,function( json ) {
					var speciesArray = [];
					//get legend pics
					$.each(json.layers, lang.hitch(this,function(i, v){
						if (v.layerName == this.sppcode){
							speciesArray.push(v);
						}	
					}));
					console.log(json);
					// Set Title
					$('#' + this.appDiv.id + 'mySpeciesLegend').append("<div style='display:inline;text-decoration:underline;font-weight:bold;margin-top:5px;'>" + this.speciesName + "</div><br>");
					// build legend items
					$.each(speciesArray[0].legend, lang.hitch(this,function(i, v){
						$('#' + this.appDiv.id + 'mySpeciesLegend').append("<p style='display:inline;'>" + v.label + "</p><img style='margin-bottom:-5px; margin-left:5px;' src='data:image/png;base64," + v.imageData + "' alt='Legend color'><br>");	
					})) ;
					// Set legend div height and width
					var h = $('#' + this.appDiv.id + 'mySpeciesLegend').height() + 60;
					var w = $('#' + this.appDiv.id + 'mySpeciesLegend').width() + 30;
					var hw = { height: h + 'px', width: w + 'px' };
					$('#' + this.appDiv.id + 'myLegendDiv').css(hw);
				})); 	
			}	
		});
	});						   		   