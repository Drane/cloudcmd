"use strict";

/* Обьект содержащий все функции и переменные 
 * серверной части Cloud Commander'а
 */
var CloudServer={
    /* функция, которая генерирует заголовки
     * файлов, отправляемые сервером клиенту
     */
    generateHeaders :function(){},
    /* функция высылает
     * данные клиенту
     */
    sendResponse        :function(){},
    /* Структура содержащая функции,
     * и переменные, в которых
     * говориться о поддерживаемых
     * браузером технологиях
     */
    BrowserSuport   :{},
     /* Обьект для работы с кэшем */
    Cashe                   :{},
    /* Обьект через который
     * выполняеться сжатие
     * скриптов и стилей
     */
    Minify                  :{},
    /* Асоциативный масив обьектов для
     * работы с ответами сервера
     * высылаемыми на запрос о файле и
     * хранащий информацию в виде
     * Responces[name]=responce;
     */
    Responses               :{},
    
    /* ПЕРЕМЕННЫЕ */
    /* Поддержка браузером JS*/
    NoJS            :true,
    /* обьект содержит данные
     * о необходимости сжатия
     * данных и скриптов
     */
    Minimize        :{
        scriptSize:false,
        styleSize:false
    },
    /* Поддержка gzip-сжатия
     * браузером
     */
    Gzip            :undefined,
    
    /* КОНСТАНТЫ */
    /* index.html */
    INDEX           :'index.html'
};

/* 
 * Обьект для работы с кэшем
 * аналог клиентского обьекта
 * с тем отличием, что в нём
 * будут храниться серверные
 * данные, такие как файлы
 * отдаваемые клиенту
 * (файлы проэкта по большому
 * счёту, для ускорения
 * первичной загрузки)
 */
CloudServer.Cache={
    _allowed            :true,     /* приватный переключатель возможности работы с кэшем */
    /* данные в которых храняться файлы 
     * в формате <поле> : <значение>
     * _data[name]=pData;
     * одному имени соответствуют 
     * одни данные
     */
    _data               :{},
    
    /* функция говорит можно ли работать с кэшем */
    isAllowed           :(function(){
        return CloudServer.Cache._allowed;
        }),
    /* функция устанавливает возможность работать с кэшем */
    setAllowed          :(function(pAllowed){
       CloudServer.Cache._allowed=pAllowed;
    }),
    /* Если доступен кэш
     * сохраняем в него данные
     */
    set                  :(function(pName, pData){
        if(CloudServer.Cache._allowed && pName && pData){
           CloudServer.Cache._data[pName]=pData;
        }
    }),
    /* Если доступен Cache принимаем из него данные*/
    get                 :(function(pName){
        if(CloudServer.Cache._allowed && pName){
            return CloudServer.Cache._data[pName];
        }
        else return null;
    }),
    
    /* Функция очищает кэш*/
    clear               :(function(){
        if(CloudServer.Cache._allowed){
            CloudServer.Cache._data={};
        }
    })
};

/* Обьект для сжатия скриптов и стилей
 */
CloudServer.Minify={
    scripts : function(){
        if(CloudServer.Minimize.scriptSize){
            var lMinify      = require('./minify');
            var lResult_b=lMinify.jsScripts();
            /* if we get false, files wasn't minified
             * error ocured
             */
            CloudServer.Minify.done=(lResult_b===undefined?true:false);
        }
    },
    /* свойство показывающее случилась ли ошибка*/
    done: false
};

//var DirContent;
var LeftDir='/';
var RightDir=LeftDir;
//var LPrevDir;
//var RPrevDir;

var Fs      = require('fs');    /* модуль для работы с файловой системой*/
var Path    = require('path');   /* модуль для работы с путями*/
var Zlib    = require('zlib');  /* модуль для сжатия данных gzip-ом*/
var CloudFunc=CloudServer.Minimize.scripts?/* если стоит минификация*/
        require('./cloudfunc.min'):/* добавляем сжатый - иначе обычный */
        require('./cloudfunc'); /* модуль с функциями */


/* конструктор*/
CloudServer.init=(function(){
    /* Переменная в которой храниться кэш*/
    CloudServer.Cache.setAllowed(false);
    CloudServer.Minimize.scriptSize=true;
    /* Если нужно минимизируем скрипты */
    CloudServer.Minify.scripts();
});


/* создаём сервер на порту 31337*/
CloudServer.start=function()
{
    CloudServer.init();
    
    var http = require('http');    
    http.createServer(CloudServer._controller).listen(process.env.PORT ||
        process.env.VCAP_APP_PORT /* cloudfoundry */      ||
        31337,
        '0.0.0.0' || '127.0.0.1');
    console.log('Cloud Commander server running at http://127.0.0.1:'+
        (process.env.PORT===undefined?31337:process.env.PORT));
};


