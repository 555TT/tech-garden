# JUC基础

1. 调用Thread的start方法会调用start0，start0会调用该Thread类的run方法。Thread类如果传入了Runnable，run方法里会调用Runnable的run方法，如果没有传入，则什么也不会做。也可以通过重写Thread的run方法，让start0调用重写的run方法。start 方法只是让线程进入就绪，里面代码不一定立刻运行（CPU 的时间片还没分给它）。每个线程对象的start方法只能调用一次，如果调用了多次会出现IllegalThreadStateException。

2. 建议用 TimeUnit 的 sleep 代替 Thread 的 sleep 来获得更好的可读性. TimeUnit.SECONDS.sleep(2); 

3. sleep结束后的线程也未必会立刻得到执行，等cpu调度。wait结束后也不一定立刻得到执行（不一定得到锁，wait结束后从waitSet队列中出来进入到entryList队列）

4. sleep、join、wait都是让线程阻塞住不再向下继续运行，sleep、join是Thread的方法，wait是Object的方法，**join的底层就是调用的Object的wait**，并且带超时时间的join是应用的保护性暂停模式。

   附加问题：既然join是通过wait实现的，调用wait前要先获取锁，join方法里怎么获取的锁？

   join方法是加了synchronized修饰的，锁的是这个thread对象

   ![image-20250419120248249](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250419120248249.png)

5. join会使当前线程阻塞到这行代码。细节：join的作用是让当前线程等待另一个线程执行结束，达到同步的效果。但join方法可以设置等待时间，如果在给定的等待时间，另一个线程还没有执行完，则主线程会直接继续执行，不再等待另一个线程；**如果在给定的时间提前结束了，则主线程也会继续执行，而不是非要等到给定的时间。**

6. interrupt用于向线程发出中断信号，但不会直接强制停止线程的执行，不会改变线程的状态，只是设置线程的打断状态为true。interrupt是为了代替stop方法，是为了让线程更安全、优雅的退出，只是告诉线程，你该停止了，后续线程可以先关闭一些资源，释放锁等，然后再选择退出，而不是像stop那样直接暴力结束线程。

isInterrupted判断当前线程的打断标记。

interrupted是Thread的静态方法，作用于当前线程，返回当前的线程的打断状态，并将打断状态设为false。

interrupt打断正常运行的线程：

```java
Thread t = new Thread(() -> {
    while (!Thread.currentThread().isInterrupted()) {
        // 执行任务
        System.out.println("运行中...");
    }
    System.out.println("线程收到中断信号，优雅退出");
});
t.start();

// 稍后中断线程
Thread.sleep(1000);
t.interrupt();
```

interrupt打断阻塞的线程：

```java
   Thread t = new Thread(() -> {
            log.info("初始状态: {}", Thread.currentThread().isInterrupted()); // false

            try {
                Thread.sleep(10000);
            } catch (InterruptedException e) {
                log.info("异常捕获时状态: {}", Thread.currentThread().isInterrupted()); // false

                // 恢复中断状态
                Thread.currentThread().interrupt();
                log.info("手动恢复后状态: {}", Thread.currentThread().isInterrupted()); // true
            }
        });
        t.start();

        Thread.sleep(100);
        log.info("主线程调用interrupt()前状态: {}", t.isInterrupted()); // false
        t.interrupt();
        log.info("主线程调用interrupt()后状态: {}", t.isInterrupted()); // true (因为线程内已恢复)
```

重点解释：打断阻塞的线程详细变化过程

1. **中断信号到达前**：
   - 线程正在执行阻塞操作（如 `sleep()`, `wait()`, `join()` 等）
   - 中断标志初始状态为 `false`
2. **调用 `interrupt()` 瞬间**：
   - JVM 先将线程的中断标志**临时设为 `true`**
   - 这个临时设置会触发阻塞操作立即抛出 `InterruptedException`
3. **异常抛出后**：
   - 在抛出 `InterruptedException` **之前**，JVM 会**自动将中断标志重置回 `false`**
   - 所以当进入 catch 块时，中断标志已经是 `false`

最佳实践

