// 平滑滚动
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80, // 考虑导航栏高度
                behavior: 'smooth'
            });
        }
    });
});

// 导航栏滚动效果
window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.1)';
        header.style.background = 'rgba(255, 255, 255, 0.95)';
    } else {
        header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        header.style.background = 'var(--white)';
    }
});

// 动画效果
document.addEventListener('DOMContentLoaded', function() {
    // 检测元素是否在视口中
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.bottom >= 0
        );
    }
    
    // 添加动画类
    function addAnimationClass() {
        const elements = document.querySelectorAll('.feature-card, .step, .download-card');
        
        elements.forEach(element => {
            if (isInViewport(element) && !element.classList.contains('animated')) {
                element.classList.add('animated');
                element.style.opacity = '1';
                element.style.transform = element.classList.contains('feature-card') 
                    ? 'translateY(0)' 
                    : 'translateX(0)';
            }
        });
    }
    
    // 初始化元素样式
    const elements = document.querySelectorAll('.feature-card, .step, .download-card');
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        if (element.classList.contains('feature-card')) {
            element.style.transform = 'translateY(20px)';
        } else {
            element.style.transform = 'translateX(-20px)';
        }
    });
    
    // 初始检查
    addAnimationClass();
    
    // 滚动时检查
    window.addEventListener('scroll', addAnimationClass);
});

// 版本号更新
document.addEventListener('DOMContentLoaded', function() {
    // 获取当前年份
    const currentYear = new Date().getFullYear();
    
    // 更新版权信息中的年份
    const copyrightYear = document.querySelector('.copyright p');
    if (copyrightYear) {
        copyrightYear.innerHTML = copyrightYear.innerHTML.replace(/\d{4}/, currentYear);
    }
});
