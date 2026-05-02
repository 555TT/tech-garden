# 仓库类别

广义上讲，仓库可以分为两大类，本地仓库和远程仓库。远程仓库细分的话，可以分为中央仓库、非中央仓库（例如公司的私服仓库）。

中央仓库就是maven官方的仓库，在super pom中定义的，super pom的位置在$MAVEN_HOME/lib/maven-model-builder-x.x.x.jar中org\apache\maven\model下的pom-4.0.0.xml，super pom是每个pom文件都会间接继承的超级pom（即使你没有显示通过\<parent\>配置）。非中央仓库就是除了https://repo.maven.apache.org/maven2之外的所有远程仓库。

# 哪些地方可以配置仓库？

1. settings.xml中：

\<localRepository\>定义本地仓库

```xml
<localRepository>/Users/polter/dev/java/maven/maven_repo</localRepository>
```

（本地仓库的默认路径：~/.m2/repository，mac|windows都一样)

\<profiles\>标签内的\<repositories\>标签和\<pluginRepositories\>标签。**注意：settings.xml中，repositories标签不可直接定义在外面，必须要定义在profiles标签内**

```xml
    <profiles>
        <profile>
            <id>maven-tencentyun</id>
            <repositories>
                <repository>
                    <id>tencent_maven</id>
                    <url>https://mirrors.tencent.com/nexus/repository/maven-public/</url>
                </repository>
                <repository>
                    <id>tencent_public</id>
                  <url>https://mirrors.tencent.com/repository/maven/tencent_public/</url>
                    <releases>
                        <enabled>true</enabled>
                    </releases>
                    <snapshots>
                        <enabled>false</enabled>
                    </snapshots>
                </repository>
                <repository>
                    <id>tencent_public_snapshots</id>
              <url>https://mirrors.tencent.com/repository/maven/tencent_public_snapshots/
                    </url>
                    <releases>
                        <enabled>false</enabled>
                    </releases>
                    <snapshots>
                        <enabled>true</enabled>
                    </snapshots>
                </repository>
                <repository>
                    <id>tencent_thirdparty_snapshots</id>
                    <url>https://mirrors.tencent.com/repository/maven/thirdparty-snapshots</url>
                    <releases>
                        <enabled>false</enabled>
                    </releases>
                    <snapshots>
                        <enabled>true</enabled>
                    </snapshots>
                </repository>
            </repositories>

            <pluginRepositories>
                <pluginRepository>
                    <id>tencent_public-plugin-release</id>
                    <name>Tencent Yun Plugin Release</name>
                    <url>https://mirrors.tencent.com/repository/maven/tencent_public</url>
                    <releases>
                        <enabled>true</enabled>
                    </releases>
                    <snapshots>
                        <enabled>false</enabled>
                    </snapshots>
                </pluginRepository>
                <pluginRepository>
                    <id>tencent_public_snapshots-plugin-snapshots</id>
                    <name>Tencent Yun Plugin Snapshots</name>
                    <url>https://mirrors.tencent.com/repository/maven/tencent_public_snapshots</url>
                    <releases>
                        <enabled>false</enabled>
                    </releases>
                    <snapshots>
                        <enabled>true</enabled>
                    </snapshots>
                </pluginRepository>
            </pluginRepositories>
        </profile>

        <profile>
            <id>maven-ali</id>

            <repositories>
                <repository>
                    <id>ali_maven</id>
                    <url>https://maven.aliyun.com/repository/central</url>
                </repository>
                <repository>
                    <id>ali_public</id>
                    <url>https://maven.aliyun.com/repository/public</url>
                    <releases>
                        <enabled>true</enabled>
                    </releases>
                    <snapshots>
                        <enabled>false</enabled>
                    </snapshots>
                </repository>
            </repositories>

        </profile>

    </profiles>
```

当然\<pluginRepositories\>标签也可以不定义在profile里面，单独出现。

2. pom中：\<repositories\>标签，\<profiles\>标签，\<pluginRepositories\>标签

同上。但是和settings.xml不同的是，在pom中可以直接在外面定义repositories标签和pluginRepositories，不是必须定义在profiles里面。并且，这是很常见的做法。

