

http.ListenAndServe(addr string, handler Handler) error

路由逻辑：当handler为nil时，默认使用的DefaultServeMux作为路由器（官方注释中称为HTTP request multiplexer），DefaultServeMux是http.ServeMux类型的。所以也可以自己调用http.NewServeMux()创建一个ServeMux作为ListenAndServe的handler参数，此时HTTP request multiplexer就是我们自己创建的ServeMux。如果不用路由器直接将一个处理器作为ListenAndServe的handler参数，那么所有的请求都会走这个handler。

http.HandleFunc函数实现中,use121 变量是 Go 为了处理 HTTP 路由匹配规则的向后兼容性问题而引入的特性开关。根据user121来判断是走旧版本路由逻辑，还是使用1.21之后的路由逻辑。不管是旧还是新逻辑，都是用的DefaultServeMux作为路由器。

post类型的请求中，form-data和x-www-form-urlencoded两种body格式。form-data是将数据拆成多个块，每个字段一块,go中用request.ParseMultipartForm()，能传输文件；x-www-form-urlencoded是把数据编码成key=value&key=value（像 URL 查询字符串）,go中用request.ParseForm()，且不能传输文件。

httptest可以不启动服务器(不http.ListenAndServe)直接测试http handler，直接构造一个请求->拿响应。

