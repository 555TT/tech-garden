go的包管理发展历程：GOPATH,go<go1.5，从go诞生就有；go vendor ,go>=go1.5；go modules ,go>=go1.11

GOPATH严格说不算是一种包管理方式，只是提供了一个统一的工作空间，包都存放在这个目录下。

GOPATH和GOROOT不能是同一个目录，不然会导致go原生包和自己的项目包重名。

# go env中的配置辨析

go env -w是将配置保存到一个文件中了，mac系统是在~/Library/Application Support/go/env文件中。当系统的环境变量和go env文件冲突时，使用环境变量中的值。 

GOPATH是go的工作区，下载的依赖的源码默认存放到GOPATH/pkd/mod下，安装的可执行程序默认存放到GOPATH/bin下，在GO111MODULE未开启的GOPATH模块下，GOPATH/src还是我们的项目源码存放的位置。

GO111MODULE，设置go modules模式是否开启，go1.11<=go<=go1.15时，GO111MODULE默认值为auth，从go1.16起，GO111MODULE默认为on。go modules是go1.11出现的，所以这个配置名叫GO111MODULE。

GOBIN目录存储go install安装的模块的可执行程序，默认值为GOPATH/bin。通常将GOBIN添加到系统PATH中，这样就可以在任意地方执行go安装的可执行程序了。

GOMODCACHE目录存储go get、go install、go mod tidy下载的源码，默认值就是GOPATH/pkg/mod

GOCACHE目录缓存编译等构建操作的结果，mac系统上的默认值为~/Library/Caches/go-build。

# go get , go build , go install

go get将将远程模块下载到GOPATH中，并自动整理go.mod和go.sum。新版go不再支持在任意地方执行go get了，只能在go mod模块下执行。

1.11<=go<1.18时，go get可以自动对包含main包的模块生成可执行程序，安装到GOPATH/bin或GOBIN下。大于1.18时go get不再自动安装可执行程序了，推荐使用 go install来安装，go install可以在任意目录下执行，将远程模块或者**本包模块**编译为可执行程序安装到GOPATH/bin或者GOBIN下，如果是远程模块先会对模块执行下载到pkd/mod的操作。

go build对于包含main包的模块执行会生成可执行程序，但不会自动放到bin目录下，也可以对普通模块执行go build，但不会生成可执行程序，只是会将编译结果缓存到GOCACHE目录下。

# go.mod go.sum

go.mod文件， 如果准备将模块放到github供别人使用，module声明的模块路径要是仓库的全路径。

```go
module github.com/555TT/tech
```

 go.sum是当前模块直接依赖和间接依赖的所有包的hash。go会根据这份hash对依赖的包做哈希校验，确保使用的模块的可信性。

不会校验对依赖包做哈希校验的情况

1. GOPRIVATE中匹配的包，例如，GOPRIVATE=*.yukework.com，则对所有后缀为yukework.com的模块都不做哈希校验。
2. GONOSUMDB中匹配的包。
3. 将GOSUMDB的设置为off，则关闭哈希校验。GOSUMDB的默认值是sum.golang.org，是go校验和数据库的地址。
4. 打包到venor目录中的包。