/* Функция создаёт заголовки файлов
 * в зависимости от расширения файла
 * перед отправкой их клиенту
 * @pName - имя файла
 * @pGzip - данные сжаты gzip'ом
 */
CloudServer.generateHeaders = function(pName, pGzip){
    var lType='';
    /* высылаем заголовок в зависимости от типа файла */
    /* если расширение у файла css -
     * загружаем стили
     */
    if(CloudFunc.checkExtension(pName,'css'))
        lType='text/css';
    /* загружаем js */
    else if(CloudFunc.checkExtension(pName,'js'))
        lType='text/javascript';
    /* загружаем картинки*/
    else if(CloudFunc.checkExtension(pName,'png'))
        lType='img/png';
    /* загружаем json*/
    else if(CloudFunc.checkExtension(pName,'json'))
        lType='application/json';
    else if(CloudFunc.checkExtension(pName,'html'))
        lType='text/html';
    /* если это неизвестный тип файла - 
     * высылаем его просто как текст
     */
    else lType='text/plain';
        
    return {
        'Content-Type': lType+'; charset=UTF-8',
        'cache-control': 'max-age='+(31337*21),
        'last-modified': new Date().toString(),
        'content-encoding': pGzip?'gzip':'',
        /* https://developers.google.com/speed/docs/best-practices/caching?hl=ru#LeverageProxyCaching */
        'Vary': 'Accept-Encoding'
    };
};

/*
 * Главная функция, через которую проихсодит
 * взаимодействие обмен данными с клиентом
 * @req - запрос клиента (Request)
 * @res - ответ сервера (Response)
 */
CloudServer._controller=function(pReq, pRes)
{
    /* Читаем содержимое папки,
        переданное в url
    */
    var url = require("url");
    var pathname = url.parse(pReq.url).pathname;
    console.log('pathname: '+pathname);
    
     /* получаем поддерживаемые браузером кодировки*/
     var lAcceptEncoding = pReq.headers['accept-encoding'];
    /* запоминаем поддерживает ли браузер
     * gzip-сжатие при первом заходе на сайт
     */ 
    if (lAcceptEncoding && 
        lAcceptEncoding.match(/\bgzip\b/)){
        CloudServer.Gzip=true;
    }else 
        CloudServer.Gzip=false;
    /* путь в ссылке, который говорит
     * что js отключен
     */
    var lNoJS_s=CloudFunc.NOJS;
    var lFS_s=CloudFunc.FS;
    
    if(pathname!=='/favicon.ico')
    {    
        console.log("request for " + pathname + " received...");
        var lName;
                        
        /* если в пути нет информации ни о ФС,
         * ни об отсутствии js,
         * ни о том, что это корневой
         * каталог - загружаем файлы проэкта
         */
         console.log(lFS_s+pathname);
        if(pathname.indexOf(lFS_s)<0 &&
            pathname.indexOf(lNoJS_s)<0 &&
            pathname!=='/'){
            /* если имена файлов проекта - загружаем их*/  
            /* убираем слеш и читаем файл с текущец директории*/
            lName=Path.basename(pathname);
            console.log('reading '+lName);
            /* сохраняем указатель на responce и имя */
            CloudServer.Responses[lName]=pRes;
            
            /* Берём значение из кэша
             * сжатый файл - если gzip-поддерживаеться браузером
             * не сжатый - в обратном случае
             */
            var lFileData=CloudServer.Cache.get(CloudServer.Gzip?(lName+'_gzip'):lName);

            var lReadFileFunc_f=CloudServer.getReadFileFunc(lName);
            /* если там что-то есть передаём данные в функцию
             * readFile
             */
            if(lFileData){
                console.log('readed from cache');
                /* передаём данные с кэша,
                 * если gzip включен - сжатые
                 * в обратном случае - несжатые
                 */
                lReadFileFunc_f(undefined,lFileData,true);
            }
            else Fs.readFile(lName,lReadFileFunc_f);
            
        }else{/* если мы имеем дело с файловой системой*/
            /* если путь не начинаеться с no-js - значит 
             * js включен
             */
            /* убираем пометку cloud, без которой c9.io
             * не работает поскольку путь из двух слешей
             * (/fs/no-js/) - очень короткий, нужно
             * длиннее
             */
            
            if(pathname.indexOf(lNoJS_s)!=lFS_s.length && pathname!='/'){
                CloudServer.NoJS=false;
            }else pathname=pathname.replace(lNoJS_s,'');
            
            /* убираем индекс файловой системы */
            if(pathname.indexOf(lFS_s)===0){
                pathname=pathname.replace(lFS_s,'');
                /* если посетитель только зашел на сайт
                 * no-js будет пустым, как и fs
                 */                       
            /* если в пути нету fs - посетитель только зашел на сайт
             * загружаем его полностью.
             */
            }else CloudServer.NoJS=true;
            /* если в итоге путь пустой
             * делаем его корневым
             */                         
            if(pathname==='')pathname='/';
            
            RightDir=pathname;
            LeftDir=pathname;               
            //DirContent=fs.readdirSync(LeftDir);
            
            /* если встретиться пробел - 
             * меня код символа пробела на пробел
             */
            
            LeftDir=CloudFunc.replaceSpaces(LeftDir);
            RightDir=CloudFunc.replaceSpaces(RightDir);
            
            /* Проверяем с папкой ли мы имеем дело */
            
            /* читаем сновные данные о файле */
            var lStat;
            try{
                lStat=Fs.statSync(LeftDir);
            }catch(error){
                console.log(error);
                CloudServer.Responses[LeftDir]=pRes;
                CloudServer.sendResponse('OK',error.toString(),LeftDir);
            }
            /* если это каталог - 
             * читаем его содержимое
             */
            try{    
                /*
                 * сохраним указатель на response
                 */            
                CloudServer.Responses[CloudServer.INDEX]=pRes;
                if(lStat.isDirectory())                    
                    Fs.readdir(LeftDir,CloudServer._readDir);                
                /* отдаём файл */
                else if(lStat.isFile()){
                    CloudServer.Responses[LeftDir]=pRes;
                    Fs.readFile(LeftDir,CloudServer.getReadFileFunc(LeftDir));
                    console.log('reading file: '+LeftDir);
                }
            }catch(error){console.log(error);}
        }
    }
};

