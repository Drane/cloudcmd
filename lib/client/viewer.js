var CloudCommander, CloudFunc, $;
/* object contains viewer FancyBox
 * https://github.com/fancyapps/fancyBox
 */
CloudCommander.Viewer = {
    dir : CloudCommander.LIBDIRCLIENT + 'viewer/',
    
    getByClass  : function(pClass){
        return document.getElementsByClassName(pClass);
    }
};
CloudCommander.Viewer.FancyBox = {    
    dir     : CloudCommander.Viewer.dir + 'fancybox/',
    /* function return configureation
     * for FancyBox open and
     * onclick (it shoud be
     * different objects)
     */
    getConfig: (function(){
        return{
            beforeShow : (function(){
            CloudCommander.keyBinded = false;
            }),
            beforeClose: (function(){
                CloudCommander.keyBinded = true;
            }),
            
            openEffect    : 'none',
            closeEffect	: 'none',
            
            helpers : {
                overlay : {
                    opacity: 0.1,
                    css : {
                        'background-color' : '#fff'
                    }
                }
            },
            padding : 0
        };
    }),
    /* function loads css and js of FancyBox
     * @pParent     - this
     * @pCallBack   -  executes, when everything loaded
     */
    load: (function(pParent, pCallBack){
        return function(){
            var ljsLoad_f = function(){                
                var lSrc = 'http://fancyapps.com/fancybox/source/jquery.fancybox.pack.js';
                
                CloudCommander.jsload(lSrc,{
                        onload: pCallBack,
                        
                        onerror: (function(){
                            pParent.removeNotLoaded({src: lSrc,
                                parent  : pParent,
                                from    : document.body
                            });
                            
                            CloudCommander.jsload(pParent.dir +
                                'jquery.fancybox.pack.js', {onload: pCallBack});
                        })
                });
            };
            
            var lSrc = 'http://fancyapps.com/fancybox/source/jquery.fancybox.css';
            
            CloudCommander.cssLoad({
                src  : lSrc,
                func : {
                    onload: ljsLoad_f,
                    onerror: (function(){                        
                        pParent.removeNotLoaded({src: lSrc,
                            parent  : pParent,
                            from    : document.head
                        });
                        
                        CloudCommander.cssLoad({
                            src  : pParent.dir +'jquery.fancybox.css',
                            func : ljsLoad_f
                        });
                    })
                }
            });
        }();
    }),
    set: function(){
        if(this.getByClass('fancybox').length)
            return;
        try{
            /* get current panel (left or right) */
            var lPanel = this.getByClass('current-file');

            lPanel.length &&
                (lPanel = lPanel[0].parentElement);
                
            /* get all file links */
            var lA = lPanel.getElementsByTagName('a');
            
            var lName;
            /* first two is not files nor folders*/
            for (var i=2; i < lA.length; i++) {
                lName = lA[i].title || lA[i].textContent;
                
                CloudFunc.checkExtension(lName,['png','jpg']) && 
                    (lA[i].className    = 'fancybox') &&
                    (lA[i].rel          = 'gallery');
            }
            
            $('.fancybox').fancybox(this.getConfig());
        }catch(pError){
            console.log(pError);
        }
    },
    getById         : function(pId){return document.getElementById(pId);},
    
    getByClass      : function(pClass){
        return document.getElementsByClassName(pClass);
    },
    
    /* @pParams_o - information for deletion     
     * {src: 1.js, from:document.body, parent:this 
     */
    removeNotLoaded : function(pParams_o){
        /* removing already loaded element
         * with same id
         */
        var lId = CloudCommander._getIdBySrc(pParams_o.src);
        lId     = pParams_o.parent.getById(lId);
        lId &&
            pParams_o.from.removeChild(lId);
    }
};
CloudCommander.Viewer.Keys = (function(){
    "use strict";
            
    var lCallBack_f = (function(pParent){
        var key_event = function(){
            return function(event){
                /* если клавиши можно обрабатывать */
                if(CloudCommander.keyBinded){
                    /* if f3 pressed */
                    if(event.keyCode===114){                    
                        CloudCommander.Viewer.FancyBox.set();
                        var lCurrent = pParent.getByClass('current-file');
                              lCurrent.length &&
                                (lCurrent = lCurrent[0]);
                        
                        var lA = lCurrent.getElementsByClassName('fancybox');
                                            
                        var lConfig = pParent.FancyBox.getConfig();
                        
                        lA.length &&
                            $.fancybox.open({ href : lA[0].href },
                                lConfig);
                    
                    event.preventDefault();
                    }
                }
            };
        };
           
        /* добавляем обработчик клавишь */
        if (document.addEventListener)                
            document.addEventListener('keydown', key_event(pParent),false);
            
        else        
            document.onkeypress=key_event;
    });
        
    CloudCommander.Viewer.FancyBox.load(this.FancyBox, lCallBack_f(this));
});