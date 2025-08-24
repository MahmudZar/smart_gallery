gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", function () {
  // Cache DOM elements
  const body = document.body;
  const enterButton = document.querySelector(".project-gallery__enter-button");
  const grid = document.querySelector(".project-gallery__grid");
  const gridRows = grid.querySelectorAll(".project-gallery__row");
  const lightbox = document.getElementById("project-gallery-lightbox");
  // Gesture handler instance
  let gestureHandler = null;

  // Cache window size and update on resize
  let winsize = { width: window.innerWidth, height: window.innerHeight };
  window.addEventListener("resize", () => {
    winsize = { width: window.innerWidth, height: window.innerHeight };
  });

  // Configuration for enabling/disabling animations
  const config = {
    translateX: true,
  };

  // Total number of rows
  const numRows = gridRows.length;
  const middleRowIndex = Math.floor(numRows / 2);

  // Initialize rendered styles for each row
  const baseAmt = 0.1;
  const minAmt = 0.05;

  let renderedStyles = Array.from({ length: numRows }, (_, index) => {
    const distanceFromMiddle = Math.abs(index - middleRowIndex);
    const amt = Math.max(baseAmt - distanceFromMiddle * 0.03, minAmt);

    let style = { amt };
    if (config.translateX) style.translateX = { previous: 0, current: 0 };

    return style;
  });

  // Scroll-based movement variables
  let scrollProgress = 0;

  // Linear interpolation function
  const lerp = (a, b, n) => (1 - n) * a + n * b;

  // Map scroll progress to translation range
  const calculateScrollMappedX = () => {
    return ((scrollProgress * 2 - 1) * 40 * winsize.width) / 100;
  };

  // Render function for scroll-based animation
  const renderScrollAnimation = () => {
    const mappedValues = {
      translateX: calculateScrollMappedX(),
    };

    gridRows.forEach((row, index) => {
      const style = renderedStyles[index];

      for (let prop in config) {
        if (config[prop] && mappedValues[prop] !== undefined) {
          style[prop].current = mappedValues[prop];
          const amt = style.amt;
          style[prop].previous = lerp(
            style[prop].previous,
            style[prop].current,
            amt
          );
        }
      }

      let gsapSettings = {};
      if (config.translateX) gsapSettings.x = style.translateX.previous;

      gsap.set(row, gsapSettings);
    });
  };

  // Setup scroll trigger for grid animation
  ScrollTrigger.create({
    trigger: ".project-gallery",
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => {
      scrollProgress = self.progress;
      renderScrollAnimation();
    },
  });

  // Lightbox functionality
  let currentSlideIndex = 0;
  let slides = [];
  let scrollPosition = 0;

  // Collect all images from the grid
  const collectGridImages = () => {
    const images = [];
    const allImages = grid.querySelectorAll(".project-gallery__image");

    allImages.forEach((img) => {
      if (img.src) {
        images.push(img.src);
      }
    });

    return images;
  };

  // Create lightbox slides
  const createLightboxSlides = () => {
    const carousel = lightbox.querySelector(".project-gallery-lightbox__carousel");
    const images = collectGridImages();

    if (!carousel) {
      console.error("Carousel container not found");
      return [];
    }

    carousel.innerHTML = "";

    images.forEach((imageUrl, index) => {
      const slide = document.createElement("div");
      slide.className = "project-gallery-lightbox__slide";
      
      if (index === 0) {
        slide.classList.add("active");
      } else {
        slide.style.transform = "translateX(100%)";
      }
      
      slide.innerHTML = `<img src="${imageUrl}" alt="Gallery image ${
        index + 1
      }" class="project-gallery-lightbox__slide-image">`;
      carousel.appendChild(slide);
    });

    return images;
  };

  // Create lightbox dots
  const createLightboxDots = (imageCount) => {
    const dotsContainer = lightbox.querySelector(".project-gallery-lightbox__dots");

    if (!dotsContainer) {
      console.error("Dots container not found");
      return;
    }

    dotsContainer.innerHTML = "";

    for (let i = 0; i < imageCount; i++) {
      const dot = document.createElement("button");
      dot.className = "project-gallery-lightbox__dot";
      if (i === 0) dot.classList.add("active");
      dot.setAttribute("aria-label", `Go to image ${i + 1}`);
      dot.addEventListener("click", () => {
        goToSlide(i);
      });
      dotsContainer.appendChild(dot);
    }
  };

  // Update active dot
  const updateActiveDot = (index) => {
    const dots = lightbox.querySelectorAll(".project-gallery-lightbox__dot");
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  };

  // Go to specific slide with slide animation
  const goToSlide = (index) => {
    if (slides.length === 0) return;

    index = (index + slides.length) % slides.length;
    
    if (index === currentSlideIndex) return;

    const direction = index > currentSlideIndex ? 'next' : 'prev';
    
    const previousIndex = currentSlideIndex;
    currentSlideIndex = index;

    const lightboxSlides = lightbox.querySelectorAll(".project-gallery-lightbox__slide");
    
    lightboxSlides.forEach(slide => {
      slide.classList.remove("slide-in-left", "slide-in-right", "slide-out-left", "slide-out-right", "active");
    });
    
    if (lightboxSlides[previousIndex]) {
      lightboxSlides[previousIndex].classList.add(direction === 'next' ? 'slide-out-left' : 'slide-out-right');
    }
    
    if (lightboxSlides[index]) {
      lightboxSlides[index].classList.add('active', direction === 'next' ? 'slide-in-right' : 'slide-in-left');
    }

    updateActiveDot(index);
  };

  // Go to next slide
  const nextSlide = () => {
    goToSlide(currentSlideIndex + 1);
  };

  // Go to previous slide
  const prevSlide = () => {
    goToSlide(currentSlideIndex - 1);
  };

  // Gesture handler class for touch/mouse swipe/drag
  class LightboxGestureHandler {
    constructor(lightboxElement) {
      this.lightbox = lightboxElement;
      this.carousel = lightboxElement.querySelector('.project-gallery-lightbox__carousel');
      this.isActive = false;
      this.gestureState = {
        isGesturing: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        deltaX: 0,
        startTime: 0,
      };

      this.config = {
        touchThreshold: 50,
        mouseThreshold: 80,
        maxTime: 300,
        previewEnabled: true,
      };

      // Bind handlers once so removeEventListener works
      this.handleTouchStart = this.handleTouchStart.bind(this);
      this.handleTouchMove = this.handleTouchMove.bind(this);
      this.handleTouchEnd = this.handleTouchEnd.bind(this);
      this.handleMouseDown = this.handleMouseDown.bind(this);
      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.handleMouseUp = this.handleMouseUp.bind(this);
    }

    enable() {
      if (this.isActive || !this.carousel) return;
      this.isActive = true;
      this.attachEventListeners();
    }

    disable() {
      if (!this.isActive) return;
      this.isActive = false;
      this.removeEventListeners();
      this.resetGestureState();
    }

    attachEventListeners() {
      // Touch events
      this.carousel.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      this.carousel.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      this.carousel.addEventListener('touchend', this.handleTouchEnd, { passive: false });

      // Mouse events
      this.carousel.addEventListener('mousedown', this.handleMouseDown);
    }

    removeEventListeners() {
      if (!this.carousel) return;
      // Touch events
      this.carousel.removeEventListener('touchstart', this.handleTouchStart);
      this.carousel.removeEventListener('touchmove', this.handleTouchMove);
      this.carousel.removeEventListener('touchend', this.handleTouchEnd);
      // Mouse events
      this.carousel.removeEventListener('mousedown', this.handleMouseDown);
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
    }

    resetGestureState() {
      this.gestureState = {
        isGesturing: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        deltaX: 0,
        startTime: 0,
      };
      this.resetSlidePreview();
      if (this.lightbox) this.lightbox.style.cursor = '';
    }

    // Touch handlers
    handleTouchStart(e) {
      if (!this.isActive) return;
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      this.gestureState.isGesturing = true;
      this.gestureState.startX = touch.clientX;
      this.gestureState.startY = touch.clientY;
      this.gestureState.startTime = Date.now();
    }

    handleTouchMove(e) {
      if (!this.gestureState.isGesturing || e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      this.gestureState.currentX = touch.clientX;
      this.gestureState.deltaX = this.gestureState.currentX - this.gestureState.startX;
      const deltaY = touch.clientY - this.gestureState.startY;
      if (Math.abs(this.gestureState.deltaX) > Math.abs(deltaY)) {
        this.updateSlidePreview(this.gestureState.deltaX);
      }
    }

    handleTouchEnd() {
      if (!this.gestureState.isGesturing) return;
      const distance = Math.abs(this.gestureState.deltaX);
      const duration = Date.now() - this.gestureState.startTime;
      const isValidSwipe = distance >= this.config.touchThreshold && duration <= this.config.maxTime;
      if (isValidSwipe) {
        const slides = this.lightbox.querySelectorAll('.project-gallery-lightbox__slide');
        const activeIndex = Array.from(slides).findIndex(s => s.classList.contains('active'));
        if (this.gestureState.deltaX > 0) {
          // Swipe right -> previous, block if at first
          if (activeIndex > 0) prevSlide();
        } else {
          // Swipe left -> next, block if at last
          if (activeIndex < slides.length - 1) nextSlide();
        }
      }
      this.resetGestureState();
    }

    // Mouse handlers
    handleMouseDown(e) {
      if (!this.isActive) return;
      if (e.button !== 0) return;
      e.preventDefault();
      this.gestureState.isGesturing = true;
      this.gestureState.startX = e.clientX;
      this.gestureState.startTime = Date.now();
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
      if (this.lightbox) this.lightbox.style.cursor = 'grabbing';
    }

    handleMouseMove(e) {
      if (!this.gestureState.isGesturing) return;
      this.gestureState.currentX = e.clientX;
      this.gestureState.deltaX = this.gestureState.currentX - this.gestureState.startX;
      this.updateSlidePreview(this.gestureState.deltaX);
    }

    handleMouseUp() {
      if (!this.gestureState.isGesturing) return;
      const distance = Math.abs(this.gestureState.deltaX);
      const duration = Date.now() - this.gestureState.startTime;
      const isValidDrag = distance >= this.config.mouseThreshold && duration <= this.config.maxTime;
      if (isValidDrag) {
        const slides = this.lightbox.querySelectorAll('.project-gallery-lightbox__slide');
        const activeIndex = Array.from(slides).findIndex(s => s.classList.contains('active'));
        if (this.gestureState.deltaX > 0) {
          // Drag right -> previous, block if at first
          if (activeIndex > 0) prevSlide();
        } else {
          // Drag left -> next, block if at last
          if (activeIndex < slides.length - 1) nextSlide();
        }
      }
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
      this.resetGestureState();
    }

    // Visual feedback
    updateSlidePreview(deltaX) {
      if (!this.config.previewEnabled) return;
      const currentSlide = this.lightbox.querySelector('.project-gallery-lightbox__slide.active');
      if (!currentSlide) return;
      const progress = deltaX / window.innerWidth;
      const absProgress = Math.abs(progress);
      gsap.set(currentSlide, { x: deltaX, scale: 1 - absProgress * 0.1, duration: 0 });
      this.showAdjacentSlidePreview(deltaX, absProgress);
    }

    showAdjacentSlidePreview(deltaX, absProgress) {
      const slides = this.lightbox.querySelectorAll('.project-gallery-lightbox__slide');
      const activeIndex = Array.from(slides).findIndex(s => s.classList.contains('active'));
      let adjacentSlide = null;
      if (deltaX > 0 && activeIndex > 0) {
        adjacentSlide = slides[activeIndex - 1];
      } else if (deltaX < 0 && activeIndex < slides.length - 1) {
        adjacentSlide = slides[activeIndex + 1];
      }
      if (adjacentSlide) {
        const slideWidth = this.carousel.offsetWidth;
        const offset = deltaX > 0 ? -slideWidth : slideWidth;
        gsap.set(adjacentSlide, { x: offset + deltaX, opacity: absProgress, scale: 0.9 + absProgress * 0.1, duration: 0 });
      }
    }

    resetSlidePreview() {
      const currentSlide = this.lightbox.querySelector('.project-gallery-lightbox__slide.active');
      if (currentSlide) {
        gsap.set(currentSlide, { x: 0, scale: 1, duration: 0.3 });
      }
      const allSlides = this.lightbox.querySelectorAll('.project-gallery-lightbox__slide');
      allSlides.forEach(slide => {
        if (!slide.classList.contains('active')) {
          gsap.set(slide, { x: 0, opacity: 0, scale: 1, duration: 0.3 });
        }
      });
    }

    destroy() {
      this.disable();
      this.lightbox = null;
      this.carousel = null;
      this.gestureState = null;
      this.config = null;
    }
  }

  // Open lightbox
  const openLightbox = () => {
    scrollPosition = window.scrollY || document.documentElement.scrollTop;

    slides = createLightboxSlides();
    createLightboxDots(slides.length);

    lightbox.showModal();

    body.classList.add("noscroll");
    body.style.top = `-${scrollPosition}px`;

    goToSlide(0);

    document.addEventListener("keydown", handleKeyDown);
    // Enable gesture navigation
    if (gestureHandler) {
      gestureHandler.enable();
    }
  };

  // Close lightbox
  const closeLightbox = () => {
    lightbox.close();

    body.classList.remove("noscroll");
    body.style.top = "";
    window.scrollTo(0, scrollPosition);

    document.removeEventListener("keydown", handleKeyDown);
    // Disable gesture navigation
    if (gestureHandler) {
      gestureHandler.disable();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    switch (e.key) {
      case "ArrowLeft":
        prevSlide();
        break;
      case "ArrowRight":
        nextSlide();
        break;
      case "Escape":
        closeLightbox();
        break;
    }
  };

  // Initialize lightbox controls
  const initLightboxControls = () => {
    const closeBtn = lightbox.querySelector(".project-gallery-lightbox__close");
    const prevBtn = lightbox.querySelector(".project-gallery-lightbox__nav-prev");
    const nextBtn = lightbox.querySelector(".project-gallery-lightbox__nav-next");

    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
    if (prevBtn) prevBtn.addEventListener("click", prevSlide);
    if (nextBtn) nextBtn.addEventListener("click", nextSlide);

    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  };

  // Initialize smooth scrolling
  const initSmoothScrolling = () => {
    if (typeof Lenis === 'function') {
      const lenis = new Lenis({ lerp: 0.15 });
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      console.warn('Lenis smooth scrolling library not found');
    }
  };

  // Initialize everything
  const init = () => {
    if (enterButton) {
      enterButton.addEventListener("click", openLightbox);
    }

    if (lightbox) {
      initLightboxControls();
      // Initialize gesture handler
      gestureHandler = new LightboxGestureHandler(lightbox);
    }

    renderScrollAnimation();
  };

  initSmoothScrolling();
  init();
});