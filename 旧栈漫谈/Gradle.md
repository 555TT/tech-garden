想研究spring的源码，但是spring是用gradle构建的，把spring-framework的源码拉下来用gradle构建这个源码项目，遇到了一些问题，记录一下。

# gradle快速入门

## 1.官网下载

## 2.配置环境变量

配置GRADLE_HOME，值为你的gradle安装根目录。

![image-20250523162544861](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250523162544861.png)

配置GRADLE_USER_HOME（类似于maven的本地仓库，但功能不完全一样）

![image-20250523162637500](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250523162637500.png)

最后再在path里添加%GRADLE_HOME%\bin，这样在任何目录都能用gradle了。

![image-20250523163815481](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250523163815481.png)

## 3.镜像

我搜了很多国内镜像的配置教程，比如配置阿里云的等，但最终下载依赖还是出问题了。索性就不配镜像了，直接用官方原地址，但要开梯子加速，给gradle下载配置代理。

## 4.代理配置

两种方式：

* 全局配置：在你的用户目录下的.gradle文件下新建或修改gradle.properties文件，添加下面配置。（

```properties
systemProp.http.proxyHost=127.0.0.1
systemProp.http.proxyPort=7890
systemProp.https.proxyHost=127.0.0.1
systemProp.https.proxyPort=7890
```

我用的clash，所以端口是7890

用户目录直接用cd命令，~代表当前用户根目录

```sh
cd ~
```

* 当前项目配置：在当前项目下的gradle.properties文件中添加上面配置

<u>**但是我配的全局配置没有生效，而在当前项目下配置就生效了。**。。</u>

## 5.使用idea打开gradle项目

打开项目时选中build.gradle打开

![image-20250523164130449](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250523164130449.png)

gradle选择本地的gradle，选包装器还得下载，本地有，直接用本地就行了。

![image-20250523164243517](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250523164243517.png)

然后和maven一样，刷新就行了。

![image-20250523164341157](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250523164341157.png)