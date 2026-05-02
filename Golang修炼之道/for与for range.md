for能遍历数组、切片、string、整数值

for能遍历的for range都能遍历，另外，for range 还可以遍历map、chan、**func**

for与for range遍历每种数据类型案例：

# 遍历数组或切片

```go
slice1 := []string{"a", "b", "c"}
	for i := 0; i < len(slice1); i++ {
		fmt.Println(i, slice1[i], reflect.TypeOf(slice1[i]))
	}
	fmt.Println("----")
	for i, v := range slice1 {
		fmt.Println(i, v, reflect.TypeOf(v))
}
```

输出：

```tex
0 a string
1 b string
2 c string
----
0 a string
1 b string
2 c string
```

# **遍历字符串**

* 遍历ASC字符串

```go
	s := "golang"
	fmt.Println(len(s))
	// for range遍历ASC字符，v的类型是rune
	for i, v := range s {
		fmt.Println(i, string(v), reflect.TypeOf(v))
	}
	fmt.Println("----")
	// for遍历ASC字符
	for i := 0; i < len(s); i++ {
		fmt.Println(i, string(s[i]), reflect.TypeOf(s[i]))
	}
```

输出：

```tex
6
0 g int32
1 o int32
2 l int32
3 a int32
4 n int32
5 g int32
----
0 g uint8
1 o uint8
2 l uint8
3 a uint8
4 n uint8
5 g uint8
```

* 遍历UTF8字符串

```go
	s := "你好"
	fmt.Println(len(s))
	// for range遍历UTF-8字符，v的类型是rune
	for i, v := range s {
		fmt.Println(i, string(v), reflect.TypeOf(v))
	}
	fmt.Println("----")
	// for遍历UTF-8字符
	for i := 0; i < len(s); i++ {
		fmt.Println(i, string(s[i]), reflect.TypeOf(s[i]))
	}
```

输出：

```tex
6
0 你 int32
3 好 int32
----
0 ä uint8
1 ½ uint8
2   uint8
3 å uint8
4 ¥ uint8
5 ½ uint8
```

可以普通for遍历字符串是一个字节一个字节遍历的，当字符串中包含UTF8字符时就会乱码，因为在UTF8中汉字占三个字节，int8存储不下。而for range是用rune(int32)来存每个字符的，i是每个字符的首地址索引，'你'占0、1、2三个字节，'好'占3、4、5三个字节。所以当要遍历的字符串中包含utf-8字符时不要用普通for。



![image-20260327161255352](/Users/zyb/Library/Application Support/typora-user-images/image-20260327161255352.png)

# 遍历map

```go
	map1 := map[string]string{
		"a": "1",
		"b": "2",
		"c": "3",
	}
	// 遍历100次，观察map的遍历顺序
	for i := 0; i < 100; i++ {
		for k, v := range map1 {
			fmt.Println(k, v)
		}
		fmt.Println("----")
	}
```

普通for没办法来遍历map，如果硬说普通for来遍历map，那就是key是一个有顺序的，用普通for来遍历key，然后根据key来取value。

* for range遍历map时需要注意的是for range并不保证每次遍历得到的顺序一致

部分输出内容：

```tex
a 1
b 2
c 3
----
a 1
b 2
c 3
----
b 2
c 3
a 1
```

* 当遍历时候移除尚未执行到的entry，则就不会迭代到移除的entry（不会产生panic）

```go
m := map[string]int{"a": 1, "b": 2, "c": 3}
for k := range m {
    fmt.Println(k)
    if k == "a" {
        delete(m, "b") // 删除还没遍历到的 "b"
    }
}
```

输出结果：

```tex
a
c
```

(这里也可能会打印出b，当b先遍历到的时候)

* 如果在迭代过程中创建了新的entry，则该条目可能在本次迭代中生成，也可能被跳过

```go
m := map[string]int{"a": 1}
for k := range m {
    fmt.Println(k)
    if k == "a" {
        m["b"] = 2 // 迭代中新增 "b"
    }
}
// 可能输出: a        （"b" 被跳过）
// 也可能输出: a b    （"b" 被遍历到）
// 具体取决于 "b" 落在哪个桶，不确定
```

* 如果map为nil，则迭代次数为0，不会panic

```go
var m map[string]int  // nil map
	fmt.Println(m == nil) // true
	for k := range m {
		fmt.Println(k) // 永远不会执行
	}
	// 不会 panic，直接跳过，0次迭代
```

以上的案例也印证了官网中对于for range迭代map的解释

![image-20260327160018715](/Users/zyb/Library/Application Support/typora-user-images/image-20260327160018715.png)

# 遍历chan