1. **对运行中线程**：
   - 在循环中定期检查`isInterrupted()`
   - 执行耗时操作前检查中断状态
   - 发现中断后执行清理工作再退出
2. **对阻塞中线程**：
   - 总是捕获`InterruptedException`
   - 通常需要调用interrupt恢复中断状态（除非确定要忽略中断）
   - 在清理资源后合理退出

interrupt打断被park的线程：

```java
Thread parkedThread = new Thread(() -> {
            log.info("即将进入park状态");
            LockSupport.park(); // 在此处阻塞
            log.info("从park返回，中断状态: {}", Thread.currentThread().isInterrupted());

            // 再次park测试
            log.info("再次park");
            LockSupport.park(); // 这次不会被park阻塞住，因为中断标志已设置为true
            log.info("第二次从park返回");
        });

        parkedThread.start();
        Thread.sleep(1000);
        parkedThread.interrupt(); // 打断被park的线程
```

# JMM

1. 非volatile变量的修改不会立即反映到主内存，那是什么时候写入到主内存的？

首先，JMM并没有规定具体的时机，只是规定了happens-before规则。非volatile变量的写入时间点是不确定的。**a. 锁的释放与获取**

- **锁释放（Monitor Exit）**：线程退出`synchronized`块或释放锁时，会将工作内存中的修改**强制刷新到主内存**。
- **锁获取（Monitor Enter）**：线程进入`synchronized`块或获取锁时，会**清空本地内存**，从主内存重新加载变量。
- 这是`synchronized`关键字隐式实现可见性的原理。

**b. 线程生命周期事件**

- 线程终止时（如`Thread.join()`），其本地内存的修改可能被同步到主内存。
- 线程启动时（`Thread.start()`）可能触发父线程与子线程的内存同步。

**c. Final字段的特殊规则**

如果对象正确发布（如构造函数正常完成且未泄露`this`引用），`final`字段的初始化值对其他线程是可见的。
等等。。

2. 周志明的《深入理解Java虚拟机》中的一句话是：**如果在本线程内观察，所有操作都是天然有序的。如果在一个线程中观察另一个线程，所有操作都是无序的**。 对这话的理解：

**1. 线程内观察的有序性**

- **“线程内表现为串行的语义”（Within-Thread As-If-Serial）**
  在单线程内部，无论实际的指令执行是否发生重排序（编译器或处理器的优化行为），程序的执行结果必须与代码顺序执行的结果一致。例如：

  ```java
  int a = 1;         // 操作1
  int b = 2;         // 操作2
  int c = a + b;     // 操作3
  ```

  操作1和操作2可能被重排序，但操作3的结果必然为3，不会因重排序影响最终结果。这种“看似有序”的保证称为**as-if-serial语义**。

- **原因**
  单线程环境下，指令重排序的优化不会破坏程序的逻辑正确性

**2. 线程间观察的无序性**

- **“指令重排序”与“内存同步延迟”**
  在多线程环境下，一个线程对共享变量的修改可能以不可预测的顺序被其他线程观察到。例如：

  ```java
  public class Example {
      int x = 0;
      boolean flag = false;
  
      // 线程1
      public void writer() {
          x = 1;            // 操作A
          flag = true;      // 操作B
      }
  
      // 线程2
      public void reader() {
          if (flag) {       // 操作C
              int y = x;    // 操作D
              System.out.println(y); // 可能输出0？
          }
      }
  }
  ```
  
  线程2可能先读到 `flag = true`（操作C），但读取 `x` 时却得到 `0`（操作D）
  
  无序性的根源
  
  - **指令重排序**：编译器、处理器为了提高性能，可能调整指令顺序。
  - **内存可见性延迟**：线程的工作内存与主内存的同步存在延迟，导致其他线程无法立即看到修改。

从以上可以进而解释synchronized是怎么实现有序性的。synchronized是并不能禁止编译器和处理器的重排序的，而是通过锁的互斥性保证同步代码单线程串行执行和 Happens-Before 规则间接保证有序性。

3. 双重检查实现单例模式出现空指针的诡异问题

