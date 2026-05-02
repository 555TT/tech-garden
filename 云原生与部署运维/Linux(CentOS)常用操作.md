

作为一个开发，linux是经常要用的，但又不像运维那样天天使用linux，所以有些常用操作偶尔会忘记，在这记录一下。方便查找，不用每一次都gpt或者施展搜索大法了。(本篇都是基于centos，其它发行版可能略有差异)

# 基础操作

vim相关：

/查找某内容时，可以按n跳转到下一个匹配项

jar包也可以直接vim

关闭防火墙

```shell
sudo systemctl stop firewalld #立即停止
```

```shell
sudo systemctl disable firewalld #关闭开机自启动
```

重命名文件

```shell
mv oldfilename newfilename
```

查看与8080端口相关联的网络连接

```shell
lsof -i:8080
```

top 然后按1查看各个核的cpu利用率

同步时间

```shell
sudo ntpdate pool.ntp.org
```

查看网络连接

```shell
netstat -napt
```

释放内存

```shell
sudo sync; echo 3 > /proc/sys/vm/drop_caches
```

删除文件夹：rmdir  删除文件： rm

scp

ssh免密登录

sz：从远程服务器下载文件到本地。

```shell
sz 1.txt
```

rz：将本地文件上传到远程服务器

```shell
rz
```

sz和rz需要安装：

```shell
sudo yum install lrzsz
```

一页一页的查看文件，防止文件太大直接vim或cat把内存打爆

```shell
less filename
```

更换yum源：

删除/etc/yum.repos.d/下面的所有文件

```shell
cd /etc/yum.reposl.d
rm -f *
```

其它源，例如阿里云

```sh
wget -O /etc/yum.repos.d/CentOS-Base.repo https://mirrors.aliyun.com/repo/Centos-7.repo
```

清除yum缓存

```shell
yum clean all && yum mackcache
```

# 开发相关

一、kafka命令：

1、启动zookeeper：./zookeeper-server-start.sh ../config/zookeeper.properties &

2、启动kafka：./kafka-server-start.sh ../config/server.properties &

3、关闭Kafka：./kafka-server-stop.sh ../config/server.properties

4、关闭zookeeper: ./zookeeper-server-stop.sh ../config/zookeeper.properties

查看log文件内容：kafka-run-class.sh kafka.tools.DumpLogSegments --files /mysoftware/kafka_2.13-3.8.0/data/kafka/__consumer_offsets-43/00000000000000000000.index

二、永久设置java环境变量

```shell
vim ~/.bash_profile
```

（~代表当前用户的家目录，当前文件是用户级别的全局变量文件。也可以修改/etc/profile文件，该文件是系统级别的全局变量文件）

将下面添加到文件末尾

```shell
export JAVA_HOME=/software/Java/jdk/jdk-21.0.6 #根据自己的路径设置，建议pwd后复制粘贴路径不要自己输入

export PATH=$JAVA_HOME/bin:$PATH

export CLASSPATH=.:$JAVA_HOME/lib/
```

使 ~/.bash_profile 生效

```bash
source ~/.bash_profile
```

后台运行进程

``` shell
nohup 命令 > /dev/null 2>&1 &
```

dokcer安装

1. 确保yum基础源正常，再添加一个docker的镜像源

```shell
sudo wget -O /etc/yum.repos.d/docker-ce.repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
```

2. 安装docker

```sh
sudo apt install docker-ce docker-ce-cli containerd.io -y
```

安装时如果显示缺少一些依赖，则安装。例如我在安装时显示缺少EPEL 和 container-selinux 包

```sh
yum install -y epel-release
yum install -y container-selinux
```

docker-compose安装（采用python的pip安装）

1. 安装pip

```sh
sudo yum install -y python3-pip
```

2. 安装依赖setuptools

```sh
sudo pip3 install -U pip setuptools
```

3. 安装docker-compose

```sh
sudo pip3 install docker-compose
```



# 网络相关

一、虚拟机固定ip

1. 改网络配置

```sh
vim /etc/sysconfig/network-scripts/ifcfg-ens33
```

![image-20250303164133417](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250303164133417.png)

```shell
IPADDR=192.168.200.130
GATEWAY=192.168.200.2
DNS1=192.168.200.2
```

2. 改vmware网络配置

![image-20250303164310167](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250303164310167.png)

![image-20250303164349873](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250303164349873.png)

二、wget从github下载文件无法建立SSL连接？

关闭防火墙（和443端口有关）