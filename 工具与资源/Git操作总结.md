# 一、git基础概念

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

# 二、日常高频操作

## 初始化和克隆

1. 初始化仓库

```bash
git init
```

2. 克隆远程仓库

用于将远程仓库的默认分支（远程仓库的默认分支不一定是master/main）克隆到本地。克隆后本地就有一个本地仓库。注意：**远程仓库不管哪个分支都是一个url**，所以你想要克隆其它分支时就要指定分支，例如，如果你要克隆develop分支，可以使用以下命令:

```bash
git clone -b develop <repository-url>
```

或者

```bash
git clone --branch develop <repository-url>
```

**经典场景：本地已经有个本地仓库，但是对应的远程仓库还未创建，怎么将本地代码推到远程仓库？**

步骤：

①创建一个远程仓库

②检查远程仓库信息，本地仓库是否和一个远程仓库关联

```bash
git remote -v
```

（输出空说明没有任何关联远程仓库）

③为本地仓库设置远程仓库

```bash
git remote set-url origin <远程仓库地址>
```

（origin：远程仓库的默认名称）

④如果本地仓库也是一个新仓库，没有任何commit，那么**此时本地仓库也没有分支**，没有分支就无法pull/push代码，可以将本地全部文件先创建一个commit，就会默认出现主分支

```bash
git add .	# 将本地所有的新文件/改动添加到暂存区
git commit -m	# 将所有改动创建一个commit
```

创建了一个commit，此时就会有一个主分支main/master。

⑤如果远程仓库已经有了commit，比如创建仓库时自动创建readme文件，可以先拉取使本地是最新的

但是此时直接使用git pull拉取，git不知道要拉取远程仓库的哪个分支，要先设置本地分支关联的远程仓库的哪个分支

```bash
git branch --set-upstream-to=origin/main main	# 设置本地 main 跟踪远程 origin/main，此后git pull和git push时就不用指定分支了。
```

设置了关联分支后，因为本地main分支和远程main分支是不相关的分支，此时直接拉取会报错：

```tex
fatal: refusing to merge unrelated histories
```

所以这次拉取的时候要设置一下允许合并不相关的分支

```bash
git pull --allow-unrelated-histories
```

因为是不相关的分支拉取，可能会有冲突，此时拉取会弹出一个文本编辑，直接关闭就好了。

⑥然后将本地文件push到远程仓库：

```bash
git push
```

## 暂存与提交

1. 将已经修改的文件或新增的文件添加到暂存区：git add

添加指定文件：

```bash
git add [file1] [file2] ...
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

也可以添加指定目录（会递归的添加子目录）：

```bash
git add src/
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

添加**当前目录下**的所有变更(git add .不是将全部的修改都加入暂存区，而是当前目录下的全部文件，如果位于仓库根目录，那就是全部文件了)

```bash
git add .
```

通配符匹配添加

```bash
git add *.js
```

2. 将已经添加到暂存区的文件提交到仓库：git commit

```bash
git commit -m "提交信息"
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

（如果修改了文件，commit之前要先add！不然commit会报错）

3. **显示当前git仓库的状态（最常用）**

```bash
git status
```

git status主要在检查工作区、暂存区、当前提交三块内容的差异。主要回答了几个问题：有没有文件被修改但还没 add、有没有文件已经 add但还没 commit、有没有新文件 、有没有删除文件 、有没有冲突、当前是落后于远程仓库还是提前于远程仓库。通过git status你都能知道，执行git add .和git commit之前你都应该执行一把git status，所以这个命令是最核心的命令。

4. git diff

①查看工作区和暂存区的差异，也就是“改了，还没add的内容”。能清楚的看到每个改动的文件添加了哪些行、删除了哪些行。

```bash
git diff	# 查看全部改动
git diff ./通用工具/git操作总结.md	# 查看某个文件
```

②查看暂存区和最新一次提交(HEAD)的差异，也就是已经add还没commit的内容

```bash
# 两个命令都行
git diff --cached
git diff --staged
```

③查看工作区和HEAD的差异，也就是查看所有未提交的修改（包括已经add和未add的）

```bash
git diff HEAD
```

④对比两次提交

```bash
git diff commit1 commit2
# 例如
git diff db2a623 caaa9c8
```

git diff还有很多高级用法，实际用到了可以再搜索。

## 撤销与回退

如果你已经把 commit push 到远程仓库了，但又想撤回它。

情况一：只是想撤回某个提交的更改，但保留历史记录：

使用 revert，它会**创建一个新的 commit 来“反做”指定的提交**。

```bash
git revert <commit_hash>
git push origin <branch_name>
```

这种方式就是用一个新的commit来删除掉那次commit修改的文件

情况二：想完全删除某个已经 push 的提交，比如误提交了密码/大文件/隐私信息：

使用 reset + 强制 push（危险，谨慎使用）

```bash
# 回退到某个提交，不保留之后的提交
git reset --hard <commit_hash>