```java
/**双重检查单例模式
 * @author: 小手WA凉
 * @create: 2024-07-06
 */
public class DoubleCheckSingletion {
    //这里最好加volatile
    private volatile static DoubleCheckSingletion doubleCheckSingletion=null;
    private DoubleCheckSingletion(){
 
    }
    //特点:安全且在多线程情况下能保持高性能
    public static DoubleCheckSingletion getInstance(){
        if(doubleCheckSingletion==null){
            synchronized (DoubleCheckSingletion.class){
                if(doubleCheckSingletion==null){
                    doubleCheckSingletion=new DoubleCheckSingletion();
                }
            }
        }
        return doubleCheckSingletion;
    }
}
```

以上是经典的单例模式的实现，但doubleCheckSingletion如果没有volatile修饰，通过getInstance获取的对象singletion在后续调用其它方法时，如singletion.call()会出现空指针的诡异情况！

为什么？

![image-20250418215800057](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250418215800057.png)

我们假设t1、t2两个线程同时开始调用getInstance方法获取单例对象：step1：t1执行到⑤，开始实例化对象；step2：t2执行到②，判断不为null，然后执行⑨，返回doubleCheckSingletion；step3：t2拿到doubleCheckSingletion，开始后续调用，如doubleCheckSingletion.call()。

上面过程看着没什么问题，但在step3调用时可能会出现空指针异常！

之所以可能抛出空指针，是因为⑨获取的不是一个完整的对象。

分析一下new DoubleCheckSingletion()的大致流程：

1、虚拟机遇到new指令，到常量池定位到这个类的符号引用。2、检查符号引用代表的类是否被加载、解析、初始化过。3、虚拟机为对象分配内存。4、虚拟机将分配到的内存空间都初始化为零值。5、虚拟机对对象进行必要的设置。6、执行方法，成员变量进行初始化。 7、将对象的引用指向这个内存区域。

简化一下：a、JVM为对象分配一块内存M。b、在内存M上为对象进行初始化。c、将内存M的地址赋值给doubleCheckSingletion变量

但是，以上过程并不是一个原子的过程，并且可能会被编译器重排序，如果重排序为：

a、JVM为对象分配一块内存M。c、将内存M的地址赋值给doubleCheckSingletion变量。b、在内存M上为对象进行初始化。

也就是先给doubleCheckSingletion变量赋值，然后再进行后续的对象初始化，所以t2拿到的对象就不是一个完整的对象，当尝试使用这个对象时就可能发生空指针。

解决办法就是给doubleCheckSingletion变量加上volatile修饰，禁止对doubleCheckSingletion变量读写指令的重排序。

4. hapends-before规则

hapend-before：**如果一个操作A“happen-before”另一个操作B,那么A的结果对B是可见的。**

程序次序规则：在同一个线程中，按照代码的书写顺序（即程序顺序），前面的操作 Happens-Before 后面的操作。这意味着，单线程内的代码执行结果必须与顺序执行的结果一致，即使实际发生了指令重排序。

```java
int x = 1;    // 操作1
int y = 2;    // 操作2
int z = x + y; // 操作3
```

根据程序次序规则，操作1 Happens-Before 操作2，操作2 Happens-Before 操作3。
实际执行中：操作1和操作2可能被重排序（例如先执行操作2再执行操作1），但最终结果必须与顺序执行一致（`z`必须为3）。也就是满足 **as-if-serial 语义**。

管程锁定规则(Monitor Lock Rule)：对一个锁的解锁happens-before随后对这个锁的加锁。即在 synchronized代码块或方法中，释放锁之前的所有操作对于下一个获取这个锁的线程是可见的。

volatile变量规则(Volatile Variable Rule):对一个volatile字段的写操作happens-before任意后续对这个字段的读操作。即确保volatile变量的写操作对其他线程立即可见。

线程启动规则(Thread Start Rule):对线程的start()方法的调用happens-before该线程的每个动作。确保线程启动时，主线程中对共享变量的写操作对于新线程是可见的。

```java
static int x = 1;
x = 10;
new Thread(()->{
 System.out.println(x);
},"t2").start();
```

打印的x一定是10。

