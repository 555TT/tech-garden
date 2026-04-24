# git基本知识

## 工作区域

- 远程仓库**：** 就是我们托管在github或者其他代码托管平台上的仓库。
- 本地仓库**：** 就是在我们本地通过git init或git clone命令建的仓库。
- **工作区：** 就是我们写代码、编辑文件的地方。
- **暂存区：** 当工作区的内容写好了之后，就会通过add命令，将工作区的内容放到暂存区，等待commit命令提交到本地仓库中。

## 文件状态

用git status命令显示的文件状态

- 未跟踪的（untracked）**：** 表示在工作区新建了某个文件，**从来没有过add**。
- 已修改（modified）**：** 表示在工作区中修改了某个文件，**没有 add**（之前add了某个文件然后commit了，现在又修改了这个文件，**commit前还要再add一次**）。
- 已暂存（staged）**：** 表示把已修改的文件已add到暂存区。
- 已提交（commit）**：** 表示文件已经commit到本地仓库保存起来了。

再强调一下，之前add了某个文件然后commit了，现在又修改了这个文件，**commit前还要再add一次！！！**你没有这个感知是因为大部分的ide比如idea、pycharm等在你commit时会自动将已修改的文件add。

# 高频操作

一、克隆远程仓库

用于将远程仓库的默认分支（远程仓库的默认分支不一定是master/main）克隆到本地。克隆后本地就有一个本地仓库。注意：**远程仓库不管哪个分支都是一个url**，所以你想要克隆其它分支时就要指定分支，例如，如果你要克隆develop分支，可以使用以下命令:

```bash
git clone -b develop <repository-url>
```

或者

```bash
git clone --branch develop <repository-url>
```

二、初始化本地仓库

```bash
git init
```

**经典场景：本地已经有个本地仓库，但是对应的远程仓库还未创建，怎么将本地代码推到远程仓库？**

步骤：

①创建一个远程仓库

②检查远程仓库信息，本地仓库是否和一个远程仓库关联

```bash
git remote -v
```

（输出空说明没有任何关联远程仓库）

③为本地仓库添加远程仓库

```bash
git remote add origin <远程仓库地址>
```

（origin：远程仓库的默认名称）

④如果远程仓库已经有了commit，比如创建仓库时自动创建readme文件，要先拉取

```bash
# 设置本地 main 跟踪远程 origin/main
git branch --set-upstream-to=origin/main main
# 拉取
git pull
```

④将本地文件push到远程仓库：

```bash
git push -u origin main
```

-u：设置默认的上游分支（upstream），便于后续操作。这会让main分支与远程的main分支关联起来，之后可以直接用 git push 或 git pull

main:远程仓库分支名称

三、将已经修改的文件或新增的文件添加到暂存区

git add

可以添加指定文件：

```bash
git add [file1] [file2] ...
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

也可以添加指定目录（会递归的添加子目录）：

```bash
git add [dir]
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

4.将已经添加到暂存区的文件提交到仓库

```bash
git commit -m "提交信息"
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

如果修改了一个文件，commit之前要先add！不然commit会报错。

5.将本地的新提交推送到远程仓库

```bash
git push
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

push之前要先拉取最新的代码，不然也是会报错。

或者强制push：

```bash
git push --force
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

将远程仓库强制更新为你的本地仓库，这很危险！！！

6.拉取远程仓库最新的commit

```bash
git pull
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

 **git pull=git fetch+ git merge**

git fetch

git fetch命令用于从远程仓库获取最新的代码提交和分支信息，但它**不会将获取到的内容应用到你的工作目录或当前分支**，也不会改变你本地仓库的历史记录。相当于是将远程仓库的最新信息下载到你的本地仓库，你可以通过git merge或git rebase将这些更新合并到你的当前分支。

7.合并分支