* 对于chan，迭代产生的值是通道关闭前通过该通道发送的连续值。

```go
ch := make(chan int)

go func() {
    ch <- 1
    ch <- 2
    ch <- 3
    close(ch) // 必须 close，否则 for range 永远阻塞
}()

for v := range ch {
    fmt.Println(v) // 输出 1, 2, 3，然后退出
}
```

`for v := range ch` 的本质等价于不断执行 **v, ok := <-ch**，每次循环迭代，从 channel 取出一个值赋给 v；如果 channel 暂时为空但未关闭，循环会阻塞等待，直到有新值发送进来；一旦发送方调用 `close(ch)`，channel 里剩余的值会被消费完，之后循环自动退出

* 如果chan为 nil ，则范围表达式将永远阻塞

```go
var ch chan int // ch == nil，零值

for range ch {  // 立刻阻塞，永不执行，也永不退出
    
}
```

最终触发 `fatal error: all goroutines are asleep - deadlock!`

# 遍历func

这是 Go 1.22 引入的实验性特性，Go 1.23 正式稳定。

```go
for range f{
  
}
func f(yield func(V) bool){
  ...
}
```

for range迭代的函数f必须符合以下三种签名之一：

```go
func(yield func() bool)               // 无值迭代
func(yield func(V) bool)              // 单值迭代
func(yield func(K, V) bool)           // 双值迭代（最常用）
```

先看几个示例：

* 无值迭代

```go
func Times(yield func() bool) {
	for i := 0; i < 5; i++ {
		if !yield() {
			return
		}
	}
}
func main() {
	count := 0
	for range Times { // 不接收任何变量
		count++
		fmt.Println("执行第", count, "次")
	}
}
```

打印结果：

```tex
执行第 1 次
执行第 2 次
执行第 3 次
执行第 4 次
执行第 5 次
```

* 单值迭代器

```go
func Squares(n int) func(yield func(int) bool) {
    return func(yield func(int) bool) {
        for i := 0; i < n; i++ {
            if !yield(i * i) {
                return
            }
        }
    }
}

for v := range Squares(5) {
    fmt.Println(v) // 0 1 4 9 16
}
```

打印结果：

```tex
0
1
4
9
16
```

* 双值迭代器

```go
func Enumerate[T any](s []T) func(yield func(int, T) bool) {
    return func(yield func(int, T) bool) {
        for i, v := range s {
            if !yield(i, v) {
                return
            }
        }
    }
}

for i, v := range Enumerate([]string{"a", "b", "c"}) {
    fmt.Printf("%d: %s\n", i, v) // 0:a  1:b  2:c
}
```

打印结果：

```tex
0: a
1: b
2: c
```

初次看确实很傻眼。。。跟我一样。

先看看官网怎么解释的：

![image-20260327163522246](/Users/zyb/Library/Application Support/typora-user-images/image-20260327163522246.png)

依然看不懂也没关系，也和我一样。。。

用这个例子来说明

```go
func main() {
	for i, v := range Enumerate([]string{"a", "b", "c"}) {
		fmt.Printf("%d: %s\n", i, v) // 0:a  1:b  2:c
		fmt.Println("这就是yeild的函数体")
		if i == 1 {
			return
		}
	}
}
func Enumerate[T any](s []T) func(yield func(int, T) bool) {
	return func(yield func(int, T) bool) {
		for i, v := range s {
			if !yield(i, v) {
				fmt.Println("yield返回false，停止迭代")
				return
			}
		}
	}
}
```

先说yield函数的本质就是main中的for range{}内的循环体，也就是

```go
fmt.Printf("%d: %s\n", i, v) // 0:a  1:b  2:c
		fmt.Println("这就是yeild的函数体")
		if i == 1 {
			return
}
```

这一块。当该循环体中break或return，yield返回false，当循环体正常执行，yield返回true。

第一步：调用Enumerate([]string{"a", "b", "c"})，得到一个闭包函数。

第二步：启动for range。进入闭包函数中。执行闭包中的循环，第一轮，i=0,v="a"，执行yield(i,v)，也就是执行main中for range的循环体，打印

```tex
0:a
这就是yeild的函数体
```

if条件不成立，没有return，yield返回true，取反false。第二轮：i=1,v="b"，执行yield(i,v)，打印

```tex
1:b
这就是yeild的函数体
```

if条件成立，return，此时虽然main中return了，但代码还没执行完，yield返回false，取反true，打印

```tex
yield返回false，停止迭代
```

闭包函数return。执行结束。

核心理解一句话。for range函数迭代器，本质是控制反转：不是调用者主动拉取数据（pull），而是迭代器主动推送数据（push），**通过 `yield` 把每个值"注入"到环体中执行。**