# 强制推送到远程
git push origin <branch_name> --force
```

就是直接回退到某个提交！！

# 分支管理

## 分支基础

先搞清什么是分支，很多人误以为分支是代码副本，其实不是。例如：

```tex
commitA — commitB — commitC   (main)
```

main只是指向提交C，并没有复制代码。

**HEAD** 是一个特殊指针，表示你当前在哪个分支或者说在哪个提交上，例如：

```tex
HEAD → main → commitC
```

也就是HEAD指向main分支，main分支指向提交C

1. 创建分支

```bash
git branch feature/GGB #根据当前的HEAD分支创建新的名为feature/GGB的分支
git branch feature/GGB dev #根据dev分支创建新的名为feature/GGB的分支
```

如果是在本地仓库创建的分支，要把这个分支推送到远程仓库，push时要指定推送的远程仓库分支。例如我要把新创建的feature/GGB分支推送到远程仓库就要执行

git push --set-upstream origin feature/GGB

或者先在远程创建好feature/GGB分支，将执行git pull将新分支拉取到本地，然后设置本地feature/GGB关联远程仓库的feature/GGB分支

```bash
git branch --set-upstream-to=origin/main main
```

然后再执行git push

2. 切换分支

```bash
git switch 目标分支名 #新版git推荐使用git switch 而不是git checkout
```

本质就是将HEAD指向了新的分支。当切换分支时，工作区也会发生变化，也就是本地文件也切换成了另一个分支的文件。

3. 删除分支

```bash
git branch -d dev #删除dev分支
```

## 分支合并

```bash
git merge
git rebase
```

**git merge/rebase到底是哪合并到哪了？**

一句话，就是你当前位于哪个分支上就合并到了哪个分支上，例如:git switch feature切换到feature分支 , git merge main 就是将main主分支的新内容合并到feature分支上。

**git rebase到底是怎么合并的？**

用一个例子来解释：

起初git log：

![img](https://i-blog.csdnimg.cn/direct/28cce0fcf169415289392867052bdb91.png)![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)编辑

也就是![img](https://i-blog.csdnimg.cn/direct/d590e47d2b89412d8387bcd2fcab5285.png)![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

起初只有main这一个分支。在c1这个提交之后，新建了一个feature分支，然后在main又新增了两个commit：c2、c3，在feature上新增了两个commit：c4、c5。

现在把feature合并到main上。

操作：git checkout main切换到main分支，然后执行git rebase feature，也就是对main进行变基。

执行git rebase feature的具体过程：站在main上，先把最近公共祖先c1以后的commit也就是c2、c3删除，生成新的c2'、c3'，然后接到c5的后面。也就变成了下面这样：

![img](https://i-blog.csdnimg.cn/direct/a2d5373c238146f0a27f2b225c045a70.png)![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)编辑

![img](https://i-blog.csdnimg.cn/direct/f0d60f37a62945c7863545145a18a5aa.png)![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

需要强调的是，c2和c3是新的c2和c3，虽然提交内容和原来的一样，但是commit id是不同的。 

# 远程协作

## 拉取/推送

```bash 
git push # 将本地的新提交推送到远程仓库
```

**push之前要先拉取最新的代码**，养成习惯！

或者强制push：

```bash
git push --force #将远程仓库强制更新为你的本地仓库，这很危险！！！
```

```bash
git pull # 拉取远程仓库最新的commit
```

 **git pull=git fetch+ git merge**

git fetch

git fetch命令用于从远程仓库获取最新的代码提交和分支信息，但它**不会将获取到的内容应用到你的工作目录或当前分支**，也不会改变你本地仓库的历史记录。相当于是将远程仓库的最新信息下载到你的本地仓库，你可以通过git merge或git rebase将这些更新合并到你的当前分支。



# 必要配置

1. 给git开梯子

明明打开了clash等工具还是显示无法连接到GitHub

```bash
fatal: unable to access 'https://github.com/555TT/tech-garden.git/': Failed to connect to github.com port 443 after 75031 ms: Couldn't connect to server
```

那是因为git默认不会走你的代理工具，需要手动配置。

解决办法：在git的全局配置文件中新增配置：

```tex
[http]
				proxy = http://127.0.0.1:7897
```

或者执行命令写入

```bash
git config --global http.proxy http://127.0.0.1:7890
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

取消设置代理：

```bash
git config --global --unset http.proxy
```

![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)

或把配置文件中的配置信息注释掉。

（注意的是，配置代理后，要打开clash等工具）

2. 让commit历史更美观 

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

   这个命令很常用，**为命令设置别名，在.gitconfig文件里配置：**

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

3. 通过SSH key认证方式操作远程仓库

终端执行

```bash
ssh-keygen -t rsa -b 4096 -C "你的邮箱"
```

然后将公钥保存到github的ssh key

# 其它



2.为什么有的命令参数前面是一个-有的是两个--？例如git log --all和git log -a都可以？

- 短选项 (`-`)：方便快速输入，适合常用的、简单的操作。例如，`-p` 比 `--patch` 快得多。
- 长选项 (`--`)：虽然输入稍长，但可读性极强，含义明确，不易混淆。`--graph` 比 `-g` (如果存在的话) 清楚多了。这对于复杂的命令和脚本尤其重要

可以简单理解为一个短横线是简写两个短横线是完整单词

3.idea、pycharm等JetBrains的ide中，文件的颜色状态：

![img](https://i-blog.csdnimg.cn/direct/f32844c7580e477d80030d1e1c626820.png)![点击并拖拽以移动](data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)编辑

红色表示文件未加入版本控制，绿色表示已加入版本控制但尚未提交，蓝色表示已提交但有修改，白色（也就是正常颜色，无色）表示已提交且无修改
