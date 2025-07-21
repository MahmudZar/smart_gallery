gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", function () {
  // Cache DOM elements
  const body = document.body;
  const enterButton = document.querySelector(".enter");
  const grid = document.querySelector(".grid");
  const gridRows = grid.querySelectorAll(".row");
  const lightbox = document.getElementById("lightbox");

  // Cache window size and update on resize
  let winsize = { width: window.innerWidth, height: window.innerHeight };
  window.addEventListener("resize", () => {
    winsize = { width: window.innerWidth, height: window.innerHeight };
  });

  // Configuration for enabling/disabling animations
  const config = {
    translateX: true,
    contrast: true,
    brightness: true,
  };

  // Total number of rows
  const numRows = gridRows.length;
  const middleRowIndex = Math.floor(numRows / 2);
  const middleRow = gridRows[middleRowIndex];
  const middleRowItems = middleRow.querySelectorAll(".row__item");
  const numRowItems = middleRowItems.length;
  const middleRowItemIndex = Math.floor(numRowItems / 2);
  const middleRowItemInner =
    middleRowItems[middleRowItemIndex].querySelector(".row__item-inner");
  const middleRowItemInnerImage =
    middleRowItemInner.querySelector(".row__item-img");

  // Setting the final size of the middle image for the reveal effect
  middleRowItemInnerImage.classList.add("row__item-img--large");

  // Initialize rendered styles for each row
  const baseAmt = 0.1;
  const minAmt = 0.05;

  let renderedStyles = Array.from({ length: numRows }, (_, index) => {
    const distanceFromMiddle = Math.abs(index - middleRowIndex);
    const amt = Math.max(baseAmt - distanceFromMiddle * 0.03, minAmt);

    let style = { amt };
    if (config.translateX) style.translateX = { previous: 0, current: 0 };
    if (config.contrast) style.contrast = { previous: 100, current: 100 };
    if (config.brightness) style.brightness = { previous: 100, current: 100 };

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

  // Map scroll progress to contrast range
  const calculateScrollMappedContrast = () => {
    const centerContrast = 100;
    const edgeContrast = 330;
    const t = Math.abs(scrollProgress * 2 - 1);
    const factor = Math.pow(t, 2);
    return centerContrast - factor * (centerContrast - edgeContrast);
  };

  // Map scroll progress to brightness range
  const calculateScrollMappedBrightness = () => {
    const centerBrightness = 100;
    const edgeBrightness = 15;
    const t = Math.abs(scrollProgress * 2 - 1);
    const factor = Math.pow(t, 2);
    return centerBrightness - factor * (centerBrightness - edgeBrightness);
  };

  // Render function for scroll-based animation
  const renderScrollAnimation = () => {
    const mappedValues = {
      translateX: calculateScrollMappedX(),
      contrast: calculateScrollMappedContrast(),
      brightness: calculateScrollMappedBrightness(),
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
      if (config.contrast)
        gsapSettings.filter = `contrast(${style.contrast.previous}%)`;
      if (config.brightness) {
        gsapSettings.filter = `${
          gsapSettings.filter ? gsapSettings.filter + " " : ""
        }brightness(${style.brightness.previous}%)`;
      }

      gsap.set(row, gsapSettings);
    });
  };

  // Setup scroll trigger for grid animation
  ScrollTrigger.create({
    trigger: ".intro",
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
    const allImages = grid.querySelectorAll(".row__item-img");

    allImages.forEach((img) => {
      const bgImage = img.style.backgroundImage;
      if (bgImage) {
        const url = bgImage.slice(4, -1).replace(/"/g, "");
        images.push(url);
      }
    });

    return images;
  };

  // Create lightbox slides
  const createLightboxSlides = () => {
    const carousel = lightbox.querySelector(".lightbox__carousel");
    const images = collectGridImages();

    if (!carousel) {
      console.error("Carousel container not found");
      return [];
    }

    carousel.innerHTML = "";

    images.forEach((imageUrl, index) => {
      const slide = document.createElement("div");
      slide.className = "lightbox__slide";
      
      // Set initial slide position
      if (index === 0) {
        slide.classList.add("active");
      } else {
        // Position other slides off-screen to the right
        slide.style.transform = "translateX(100%)";
      }
      
      slide.innerHTML = `<img src="${imageUrl}" alt="Gallery image ${
        index + 1
      }" class="lightbox__image">`;
      carousel.appendChild(slide);
    });

    return images;
  };

  // Create lightbox dots
  const createLightboxDots = (imageCount) => {
    const dotsContainer = lightbox.querySelector(".lightbox__dots");

    if (!dotsContainer) {
      console.error("Dots container not found");
      return;
    }

    dotsContainer.innerHTML = "";

    for (let i = 0; i < imageCount; i++) {
      const dot = document.createElement("button");
      dot.className = "lightbox__dot";
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
    const dots = lightbox.querySelectorAll(".lightbox__dot");
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  };

  // Go to specific slide with slide animation
  const goToSlide = (index) => {
    if (slides.length === 0) return;

    // Ensure index is within bounds
    index = (index + slides.length) % slides.length;
    
    // Don't do anything if we're already on this slide
    if (index === currentSlideIndex) return;

    // Determine slide direction (left or right)
    const direction = index > currentSlideIndex ? 'next' : 'prev';
    
    // Update current index
    const previousIndex = currentSlideIndex;
    currentSlideIndex = index;

    // Update slides with slide animation
    const lightboxSlides = lightbox.querySelectorAll(".lightbox__slide");
    
    // Remove any existing transition classes
    lightboxSlides.forEach(slide => {
      slide.classList.remove("slide-in-left", "slide-in-right", "slide-out-left", "slide-out-right", "active");
    });
    
    // Apply appropriate slide classes based on direction
    if (lightboxSlides[previousIndex]) {
      lightboxSlides[previousIndex].classList.add(direction === 'next' ? 'slide-out-left' : 'slide-out-right');
    }
    
    if (lightboxSlides[index]) {
      lightboxSlides[index].classList.add('active', direction === 'next' ? 'slide-in-right' : 'slide-in-left');
    }

    // Update dots
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

  // Open lightbox
  const openLightbox = () => {
    // Save current scroll position
    scrollPosition = window.scrollY || document.documentElement.scrollTop;

    // Create lightbox content
    slides = createLightboxSlides();
    createLightboxDots(slides.length);

    // Show lightbox
    lightbox.showModal();

    // Disable scrolling
    body.classList.add("noscroll");
    body.style.top = `-${scrollPosition}px`;

    // Set initial slide
    goToSlide(0);

    // Add keyboard navigation
    document.addEventListener("keydown", handleKeyDown);
  };

  // Close lightbox
  const closeLightbox = () => {
    // Hide lightbox
    lightbox.close();

    // Enable scrolling and restore position
    body.classList.remove("noscroll");
    body.style.top = "";
    window.scrollTo(0, scrollPosition);

    // Remove keyboard navigation
    document.removeEventListener("keydown", handleKeyDown);
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
    const closeBtn = lightbox.querySelector(".lightbox__close");
    const prevBtn = lightbox.querySelector(".lightbox__nav-prev");
    const nextBtn = lightbox.querySelector(".lightbox__nav-next");

    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
    if (prevBtn) prevBtn.addEventListener("click", prevSlide);
    if (nextBtn) nextBtn.addEventListener("click", nextSlide);

    // Close on backdrop click (for browsers that support it)
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  };

  // Initialize smooth scrolling
  const initSmoothScrolling = () => {
    // Check if Lenis is available
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
    // Initialize click event for the "Explore" button
    if (enterButton) {
      enterButton.addEventListener("click", openLightbox);
    }

    // Initialize lightbox controls
    if (lightbox) {
      initLightboxControls();
    }

    // Start initial render
    renderScrollAnimation();
  };

  // Activate smooth scrolling
  initSmoothScrolling();

  // Call initialization
  init();
});
