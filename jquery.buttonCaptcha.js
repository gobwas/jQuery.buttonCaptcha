/*!
 * jQuery.buttonCaptcha - plugin that protects your site from robots using jQuery.
 * http://www.gobwas.com/bcaptcha
 * Version: 1.01.
 *
 * Copyright 2011, Sergey Kamardin.
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Date: Wed Apr 25 11:19:47 2011 +0300.
 * Location: Moscow, Russia.
 * Contact: gobwas[a]gobwas.com
 */

(function($){
	$.fn.buttonCaptcha = function(userOptions) {
		var options = {
			codeWord		:	'gbws',						// code word which must be assembled from pieces;
			codeZone		:	'com',						// if you want, you can add a domain zone to your code word (length must be from 2 to 4);
			hideButton		:	true,						// if true, then button, which you passed to the buttonCaptcha will be hidden till unlock;
			hideCaptcha		:	false,						// if true, then Captcha will fade out when unlocked;
			lockButton		:	true,						// if true, then button will be disabled till unlock;
			scrollToButton	: 	false,						// if true, then when Captcha unlocked, will be autoscroll to the button  (need a jQuery.scrollTo plugin!!!);
			verifyInput		:	true,						// if true, then to the first parent form will be attached a hidden field with the value of deferred letters.
			verifyName		:	'gbws_captcha_input',		// the name of hidden field;
			captchaHeader	:	'Are you a robot?',			// question above the Captcha;
			captchaTip		: 	'Drag letters from left to right, to get word "%code_word%". Thanks!', 	// tip text; remember that you must save %code_word% tag! 
																										// For example : < Hello, make this word: %code_word% >
			captchaUnlocked	:	'Unlocked!'					// text for the header of captcha when it unlocked;
		}
		
		$.extend(options,userOptions); // apply userOptions, and then calculate captchaTip and codeWord length (options.letters);
		
		options.captchaTip=options.captchaTip.replace('%code_word%','<b>'+options.codeWord+'</b>')
		options.letters=options.codeWord.length;
		
		var alphabet=['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
		
		// cfg - is a global configuration object, who is using by each exemplar of Captcha;
		
		var cfg={
			structure:{
				outer: {
					top:$('<div/>')		.attr('class','captcha_top'),						// top part of Captcha (with tip);
					lock:$('<div/>')	.attr('class','captcha_lock'),						// lock div (picture with lock);
					captcha:$('<div/>')	.attr('class','captcha_gbws')						// Captcha div;
				},
				inner: {
					left:		$('<div/>')	.attr('class','captcha_left'),					// left border of Captcha;
					blue:		$('<div/>')	.attr('class','captcha_blue')					// left container of letters;
											.html('<div class="captcha_delshadow"></div>'),
					white:		$('<div/>')	.attr('class','captcha_white'),					// right container of baskets and zone (if enabled);
					right:		$('<div/>')	.attr('class','captcha_right'),					// right border of Captcha;
					end:		$('<div/>')	.css('clear','both')							// !important clear:both div;
				},
				buttons: {
					retake: 	$('<div/>')	.attr('class','captcha_retake'),				// refresh button (on top-right corner of Captcha);
					showtip:	$('<div/>')	.attr('class','captcha_showtip')				// showtip div;
											.html(options.captchaHeader)
				},
				contains: {
					tip: 		$('<div/>')	.attr('class','captcha_tip')					// tip text;
											.html(options.captchaTip),
					end:		$('<div/>')	.css('clear','both'),							// clear:both div;
					zone:		$('<div/>')	.attr('class','captcha_zone')					// zone div;
				}
			},
			lettersDivs:[],																	// array of divs, each containing its letter (required for mixing letters);
			lettersSprite:{}																// object, which keeps the offset value in css-bckgrnd of letters div;
		}
		
		cfg.lettersSprite= (function() {
			var obj={};
			for (var x in alphabet) {
				obj[alphabet[x]]=x*(-18);	
			}
			return obj;
		})();
		
		cfg.lettersDivs= (function() {
			if (options.codeWord.match(/[a-zA-Z0-9]+/)!=null) {
				var letters=options.codeWord;
				var divs=[];
				for (var x=0; x<letters.length; x++) {
					findLetter=letters.charAt(x).toLowerCase();
					var sprite=cfg.lettersSprite[findLetter];
					var div=$('<div/>')
							.attr('class','letter')
							.css('background-position',sprite+'px 0');
					divs.push(div);
				}
				return divs;
			}
		})();
		
		// generating codeZone to Captcha, and saving it to cfg.structure:
		(function() {
			if (options.codeZone.match(/[a-zA-Z0-9]{2,4}/)!=null) {
				var letters=options.codeZone;
				var div=$('<div/>')
							.attr('class','zone_dot')
							.appendTo(cfg.structure.contains.zone);
				var zone_len=12;
				for (var x=0; x<letters.length; x++) {
					findLetter=letters.charAt(x).toLowerCase();
					var sprite=cfg.lettersSprite[findLetter];
					var div=$('<div/>')
							.attr('class','zone_letter')
							.css('background-position',sprite+'px 0')
							.appendTo(cfg.structure.contains.zone);
					zone_len+=18;
				}
				cfg.structure.contains.zone.css('width',zone_len+'px');
			}
		})();
		
		// now, uses javascript closures, generating Captchas if they are many, and if not - a single Captcha.
		for (var x=0; x<this.length; x++) {
			(function(button) {
				// cfgL - is a local variable, which can be used only in the scope is generated when you create a new Captcha;
				var cfgL={
					captchas:x,
					button:button,
					captcha:null,
					verify:null,
					steps:[],
					stepsLength:0,
					goodLetters:0,
					blue:null,
					white:null,
					captcha:null,
					lock:null,
					top:null,
					showTip:null,
					retake:null
				}
				
				wrap(cfgL.button);
				
				if (options.hideButton===true) {
					$(cfgL.button).fadeOut(300);	
				}
				if (options.lockButton===true) {
					$(cfgL.button).attr('disabled','true');
				}
				// function, that generates a letters in left side of Captcha;
				function getWord(part, box) {
					var div=$('<div/>').attr('id','letters_'+cfgL.captchas).attr('class','letters');
					var divs_appended=[];
					while (divs_appended.length<cfg.lettersDivs.length) {
						var x=Math.floor(Math.random() * ((cfg.lettersDivs.length-1) - 0 + 1)) + 0;
						if ($.inArray(x,divs_appended)==-1) {
							$(cfg.lettersDivs[x])
															.clone()
															.attr('id','letter_'+(x)+'_'+cfgL.captchas)
															.appendTo(div)
															.draggable({
																revert: true,
																revertDuration: 300,
																cursor:"pointer", 
																cursorAt: {top: 12, left: 9},
																containment: "#"+box, 
																scroll: false, 
																snap: ".basket", 
																snapMode: "inner"
															}); 
								
							divs_appended.push(x);
						}
					}
					$(div).appendTo(part);
				};
				// function, that generates a baskets in right side of Captcha;
				function getBaskets(part) {
					var div=$('<div/>').attr('id','baskets_'+cfgL.captchas).attr('class','baskets');
					for (var x in cfg.lettersDivs) {
						var basket=$('<div/>')
									.attr('id','basket_'+x+'_'+cfgL.captchas)
									.attr('class','basket');
						if (Number(x)!=(cfg.lettersDivs.length-1)) basket.css('border-right','none');
						$(basket).droppable({
							hoverClass: "basket-hover",
							drop: function( event, ui ) {
								if (!$(this).droppable('option','disabled')) {
									
									var clone=$(ui.draggable).clone().css({left:0,top:0});
								
									$(ui.draggable)
											.draggable({ revert: false })
											.css({left:0,top:0})
											.animate({width:0,opacity:0},600);
									
									$(this)
											.droppable({disabled:true})
											.attr('class','basket_closed')
											.append(clone);
									
									var letter_ids=$(ui.draggable).attr('id'); letter_ids=letter_ids.split('_');
									var basket_ids=$(this).attr('id'); basket_ids=basket_ids.split('_');
		
									if (letter_ids[1]==basket_ids[1] && letter_ids[2]==basket_ids[2]) {
										$(this).fadeOut(100, function(){$(this).fadeIn(500)});
										$(clone).attr('class','letter_blue');
										cfgL.goodLetters++;
									}
									else {
										$(this).effect('pulsate',100);
										$(clone).attr('class','letter_red');
									}
									
	
									if (options.verifyInput===true) {
										cfgL.stepsLength++;
										cfgL.steps[basket_ids[1]]=letter_ids[1];
										if (cfgL.stepsLength==options.letters) setVerify();
									}
									
									if (cfgL.goodLetters==options.letters) setNotRobot();
								}
							}
						}).appendTo(div);
					}
					if (options.codeZone!=false) $(cfg.structure.contains.zone).clone().appendTo(div);
					var zone=$(cfg.structure.contains.end).clone().appendTo(div);
					$(div).appendTo(part).css('width',((cfg.lettersDivs.length*18)+cfg.lettersDivs.length*2+cfg.structure.contains.zone.css('width'))+'px');
				};
				// function, that makes Captcha;
				function wrap(button) {
					var captcha_wrap	=	$('<div/>')	.attr('class','captcha_gbws_wrap')
														.attr('id','captcha_gbws_wrap_'+cfgL.captchas);
					var captcha = 	cfg.structure.outer.captcha.clone().attr('id','captcha_gbws_'+cfgL.captchas);
					var showtip =	cfg.structure.buttons.showtip	.clone()
																	.attr('id','captcha_gbws_top_showtip_'+cfgL.captchas)
																	.bind('click',function() {
																		tip.toggle('blind',300)
																	});
					var tip		=	cfg.structure.contains.tip.clone().attr('id','captcha_gbws_top_tip_'+cfgL.captchas);
					var lock	=	cfg.structure.outer.lock.clone();
					var topdiv	=	cfg.structure.outer.top	.clone()
															.attr('id','captcha_gbws_top_'+cfgL.captchas)
															.append(lock)
															.append(showtip)
															.append(cfg.structure.contains.end.clone())
															.append(tip);	
					var retake	=	cfg.structure.buttons.retake.clone().bind('click',function() {
																			var mas=$(cfgL.captcha).find('.letter, .letter_blue, .letter_red, .basket, .basket_closed');
																			var t=0;
																			for (var x=0; x<mas.length; x++) {
																					t+=150;
																					(function(i,y) {
																						setTimeout(function() {
																							var method='shake'; var speed=150;
																							// TODO make various animation
																							$(mas[y]).stop().hide(method,speed, function(){
																								$(mas[y]).remove()
																							});
																						},i)
																					})(t,x)
																			}
																			setTimeout(function(){
																				$('#'+$(cfgL.blue).attr('id')+' .letters').remove();
																				$('#'+$(cfgL.white).attr('id')+' .baskets').remove();
																				getBaskets(cfgL.white);
																				getWord(cfgL.blue);
																				cfgL.steps=[];
																				cfgL.stepsLength=0;
																				cfgL.goodLetters=0;
																			},t+150);
																		})
					cfgL.top=topdiv;
					cfgL.lock=lock;
					cfgL.showTip=showtip;
					cfgL.retake=retake;
					
					for (var x in cfg.structure.inner) {
						var part=$(cfg.structure.inner[x]).clone().attr('id','captcha_'+x+'_'+cfgL.captchas).appendTo(captcha);
						if (x=='blue') 	{
							cfgL.blue=part;
							getWord(part,'captcha_gbws_'+cfgL.captchas);
						}
						else if (x=='white') {
							cfgL.white=part;
							part.append(retake);
							getBaskets(part);
						}
					}
					
					
					topdiv								.appendTo(captcha_wrap);
					captcha								.appendTo(captcha_wrap);
					cfg.structure.contains.end.clone()	.appendTo(captcha_wrap);
					captcha_wrap						.insertBefore(button);
					tip									.toggle('blind',1);
					
					topdiv								.css('width',captcha.width());
					captcha_wrap						.find(' > *').disableSelection();
					
					cfgL.captcha=captcha_wrap;
					
					if (options.verifyInput===true) {
						if ($(cfgL.button).parents('form:first').length>0) {
							var input=$('<input/>', {
								type:'hidden',
								name:options.verifyName,
								id:'input_gbws_'+cfgL.captchas
							}).attr('class','input_gbws');
							$(cfgL.button).parents('form:first').append(input);
							cfgL.verify=input;
						}
					}
				}
				// function, that puts value of Captcha to the hidden input of form (if enabled in options);
				function setVerify() {
					for (var x in cfgL.steps) {
						$(cfgL.verify).val($(cfgL.verify).val()+options.codeWord.charAt(cfgL.steps[x]));
					}
				}
				// function, that unlock button;
				function setNotRobot() {
						if (options.lockButton===true) $(cfgL.button).removeAttr('disabled');
						
						if (options.hideCaptcha===true) {
							$(cfgL.captcha).fadeOut(1000, function(){
								if (options.hideButton===true) {
									$(cfgL.button).fadeIn(600, function() {
										if (options.scrollToButton===true) $.scrollTo(cfgL.button, 500);
									})
								};
							})
						}
						else {
							var div=$('<div/>').attr('class','captcha_human').append(cfgL.lock).appendTo(cfgL.blue);
							cfgL.lock.attr('class','captcha_unlock');
							cfgL.top.html(options.captchaUnlocked);
							cfgL.retake.remove();
							
							if (options.hideButton===true) {
								$(cfgL.button).fadeIn(300, function() {
									if (options.scrollToButton===true) $.scrollTo(cfgL.button, 500);
								})
							};
						}
				}
			})(this[x])
		}
		
		return this;
	}
})(jQuery);
