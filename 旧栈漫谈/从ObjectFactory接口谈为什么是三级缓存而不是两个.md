[TOC]



# 情景复现

众所众知，spring解决循环依赖用的三级缓存，也就是三个HashMap，通过提前缓存半成品exposedObject对象，来解决A依赖B，B又依赖了A的问题。

![](C:\Users\DELL\Desktop\image-已去除(lightpdf.cn).png)

再次说明一下，解决循环依赖用的是提前暴露出来半成品对象的方式解决的，那么理论上两个缓存也可以解决，也就是二级缓存也可以解决：一个缓存用来存储成品对象，另一个用来存储提前暴露的半成品对象。那spring为什么要用三个缓存来解决循环依赖呢？

# 探究

先看看三个缓存的真面目，在DefaultListableBeanFactory类的基类之一DefaultSingletonBeanRegistry类中：

![image-20250821214641768](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250821214641768.png)

singletonObjects就是我们说的一级缓存，earlySingletonObjects就是二级缓存，singletonFactories就是三级缓存。值得注意的是三级缓存中的value是ObjectFactory，ObjectFactory是一个接口。即三级缓存中存储的是ObjectFacotry接口的实现类。三级缓存是什么时候放进去的？

![image-20250821215037246](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250821215037246.png)

就在上图中的断点处，该处就是在bean生命周期createBeanInstance方法实例化创建bean之后。即三级缓存是在实例化完成之后populateBean和initializeBean之前放进去的。放进去的是什么？

点进addSingletonFactory方法中：

![image-20250821215327777](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250821215327777.png)

发现放进去的就是ObjectFactory接口，也就是外面的() -> getEarlyBeanReference(beanName, mbd, bean)这样的lambda表达式，该lambda表达式中又调用了getEarlyBeanReference方法。lambda表达式是匿名类的简化写法，所以这里放进去的就是ObjectFactory接口的一个实现类的对象，并且该实现类的对象的getObject方法中调用了getEarlyBeanReference方法，

![image-20250821220414838](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250821220414838.png)

getEarlyBeanReference方法的第三个参数暂存了当前刚实例化完成但未填充和初始化完成的半成品对象。

但是这里还并没有调用ObjectFactory对象的getObject方法。那这个方法是什么时候调用的，和我们今天说的为什么是三个缓存而不是两个缓存这个问题有什么联系？

先总结一下，到目前为止，我们知道了，三级缓存是在bean实例化完成之后填充bean(**populateBean**)和初始化bean(**initializeBean**)之前放进去的，并且放入的是ObjectFactory的实现类对象，实现类实现的方法中调用了getEarlyBeanReference方法，方法的实参中存储了当前的半成品对象（本质上是栈帧中存储的）。

**再来看spring创建代理对象具体是在哪里创建的？**

spring中创建bean的代理是通过AnnotationAwareAspectJAutoProxyCreator这个bean后置处理器的postProcessAfterInitialization方法中实现的：

![image-20250821224036359](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250821224036359.png)

（具体在AnnotationAwareAspectJAutoProxyCreator的基类AbstractAutoProxyCreator中）

但在bean的生命周期中，调用到postProcessAfterInitialization方法的地方有两个，也就是说创建一个bean的代理时有两个入口：①. () -> getEarlyBeanReference(beanName, mbd, bean)这个lambda表达式中的getEarlyBeanReference方法，getEarlyBeanReference方法会遍历SmartInstantiationAwareBeanPostProcessor类型的后置处理器。②.在初始化bean(initializeBean)方法的applyBeanPostProcessorsAfterInitialization方法中也会遍历后置处理器来对bean进行修改，这其中就有AnnotationAwareAspectJAutoProxyCreator这个后置处理器。

**这两种方式在什么情况下使用？**

当创建一个代理类的bean时，如果该bean没有被其它bean依赖或者说是**该bean先创建的**，那么就会在②方式中创建bean的代理；但是当该bean被其它bean依赖或者说是先创建的另一个bean，那么在创建另一个bean时，就会在populateBean（填充bean）中注入这个代理bean依赖---->

getBean->doGetBean，然后doGetBean中先在三个缓存中查询有没有，发现第三个缓存中有，那么就调用第三个缓存中的lambda表达式获取该bean。所以就用到了①方式创建的代理bean。

---

知道这些前置知识后，再来说spring为什么要用三个缓存。众所众知，在bean的正常生命周期中，如果该bean被代理增强了，会在initializeBean的调用后置处理器的applyBeanPostProcessors**After**Initialization方法中创建bean的代理**（也就是②方式）**，并将该bean的变量指向创建的代理对象。这是**spring最初的设计原则：代理对象是在bean生命周期的最后阶段进行的**。但是当发现有循环依赖时，要暴露bean的半成品对象来解决循环依赖，这时就会有个问题，如果依赖的bean是个代理bean，我要暴露出半成品的代理对象，但是spring的设计原则是代理对象是在生命周期的最后阶段才创建出来的，这就打破了最初的bean创建流程（先实例化，再填充，再初始化）打破原来的这一套流程可能会带来更多的问题。所以这该怎么办？

那么就再加一个缓存，该缓存存储一个lambda表达式，当需要获取该bean时调用lambda表达式获取，如果需要的是bean的代理对象就在AnnotationAwareAspectJAutoProxyCreator这个后置处理器中通过jdk或cglib生成代理对象，如果不需要，就返回正常的bean。

# 总结

总结，第三级缓存是为了解决代理bean的循环依赖问题时不想打破原有的spring设计原则而设计出来的。