/* Функция читает ссылку или выводит информацию об ошибке*/
CloudServer._readDir=function (pError, pFiles)
{
    if(!pError)
    {
        /* данные о файлах в формате JSON*/
        var lJSON=[];
        var lJSONFile={};
        /* Если мы не в корне добавляем слеш к будующим ссылкам */       
       if(LeftDir!='/')
        {
            RightDir+='/';
            LeftDir+='/';
        }
        //DirContent=
        pFiles=pFiles.sort();
                
        lJSON[0]={path:LeftDir,size:'dir'};
        var fReturnFalse=function returnFalse(){return false;};        
        for(var i=0;i<pFiles.length;i++)
        {
            /* Получаем информацию о файле*/
            var lStats;
            try{
                lStats=Fs.statSync(RightDir+pFiles[i]);
            }catch(err){
                console.log(err);
                lStats={
                    'mode':undefined,
                    'size':undefined,
                    'isDirectory':fReturnFalse
                };
            }
            /*
             *Переводим права доступа в 8-ричную систему
             */
            var lMode=(lStats.mode-0).toString(8);            
                        
            /* Если папка - выводим пиктограмму папки */
            if(lStats.isDirectory())
            {                
                lJSONFile={'name':pFiles[i],'size':'dir','uid':lStats.uid,'mode':lMode};
                lJSON[i+1]=lJSONFile;            
            }
            /* В противоположном случае - файла */
            else
            {
                lJSONFile={'name':pFiles[i],'uid':lStats.uid,'size':lStats.size,'mode':lMode};
                lJSON[i+1]=lJSONFile;
            }
        }
        
        /* заголовок ответа сервера */        
        var lHeader;        
        var lList;
        /* если js недоступен */
        /* если javascript отключен вылылаем html-код
         * и прописываем соответствующие заголовки
         */
        if(CloudServer.NoJS){
            var lPanel=CloudFunc.buildFromJSON(lJSON);
            lList='<ul id=left class=panel>';
            lList+=lPanel;
            lList+='</ul>';
            
            lList+='<ul id=right class="panel hidden">';
            lList+=lPanel;
            lList+='</ul>';
            try{
                var lIndex;
                /* пробуем достать данные из кэша
                 * с жатием или без, взависимости
                 * от настроек
                 */
                var lFileData=CloudServer.Cache.get(CloudServer.INDEX);
                /* если их нет там - вычитываем из файла*/
                if(!lFileData){
                    lIndex=Fs.readFileSync(CloudServer.INDEX);
                    /* и сохраняем в кэш */
                    CloudServer.Cache.set(CloudServer.INDEX,lIndex);
                }else lIndex=lFileData;
                
                /* если выбрана опция минифизировать скрпиты
                 * меняем в index.html обычный client.js на
                 * минифицированый
                 */
                lIndex=lIndex.toString();
                
                /* if scripts shoud be minified and
                 * minification proceed sucessfully
                 * we include minified version of
                 * clien.js to index.html
                 */
                (CloudServer.Minimize.scriptSize && CloudServer.Minify.done)?
                    lIndex=lIndex.replace('client.js','client.min.js'):'';
                
                lIndex=lIndex.toString().replace('<div id=fm class=no-js>','<div id=fm class=no-js>'+lList);
                /* меняем title */
                lIndex=lIndex.replace('<title>Cloud Commander</title>',
                    '<title>'+CloudFunc.setTitle()+'</title>');
                /* отображаем панель быстрых клавишь */
                lList=lIndex;
                 /* если браузер поддерживает gzip-сжатие*/
                lHeader=CloudServer.generateHeaders('text/html',CloudServer.Gzip);
            }catch(error){console.log(error);}
        }else{
            /* в обычном режиме(когда js включен
             * высылаем json-структуру файлов
             * с соответствующими заголовками
             */
            lList=JSON.stringify(lJSON);
            lHeader=CloudServer.generateHeaders('application/json',CloudServer.Gzip);
        }
        /* если браузер поддерживает gzip-сжатие - сжимаем данные*/                
        if(CloudServer.Gzip){
            Zlib.gzip(lList,CloudServer.getGzipDataFunc(lHeader,CloudServer.INDEX));
        }
        /* если не поддерживаеться - отсылаем данные без сжатия*/
        else
            CloudServer.sendResponse(lHeader,lList,CloudServer.INDEX);
    }
    else
    {
        console.log(pError);
        CloudServer.sendResponse('OK',pError.toString());
    }
};