3. 另外还有在super pom中配置的中央仓库

经典Q&A：

疑惑1：settings.xml中的\<mirrors\>配置的不是仓库吗？？？

这是几乎所有初学者都会疑惑的地方，因为大家在学习maven的时候，老师基本上都是直接给你说，要在settings.xml中配置一个阿里云的镜像，这样我们就会从阿里云的maven仓库下载依赖了。所以会觉得mirrors就是配置了一个阿里云的仓库，但这样理解是完全错误的！

配置仓库只有通过上面的方式，mirrors只是配置了某个仓库的镜像而已。例如mirror的mirrorOf定义为central

```xml
		<mirror>
            <id>mirrorId</id>
            <mirrorOf>central</mirrorOf>
            <name>Nexus tencentyun mirror for maven repositories.</name>
            <url>https://mirrors.tencent.com/nexus/repository/maven-public</url>
        </mirror>
```

就是定以了中央仓库的镜像，当从中央仓库下载镜像时，会用你配置的镜像地址而不是用原始的https://repo.maven.apache.org/maven2地址。

mirrorOf的其它值的含义：

- `*`: 匹配所有远程仓库 (最常用，如指向公司内部的 Nexus/Artifactory )。
- `external:*`: 匹配所有远程仓库，除了本地文件系统 (file://) 和 localhost 定义的仓库。
- `repo1,repo2`等具体仓库id: 匹配 id 为 repo1 或 repo2 的仓库。
- `*,!repo1`: 匹配所有仓库，除了 id 为 repo1 的仓库。
- `central`: 仅镜像中央仓库

疑惑2：profile到底是个什么，为什么里面可以定义仓库？

可以用spring的profile来对比理解，spring的profile是用来区分不同的环境的配置文件，如dev、test等，而且要指定你要激活哪个配置文件。maven的也一样，你可以为了区分不同的环境从而定义多套仓库配置，然后在activeProfiles标签中指定你要激活的仓库列表：

```xml
 <activeProfiles>
        <activeProfile>maven-tencentyun</activeProfile>
    </activeProfiles>
```

activeProfile标签的值是profile的id

在idea中看到的![image-20250701223056654](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250701223056654.png)

这个就是profiles中定义的。

# maven仓库的查找顺序

官方这样说的：https://maven.apache.org/guides/mini/guide-multiple-repositories.html

![image-20250701223405424](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250701223405424.png)

几点规则：

1. 全局配置文件settings.xml中的配置项的优先级最高，也就是maven安装目录下的conf/settings.xml优先级最高

2. 其次是用户级别的配置文件优先级次高，默认是${user.home}/.m2/settings.xml
3. 最后就是本地的pom.xml文件优先级次次高
4. 当确定了要查询某个仓库时，会先看这个仓库有没有对应的镜像仓库，如果有的话，则转向去查镜像仓库，也就是会查当前仓库的替代品(镜像仓库)，跳过对本仓库的检索
5. 如果同一个pom文件里面有多个激活的profile，则靠后面激活的profile的优先级高
6. 针对pom文件，如果有激活的profile，且profile里面配置了repositories，则profile里面的repositories的仓库优先级比标签下面的repositories的优先级高
7. pom文件中无论是project标签下面直接定义的repositories，还是profile标签下面定义的repositories，repositories内部的repository的查询顺序，都是按照仓库定义的顺序查询，也就是自上而下查询。
8. 如果settings.xml中的profile的id和pom文件中的profile的id一样，则以settings.xml中的profile中配置的值为准
9. 如果同一个pom文件中有多个profile被激活，那么处于profiles内部靠后面生效的profile优先级比profiles中靠前的profile的优先级高

整体的优先级方面:

settings.xml > ${user.home}/.m2/settings.xml >本地的pom.xml文件。

具体的查找顺序：

settings.xml中激活的profile（多个激活的profile，靠后的比靠前的优先级高，同一个profile内，优先级按顺序）>pom中的repositories标签>激活的profile>中央仓库

另外有的私服仓库需要认证，就需要通过settings.xml中的servers标签来配置，server标签的id要和仓库的id对应。