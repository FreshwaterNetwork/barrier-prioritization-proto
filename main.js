// Pull in your favorite version of jquery 
require({ 
    packages: [{ name: "jquery", location: "http://ajax.googleapis.com/ajax/libs/jquery/2.1.0/", main: "jquery.min" }] 
});
// Bring in dojo and javascript api classes as well as config.json and content.html
define([
    "dojo/_base/declare", "framework/PluginBase", "esri/layers/FeatureLayer", "esri/layers/GraphicsLayer", "esri/layers/ImageParameters", "esri/symbols/SimpleLineSymbol", 
    "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleMarkerSymbol",  "esri/SpatialReference", 
    "esri/tasks/Geoprocessor", "esri/tasks/IdentifyTask", "esri/tasks/IdentifyParameters",  "esri/tasks/query", "esri/tasks/QueryTask", "esri/graphic", "esri/InfoTemplate", "esri/renderers/SimpleRenderer", "dojo/_base/Color",    
    "dijit/layout/ContentPane", "dijit/form/HorizontalSlider","dijit/registry", "dojo/_base/array", "dojo/dom", "dojo/dom-class", "dojo/dom-style", 
    "dojo/dom-construct", "dojo/dom-geometry", "dojo/_base/lang", "dojo/on", "dojo/parser", 
    "plugins/barrier-prioritization/js/ConstrainedMoveable", "dojo/text!./config.json", "dojo/text!./filters.json", "dojo/text!./obj.json", "jquery",
    "dojo/text!./html/legend.html", "dojo/text!./html/content.html", "dijit/TooltipDialog", 
    "dijit/popup",     "dojox/grid/DataGrid", "dojo/data/ItemFileReadStore", "plugins/barrier-prioritization/js/jquery-ui-1.11.0/jquery-ui.js"

],
function ( declare, PluginBase, FeatureLayer, GraphicsLayer, ImageParameters, SimpleLineSymbol, SimpleFillSymbol, SimpleMarkerSymbol, 
            SpatialReference, Geoprocessor,  IdentifyTask, IdentifyParameters, Query, QueryTask, Graphic, InfoTemplate, SimpleRenderer, Color, ContentPane, HorizontalSlider, 
            registry, arrayUtils, dom, domClass, domStyle, domConstruct, domGeom, lang, on, parser,
            ConstrainedMoveable, config, filters, obj, $, legendContent, content, TooltipDialog, popup,   DataGrid,  
            ItemFileReadStore, ui) {
        return declare(PluginBase, {
            toolbarName: "Aquatic Barrier Prioritization", showServiceLayersInLegend: true, allowIdentifyWhenActive: false, rendered: false, resizable: false,
            // First function called when the user clicks the pluging icon. Defines the default JSON and plugin size
            initialize: function (frameworkParameters) {
                declare.safeMixin(this, frameworkParameters);
                domClass.add(this.container, "claro");
                this.con = dom.byId('plugins/barrier-prioritization-0');
                this.con1 = dom.byId('plugins/barrier-prioritization-1');
                if (this.con1 != undefined){
                    domStyle.set(this.con1, "width", "480px");
                    domStyle.set(this.con1, "height", "250px");

                }else{
                    domStyle.set(this.con, "width", "480px");
                    domStyle.set(this.con, "height", "250px");
                }   
                this.config = dojo.eval("[" + config + "]")[0]; 
                this.filters = dojo.eval("[" + filters + "]")[0]; 
                this.obj = dojo.eval("[" + obj + "]")[0]; 

                this.items = [];
                this.itemsFiltered = [];
                this.atRow = [];
                this.gp = new esri.tasks.Geoprocessor(this.config.gpURL);
                this.gp.setUpdateDelay(200); //status check in milliseconds;
                this.uniqueID = this.config.uniqueID;
                
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
                
					//clear all filters
					$('#'+ this.appDiv.id +"resultsFilter").val(''); 
					require(["jquery", "plugins/barrier-prioritization/js/chosen.jquery"],lang.hitch(this,function($) {
					    $('#'+ this.appDiv.id +"filterResultsField").val('option: first').trigger("chosen:updated");
		                $('#'+ this.appDiv.id +"filterResultsOperator").val('option: first').trigger("chosen:updated");
		                $('#'+ this.appDiv.id +"filterResultsValue").val('option: first').trigger("chosen:updated");
					    $('#'+ this.appDiv.id +"filterConsensusResultsField").val('option: first').trigger("chosen:updated");
	                	$('#'+ this.appDiv.id +"filterConsensusResultsOperator").val('option: first').trigger("chosen:updated");
	                	$('#'+ this.appDiv.id +"filterConsensusResultsValue").val('option: first').trigger("chosen:updated");
					}));
			        $( "#" + this.appDiv.id + "gpResultFilterSliderTier" ).slider( "values", 0, 1 );
	            	$( "#" + this.appDiv.id + "gpResultFilterSliderTier" ).slider( "values", 1, 20 );
	            	$( "#" + this.appDiv.id + "gpResultFilterSliderSeverity" ).slider( "values", 0, 1 );
	            	$( "#" + this.appDiv.id + "gpResultFilterSliderSeverity" ).slider( "values", 1, 20 );
					$('#'+ this.appDiv.id +"resultsConsensusFilter").val(''); 
					$( "#" + this.appDiv.id + "consensusResultFilterSliderTier" ).slider( "values", 0, 1 );
		        	$( "#" + this.appDiv.id + "consensusResultFilterSliderTier" ).slider( "values", 1, 20 );
		        	$( "#" + this.appDiv.id + "consensusResultFilterSliderSeverity" ).slider( "values", 0, 1 );
		        	$( "#" + this.appDiv.id + "consensusResultFilterSliderSeverity" ).slider( "values", 1, 20 );
                    if (this.dynamicLayer != undefined)  {
                        this.dynamicLayer.setVisibility(false);
                        this.map.graphics.clear();
                    }
                    if (this.fc != undefined){this.fc.clear();}
                    if (this.map != undefined){this.map.graphics.clear();}       
                    if (this.gpResLayer != undefined){this.gpResLayer.setVisibility(false);}
                    if ("#" + this.appDiv.id + "gpResultTable" != undefined){
                        $("#" + this.appDiv.id + "gpResultTable").empty();
                        $('input:radio[name="stateRadio"]').filter('[value="inputs"]').prop('checked', true);
                    }
                    if ("#" + this.appDiv.id + "gpSumStatsTable" != undefined){$("#" + this.appDiv.id + "gpSumStatsTable").empty();}
                    $("#" + this.appDiv.id + "gpResultTableDivContainer").hide();
                    $("#" + this.appDiv.id + "gpResultMapServiceDivContainer").hide();
                    $("#" + this.appDiv.id + "gpSumStatsTableDivContainer").hide();
                    $('#' + this.appDiv.id + 'toggleResultsDiv').hide();
                    $("#" + this.appDiv.id + "topRadioDiv").hide();
                    $('#' + this.appDiv.id + 'bottomDiv').hide();
                    $('#' + this.appDiv.id + 'allTabContent').hide();
                    $('#' + this.appDiv.id + 'dlCSV').css('display', 'none');   
                    $('#' + this.appDiv.id + 'dlInputs').css('display', 'none'); 
                    lang.hitch(this, this.hideSummStatsInputs());
                    lang.hitch(this, this.hideFilterInputs());
                    lang.hitch(this, this.gotoInputsState());
					lang.hitch(this, this.clearAllInputs());
					
					var ischecked = $('#' + this.appDiv.id + 'toggleLayer').is(':checked');
					if (!ischecked){$('#' + this.appDiv.id + 'toggleLayer').trigger('click');}
					
					this.mapSide = this.appDiv.id.replace("dijit_layout_ContentPane_", ""); 
                    this.activateIdentify = false;                           
                    lang.hitch(this, this.refreshIdentify(this.config.url));
                    


				
                }
            },
            
            // Called after hibernate at app startup. Calls the render function which builds the plugins elements and functions.  
            activate: function () {
                console.log(this.con1);
                // Hide framework default legend
                if (this.con1 == null){this.mapSide=0;}
                else{this.mapSide = 1;}       
               // $('#legend-container-' + this.mapSide).addClass("hideLegend");

                if (this.rendered == false) {                         
                    this.render();
                    this.dynamicLayer.setVisibility(true);
                } 
                else {
                    if (this.dynamicLayer != undefined)  {
                        this.dynamicLayer.setVisibility(true);  
                    }
                    if (this.small == "yes"){
                        this.con = dom.byId('plugins/barrier-prioritization-0');
                        this.con1 = dom.byId('plugins/barrier-prioritization-1');
                        if (this.con1 != undefined){
                            domStyle.set(this.con1, "width", "480px");
                            domStyle.set(this.con1, "height", "260px");
                        }else{
                            domStyle.set(this.con, "width", "480px");
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
			// Write anything to you varObject.json file you have tracked during user activity.		
			getState: function () {
				this.obj.extent = this.map.geographicExtent;

				this.obj.stateSet = "yes";	
	
				//Get the current weights
				$("input[id^=" + this.appDiv.id + "weightIn]").each(lang.hitch(this, function(i, v){
                        var m = v.id.replace(this.appDiv.id + "weightIn-", "");
                        this.obj.startingWeights[m] = parseInt(v.value);                
                 }));
				
				//Get filter
				this.obj.filter = $("#" + this.appDiv.id + "userFilter").val();
				
				
				//Get list of barriers to remove
				this.obj.startingBarriers2Remove = $("#" + this.appDiv.id + 'barriers2Remove').val();
				
				this.obj.startingRemovingBarriers = this.removingBarriers;
				this.obj.startingPassability = $("#" + this.appDiv.id + "passability").val();
				
				this.obj.startingConsensusTierFilterMin =$('#' + this.appDiv.id + 'consensusResultFilterSliderTier').slider("values", 0);
				this.obj.startingConsensusTierFilterMax =$('#' + this.appDiv.id + 'consensusResultFilterSliderTier').slider("values", 1);
				this.obj.startingConsensusSeverityFilterMin =$('#' + this.appDiv.id + 'consensusResultFilterSliderSeverity').slider("values", 0);
				this.obj.startingConsensusSeverityFilterMax =$('#' + this.appDiv.id + 'consensusResultFilterSliderSeverity').slider("values", 1);
				if ($('#' + this.appDiv.id + 'resultsConsensusFilter').val() != ""){
					this.obj.startingUseConsensusCustomFilter = true;
					this.obj.startingConsensusCustomFilter = $('#' + this.appDiv.id + 'resultsConsensusFilter').val();
				}
				
				
				var state = new Object();
				state = this.obj;
				console.log(state);
				return state;	
				
			},
			// Called before activate only when plugin is started from a getState url. 
			//It's overwrites the default JSON definfed in initialize with the saved stae JSON.
			setState: function (state) {
				this.obj = state;
				this.stateSet = this.obj.stateSet;
				
				console.log(this.obj);
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
                window.windowPopup = function(mylink, windowname, size){
                    console.log("window popup");
                if (! window.focus)return true;
                    var href;
                if (typeof(mylink) == 'string')
                   href=mylink;
                else
                   href=mylink.href;
                winPop = window.open(href, windowname, size);
                winPop.moveTo(400, 200);
                return false;
                };

                this.graphicMouseovers = 0;
                this.keepInfoWindow = "no";   
                this.activateIdentify = false;                             
                lang.hitch(this, this.refreshIdentify(this.config.url));
                this.workingRemoveBarriers = [];
                this.workingRemoveBarriersString = "";
                this.barriers2RemoveCount = 0;

                
                // Info icon src
                this.info = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAEZ0FNQQAAsY58+1GTAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAI2SURBVHjarJPfSxRRFMc/rrasPxpWZU2ywTaWSkRYoaeBmoVKBnwoJfIlWB8LekiaP2N76S9o3wPBKAbFEB/mIQJNHEuTdBmjUtq1mz/Xmbk95A6u+lYHzsvnnvO995xzTw3HLJfLDQNZIHPsaArIm6b54iisOZJ4ERhVFCWtaRqqqqIoCgBCCFzXxbZthBCzwIBpmquhwGHyTHd3d9wwDAqlA6a/bFMolQHobI5y41Ijnc1nsCwLx3E2gV7TNFfrDh8wWknOvy9hffoNwNNMgkKxzMu5X7z5KDCuniVrGABxx3FGgd7aXC43rCjKw6GhIV68K/J6QRBISSAl6fP1bO0HzH/bJZCSpY19dsoB9/QeHMdp13W9EAGymqaxUiwzNr+J7wehP59e5+2SqGJj85usFMtomgaQjQAZVVWZXKwO7O9SeHang8fXE1Xc9wMmFwWqqgJkIgCKorC8sYfnB6F/Xt+lIRpBSqq45wcsb+yFE6o0Ed8P8LwgnO+Mu80PcQBQxSuxFYtU5pxsjZ64SUqJlPIET7ZGEUKEAlOu69LXFT9FgFNL6OuK47ouwFQEyNu2TSoRYzDdguf9LUVLNpFqi5Fqi6Elm0I+mG4hlYhh2zZAvnZ8fHxW1/W7Qoj2B7d7Ebsec+4WzY11TCyUmFgosXcQ8LW0z/1rCZ7c7MCyLNbW1mZN03xUaeKA4zgzQHzEMOjvaeHVh58sft8B4Ep7AyO3LnD5XP3Rrzzw/5bpX9b5zwBaRXthcSp6rQAAAABJRU5ErkJggg==";   
                
                // Define Content Pane      
                this.appDiv = new ContentPane({});
                parser.parse();
                dom.byId(this.container).appendChild(this.appDiv.domNode);                  
                // Get html from content.html, prepend appDiv.id to html element id's, and add to appDiv
                var idUpdate = content.replace(/id='/g, "id='" + this.appDiv.id);   
                $('#' + this.appDiv.id).html(idUpdate);

				//if consuming with table results include the results option on the radio buttons
				if (this.config.tableResults == true){
					$('#' + this.appDiv.id + 'tableResultsRadio').css("display", "inline-block");
					$('#' + this.appDiv.id + 'mapServiceResultsRadio').css("display", "none");
				}
                if (this.config.tableResults == false){
					$('#' + this.appDiv.id + 'tableResultsRadio').css("display", "none");
					$('#' + this.appDiv.id + 'mapServiceResultsRadio').css("display", "inline-block");
				}
				
                //show passability options if config file says to
                if (this.config.includePassabilityOption == true){
                	$('#' + this.appDiv.id + 'passabilityDiv').show();
                }
                
                //show input divs if "run a custom analysis tab is selected             
                $('#' + this.appDiv.id + 'tabB' ).on('click',lang.hitch(this,function(){
	                    console.log("tab clicked");
	                    $("#" + this.appDiv.id + "allTabContent").show();
						                 
	                    	selectedVal= $('input[name=stateRadio]:checked', '#' + this.appDiv.id + 'stateRadioForm').val();
	                    
		                    if (selectedVal==="results"){
		                        lang.hitch(this, this.gotoResultsState());
		                    }
		                    if (selectedVal==="mapServiceResults"){
		                        lang.hitch(this, this.gotoMapServResultsState());
		                    }
		                    if (selectedVal==="inputs"){
		                        lang.hitch(this, this.gotoInputsState());      
		                    }
		                    if (selectedVal==="stats"){
		                        lang.hitch(this, this.gotoStatsState());                           
		                    }
		                    
	                	})); 

	                    
                //apply Tier slider filter to Consensus results                
                $('#' + this.appDiv.id + 'consensusResultFilterSliderTier').slider({
                	min: 1,	
                	max: 20, 
                	values: [this.obj.startingConsensusTierFilterMin, this.obj.startingConsensusTierFilterMax],
                	range: true,
                	change:lang.hitch(this, function(event, ui) {
				        if (event.originalEvent) {
				        	console.log(event);
				            //manual change - only apply filter if it's a manual change, else it's a programmatic reset
				            lang.hitch(this, this.clearConsensusFilterMapService());
				            lang.hitch(this, this.filterConsensusMapServiceSlider());
				            
				        }
			        	else{
			        		console.log("programmatic change");
			        	}			        
    				})
				}).each(lang.hitch(this, function(){
				  // Get the options for this slider
				  this.consensusResultFilterSliderTierOpt = $('#' + this.appDiv.id + 'consensusResultFilterSliderTier').data().uiSlider.options;  
				  // Get the number of possible values
				  this.consensusResultFilterSliderTierVals = this.consensusResultFilterSliderTierOpt.max - this.consensusResultFilterSliderTierOpt.min;		  
				  // Space out values
				  for (var i = 0; i <= this.consensusResultFilterSliderTierVals; i++) {	    
				    var el = $('<label>'+(this.consensusResultFilterSliderTierOpt.max-i)+'</label>').css('left',(i/this.consensusResultFilterSliderTierVals*100)+'%');		  
				    $('#' + this.appDiv.id + 'consensusResultFilterSliderTier').append(el);	
				    $('<span class="ui-slider-tick-mark"></span>').css('left', (i/this.consensusResultFilterSliderTierVals*100)+'%').appendTo($('#' + this.appDiv.id + 'consensusResultFilterSliderTier')); 			    
				  }
				})); 
	
            
            	if (this.config.includeSeverityFilter == true){
	                //apply Severity slider filter to Consensus results                
	                $('#' + this.appDiv.id + 'consensusResultFilterSliderSeverity').slider({
	                	min: 1,	
	                	max: 5, 
	                	values: [this.obj.startingConsensusSeverityFilterMin, this.obj.startingConsensusSeverityFilterMax],
	                	range: true,
	                	change:lang.hitch(this, function(event, ui) {
				        if (event.originalEvent) {
				            //manual change - only apply filter if it's a manual change, else it's a programmatic reset
				            lang.hitch(this, this.clearConsensusFilterMapService());
				            lang.hitch(this, this.filterConsensusMapServiceSlider());
				        }
			        	else{
			        		console.log("programmatic change");
			        	}				        
					})
					}).each(lang.hitch(this, function(){
					  this.consensusResultFilterSliderSeverityOpt = $('#' + this.appDiv.id + 'consensusResultFilterSliderSeverity').data().uiSlider.options;  
					  this.consensusResultFilterSliderSeverityVals = this.consensusResultFilterSliderSeverityOpt.max - this.consensusResultFilterSliderSeverityOpt.min;		  
					  this.severityDict = {5:"Severe", 4:"Significant", 3:"Moderate", 2:"Minor", 1:"Insignificant"};
					  for (var i = 0; i <= this.consensusResultFilterSliderSeverityVals; i++) {	    
					    var el = $('<label>'+this.severityDict[(i+1)]+'</label>').css('left',(i/this.consensusResultFilterSliderSeverityVals*100)+'%');		  
					    $('#' + this.appDiv.id + 'consensusResultFilterSliderSeverity').append(el);	
					    $('<span class="ui-slider-tick-mark"></span>').css('left', (i/this.consensusResultFilterSliderSeverityVals*100)+'%').appendTo($('#' + this.appDiv.id + 'consensusResultFilterSliderSeverity')); 			    
					  }
					})); 
  
            
            
	                //apply Severity slider filter to GP results                
	                $('#' + this.appDiv.id + 'gpResultFilterSliderSeverity').slider({
	                	min: 1,	
	                	max: 5, 
	                	values: [this.obj.startingConsensusSeverityFilterMin, this.obj.startingConsensusSeverityFilterMax],
	                	range: true,
	                	change:lang.hitch(this, function(event, ui) {
					        if (event.originalEvent) {
					            //manual change - only apply filter if it's a manual change, else it's a programmatic reset
					            // lang.hitch(this, this.clearFilterMapService());
					            lang.hitch(this, this.filterResultMapServiceSlider());
					        }
				        	else{
				        		console.log("programmatic change");
				        	}
	    				})                	
					}).each(lang.hitch(this, function(){
					  this.gpResultFilterSliderSeverityOpt = $('#' + this.appDiv.id + 'gpResultFilterSliderSeverity').data().uiSlider.options;  
					  this.gpResultFilterSliderSeverityVals = this.gpResultFilterSliderSeverityOpt.max - this.gpResultFilterSliderSeverityOpt.min;		  
					  this.severityDict = {5:"Severe", 4:"Significant", 3:"Moderate", 2:"Minor", 1:"Insignificant"};
					  for (var i = 0; i <= this.gpResultFilterSliderSeverityVals; i++) {	    
					    var el = $('<label>'+this.severityDict[(i+1)]+'</label>').css('left',(i/this.gpResultFilterSliderSeverityVals*100)+'%');		  
					    $('#' + this.appDiv.id + 'gpResultFilterSliderSeverity').append(el);	
					    $('<span class="ui-slider-tick-mark"></span>').css('left', (i/this.gpResultFilterSliderSeverityVals*100)+'%').appendTo($('#' + this.appDiv.id + 'gpResultFilterSliderSeverity')); 			    
					  }
					})); 


            
            	}
                
                //apply Tier slider filter to GP results                
                $('#' + this.appDiv.id + 'gpResultFilterSliderTier').slider({
                	min: 1,	
                	max: 20, 
                	values: [1, 20],
                	range: true,
                	change:lang.hitch(this, function(event, ui) {
				        if (event.originalEvent) {
				            //manual change - only apply filter if it's a manual change, else it's a programmatic reset
				            // lang.hitch(this, this.clearFilterMapService());
				            lang.hitch(this, this.filterResultMapServiceSlider());
				            
				        }
				        else{
				        	console.log("programmatic change");
				        }
    				})         
				}).each(lang.hitch(this, function(){
				  this.gpResultFilterSliderTierOpt = $('#' + this.appDiv.id + 'gpResultFilterSliderTier').data().uiSlider.options;  
				  this.gpResultFilterSliderTierVals = this.gpResultFilterSliderTierOpt.max - this.gpResultFilterSliderTierOpt.min;		  
				  for (var i = 0; i <= this.gpResultFilterSliderTierVals; i++) {	    
				    var el = $('<label>'+(this.gpResultFilterSliderTierOpt.max-i)+'</label>').css('left',(i/this.gpResultFilterSliderTierVals*100)+'%');		  
				    $('#' + this.appDiv.id + 'gpResultFilterSliderTier').append(el);	
				    $('<span class="ui-slider-tick-mark"></span>').css('left', (i/this.gpResultFilterSliderTierVals*100)+'%').appendTo($('#' + this.appDiv.id + 'gpResultFilterSliderTier')); 			    
				  }
				})); 



//************		

                	//Consensus Results custom filter builder
                	this.consensusResultFilterField = "";
	                this.consensusResultFilterOperator ="";
	                this.consensusResultFilterValue = "";       
	                this.consensusResultFilterFieldList = "";
	                for (var i=0; i< this.filters.resultFilters.resultFilterFields.length; i++){
	                    this.consensusResultFilterFieldList += "<option value='" + this.filters.resultFilters.resultFilterFields[i].resultGISName + "'>" + this.filters.resultFilters.resultFilterFields[i].resultPrettyName + "</option>";
						console.log(this.consensusResultFilterFieldList);
					}
	                $("#" + this.appDiv.id + "filterConsensusResultsField").html(this.consensusResultFilterFieldList);
	      
	                this.updateConsensusResultValues = (lang.hitch(this,function (field){    
	                    this.fieldValsList = "";
	                    for (var i=0; i < this.filters.resultFilters.resultValuesTable[field].length; i++){
	                        this.fieldValsList += "<option value='" + this.filters.resultFilters.resultValuesTable[field][i].resultValue + "'>" + this.filters.resultFilters.resultValuesTable[field][i].resultValue + "</option>";
	                    }
	                    $("#" + this.appDiv.id + "filterConsensusResultsValue").html(this.fieldValsList);
	                    require(["jquery", "plugins/barrier-prioritization/js/chosen.jquery"],lang.hitch(this,function($) {
	                        $(".chosen-select7").val('').trigger("chosen:updated");
	                        this.consensusResultFilterValue = $("#" + this.appDiv.id + "filterConsensusResultsValue").val();
	                        
	                        //set operator to = as a default
	                        if (this.consensusResultFilterOperator == ""){
	                            $('#'+ this.appDiv.id +"filterConsensusResultsOperator").val($('#'+ this.appDiv.id +"filterConsensusResultsOperator option:eq(1)").val());
	                            $(".chosen-select6").trigger("chosen:updated");
	                            this.consensusResultFilterOperator = $("#" + this.appDiv.id + "filterConsensusResultsOperator").val();
	                        }
	                        $("#" + this.appDiv.id + "resultsConsensusFilter").val( this.consensusResultFilterField + ' ' + this.consensusResultFilterOperator + " (" + this.consensusResultFilterValue + ")");
	                    })); 
	                }));
	                
	                $("#" + this.appDiv.id + "filterConsensusResultsField").on('change',lang.hitch(this,function(e){
	                    console.log("filter change");
	                    this.consensusSelectedField = $("#" + this.appDiv.id + "filterConsensusResultsField option:selected").text();
	                    this.updateConsensusResultValues(this.consensusSelectedField);
						this.consensusResultFilterField = $("#" + this.appDiv.id + "filterConsensusResultsField").val();
	                    $("#" + this.appDiv.id + "resultsConsensusFilter").val( this.consensusResultFilterField + ' ' + this.consensusResultFilterOperator + " (" + this.consensusResultFilterValue + ")");
	                }));
					require(["jquery", "plugins/barrier-prioritization/js/chosen.jquery"],lang.hitch(this,function($) {
						$(".chosen-select5").val('').trigger("chosen:updated");
					}));
					
	                $("#" + this.appDiv.id + "filterConsensusResultsOperator").on('change',lang.hitch(this,function(e){
	                    console.log("filter change");
	                    this.consensusuResultFilterOperator = $("#" + this.appDiv.id + "filterConsensusResultsOperator").val();
	                    $("#" + this.appDiv.id + "resultsConsensusFilter").val(this.resultFilterField + ' ' + this.resultFilterOperator + " (" + this.consensusResultFilterValue + ")");
	                }));
	                $("#" + this.appDiv.id + "filterConsensusResultsValue").on('change',lang.hitch(this,function(e){
	                    console.log("filter change");
	                    this.consensusResultFilterValue = $("#" + this.appDiv.id + "filterConsensusResultsValue").val();
	                    $("#" + this.appDiv.id + "resultsConsensusFilter").val(this.consensusResultFilterField + ' ' + this.consensusResultFilterOperator + " (" + this.consensusResultFilterValue + ")");
	                }));                                      	
        		                    
                    //applyFilter to Consensus results
                    $('#' + this.appDiv.id +"applyResultConsensusFilterButton").on('click',lang.hitch(this,function(e){
                    	//lang.hitch(this, this.resetSlider($( "#" + this.appDiv.id + "consensusResultFilterSliderTier" )));
                    	$( "#" + this.appDiv.id + "consensusResultFilterSliderTier" ).slider( "values", 0, 1 );
                    	$( "#" + this.appDiv.id + "consensusResultFilterSliderTier" ).slider( "values", 1, 20 );
                    	$( "#" + this.appDiv.id + "consensusResultFilterSliderSeverity" ).slider( "values", 0, 1 );
                    	$( "#" + this.appDiv.id + "consensusResultFilterSliderSeverity" ).slider( "values", 1, 20 );
                    	this.consensusCustomFilter = $("#" + this.appDiv.id + "resultsConsensusFilter").val();
                    	console.log(this.consensusCustomFilter);
                    	this.map.removeLayer(this.dynamicLayer);
                    	this.dynamicLayer = this.filterMapService(this.consensusCustomFilter, this.dynamicLayer, this.config.url); 
						console.log("back from function");
						console.log(this.dynamicLayer);
    					this.dynamicLayer.setVisibleLayers(this.config.visibleLayers);
					
						setTimeout(lang.hitch(this, function(){
						    this.map.addLayer(this.dynamicLayer);
						},500));		
						lang.hitch(this, this.refreshIdentify(this.config.url, this.consensusCustomFilter));	                 
                    }));
                    
                    
                    //clear filter from consensus results
                    $('#' + this.appDiv.id +'clearResultConsensusFilterButton').on('click',lang.hitch(this,function(e){
                    	lang.hitch(this,this.clearConsensusFilterMapService());               
                    }));


//**************


                //set listeners to change state between inputs and result table
                $('#' + this.appDiv.id + 'stateRadioForm').on('change',lang.hitch(this, function(){                    
                    selectedVal= $('input[name=stateRadio]:checked', '#' + this.appDiv.id + 'stateRadioForm').val();
                    
                    if (selectedVal==="results"){
                        lang.hitch(this, this.gotoResultsState());
                    }
                    if (selectedVal==="mapServiceResults"){
                        lang.hitch(this, this.gotoMapServResultsState());
                    }
                    if (selectedVal==="inputs"){
                        lang.hitch(this, this.gotoInputsState());      
                    }
                    if (selectedVal==="stats"){
                        lang.hitch(this, this.gotoStatsState());                           
                    }
                    
                }));                
            

                // Custom legend
                // Get the parent element of the map for placement
                var a = $('#' + $(this.map).attr('id')).parent();
                // Use legend.html to build the elements in the ContentPane - update the ids with this.appDiv
                var legHTML = legendContent.replace(/id='/g, "id='" + this.appDiv.id);
                this.legendWin = new ContentPane({ id: this.appDiv.id + "myLegendDiv", innerHTML: legHTML   });
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

                // Enable jquery plugin 'chosen'
                require(["jquery", "plugins/barrier-prioritization/js/chosen.jquery"],lang.hitch(this,function($) {
                    var config = { '.chosen-select' : {
                        allow_single_deselect:true, 
                        width:"170px", 
                        disable_search:true}
                    };
                    var config1 = { '.chosen-select1' : {
                        allow_single_deselect:true, 
                        width:"160px", 
                        disable_search:true}
                    };
                    var config2 = { '.chosen-select2' : {
                        allow_single_deselect:false, 
                        width:"110px", 
                        disable_search:false,
                        multiple:true}
                    };
                    var config3 = { '.chosen-select3' : {
                        allow_single_deselect:true, 
                        width:"70px", 
                        disable_search:true}
                    };
                    
                    var config4 = { '.chosen-select4' : {
                        allow_single_deselect:false, 
                        width:"225px", 
                        disable_search:true, 
                        visible: false}
                    };
                    
                    var config5 = { '.chosen-select5' : {
                        allow_single_deselect:true, 
                        width:"150px", 
                        disable_search:true}
                    };
                    
                    var config6 = { '.chosen-select6' : {
                        allow_single_deselect:true, 
                        width:"70px", 
                        disable_search:true}
                    };
                    
                    var config7 = { '.chosen-select7' : {
                        allow_single_deselect:true, 
                        width:"90px", 
                        disable_search:true,
                        multiple: true}
                    };
                    
                    for (var selector in config) { $(selector).chosen(config[selector]); }
                    for (var selector in config1) { $(selector).chosen(config1[selector]); }
                    for (var selector in config2) { $(selector).chosen(config2[selector]); }
                    for (var selector in config3) { $(selector).chosen(config3[selector]); }
                    for (var selector in config4) { $(selector).chosen(config4[selector]); }
                    for (var selector in config5) { $(selector).chosen(config5[selector]); }
                    for (var selector in config6) { $(selector).chosen(config6[selector]); }
                    for (var selector in config7) { $(selector).chosen(config7[selector]); }                    
                    $("#" + this.appDiv.id + "summarizeBy_chosen").hide();
                    $("#" + this.appDiv.id + "summaryStatField_chosen").hide(); 
                    $("#" + this.appDiv.id + "filterBuildField_chosen").hide();
                    $("#" + this.appDiv.id + "filterBuildOperator_chosen").hide();
                    $("#" + this.appDiv.id + "filterBuildValue_chosen").hide();
                    $("#" + this.appDiv.id + "filterResultsField_chosen").hide();
                    $("#" + this.appDiv.id + "filterResultsOperator_chosen").hide();
                    $("#" + this.appDiv.id + "filterResultsValue_chosen").hide();               
           
                }));    

                
                //GP Analysis iterator
                this.gpIterator = 1;
                
                //Get started button and open tool UI
                $('#' + this.appDiv.id +"start").on('click',lang.hitch(this,function(evt){              
                    this.mapSide = evt.currentTarget.id;
                    $("#" + this.appDiv.id + "allTabContent").show();
                    lang.hitch(this, this.openInputs(this.mapSide));
                     if (this.config.includeExploreConsensus == false){
	                     $("#" + this.appDiv.id + "contentTabLinkExploreConsensus").addClass("");
	                     $("#" + this.appDiv.id + "contentTabLinkExploreConsensus").hide();
	                     $("#" + this.appDiv.id + "exploreConsensusDiv").hide();
	                     $("#" + this.appDiv.id + "contentTabLinkCustomAnalysis").addClass("active");
	                     $('#'+ this.appDiv.id +"tabB").trigger('click');
                     }
                     if (this.config.includeSeverityFilter == false){
                     	$("#" + this.appDiv.id + "gpResultFilterSliderSeverityDiv".hide());           	
                     }
                     if (this.stateSet== "yes"){

                     	if (this.obj.startingUseConsensusCustomFilter == true){
                     		$('#' + this.appDiv.id + 'resultsConsensusFilter').val(this.obj.startingConsensusCustomFilter);
                     		$('#' + this.appDiv.id + 'applyResultConsensusFilterButton').trigger('click');
                     		console.log("applying custom filter");
                     	}
                     	else{
                     		lang.hitch(this, this.filterConsensusMapServiceSlider());
                     		console.log("applying filter sliders");
                     	}
                     	
                     	if ($('#' + this.appDiv.id + 'removeBarriers').is(':checked')){
                     		lang.hitch(this, this.addSavedBarriersToRemove());
                     	}

                     }
                }));

                
                //toggle dynamic layer 
                $('#' + this.appDiv.id + 'toggleLayer').on('change', lang.hitch(this, function(evt){             
                        var ischecked = $('#' + this.appDiv.id + 'toggleLayer').is(':checked');
                        resIsChecked = $('#' + this.appDiv.id + 'toggleResults').is(':checked');
                        if (ischecked) {
                            this.dynamicLayer.setVisibleLayers(this.config.visibleLayers);
                            this.activateIdentify = true;                   
                            lang.hitch(this, this.refreshIdentify(this.config.url)); 
                            lang.hitch(this, this.filterConsensusMapServiceSlider);  
                            lang.hitch(this, this.filterResultMapServiceSlider);       
                        }
                        if (!ischecked && !resIsChecked){
                        	this.dynamicLayer.setVisibleLayers([-1]);
                            this.activateIdentify = false;
                            lang.hitch(this, this.refreshIdentify(this.config.url));
                            lang.hitch(this, this.filterConsensusMapServiceSlider);  
                            lang.hitch(this, this.filterResultMapServiceSlider);     
                            this.dynamicLayer.setVisibleLayers([-1]);
                        }                 
                        if (!ischecked && resIsChecked){
                        	
                            this.activateIdentify = true;
                            lang.hitch(this, this.refreshIdentify(this.resMapServ));
                            lang.hitch(this, this.filterConsensusMapServiceSlider);  
                            lang.hitch(this, this.filterResultMapServiceSlider); 
                            this.dynamicLayer.setVisibleLayers([-1]);    
                        }        
                }));                
                
                //toggle results graphics
                $('#' + this.appDiv.id + 'toggleResults').on('change', lang.hitch(this, function(evt){             
                        var ischecked = $('#' + this.appDiv.id + 'toggleResults').is(':checked');
                        if (ischecked) {
                            this.map.graphics.show(); 
                            this.gpResLayer.setVisibility(true);

                            this.activateIdentify = true;
                            lang.hitch(this, this.refreshIdentify(this.resMapServ));
                        }
                        if (!ischecked){
                            this.map.graphics.hide();
                            this.gpResLayer.setVisibility(false);

                            this.identifyRes = new IdentifyTask(this.config.url);
                        }                        
                })); 
                
                //hide filter input if not checked
                $('#' + this.appDiv.id + 'filterBarriers').on('change', lang.hitch(this, function(evt){     
                        var ischecked = $('#' + this.appDiv.id +"filterBarriers").is(':checked');
                        if (ischecked) {lang.hitch(this, this.showFilterInputs());}
                        if (!ischecked){lang.hitch(this, this.hideFilterInputs());}                                            
                }));                
                
                //hide remove summary stats if not checked  
                $('#' + this.appDiv.id + 'runSumStats').on('change', lang.hitch(this, function(evt){    
                        var ischecked = $('#' + this.appDiv.id +"runSumStats").is(':checked');
                        if (ischecked) {
                            lang.hitch(this, this.showSummStatsInputs());
                        }
                        if (!ischecked){
                            lang.hitch(this, this.hideSummStatsInputs());
                        }   
                }));    
                
                //hide remove barriers inputs if not checked    
                $('#' + this.appDiv.id + 'removeBarriers').on('change', lang.hitch(this, function(evt){    
                        var ischecked = $('#' + this.appDiv.id +"removeBarriers").is(':checked');
                        if (ischecked) {
                              $("#" + this.appDiv.id + "barriers2Remove").show();
                             //if (this.removingBarriers == false){
                              	this.removingBarriers = true;
                                this.activateIdentify = false;
                                lang.hitch(this, this.refreshIdentify(this.config.url)); 
                                lang.hitch(this, this.selectRemovalBarriers());
                              //}
                            }
                        if (!ischecked){
                        	$("#" + this.appDiv.id + "barriers2Remove").hide();
                        	this.activateIdentify = true;
                        	lang.hitch(this, this.refreshIdentify(this.config.url));
                        	this.map.removeLayer(this.removeFeatureLayer);
              				this.map.removeLayer(this.selectedBarriers);
              				this.removingBarriers = false;
                        }    
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
                    if (isNaN(parseFloat(e.currentTarget.value)) == true){e.currentTarget.value = 0;}
                    this.gpVals = {};
                    this.weights = $("input[id^=" + this.appDiv.id + "weightIn]").each(lang.hitch(this, function(i, v){
                        if (isNaN(parseFloat(v.value)) == true){v.id = 0;} 
                        if (v.value ==""){v.id = 0;}
                        else{this.gpVals[v.id] = v.value;}      
                        this.gpVals[v.id] = v.value;
                        if (parseFloat(v.value) > 0){$('#' + v.id).addClass('weighted');}
                        else{$('#' + v.id).removeClass('weighted');}                                
                    }));
                    this.sumWeights = this.metricWeightCalculator(this.gpVals);
                    
                    $('#'+ this.appDiv.id + "currWeight").text(this.sumWeights);
                    if (this.sumWeights !=100){
                        
                        $('#'+ this.appDiv.id +"currWeight").css('color', 'red');
                    }
                    if (this.sumWeights ==100){
                        $('#'+ this.appDiv.id +"currWeight").css('color', 'green');
                    } 
                }));

                //FILTER BUILDER listener to fill in filter as drop downs are used
                this.filterField = "";
                this.filterOperator ="";
                this.filterValue = "";       
                this.filterFieldList = "";
                for (var i=0; i< this.filters.inputFilters.metricNamesTable.length; i++){
                    this.filterFieldList += "<option value='" + this.filters.inputFilters.metricNamesTable[i].metricGISName + "'>" + this.filters.inputFilters.metricNamesTable[i].metricPrettyName + "</option>";
				}
				
                $("#" + this.appDiv.id + "filterBuildField").html(this.filterFieldList);
                
                this.updateMetricValues = (lang.hitch(this,function (metric){    
                    this.metricValsList = "";
                    for (var i=0; i < this.filters.inputFilters.metricValuesTable[metric].length; i++){
                        this.metricValsList += "<option value='" + this.filters.inputFilters.metricValuesTable[metric][i].metricValue + "'>" + this.filters.inputFilters.metricValuesTable[metric][i].metricValue + "</option>";
                    }
                    $("#" + this.appDiv.id + "filterBuildValue").html(this.metricValsList);
                    

                    require(["jquery", "plugins/barrier-prioritization/js/chosen.jquery"],lang.hitch(this,function($) {
                        $(".chosen-select2").val('').trigger("chosen:updated");
                        this.filterValue = $("#" + this.appDiv.id + "filterBuildValue").val();
                        
                        //set operator to = as a default
                        if (this.filterOperator == ""){
                            //$("#" + this.appDiv.id + "filterBuildOperator").val("=");
                            $('#'+ this.appDiv.id +"filterBuildOperator").val($('#'+ this.appDiv.id +"filterBuildOperator option:eq(1)").val());
                            $(".chosen-select3").trigger("chosen:updated");
                            this.filterOperator = $("#" + this.appDiv.id + "filterBuildOperator").val();
                        }
                        $("#" + this.appDiv.id + "userFilter").val('"' + this.filterField + '" ' + this.filterOperator + " (" + this.filterValue + ")");
                    })); 
                    
                }));
                

                $("#" + this.appDiv.id + "filterBuildField").on('change',lang.hitch(this,function(e){
                    console.log("filter change");
                    this.selectedMetric = $("#" + this.appDiv.id + "filterBuildField option:selected").text();
                    this.updateMetricValues(this.selectedMetric);
					this.filterField = $("#" + this.appDiv.id + "filterBuildField").val();
                    $("#" + this.appDiv.id + "userFilter").val('"' + this.filterField + '" ' + this.filterOperator + " (" + this.filterValue + ")");
                }));
				require(["jquery", "plugins/barrier-prioritization/js/chosen.jquery"],lang.hitch(this,function($) {
					$(".chosen-select1").val('').trigger("chosen:updated");
				}));
				
                $("#" + this.appDiv.id + "filterBuildOperator").on('change',lang.hitch(this,function(e){
                    console.log("filter change");
                    this.filterOperator = $("#" + this.appDiv.id + "filterBuildOperator").val();
                    $("#" + this.appDiv.id + "userFilter").val('"' + this.filterField + '" ' + this.filterOperator + " (" + this.filterValue + ")");
                }));
                $("#" + this.appDiv.id + "filterBuildValue").on('change',lang.hitch(this,function(e){
                    console.log("filter change");
                    this.filterValue = $("#" + this.appDiv.id + "filterBuildValue").val();
                    $("#" + this.appDiv.id + "userFilter").val('"' + this.filterField + '" ' + this.filterOperator + " (" + this.filterValue + ")");
                }));                               


				//apply starting weights
                lang.hitch(this, this.applyWeights(this.obj.startingWeights));
                
               	//apply starting passability
				if (this.obj.startingPassability != ""){
					$("#" + this.appDiv.id + "passability").val(this.obj.startingPassability);
				}
               
				//apply starting filter
				if (this.obj.startingFilter != ""){
					$("#" + this.appDiv.id + 'filterBarriers').prop('checked', true);
					lang.hitch(this, this.showFilterInputs());
					$("#" + this.appDiv.id + "userFilter").val(this.obj.startingFilter);
				}
				
				//apply starting barriers to remove
				if (this.obj.startingBarriers2Remove != ""){
					this.removingBarriers = true;
					$("#" + this.appDiv.id + 'removeBarriers').prop('checked', true);
					$("#" + this.appDiv.id + 'barriers2Remove').show();
					$("#" + this.appDiv.id + 'barriers2Remove').val(this.obj.startingBarriers2Remove);
				}
			
				//apply starting summary stats inputs
				if (this.obj.startingSummarizeBy != "" ||this.obj.startingSummaryStatField != ""){
					$("#" + this.appDiv.id + 'runSumStats').prop('checked', true);
					lang.hitch(this, this.showSummStatsInputs());
				}
							
                //apply consensus weights
                $('#' + this.appDiv.id +"applyDefaultDiadromous").on('click',lang.hitch(this,function(e){   
                	lang.hitch(this, this.applyWeights(this.config.diadromous));
                }));
                
                $('#' + this.appDiv.id +"applyDefaultResident").on('click',lang.hitch(this,function(e){ 
                    lang.hitch(this, this.applyWeights(this.config.resident));
                }));
                
                //clear all metric weights, filters, barriers to remove, uncheck all options
                $('#' + this.appDiv.id +"applyZeroWeight").on('click',lang.hitch(this,function(e){ 
                	lang.hitch(this, this.clearAllInputs());
                }));
                

                //prepare and pass the GP request object to gpURL
                $('#' + this.appDiv.id +"submitButton").on('click',lang.hitch(this,function(e){
                    $('#' + this.appDiv.id + 'dlCSV').css('display', 'none');
                    this.gpVals = {};
                    this.weights = $("input[id^=" + this.appDiv.id + "weightIn]").each(lang.hitch(this, function(i, v){
                        this.gpVals[v.id] = v.value;                
                    }));
                    this.sumWeights = this.metricWeightCalculator(this.gpVals);
                    //console.log(this.gpVals);
                    this.sumWeights = this.metricWeightCalculator(this.gpVals);
                    if (this.sumWeights != 100){
                        alert("Metric weights must sum to 100");
                    }
                    else{
                        //clear old map graphics and results table
                        this.map.graphics.clear();
                        if (this.selectedBarriers != undefined){this.map.removeLayer(this.selectedBarriers);}
                        if (this.removeFeatureLayer != undefined){this.map.removeLayer(this.removeFeatureLayer);}
                        this.tableHTML = "";
                        if (this.gpResLayer != undefined){
                            this.map.removeLayer(this.gpResLayer);
                        }
                        // $("#" + this.appDiv.id + "gpResultTable > tbody").html(''); 
                        // $("#" + this.appDiv.id + "gpResultTable > thead").html('<tr></tr>');
                        this.tableHTML = "<thead> <tr></tr></thead><tbody ></tbody>";
                        this.sumStatsTableHTML = "<thead> <tr></tr></thead><tbody ></tbody>";
                        if (this.gpIterator >1){                                            
                            require(["jquery", "plugins/barrier-prioritization/js/jquery.tablesorter.combined.js"],lang.hitch(this,function($) {
                             $("#" + this.appDiv.id + "gpResultTable").trigger("destroy");
                            }));
                        }
                        if ("#" + this.appDiv.id + "gpSumStatsTable"){
                            require(["jquery", "plugins/barrier-prioritization/js/jquery.tablesorter.combined.js"],lang.hitch(this,function($) {
                                $("#" + this.appDiv.id + "gpSumStatsTable").trigger("destroy");
                            }));
                            
                        }
                        $("#" + this.appDiv.id + "gpSumStatsTable").html(this.sumStatsTableHTML);
                        $("#" + this.appDiv.id + "gpResultTable").html(this.tableHTML);                     
                        //console.log($("#" + this.appDiv.id + "gpResultTable"));
                        
                        this.requestObject = {};                
                        if($("#" + this.appDiv.id + "filterBarriers").is(':checked')){this.filterBarr = true;}
                        else{this.filterBarr = false;}
					
						//if passability option is an input get it
						if (this.config.includePassabilityOption == true){
							this.passability = $("#" + this.appDiv.id + "passability").val();
						}

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
                        
                        this.requestObject["Passability"] = this.passability;
                        this.requestObject["Take_Average_Value"] = false;
                        this.requestObject["FilterBarriers"] = this.filterBarr;
                        this.requestObject["UserFilter"] = this.filter;
                        this.requestObject["ModelRemoval"] = this.removeBarr;
                        this.requestObject["Barriers_for_Modeled_Removal"] = this.removeIDs;
                        this.requestObject["Run_Watershed_Summary_Stats"] = this.runSumStats;
                        this.requestObject["Summarize_By"] = this.summarizeBy;
                        this.requestObject["Summary_Stat_Field"] = this.sumStatField;
                        this.weightIterator = 1;

						//if using result table initialize and set header row
						if (this.config.tableResults == true){
	                        $("#" + this.appDiv.id + "gpResultTable tr:first").append("<th class='" + this.uniqueID + "'>" + this.uniqueID + "</th>");
	                        $("#" + this.appDiv.id + "gpResultTable tr:first").append("<th>Name</th>");
	                        $("#" + this.appDiv.id + "gpResultTable tr:first").append("<th>Tier</th>");
	                        $("#" + this.appDiv.id + "gpResultTable tr:first").append("<th>Sequential Rank</th>");
                        }
                        $.each(this.gpVals, lang.hitch(this, function(metric, weight){
                            if (weight >0){
                                var mNum = "Metric_" + this.weightIterator;
                                var mWeight = mNum + "_Weight";
                                var mOrder = mNum + "_Order";
                                if (this.config.gpServIncludesLogTransform == true){
                                	var mLogTrans = mNum + "_Log_Transform";
                                }
                                var m = metric.replace(this.appDiv.id + "weightIn-", "");
                                var prettyM = this.config.metricNames[m];
                                this.requestObject[mNum] = m;
                                this.requestObject[mWeight] = weight;
                                this.requestObject[mOrder] = this.config.metricOrder[m];
                                if (this.config.gpServIncludesLogTransform == true){
                                	this.requestObject[mLogTrans] = "No";
                                }
                                this.weightIterator ++; 
                                if (this.config.tableResults == true){$("#" + this.appDiv.id + "gpResultTable tr:first").append("<th>" + prettyM +"</th>");}
                            }
                        }));
                        if (this.config.tableResults == true){
	                        $("#" + this.appDiv.id + "gpResultTable tr:first").append("<th>Town</th>");
	                        $("#" + this.appDiv.id + "gpResultTable tr:first").append("<th>County</th>");
	                        $("#" + this.appDiv.id + "gpResultTable tr:first").append("<th>Stream</th>");
	                        $("#" + this.appDiv.id + "gpResultTable tr:first").append("<th>Barrier Class</th>");
	                        $("#" + this.appDiv.id + "gpResultTable tr:first").append("<th>HUC8 Name</th>");
	                        $("#" + this.appDiv.id + "gpResultTable tr:first").append("<th>HUC10 Name</th>");
	                        $("#" + this.appDiv.id + "gpResultTable tr:first").append("<th>HUC12 Name</th>");
                        }

	                    console.log(this.requestObject);
	                    this.statusCallbackIterator = 0;
	                    
	                    this.gp.submitJob(this.requestObject, lang.hitch(this,completeCallback), lang.hitch(this,statusCallback), lang.hitch(this, function(error){
	                            alert(error);
	                            $('#' + this.appDiv.id +"submitButton").removeClass('submitButtonRunning');
	                            $('#' + this.appDiv.id +"submitButton").prop('disabled', false);
	                    }));
	                    
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
                        $("#" + this.appDiv.id +"gpStatusReport").html("Transferring data from server. The 'Results' screen will appear automatically when complete...");
                        // Get result as map service -- needed for larger datasets and easy way to get legend
                        this.resMapServURLRoot = this.config.gpURL.replace("GPServer/Prioritize", "MapServer/jobs/");
                        this.resMapServ =  (this.resMapServURLRoot + jobInfo.jobId);
                        this.gpResLayer = new esri.layers.ArcGISDynamicMapServiceLayer(this.resMapServ);
                        this.gpResLayer.opacity = 0.8;
                        this.map.addLayer(this.gpResLayer);
                        var ischecked = $('#' + this.appDiv.id +"toggleLayer").is(':checked');
                        if (ischecked){$('#'+ this.appDiv.id +"toggleLayer").trigger('click');}
                        $('#'+ this.appDiv.id +"toggleResults").trigger('click');
                        console.log("callback complete");
                     	this.jobInfo = jobInfo;
                        // Get result JSON for graphics and linked table
                        if (this.runSumStats == true){
                        	this.gp.getResultData(jobInfo.jobId, this.config.summStatsParamName, lang.hitch(this,displayStats));
                        	console.log("finished stats");
                        }
                        if (this.config.tableResults === true){
                        	this.gp.getResultData(jobInfo.jobId, this.config.resultsParamName, lang.hitch(this,displayResultTable));
                        }
                        if (this.config.tableResults === false){
                        	this.gp.getResultData(jobInfo.jobId, this.config.resultsParamName, lang.hitch(this,displayResultMapServ));          	
                        }
                        
                        this.statusCallbackIterator = 0;

                }
        
        		//Display GP Result Map Service  
        		function displayResultMapServ(result, messages){
        			console.log("map service results");
        			this.gpIterator ++;
				    lang.hitch(this, this.gotoMapServResultsState());
				    $('input:radio[name="stateRadio"]').filter('[value="mapServiceResults"]').prop('checked', true);
				    
				    //re-enable Submit button for subsequent analyses
                    $('#' + this.appDiv.id +"submitButton").removeClass('submitButtonRunning');
                    $('#' + this.appDiv.id +"submitButton").prop('disabled', false);
                    
                
                	//Results filter builder
                	this.resultFilterField = "";
	                this.resultFilterOperator ="";
	                this.resultFilterValue = "";       
	                this.resultFilterFieldList = "";
	                for (var i=0; i< this.filters.resultFilters.resultFilterFields.length; i++){
	                    this.resultFilterFieldList += "<option value='" + this.filters.resultFilters.resultFilterFields[i].resultGISName + "'>" + this.filters.resultFilters.resultFilterFields[i].resultPrettyName + "</option>";
					}
	                $("#" + this.appDiv.id + "filterResultsField").html(this.resultFilterFieldList);
	      
	                this.updateResultValues = (lang.hitch(this,function (field){    
	                    this.fieldValsList = "";
	                    for (var i=0; i < this.filters.resultFilters.resultValuesTable[field].length; i++){
	                        this.fieldValsList += "<option value='" + this.filters.resultFilters.resultValuesTable[field][i].resultValue + "'>" + this.filters.resultFilters.resultValuesTable[field][i].resultValue + "</option>";
	                    }
	                    $("#" + this.appDiv.id + "filterResultsValue").html(this.fieldValsList);
	                    require(["jquery", "plugins/barrier-prioritization/js/chosen.jquery"],lang.hitch(this,function($) {
	                        $(".chosen-select7").val('').trigger("chosen:updated");
	                        this.resultsFilterValue = $("#" + this.appDiv.id + "filterResultsValue").val();
	                        
	                        //set operator to = as a default
	                        if (this.resultFilterOperator == ""){
	                            $('#'+ this.appDiv.id +"filterResultsOperator").val($('#'+ this.appDiv.id +"filterResultsOperator option:eq(1)").val());
	                            $(".chosen-select6").trigger("chosen:updated");
	                            this.resultFilterOperator = $("#" + this.appDiv.id + "filterResultsOperator").val();
	                        }
	                        $("#" + this.appDiv.id + "resultsFilter").val( this.resultFilterField + ' ' + this.resultFilterOperator + " (" + this.resultFilterValue + ")");
	                    })); 
	                }));
	                
	                $("#" + this.appDiv.id + "filterResultsField").on('change',lang.hitch(this,function(e){
	                    console.log("filter change");
	                    this.selectedField = $("#" + this.appDiv.id + "filterResultsField option:selected").text();
	                    this.updateResultValues(this.selectedField);
						this.resultFilterField = $("#" + this.appDiv.id + "filterResultsField").val();
	                    $("#" + this.appDiv.id + "resultsFilter").val( this.resultFilterField + ' ' + this.resultFilterOperator + " (" + this.resultFilterValue + ")");
	                }));
					require(["jquery", "plugins/barrier-prioritization/js/chosen.jquery"],lang.hitch(this,function($) {
						$(".chosen-select5").val('').trigger("chosen:updated");
					}));
					
	                $("#" + this.appDiv.id + "filterResultsOperator").on('change',lang.hitch(this,function(e){
	                    console.log("filter change");
	                    this.resultFilterOperator = $("#" + this.appDiv.id + "filterResultsOperator").val();
	                    $("#" + this.appDiv.id + "resultsFilter").val(this.resultFilterField + ' ' + this.resultFilterOperator + " (" + this.resultFilterValue + ")");
	                }));
	                $("#" + this.appDiv.id + "filterResultsValue").on('change',lang.hitch(this,function(e){
	                    console.log("filter change");
	                    this.resultFilterValue = $("#" + this.appDiv.id + "filterResultsValue").val();
	                    $("#" + this.appDiv.id + "resultsFilter").val(this.resultFilterField + ' ' + this.resultFilterOperator + " (" + this.resultFilterValue + ")");
	                }));                                      	
        		
        		
    		        //set identify to GP service
                    this.identifyRes = new IdentifyTask(this.resMapServ);
                    this.activateIdentify = true;
                    lang.hitch(this, this.refreshIdentify(this.resMapServ));
                    
                    //applyFilter to GP results
                    $('#' + this.appDiv.id +"applyResultFilterButton").on('click',lang.hitch(this,function(e){
                    	$( "#" + this.appDiv.id + "gpResultFilterSliderTier" ).slider( "values", 0, 1 );
                    	$( "#" + this.appDiv.id + "gpResultFilterSliderTier" ).slider( "values", 1, 20 );
                    	$( "#" + this.appDiv.id + "gpResultFilterSliderSeverity" ).slider( "values", 0, 1 );
                    	$( "#" + this.appDiv.id + "gpResultFilterSliderSeverity" ).slider( "values", 1, 20 );
                    	this.gpCustomFilter = $("#" + this.appDiv.id + "resultsFilter").val();

						this.map.removeLayer(this.gpResLayer);
                    	this.gpResLayer= this.filterMapService(this.gpCustomFilter, this.gpResLayer, this.resMapServ); 
						console.log("back from function");
						console.log(this.gpResLayer);
    					this.gpResLayer.setVisibleLayers = [0];
					
						setTimeout(lang.hitch(this, function(){
						    this.map.addLayer(this.gpResLayer);
						},500));		
						lang.hitch(this, this.refreshIdentify(this.resMapServ, this.gpCustomFilter));

                    	             
                    }));
                    
                    //clear filter from GP results
                    $('#' + this.appDiv.id +'clearResultFilterButton').on('click',lang.hitch(this,function(e){
                    	lang.hitch(this,this.clearFilterMapService());                  
                    }));
                    
        		}
        		
                //Display GP Result Table  
                function displayResultTable(result, messages){
                	console.log("table results");
                    this.itJSON = {title: this.uniqueID + " : " + "${" + this.uniqueID + "}",content: "Tier: ${Tier}<br>Seqential Result: ${FinalRank}"};

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
                        c.push("<tr title='Click on a table row to zoom to that barrier'>");
                        c.push("<td>" + row[this.uniqueID] + "</td>");
                        c.push("<td>" + row.Name + "</td>");
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
                        c.push("<td>" + row.Town + "</td>");
                        c.push("<td>" + row.County + "</td>");
                        c.push("<td>" + row.Stream + "</td>");
                        c.push("<td>" + row.BarrierCla + "</td>");
                        c.push("<td>" + row.HUC8_Name + "</td>");
                        c.push("<td>" + row.HUC10_Name + "</td>");
                        c.push("<td>" + row.HUC12_Name + "</td>");
                        c.push("</tr>");
                     
                    }
                    cStr = c.toString();
                    cStr2 = cStr.replace(/,/g, "");
                    $("#" + this.appDiv.id + "gpResultTable > tbody:last-child").append(cStr2);
                    
                    //Set up tablesorter           
                    require(["jquery", "plugins/barrier-prioritization/js/jquery.tablesorter.combined.js"],lang.hitch(this,function($) {
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
                        
                        var sorting = [[3,0]]; 
                        
                        setTimeout(lang.hitch(this,function () {
                            $("#" + this.appDiv.id + "gpResultTable").trigger("sorton", [sorting]);
                        }, 100));   
                        
                        if(this.removeIDs != ""){
                            alert("The metrics values in this table are based on the removal of barriers: " + this.removeIDs);
                        }
                    
                    
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
                        this.tableUNIQUE_ID = this.td.eq(0).text();
                        
                        //add attributes to highlight graphic so hover infoTemplate works 
                        $.each(this.map.graphics.graphics, (lang.hitch(this, function(i, graphic){
                            if (graphic.attributes[[this.uniqueID]] == this.tableUNIQUE_ID){
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
                    lang.hitch(this, this.gotoResultsState());
                    $('input:radio[name="stateRadio"]').filter('[value="results"]').prop('checked', true);

                    
                    //result graphic tooltip -- all of the "keepInfoWindow logic is to 
                    //deal with separate hover popups and click popups
                    dojo.connect(this.map.graphics, "onClick", lang.hitch(this, function(evt) { 
                       this.keepInfoWindow = "yes";
                    }));   
                
                    dojo.connect(this.map.graphics, "onMouseOver", lang.hitch(this, function(evt) { 
                        if (this.map.infoWindow.isShowing == false){this.keepInfoWindow = "no";}
                        this.graphicMouseovers  +=1;
                        if (this.keepInfoWindow == "no"){   // || this.graphicMouseovers >5){
                            this.g = evt.graphic;
                            this.map.infoWindow.setContent(this.g.getContent());
                            this.map.infoWindow.setTitle(this.g.getTitle());
                            this.map.infoWindow.show(evt.screenPoint,this.map.getInfoWindowAnchor(evt.screenPoint));    
                            this.keepInfoWindow="no";
                        }
                    }));
                    
                    dojo.connect(this.map.graphics, "onMouseOut", lang.hitch(this, function(evt) {        
                       
                       if (this.keepInfoWindow == "no"){    //|| this.graphicMouseovers >5){           
                           this.map.infoWindow.hide();
                           this.graphicMouseovers =0;
                       }

                    }));
                    
                    
                    //result graphic zoom to table row  
                    dojo.connect(this.map.graphics, "onClick", lang.hitch(this, function(evt) {
                       
                        this.resultID2 =  String(evt.graphic.attributes[this.uniqueID]);
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

                //Display Summary Stats table
                function displayStats(result, messages){
                    $("#" + this.appDiv.id + "gpSumStatsTable tr:first").append("<th>" + this.summarizeBy + "</th>");
                    $("#" + this.appDiv.id + "gpSumStatsTable tr:first").append("<th># Barriers</th>");
                    $("#" + this.appDiv.id + "gpSumStatsTable tr:first").append("<th>Max " + this.sumStatField + "</th>");
                    $("#" + this.appDiv.id + "gpSumStatsTable tr:first").append("<th>Mean " + this.sumStatField + "</th>");
                    $("#" + this.appDiv.id + "gpSumStatsTable tr:first").append("<th>Min " + this.sumStatField + "</th>");
                    $("#" + this.appDiv.id + "gpSumStatsTable tr:first").append("<th>" + this.sumStatField + " Standard Deviation </th>");
                    var d = [];
                    var dStr = "";
                    var dStr2 = "";
                    this.sumStatsFeatures = result.value.features;      
                    for (var f=0, fl=this.sumStatsFeatures.length; f<fl; f++) {
                        this.feature = this.sumStatsFeatures[f];
                        var row = this.feature.attributes;
                        d.push("<tr>");
                        d.push("<td>" + row.CASEFIELD + "</td>");
                        d.push("<td>" + row.COUNT + "</td>");
                        d.push("<td>" + row.MAX + "</td>");
                        d.push("<td>" + row.MEAN + "</td>");
                        d.push("<td>" + row.MIN + "</td>");
                        d.push("<td>" + row.STD + "</td>");
                        d.push("</tr>");
                    }
                    dStr = d.toString();
                    dStr2 = dStr.replace(/,/g, "");
                    $("#" + this.appDiv.id + "gpSumStatsTable > tbody:last-child").append(dStr2); 
                    
                    //Set up tablesorter           
                    require(["jquery", "plugins/barrier-prioritization/js/jquery.tablesorter.combined.js"],lang.hitch(this,function($) {
                                $("#" + this.appDiv.id + "gpSumStatsTable").tablesorter({
                                widthFixed : true,
                                headerTemplate : '{content} {icon}', // Add icon for various themes
                                widgets: [ 'zebra', 'stickyHeaders' ], 
                                theme: 'blue',
                                widgetOptions: {
                                    //jQuery selector or object to attach sticky header to
                                    stickyHeaders_attachTo: '.gpSumStatsTableDivContainer',
                                    stickyHeaders_includeCaption: false, // or $('.wrapper')   
                            }
                        });   
                        console.log("tablesort initialized");
                        $('#' + this.appDiv.id + 'gpSumStatsTable').trigger("update");
                        var sorting = [[0]];                         
                        setTimeout(lang.hitch(this,function () {
                            $("#" + this.appDiv.id + "gpSumStatsTable").trigger("sorton", [sorting]);
                        }, 100));
                    }));
                    
                }
                                

                
                // Print and CSV clicks
                $('#' + this.appDiv.id + 'printReport').on('click',lang.hitch(this,function(e) { 
                    alert("Print Report is coming soon. Brace yourself, it's going to be awesome!");
                }));
                $('#' + this.appDiv.id + 'help').on('click',lang.hitch(this,function(e) { 
                    return windowPopup('plugins/barrier-prioritization/html/help.html', 'help', 'width=1100,height=590,scrollbars=yes');
                }));
                $('#' + this.appDiv.id + 'dlCSV').on('click',lang.hitch(this,function(e) { 
                    require(["jquery", "plugins/barrier-prioritization/js/jquery.tabletoCSV"],lang.hitch(this,function($) {
                             $("#" + this.appDiv.id + "gpResultTable").tableToCSV();
                    }));
                }));
                //download input parameters
                $('#' + this.appDiv.id + 'dlInputs').on('click',lang.hitch(this,function(e) { 
                     this.requestObjectPretty = {};
                     for (var key in this.requestObject){
                     	
                         value = this.requestObject[key];
                         console.log(key + " ---- " + value);
                         
                         if (this.config.metricNames.hasOwnProperty(value)){
                            //Use the pretty metric name
                            this.requestObjectPretty[key] = this.config.metricNames[value];
                            console.log(this.config.metricNames[value]);
                         } 
                         //don't include sort order & log transform in the downloaded inputs
                         else if (key.indexOf("Order") == -1 && key.indexOf("Log") == -1){
                             this.requestObjectPretty[key] = this.requestObject[key];
                         }
                     }
                     
                     this.requestObjectArray = [];
                     this.requestObjectArray.push(this.requestObjectPretty);
                     //add tabs to beautify the JSON
                     this.requestObjectJSON = JSON.stringify(this.requestObjectArray, null, "\t");
                     this.requestObjectJSON = this.requestObjectJSON.replace(/[\u200B-\u200D\uFEFF]/g, "");
                     this.JSONToCSVConvertor(this.requestObjectJSON, "Prioritization_X_Inputs", true);
                }));
                
                
                this.rendered = true;               
            
            
           },  
           
           refreshIdentify: function(layerURL, layerDef) {           		
           		if (this.activateIdentify == true){   
	                //Identify functionality...     
	                this.identifyRes = new IdentifyTask(layerURL);
	                this.identifyParams = new IdentifyParameters();
	                this.identifyParams.tolerance = 6;
	                this.identifyParams.returnGeometry = true;
	                this.identifyParams.layerIds = this.config.visibleLayers;
	                this.identifyParams.layerDefinitions=[];
	                if (layerDef != undefined){
	                	this.identifyParams.layerDefinitions[0] = layerDef;
	                	console.log("layer def= " + this.identifyParams.layerDefinitions);
	                }
	                else{this.identifyParams.layerDefinitions = [];}
	                this.identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
	                this.identifyParams.width = this.map.width;
	                this.identifyParams.height = this.map.height;
					
            		this.identifyClick = dojo.connect(this.map, "onClick", lang.hitch(this, function(evt) {  
    
                    this.identifyParams.geometry = evt.mapPoint;
                    this.identifyParams.mapExtent = this.map.extent;               
                    this.deferred = this.identifyRes       
                        .execute(this.identifyParams)
                        .addCallback(lang.hitch(this, function (response) {
                        return arrayUtils.map(response, lang.hitch(this, function (idResult) {
                            this.IdentifyFeature = idResult.feature;
                            this.idContent = "";
                            $.each(idResult.feature.attributes, lang.hitch(this, function(k, v){
                                //HTML for identify popup -- loop through and include all fields except those in plugin-config blakclist
                                if ($.inArray(k, this.config.idBlacklist) == -1){
                                	if (this.config.metricNames[k] != undefined){this.idContent = this.idContent + "<b>" + this.config.metricNames[k] + "</b> : " + v + "<hr>";}
                                    else{this.idContent = this.idContent + "<b>" + k + "</b> : " + v + "<hr>";}
                                }
                            }));
                           // console.log(this.idContent);
                            this.identJSON = {
                                title: "Unique ID: ${" + this.uniqueID+ "}",
                                content: this.idContent
                            };
                            this.popupInfoTemplate = new esri.InfoTemplate(this.identJSON);
                            this.IdentifyFeature.setInfoTemplate(this.popupInfoTemplate);
                            return this.IdentifyFeature;


                       }));
                     }));
                     this.map.infoWindow.setFeatures([this.deferred]);
                     this.map.infoWindow.show(this.identifyParams.geometry);
                   
                })); 
              }
              
              else{
              	dojo.disconnect(this.identifyClick);
              	console.log("identify disconnected");
              }
           },
            
           applyWeights: function(myWeights) {  
                    for (var key in myWeights) {
                        if (myWeights.hasOwnProperty(key)) {
                            $("#" + this.appDiv.id + "weightIn-" + key).val(myWeights[key]);
                        }
                    this.gpVals = {};
                    this.weights = $("input[id^=" + this.appDiv.id + "weightIn]").each(lang.hitch(this, function(i, v){
                        this.gpVals[v.id] = v.value;    
                        if (parseFloat(v.value) > 0){$('#' + v.id).addClass('weighted');}
                        else{$('#' + v.id).removeClass('weighted');}            
                    }));
                    this.sumWeights = this.metricWeightCalculator(this.gpVals);
                    $('#'+ this.appDiv.id + "currWeight").text(this.sumWeights);
                    if (this.sumWeights !=100){$('#'+ this.appDiv.id +"currWeight").css('color', 'red');}
                    if (this.sumWeights ==100){$('#'+ this.appDiv.id +"currWeight").css('color', 'green');} 
                    }
            },            
            

            openInputs: function(mapSide){
            	                  
                    //Resize main container - check which side first
                    if (mapSide == "dijit_layout_ContentPane_1start"){
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
                            this.resize();  
                            this.activateIdentify = true;
                            lang.hitch(this, this.refreshIdentify(this.config.url));
                        }));

                        $('#' + this.appDiv.id + "clickTitle").hide();
						if (this.small == "no"){
							lang.hitch(this, this.gotoInputsState()); 
						}
						if (this.small == "yes"){							
							$('#'+ this.appDiv.id +'tabA')[0].click(); //TODO
						}
                    }
            },
            
 			showFilterInputs: function(){
    	        $("#" + this.appDiv.id + "userFilter").show();
                $("#" + this.appDiv.id + "filterBuildField_chosen").show();                      
                $("#" + this.appDiv.id + "filterBuildOperator_chosen").show();                 
                $("#" + this.appDiv.id + "filterBuildValue_chosen").show();
            },
            
            hideFilterInputs: function(){
 				$("#" + this.appDiv.id + "filterBuildValue_chosen").hide();
 				$("#" + this.appDiv.id + "filterBuildOperator_chosen").hide();
 				$("#" + this.appDiv.id + "filterBuildField_chosen").hide(); 
 				$("#" + this.appDiv.id + "userFilter").hide();
                $("#" + this.appDiv.id + "filterBuildField").hide();   
                $("#" + this.appDiv.id + "filterBuildOperator").hide();
                $("#" + this.appDiv.id + "filterBuildValue").hide(); 
            },
            
			showSummStatsInputs: function(){
				$("#" + this.appDiv.id + "summarizeBy_chosen").show();
                $("#" + this.appDiv.id + "summaryStatField_chosen").show(); 
			},
            hideSummStatsInputs: function(){
				$("#" + this.appDiv.id + "summarizeBy_chosen").hide();
                $("#" + this.appDiv.id + "summaryStatField_chosen").hide(); 
                $("#" + this.appDiv.id + "summarizeBy").hide();
                $("#" + this.appDiv.id + "summaryStatField").hide();  
			},
            
            gotoInputsState: function(){
                $('#' + this.appDiv.id + 'leftSide').show();
                $('#' + this.appDiv.id + 'rightSide').css('display', 'inline-block');
                $('#' + this.appDiv.id + 'rightSide').show();
                $('#' + this.appDiv.id + 'gpResultTableDivContainer').hide();
                $('#' + this.appDiv.id + 'toggleResultsDiv').hide();    
                $('#' + this.appDiv.id + 'gpSumStatsTableDivContainer').hide(); 
                $('#' + this.appDiv.id + 'gpResultMapServiceDivContainer').hide(); 
                $('#' + this.appDiv.id + 'dlCSV').hide(); 
                $('#' + this.appDiv.id + 'dlInputs').hide();
                $('#' + this.appDiv.id + 'bottomDiv').show();
                $('#' + this.appDiv.id + 'topRadioDiv').show();
 
            },         

            gotoResultsState: function(){
                $('#' + this.appDiv.id + 'leftSide').hide();
                $('#' + this.appDiv.id + 'rightSide').hide();
                if (this.gpIterator >1 ){
               		$('#' + this.appDiv.id + 'gpResultTableDivContainer').show();
                }
                $('#' + this.appDiv.id + 'toggleResultsDiv').show();
                $('#' + this.appDiv.id + 'gpSumStatsTableDivContainer').hide();  
                $('#' + this.appDiv.id + 'gpResultMapServiceDivContainer').hide();  
                $('#' + this.appDiv.id + 'dlCSV').show();
                $('#' + this.appDiv.id + 'dlInputs').show();
                $('#' + this.appDiv.id + 'bottomDiv').show();
                $('#' + this.appDiv.id + 'topRadioDiv').show();

            },  
            
            gotoMapServResultsState: function(){
            	$('#' + this.appDiv.id + 'leftSide').hide();
                $('#' + this.appDiv.id + 'rightSide').hide();
                if (this.gpIterator >1 ){
                	$('#' + this.appDiv.id + 'gpResultMapServiceDivContainer').show();
                }
                $('#' + this.appDiv.id + 'toggleResultsDiv').show();
                $('#' + this.appDiv.id + 'gpSumStatsTableDivContainer').hide();    
                // $('#' + this.appDiv.id + 'dlCSV').show();
                // $('#' + this.appDiv.id + 'dlInputs').show();                		
    	        $("#" + this.appDiv.id + "resultsFilter").show();
                $("#" + this.appDiv.id + "filterResultsField_chosen").show();                      
                $("#" + this.appDiv.id + "filterResultsOperator_chosen").show();                 
                $("#" + this.appDiv.id + "filterResultsValue_chosen").show();
                $('#' + this.appDiv.id + 'bottomDiv').show();
                $('#' + this.appDiv.id + 'topRadioDiv').show();

            },
            
            gotoStatsState: function(){
				$('#' + this.appDiv.id + 'leftSide').hide();
                $('#' + this.appDiv.id + 'rightSide').hide();
                $('#' + this.appDiv.id + 'gpResultTableDivContainer').hide();
                $('#' + this.appDiv.id + 'gpSumStatsTableDivContainer').show(); 
                $('#' + this.appDiv.id + 'gpResultMapServiceDivContainer').hide(); 
                $('#' + this.appDiv.id + 'dlCSV').hide();   
                $('#' + this.appDiv.id + 'dlInputs').hide(); 
                $('#' + this.appDiv.id + 'bottomDiv').show();
                $('#' + this.appDiv.id + 'topRadioDiv').show();

            },  
            
            //calculate current metric weights
            metricWeightCalculator: function (gpVals){
                var sumWeights = 0; 
                for (key in gpVals) {
                    if (isNaN(gpVals[key])){
                        console.log("Warning! Must input integers!");
                    }
                    sumWeights = sumWeights + parseInt(gpVals[key], 10); 
                }
                return sumWeights;
            },

			filterResultMapServiceSlider: function(){
				this.map.removeLayer(this.gpResLayer);
				this.gpTierMaxVal = 21-$('#' + this.appDiv.id + 'gpResultFilterSliderTier').slider("values", 0);
				this.gpTierMinVal = 21-$('#' + this.appDiv.id + 'gpResultFilterSliderTier').slider("values", 1);
				this.gpSeverityMinVal = $('#' + this.appDiv.id + 'gpResultFilterSliderSeverity').slider("values", 0);
				this.gpSeverityMaxVal = $('#' + this.appDiv.id + 'gpResultFilterSliderSeverity').slider("values", 1);
				this.gpSeverityRange = [];
				var i=1;
				while (i<=this.gpSeverityMaxVal){
					if (i>=this.gpSeverityMinVal){
						this.gpSeverityRange.push("'" + this.severityDict[i] + " Barrier" + "'");
					}
					i++;
				}
		
				this.gpSeverityRangeStr = this.gpSeverityRange.toString();
				this.gpFilterQuery = this.config.resultTier + " >= " + this.gpTierMinVal + " AND " + this.config.resultTier + " <= " + this.gpTierMaxVal + " AND " + this.config.severityField + " IN (" + this.gpSeverityRangeStr + ")";

	
				this.resultFilterParameters = new ImageParameters();
				this.resLayerDefs = [];
				this.resLayerDefs[0] = this.gpFilterQuery;
				this.resultFilterParameters.layerDefinitions = this.resLayerDefs;
				this.resultFilterParameters.layerIds = [0];
				this.resultFilterParameters.transparent = true;
				this.gpResLayer = new esri.layers.ArcGISDynamicMapServiceLayer(this.resMapServ, 
					{"imageParameters" : this.resultFilterParameters});
				this.gpResLayer.setVisibleLayers = [0];
				
				setTimeout(lang.hitch(this, function(){
				    this.map.addLayer(this.gpResLayer);
				    console.log("added filtered layer");
				},500));		
				lang.hitch(this, this.refreshIdentify(this.resMapServ, this.gpFilterQuery));	
			},
			
			
			filterConsensusMapServiceSlider: function(){
				
				this.consensusTierMaxVal = 21-$('#' + this.appDiv.id + 'consensusResultFilterSliderTier').slider("values", 0);
				this.consensusTierMinVal = 21-$('#' + this.appDiv.id + 'consensusResultFilterSliderTier').slider("values", 1);
				this.consensusSeverityMinVal = $('#' + this.appDiv.id + 'consensusResultFilterSliderSeverity').slider("values", 0);
				this.consensusSeverityMaxVal = $('#' + this.appDiv.id + 'consensusResultFilterSliderSeverity').slider("values", 1);
				this.consensusSeverityRange = [];
				var i=1;
				while (i<=this.consensusSeverityMaxVal){
					if (i>=this.consensusSeverityMinVal){
						this.consensusSeverityRange.push("'" + this.severityDict[i] + " Barrier" + "'");
					}
					i++;
				}
				console.log(this.consensusSeverityRange);
				this.consensusSeverityRangeStr = this.consensusSeverityRange.toString();
				this.consensusFilterQuery = this.config.resultTier + " >= " + this.consensusTierMinVal + " AND " + this.config.resultTier + " <= " + this.consensusTierMaxVal + " AND " + this.config.severityField + " IN (" + this.consensusSeverityRangeStr + ")";
				this.map.removeLayer(this.dynamicLayer);

				this.consensusFilterParameters = new ImageParameters();
				this.layerDefs = [];
				this.layerDefs[0] = this.consensusFilterQuery;
				this.consensusFilterParameters.layerDefinitions = this.layerDefs;
				this.consensusFilterParameters.layerIds = [0];
				this.consensusFilterParameters.layerOption = ImageParameters.LAYER_OPTION_SHOW;
				this.consensusFilterParameters.transparent = true;
				this.dynamicLayer = new esri.layers.ArcGISDynamicMapServiceLayer(this.config.url, 
					{"imageParameters" : this.consensusFilterParameters});

				setTimeout(lang.hitch(this, function(){
				    this.map.addLayer(this.dynamicLayer);
				    lang.hitch(this, this.refreshIdentify(this.config.url, this.consensusFilterQuery));	
				},500));		

				
				var ischecked = $('#' + this.appDiv.id + 'toggleLayer').is(':checked');
				if (!ischecked){
					$('#'+ this.appDiv.id +"toggleLayer").trigger('click');
				}
				
			},
			
			


			filterMapService: function(filter, mapServLayer, mapServURL){
	
				var filterParameters = new ImageParameters();
				var layerDefs = [];
				layerDefs[0] = filter;
				console.log("in function " +filter);
				filterParameters.layerDefinitions = layerDefs;
				filterParameters.layerIds = [0];
				filterParameters.layerOption = ImageParameters.LAYER_OPTION_SHOW;
				filterParameters.transparent = true;
				var filteredMapServLayer = new esri.layers.ArcGISDynamicMapServiceLayer(mapServURL, 
					{"imageParameters" : filterParameters});
		
				return Object(filteredMapServLayer);

			},

			clearFilterMapService: function(){

				this.map.removeLayer(this.gpResLayer);
				this.gpResLayer = new esri.layers.ArcGISDynamicMapServiceLayer(this.resMapServ);
				setTimeout(lang.hitch(this, function(){
				    this.map.addLayer(this.gpResLayer);
				},500));
				
				$('#'+ this.appDiv.id +"resultsFilter").val(''); 
				require(["jquery", "plugins/barrier-prioritization/js/chosen.jquery"],lang.hitch(this,function($) {
				    $('#'+ this.appDiv.id +"filterResultsField").val('option: first').trigger("chosen:updated");
	                $('#'+ this.appDiv.id +"filterResultsOperator").val('option: first').trigger("chosen:updated");
	                $('#'+ this.appDiv.id +"filterResultsValue").val('option: first').trigger("chosen:updated");
				}));
		        $( "#" + this.appDiv.id + "gpResultFilterSliderTier" ).slider( "values", 0, 1 );
            	$( "#" + this.appDiv.id + "gpResultFilterSliderTier" ).slider( "values", 1, 20 );
            	$( "#" + this.appDiv.id + "gpResultFilterSliderSeverity" ).slider( "values", 0, 1 );
            	$( "#" + this.appDiv.id + "gpResultFilterSliderSeverity" ).slider( "values", 1, 20 );
			},
			
			clearConsensusFilterMapService: function(){
				this.map.removeLayer(this.dynamicLayer);
				this.dynamicLayer = new esri.layers.ArcGISDynamicMapServiceLayer(this.config.url);
				this.dynamicLayer.setVisibleLayers(this.config.visibleLayers);
				setTimeout(lang.hitch(this, function(){
				    this.map.addLayer(this.dynamicLayer);
				},500));
				
				$('#'+ this.appDiv.id +"resultsConsensusFilter").val(''); 
				require(["jquery", "plugins/barrier-prioritization/js/chosen.jquery"],lang.hitch(this,function($) {
				    $('#'+ this.appDiv.id +"filterConsensusResultsField").val('option: first').trigger("chosen:updated");
	                $('#'+ this.appDiv.id +"filterConsensusResultsOperator").val('option: first').trigger("chosen:updated");
	                $('#'+ this.appDiv.id +"filterConsensusResultsValue").val('option: first').trigger("chosen:updated");
				}));
				// $( "#" + this.appDiv.id + "consensusResultFilterSliderTier" ).slider( "values", 0, 1 );
            	// $( "#" + this.appDiv.id + "consensusResultFilterSliderTier" ).slider( "values", 1, 20 );
            	// $( "#" + this.appDiv.id + "consensusResultFilterSliderSeverity" ).slider( "values", 0, 1 );
            	// $( "#" + this.appDiv.id + "consensusResultFilterSliderSeverity" ).slider( "values", 1, 20 );
			},			

			clearAllInputs: function(){
				$("#" + this.appDiv.id +"gpStatusReport").html("");
                $("#" + this.appDiv.id +"gpStatusReportHead").css('display', 'none');
				$("input[id^=" + this.appDiv.id + "weightIn]").each(lang.hitch(this, function(i, v){
                     v.value = 0;
                     $('#' + v.id).removeClass('weighted');            
                }));
                $('#'+ this.appDiv.id +"currWeight").html('0');
                $('#'+ this.appDiv.id +"currWeight").css('color', 'red');
                $('#'+ this.appDiv.id +"barriers2Remove").val('');
                $('#'+ this.appDiv.id +"userFilter").val('');      
                $('#'+ this.appDiv.id +"resultsFilter").val(''); 
                if ($('#'+ this.appDiv.id +"removeBarriers").is(":checked")){$('#'+ this.appDiv.id +"removeBarriers").trigger('click');}
                if ($('#'+ this.appDiv.id +"runSumStats").is(":checked")){$('#'+ this.appDiv.id +"runSumStats").trigger('click');}
                if ($('#'+ this.appDiv.id +"filterBarriers").is(":checked")){
                    $('#'+ this.appDiv.id +"filterBarriers").trigger('click');
                }
                require(["jquery", "plugins/barrier-prioritization/js/chosen.jquery"],lang.hitch(this,function($) {
	                $('#'+ this.appDiv.id +"filterBuildField").val('option: first').trigger("chosen:updated");
	                $('#'+ this.appDiv.id +"filterBuildOperator").val('option: first').trigger("chosen:updated");
	                $('#'+ this.appDiv.id +"filterBuildValue").val('option: first').trigger("chosen:updated"); 
                    $('#'+ this.appDiv.id +"filterResultsField").val('option: first').trigger("chosen:updated");
	                $('#'+ this.appDiv.id +"filterResultsOperator").val('option: first').trigger("chosen:updated");
	                $('#'+ this.appDiv.id +"filterResultsValue").val('option: first').trigger("chosen:updated");
                    $('#'+ this.appDiv.id +"passability").val('option: first').trigger("chosen:updated");
                    $('#'+ this.appDiv.id +"summarizeBy").val('option: first').trigger("chosen:updated");
                    $('#'+ this.appDiv.id +"summaryStatField").val('option: first').trigger("chosen:updated");
                    
                }));                 
                if (this.removeFeatureLayer != undefined){
                    this.map.removeLayer(this.removeFeatureLayer);
                }
                if (this.selectedBarriers != undefined){
                    this.map.removeLayer(this.selectedBarriers);
                }           
                this.workingRemoveBarriers = [];
                this.workingRemoveBarriersString = "";
                this.barriers2RemoveCount = 0;
                this.removingBarriers = false;

			},
                            
            selectRemovalBarriers: function() {  
                this.removingBarriers = true;
                
                if ($('#'+ this.appDiv.id +"toggleLayer").is(":checked")){$('#'+ this.appDiv.id +"toggleLayer").trigger('click');}
                console.log("removing barriers");
                // this.activateIdentify = false;
                // lang.hitch(this, this.refreshIdentify(this.config.url));
                var removeBarrierSymbol = new SimpleMarkerSymbol().setSize(5).setColor(new Color([0,0,0]));
                this.selectedRemoveBarrierSymbol = new SimpleMarkerSymbol().setSize(10).setColor(new Color([255,0,0]));                                      
                var renderer = new SimpleRenderer(removeBarrierSymbol);
                
                this.removeFeatureLayer = new FeatureLayer(this.config.removeSelectionURL);
                this.removeFeatureLayer.setRenderer(renderer);
                this.removeFeatureLayer.MODE_SNAPSHOT;

				// Set layer definition so barriers to remove layer only shows passability level of barriers being analyzed (e.g. Dams only)
                this.severityQueryDict = {
	            	'Dams':'Use_Dams',
					'Dams (Excluding Dams with Passage)':'Use_Dams_ExclPassage',
					'Severe':'Use_Severe',
					'Severe (Excluding Dams with Passage)':'Use_Severe_ExclPassage',
					'Significant':'Use_Significant',
					'Moderate':'Use_Moderate',
					'Minor':'Use_Minor',
					'Insignificant':'Use_Insignificant'
                };
                this.severityField = this.severityQueryDict[$('#'+ this.appDiv.id + 'passability').val()];
                this.severityQuery = this.severityField +' = 1';
                console.log(this.severityQuery);
                this.removeFeatureLayer.setDefinitionExpression(this.severityQuery); //TODO
                this.removeFeatureLayer.dataAttributes = [this.uniqueID, this.severityField];
                this.selectedBarriers = new GraphicsLayer();
                
                //TODO if there's already values in the text box, include the corresponding graphics
				if ($("#" + this.appDiv.id + 'barriers2Remove').val() != ''){
					lang.hitch(this, this.addSavedBarriersToRemove());
					
               }
                this.removeFeatureLayer.on("click", lang.hitch(this, function(e){
                    this.currID = e.graphic.attributes[this.uniqueID];
                    console.log(this.currID);
                    for (i = 0; i< this.removeFeatureLayer.graphics.length; i++){  
                        if (this.alreadySelBarr2Remove != undefined && this.alreadySelBarr2Remove.indexOf(this.currID)>=0){
                        	console.log(this.currID + "is already selected");
                        }           	
                    	//the following statement check if each graphic is either the one clicked on or in the list of previously selected 
                        if (this.removeFeatureLayer.graphics[i].attributes[this.uniqueID] == this.currID ){
                            this.barriers2RemoveCount ++;                       
                            if (this.barriers2RemoveCount <= 10) {
                                //Make a graphic copy of the selected point.  Changing the symbology of the existing point worked, but then
                                //symbology would revert on zoom in/out
 								var key = this.uniqueID;
                                var attr = {};
                                attr[key] = this.removeFeatureLayer.graphics[i].attributes[this.uniqueID];
                                this.selectedBarrier = new Graphic(this.removeFeatureLayer.graphics[i].geometry, this.selectedRemoveBarrierSymbol, attr );
                                this.selectedBarriers.add(this.selectedBarrier);
                                 
                                //if an existing selected graphic is clicked remove it and its UNIQUE_ID from String
                                this.selectedBarriers.on("click", lang.hitch(this, function(e){
                                    if (this.workingRemoveBarriers.indexOf(e.graphic.attributes[this.uniqueID]) >-1){
                                        this.workingRemoveBarriers.splice(this.workingRemoveBarriers.indexOf(e.graphic.attributes[this.uniqueID]), 1);
                                        this.barriers2RemoveCount --;
                                    }
                                    this.workingRemoveBarriersString = "'" + this.workingRemoveBarriers.join("', '") + "'";
                                    if (this.workingRemoveBarriersString == "''"){this.workingRemoveBarriersString = "";}
                                    $("#" + this.appDiv.id + 'barriers2Remove').val(this.workingRemoveBarriersString);
                                    this.selectedBarriers.remove(e.graphic);
                                }));    
                         
                                this.workingRemoveBarriers.push(this.currID);
                                this.workingRemoveBarriersString = "'" + this.workingRemoveBarriers.join("', '") + "'";       
                                $("#" + this.appDiv.id + 'barriers2Remove').val(this.workingRemoveBarriersString);
                            }
                        
                            else{
                                alert("You may only select 10 barriers");
                            }
                            
                        }
	                    else{
							this.alreadySelBarr2Remove = ""; 
			            }
                    
                    }   
                }));
              
              this.map.addLayer(this.removeFeatureLayer);
              console.log(this.removeFeatureLayer);
              this.map.addLayer(this.selectedBarriers);
            },
            
            addSavedBarriersToRemove: function(){
        		console.log("there's already barriers to remove listed");
				this.alreadySelBarr2RemoveList = $("#" + this.appDiv.id + 'barriers2Remove').val().split(",");
				this.alreadySelBarr2RemoveQuery = new Query();
				this.alreadySelBarr2RemoveQueryTask = new QueryTask(this.config.removeSelectionURL);//(this.removeFeatureLayer);
				
				this.alreadySelBarr2RemoveQuery.where = this.config.uniqueID + " IN (" + $("#" + this.appDiv.id + 'barriers2Remove').val() +")";
				
				this.alreadySelBarr2RemoveQuery.returnGeometry = true;
				this.alreadySelBarr2RemoveQuery.outFields = [this.config.uniqueID];
				console.log(this.alreadySelBarr2RemoveQuery);
				console.log(this.alreadySelBarr2RemoveQueryTask);
				this.alreadySelBarr2RemoveQueryTask.execute(this.alreadySelBarr2RemoveQuery,  lang.hitch(this, addQueryResults));
				
				function addQueryResults(results){
					console.log(results);
					for (i = 0; i< results.features.length; i++){  
	             		var key = this.uniqueID;
	                    var attr2 = {};
	                    attr2[key] = results.features[i].attributes[this.config.uniqueID];
	                    this.selectedBarrier = new Graphic(results.features[i].geometry, this.selectedRemoveBarrierSymbol, attr2 );
	                    this.selectedBarriers.add(this.selectedBarrier);
	                    this.barriers2RemoveCount ++; 
	                   	
            		} 
            		//if an existing selected graphic is clicked remove it and its UNIQUE_ID from String
                    this.selectedBarriers.on("click", lang.hitch(this, function(e){
                        if (this.workingRemoveBarriers.indexOf(e.graphic.attributes[this.uniqueID]) >-1){
                            this.workingRemoveBarriers.splice(this.workingRemoveBarriers.indexOf(e.graphic.attributes[this.uniqueID]), 1);
                            this.barriers2RemoveCount --;
                        }
                        this.workingRemoveBarriersString = "'" + this.workingRemoveBarriers.join("', '") + "'";
                        if (this.workingRemoveBarriersString == "''"){this.workingRemoveBarriersString = "";}
                        $("#" + this.appDiv.id + 'barriers2Remove').val(this.workingRemoveBarriersString);
                        this.selectedBarriers.remove(e.graphic);
                    })); 
				}
			},

            
            JSONToCSVConvertor: function(JSONData, ReportTitle, ShowLabel) {
                //taken from http://jsfiddle.net/hybrid13i/JXrwM/
                //If JSONData is not an object then JSON.parse will parse the JSON string in an Object
                var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;
                
                var CSV = '';    
                //Set Report title in first row or line
                
                CSV += ReportTitle + '\r\n' + JSONData;

                
                //Generate a file name
                var fileName = "";
                //this will remove the blank-spaces from the title and replace it with an underscore
                fileName += ReportTitle.replace(/ /g,"_");   
                
                //Initialize file format you want csv or xls
                var uri = 'data:text/csv;charset=utf-8,' + escape(CSV);
                
                // Now the little tricky part.
                // you can use either>> window.open(uri);
                // but this will not work in some browsers
                // or you will not get the correct file extension    
                
                //this trick will generate a temp <a /> tag
                var link = document.createElement("a");    
                link.href = uri;
                
                //set the visibility hidden so it will not effect on your web-layout
                link.style = "visibility:hidden";
                link.download = fileName + ".csv";
                
                //this part will append the anchor tag and remove it after automatic click
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }           
            
        });
    });                                