/* Функция генерирует функция считывания файла
 * таким образом, что бы у нас было 
 * имя считываемого файла
 * @pName - полное имя файла
 */
CloudServer.getReadFileFunc = function(pName){
/*
 * @pError  - ошибка
 * @pData   - данные
 * @pFromFile - прочитано с файла bool
 */    
    var lReadFile=function(pError,pData,pFromCache_b){
        if (!pError){
            console.log('file ' + pName + ' readed');
            
            /* берём из кэша данные файла
             * если их нет в кэше - 
             * сохраняем
             */            
            if(!pFromCache_b && CloudServer.Cache.isAllowed)
                CloudServer.Cache.set(pName,pData);
            /* если кэш есть
             * сохраняем его в переменную
             * которая до этого будет пустая
             * по скольку мы будем вызывать этот метод
             * сами, ведь файл уже вычитан
             */
            
            var lHeader=CloudServer.generateHeaders(pName,CloudServer.Gzip);
            /* если браузер поддерживает gzip-сжатие - сжимаем данные*/
            if(CloudServer.Gzip &&!pFromCache_b){
                /* сжимаем содержимое */
                Zlib.gzip(pData,CloudServer.getGzipDataFunc(lHeader,pName));                
            }
            else{
                /* высылаем несжатые данные */
                CloudServer.sendResponse(lHeader,pData,pName);
            }
        }
        else
        {
            console.log(pError.path);
            if(pError.path!='passwd.json')
            {
                console.log(pError);
                CloudServer.sendResponse('OK',pError.toString());
            }else{
                CloudServer.sendResponse('OK','passwd.json');
            }            
        }
    };
    return lReadFile;
};

/* Функция получает сжатые данные
 * @pHeader - заголовок файла
 */
CloudServer.getGzipDataFunc=function(pHeader,pName){
    return function(error,pResult){
                    if(!error){
                        /* отправляем сжатые данные
                         * вместе с заголовком
                         */                            
                         /* если установлена работа с кэшем
                          * сохраняем сжатые данные
                          */
                        if(CloudServer.Cache.isAllowed){
                            /* устанавливаем кєш */
                            console.log(pName+' gziped');
                            CloudServer.Cache.set(pName+'_gzip',pResult);
                        }
                        CloudServer.sendResponse(pHeader,pResult,pName);                        
                    }
                    else{
                        console.log(error);
                        CloudServer.sendResponse(pHeader,error);
                    }
    };
};
/* Функция высылает ответ серверу 
 * @pHead       - заголовок
 * @pData       - данные
 * @pName       - имя отсылаемого файла
 */
CloudServer.sendResponse = function(pHead, pData,pName){
    /* если у нас есть указатель на responce
     * для соответствующего файла - 
     * высылаем его
     */
    var lResponse=CloudServer.Responses[pName];
    if(lResponse){
        lResponse.writeHead(200,pHead);
        lResponse.end(pData);
        console.log(pName+' sended');
    }
};

CloudServer.start();