```bash
git merge

git rebase
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

**git merge/rebase到底是哪合并到哪了？**

一句话，就是你当前位于哪个分支上就合并到了哪个分支上，例如:git checkout feature切换到feature分支 , git merge main 就是将main主分支的新内容合并到feature分支上。

**git rebase到底是怎么合并的？**

用一个例子来解释：

起初git log：

![img](https://i-blog.csdnimg.cn/direct/28cce0fcf169415289392867052bdb91.png)![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)编辑

也就是![img](https://i-blog.csdnimg.cn/direct/d590e47d2b89412d8387bcd2fcab5285.png)![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)编辑

起初只有main这一个分支。在c1这个提交之后，新建了一个feature分支，然后在main又新增了两个commit：c2、c3，在feature上新增了两个commit：c4、c5。

现在把feature合并到main上。

操作：git checkout main切换到main分支，然后执行git rebase feature，也就是对main进行变基。

执行git rebase feature的具体过程：站在main上，先把最近公共祖先c1以后的commit也就是c2、c3删除，生成新的c2'、c3'，然后接到c5的后面。也就变成了下面这样：

![img](https://i-blog.csdnimg.cn/direct/a2d5373c238146f0a27f2b225c045a70.png)![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)编辑

![img](https://i-blog.csdnimg.cn/direct/f0d60f37a62945c7863545145a18a5aa.png)![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)编辑

需要强调的是，c2和c3是新的c2和c3，虽然提交内容和原来的一样，但是commit id是不同的。 

8.其它常用分支操作

查看都是有哪些分支，当前处于的分支会被星星标记 

> git branch -v

 创建分支 

> git branch <分支名称>

切换分支

> git checkout <分支名称>

9.打印commit历史 

git log默认只会输出当前分支的的提交记录，如果要打印特定分支的log，则：

```bash
git log [分支名]
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

如果要输出全部，则：

```bash
git log --all
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

如果要**图形**的方式绘制提交历史的分支和合并关系，则：

```bash
git log --all --graph --decorate --oneline
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

效果就会像这样：

![img](https://i-blog.csdnimg.cn/direct/bb926a40e542434eaf60a60fc07a6f56.png)![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)编辑

解释：红色的origin/main是远程仓库的main分支所处于的版本（此处是1e32b7f），红色的origin/feature是远程仓库的feature分支所处于的版本（此处是43d0a7d），绿色的main是本地仓库的main分支所处于的版本（此处是1e32b7f)，绿色的feature是本地仓库的feature所处于版本(43d0a7d)。蓝色的HEAD是本地仓库目前处于的分支（也就是说当前已经git checkout到了feature分支上了），红色的origin/HEAD是远程仓库目前处于的分支(此处是main分支。没有做过什么配置，默认一直在main分支）。分析这个打印结果可以看出本地仓库和远程仓库是一致的，而feature比main超前了3了commit，落后main一个commit。

这个命令很常用，建议为命令设置别名：在.gitconfig文件里配置：

```bash
[alias]
  lg =log --all --graph --decorate --oneline
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

这样你输入git lg就会执行上面一大串命令。这个git log的输出内容还可以自定义美化，例如这样：

```bash
git log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

具体命令细节可以自行搜索。

10.打印文件状态

```bash
git status
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

能打印出哪些文件还没有add，哪些文件没有commit

11.撤回某次commit

如果你已经把 commit push 到远程仓库了，但又想撤回它。

情况一：只是想撤回某个提交的更改，但保留历史记录：

使用 revert，它会**创建一个新的 commit 来“反做”指定的提交**。命令：

```bash
git revert <commit_hash>
git push origin <branch_name>
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

这种方式一句话就是用一个新的commit来删除掉那次commit修改的文件

情况二：想完全删除某个已经 push 的提交，比如误提交了密码/大文件/隐私信息：

使用 reset + 强制 push（危险，谨慎使用）

```bash
# 回退到某个提交，不保留之后的提交
git reset --hard <commit_hash>

# 强制推送到远程
git push origin <branch_name> --force
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

一句话就是直接回退到某个提交！！

# 其它

1.git克隆报错Failed to connect to 127.0.0.1 port 7890 after 2034 ms: Couldn‘t connect to server

当无法连接github时，可以设置git的代理

```bash
git config --global http.proxy http://127.0.0.1:7890
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

这种方式是全局配置，在~\.gitconfig里能看到设置的全局配置：

取消设置代理：

```bash
git config --global --unset http.proxy
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

或把配置文件中的配置信息注释掉。

注意的是，打开代理后，要打开clash等工具。

2.为什么有的命令参数前面是一个-有的是两个--？例如git log --all和git log -a都可以？

- 短选项 (`-`)：方便快速输入，适合常用的、简单的操作。例如，`-p` 比 `--patch` 快得多。
- 长选项 (`--`)：虽然输入稍长，但可读性极强，含义明确，不易混淆。`--graph` 比 `-g` (如果存在的话) 清楚多了。这对于复杂的命令和脚本尤其重要

可以简单理解为一个短横线是简写两个短横线是完整单词

3.idea、pycharm等JetBrains的ide中，文件的颜色状态：

![img](https://i-blog.csdnimg.cn/direct/f32844c7580e477d80030d1e1c626820.png)![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)编辑

红色表示文件未加入版本控制，绿色表示已加入版本控制但尚未提交，蓝色表示已提交但有修改，白色（也就是正常颜色，无色）表示已提交且无修改