线程终止规则(Thread Termination Rule):一个线程内的所有操作happens-before对这个线程结束后（比如调用join()方法），其它线程可见。

```java
static int x = 1;
Thread t1 = new Thread(()->{
 x = 10;
},"t1");
t1.start();
t1.join();
System.out.println(x);
```

打印的x一定是10。

线程中断规则(Thread Interruption Rule)：对线程的interrupt()方法的调用happens-before被中断线程检测到中断事件的发生。即线程的中断操作在被该线程检测到之前已经发生。

对象终结规则(Finalizer Rule)：一个对象的初始化完成（构造函数执行结束）happens-before它的 finalize()方法的开始。即在对象被回收前，其构造过程已经完全结束。

还有，对变量默认值（0，false，null）的写，对其它线程对该变量的读可见。

传递性(Transitivity)：如果操作A先行发生于操作B,操作B先行发生于操作C,那就可以得出操作A先行发生于操作C的结论。

# 原子类

* 基本类型原子类：AtomicInteger、AtomicLong、AtomicBoolean

常用api：

```java
public final int get() //获取当前的值
public final int getAndSet(int newValue)//获取当前的值，并设置新的值
public final int getAndIncrement()//获取当前的值，并自增
public final int getAndDecrement() //获取当前的值，并自减
public final int getAndAdd(int delta) //获取当前的值，并加上预期的值
boolean compareAndSet(int expect, int update) //如果输入的数值等于预期值，则以原子方式将该值设置为输入值（update）
```

* 数组类型原子类：AtomicIntegerArray、AtomicLongArray、AtomicReferenceArray

* 引用类型原子类： AtomicReference、AtomicMarkableReference，只能判断true和false，不能解决ABA问题、AtomicStampedReference，带版本号的原子引用，可解决ABA问题

* 对象的属性修改原子类，以线程安全的方式修饰对象中的属性值：AtomicIntegerFieldUpdater、AtomicLongFieldUpdater、AtomicReferenceFieldUpdater

​      **要更新的对象字段必须是pulic volatile修饰**

* 原子操作增强类：LongAdder、LongAccumulator、DoubleAdder、DoubleAccumulator

​	**阿里开发手册中说明，如果是Java8建议用LongAdder代替AtomicLong，性能更高**

为什么？优化在哪？

LongAdder源码分析

继承关系：

```java
LongAdder extends Striped64 implements Serializable
```

Striped64有几个重要的成员属性：

```java
 
/** Number of CPUS, to place bound on table size        CPU数量，即cells数组的最大长度 */
static final int NCPU = Runtime.getRuntime().availableProcessors();

/**
 * Table of cells. When non-null, size is a power of 2.
cells数组，为2的幂，2,4,8,16.....，方便以后位运算
 */
transient volatile Cell[] cells;

/**基础value值，当并发较低时，只累加该值主要用于没有竞争的情况，通过CAS更新。
 * Base value, used mainly when there is no contention, but also as
 * a fallback during table initialization races. Updated via CAS.
 */
transient volatile long base;

/**创建或者扩容Cells数组时使用的自旋锁变量调整单元格大小（扩容），创建单元格时使用的锁。
 * Spinlock (locked via CAS) used when resizing and/or creating Cells. 
 */
transient volatile int cellsBusy;
```

其中最重要的是cells和base，Cell是Striped64的内部类

longAdder.increment()源码分析

```java
public void increment() {
        add(1L);
}
```

```java
//as表示cells引用 b表示获取的base值 V表示期望值  m表示cells数组的长度 a表示当前线程命中的cell单元/格
public void add(long x) {
        Cell[] as; long b, v; int m; Cell a;
        if ((as = cells) != null || !casBase(b = base, b + x)) {
            boolean uncontended = true;
            if (as == null || (m = as.length - 1) < 0 ||
                (a = as[getProbe() & m]) == null ||
                !(uncontended = a.cas(v = a.value, v + x)))
                longAccumulate(x, null, uncontended);
     }
}
```

![image-20250516213624366](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250516213624366.png)

getProbe()&m和HashMap中的(n-1)&hash类型，都是通过hash对数组长度取模运算

![image-20250516213644338](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250516213644338.png)
