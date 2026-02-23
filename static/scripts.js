/**
 * Shared IntersectionObserver for efficient video playback.
 * Only plays videos when they are actually visible in the viewport.
 */
const sharedVideoObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const video = entry.target;
    if (entry.isIntersecting) {
      if (video.paused) {
        video.play().catch(() => { /* Auto-play prevented or interrupted */ });
      }
    } else {
      video.pause();
    }
  });
}, {
  rootMargin: "50px 0px",
  threshold: 0.1
});

function playMergeVid(vid, videoMerge) {
  // Written by Dor Verbin, October 2021
  // Optimized for performance
  const leftcaption = [...videoMerge.parentElement.querySelectorAll('.video-label > :first-child')];
  const rightcaption = [...videoMerge.parentElement.querySelectorAll('.video-label > :last-child')];
  const borderThickness = 4;
  var position = 0.5;
  
  var vidWidth = vid.videoWidth / 2;
  var vidHeight = vid.videoHeight;
  var bcr = videoMerge.getBoundingClientRect();
  var mergeContext = videoMerge.getContext("2d");
  
  // Default to true so it draws immediately on load, then the observer takes over
  let isVisible = true;

  function updateCaptionMasks() {
    if (leftcaption) {
      for (var i = 0; i < leftcaption.length; i++) {
        leftcaption[i].style.clipPath = `xywh(0 0 ${bcr.width * position - borderThickness / 2}px 100%)`;
      }
    }
    if (rightcaption) {
      for (var i = 0; i < rightcaption.length; i++) {
        rightcaption[i].style.clipPath = `inset(0 0 0 calc(100% - ${bcr.width * (1 - position) - borderThickness / 2}px))`;
      }
    }
  }

  function startLogic() {
    vid.play(); 

    function trackLocation(e) {
      bcr = videoMerge.getBoundingClientRect();
      position = ((e.pageX - bcr.x) / bcr.width);
      updateCaptionMasks();
    }

    function trackLocationTouch(e) {
      bcr = videoMerge.getBoundingClientRect();
      position = ((e.touches[0].pageX - bcr.x) / bcr.width);
      updateCaptionMasks();
    }

    videoMerge.addEventListener("mousemove", trackLocation, false);
    videoMerge.addEventListener("touchstart", trackLocationTouch, { passive: true });
    videoMerge.addEventListener("touchmove", trackLocationTouch, { passive: true });

    function clamp(number, min, max) {
      return Math.min(Math.max(number, min), max);
    };

    function drawLoop() {
      if (!isVisible) {
        requestAnimationFrame(drawLoop);
        return; 
      }

      mergeContext.drawImage(vid, 0, 0, vidWidth, vidHeight, 0, 0, vidWidth, vidHeight);
      var colStart = clamp(vidWidth * position, 0.0, vidWidth);
      var colWidth = clamp(vidWidth - (vidWidth * position), 0.0, vidWidth);
      mergeContext.drawImage(vid, colStart + vidWidth, 0, colWidth, vidHeight, colStart, 0, colWidth, vidHeight);

      var arrowLength = 0.09 * vidHeight;
      var arrowheadWidth = 0.025 * vidHeight;
      var arrowheadLength = 0.04 * vidHeight;
      var arrowPosY = vidHeight / 10;
      var arrowWidth = 0.007 * vidHeight;
      var currX = vidWidth * position;

      mergeContext.beginPath();
      mergeContext.arc(currX, arrowPosY, arrowLength * 0.7, 0, Math.PI * 2, false);
      mergeContext.fillStyle = "#FFD79340";
      mergeContext.fill();

      mergeContext.beginPath();
      mergeContext.moveTo(vidWidth * position, 0);
      mergeContext.lineTo(vidWidth * position, vidHeight);
      mergeContext.closePath();
      mergeContext.strokeStyle = "#444444";
      mergeContext.lineWidth = 5;
      mergeContext.stroke();

      mergeContext.beginPath();
      mergeContext.moveTo(currX, arrowPosY - arrowWidth / 2);
      mergeContext.lineTo(currX + arrowLength / 2 - arrowheadLength / 2, arrowPosY - arrowWidth / 2);
      mergeContext.lineTo(currX + arrowLength / 2 - arrowheadLength / 2, arrowPosY - arrowheadWidth / 2);
      mergeContext.lineTo(currX + arrowLength / 2, arrowPosY);
      mergeContext.lineTo(currX + arrowLength / 2 - arrowheadLength / 2, arrowPosY + arrowheadWidth / 2);
      mergeContext.lineTo(currX + arrowLength / 2 - arrowheadLength / 2, arrowPosY + arrowWidth / 2);
      mergeContext.lineTo(currX - arrowLength / 2 + arrowheadLength / 2, arrowPosY + arrowWidth / 2);
      mergeContext.lineTo(currX - arrowLength / 2 + arrowheadLength / 2, arrowPosY + arrowheadWidth / 2);
      mergeContext.lineTo(currX - arrowLength / 2, arrowPosY);
      mergeContext.lineTo(currX - arrowLength / 2 + arrowheadLength / 2, arrowPosY - arrowheadWidth / 2);
      mergeContext.lineTo(currX - arrowLength / 2 + arrowheadLength / 2, arrowPosY);
      mergeContext.lineTo(currX - arrowLength / 2 + arrowheadLength / 2, arrowPosY - arrowWidth / 2);
      mergeContext.lineTo(currX, arrowPosY - arrowWidth / 2);
      mergeContext.closePath();
      mergeContext.fillStyle = "#444444";
      mergeContext.fill();

      requestAnimationFrame(drawLoop);
    }
    
    requestAnimationFrame(drawLoop);
  }

  // Observer to pause the DRAW LOOP when offscreen (saves GPU)
  const canvasObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        isVisible = entry.isIntersecting;
        if(isVisible) {
            vid.play().catch(()=>{});
        } else {
            vid.pause();
        }
    });
  }, { threshold: 0 });
  canvasObserver.observe(videoMerge);

  if (vid.readyState > 3) {
    startLogic();
  } else {
    vid.addEventListener('loadeddata', startLogic);
  }
}

function ondocumentready() {
  // 1. Handle Video Comparisons
  [...document.querySelectorAll('video.video-compare')].forEach(element => {
    function loadeddata() {
      const canvas = document.createElement("canvas");
      element.parentNode.insertBefore(canvas, element.nextSibling);
      element.height = 0;
      element.style.position = "absolute"; 
      canvas.style.aspectRatio = `${element.videoWidth / 2}/${element.videoHeight}`;
      canvas.width = element.videoWidth / 2;
      canvas.height = element.videoHeight;
      canvas.classList.add("video-compare");
      playMergeVid(element, canvas);
    }
    if (element.readyState > 3) loadeddata();
    else element.addEventListener("loadeddata", loadeddata);
  });

  // 2. Handle Sliders (Interpolation)
  [...document.querySelectorAll('input[data-control-video]')].forEach(element => {
    const video = document.getElementById(element.getAttribute("data-control-video"));
    const sliderImagesRoot = document.getElementById(element.getAttribute("data-control-slider-images"));
    
    element.addEventListener("input", function() {
      const value = Math.min(100, Math.max(0, element.value));
      if(video && Number.isFinite(video.duration)) {
          const slice = video.duration * value / 100;
          video.currentTime = "" + slice;
      }

      if (sliderImagesRoot) {
        const el1 = Math.min(Math.floor(value / 100 * (sliderImagesRoot.children.length - 1)), sliderImagesRoot.children.length - 2);
        const offset = (sliderImagesRoot.children.length - 1) * value / 100 - el1;
        for (var i = 0; i < sliderImagesRoot.children.length; i++) {
          sliderImagesRoot.children[i].style.setProperty("--active-weight", "0%");
          if (i === el1) {
            sliderImagesRoot.children[i].style.setProperty("--active-weight", `${100 * (1 - offset)}%`);
          }
          if (i === el1 + 1) {
            sliderImagesRoot.children[i].style.setProperty("--active-weight", `${100 * offset}%`);
          }
        }
      }
    });
  });

  // 3. Observe standalone videos
  // CRITICAL FIX: Exclude the interpolation video (#appearance-interpolation-video)
  // We do NOT want the auto-player to touch that video, because the slider controls it.
  const allVideos = document.querySelectorAll('video:not(.video-compare):not(#appearance-interpolation-video)');
  allVideos.forEach(v => {
      sharedVideoObserver.observe(v);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ondocumentready);
} else {
  ondocumentready();
}

// Grid Logic (SOTA Comparison)
document.addEventListener('DOMContentLoaded', (event) => {
    const rows = document.querySelectorAll('#grid-container .comparison-grid .row');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const pageInfo = document.getElementById('page-info');
    const totalRows = rows.length;
    let currentRowIndex = 0;

    if (totalRows === 0) {
        if(pageInfo) pageInfo.textContent = '0 / 0';
        return;
    }

    function updateGrid() {
        rows.forEach((row, index) => {
            if (index === currentRowIndex) {
                row.style.display = 'flex'; 
                const videos = row.querySelectorAll('video');
                videos.forEach(v => {
                    v.currentTime = 0;
                    v.play().catch(()=>{});
                    sharedVideoObserver.observe(v);
                });
            } else {
                row.style.display = 'none';
                const videos = row.querySelectorAll('video');
                videos.forEach(v => {
                    v.pause();
                });
            }
        });

        if(pageInfo) pageInfo.textContent = `${currentRowIndex + 1} / ${totalRows}`;
        if(prevButton) prevButton.disabled = currentRowIndex === 0;
        if(nextButton) nextButton.disabled = currentRowIndex === totalRows - 1;
    }

    if(nextButton) nextButton.addEventListener('click', () => {
        if (currentRowIndex < totalRows - 1) {
            currentRowIndex++;
            updateGrid();
        }
    });

    if(prevButton) prevButton.addEventListener('click', () => {
        if (currentRowIndex > 0) {
            currentRowIndex--;
            updateGrid();
        }
    });

    updateGrid();
});

// Labels resizing
window.addEventListener("load", () => {
    const firstRowCells = document.querySelectorAll(".crossillum-row:nth-of-type(2) .cell");
    const labelCells = document.querySelectorAll("#label-row .label");
    
    if(firstRowCells.length > 0 && labelCells.length > 0) {
        firstRowCells.forEach((cell, i) => {
            if(labelCells[i]) {
                const w = cell.getBoundingClientRect().width;
                labelCells[i].style.width = w + "px";
                labelCells[i].style.flex = "0 0 " + w + "px";
            }
        });
    }
});

// Failure Cases Gallery
document.addEventListener('DOMContentLoaded', () => {
    const failureGrid = document.getElementById('failure-grid');
    const failureHeading = document.getElementById('failure-heading');
    const failurePrevBtn = document.getElementById('failure-prev');
    const failureNextBtn = document.getElementById('failure-next');
    const failureTemplates = document.querySelectorAll('#failure-templates .failure-set');
    let currentFailureIndex = 0;

    function renderFailureCase(index) {
        const caseIndex = Math.min(Math.max(0, index), failureTemplates.length - 1);
        currentFailureIndex = caseIndex;

        failureGrid.innerHTML = '';
        const currentCaseTemplate = failureTemplates[caseIndex];
        
        Array.from(currentCaseTemplate.children).forEach(child => {
            const clone = child.cloneNode(true);
            failureGrid.appendChild(clone);
        });

        const videos = failureGrid.querySelectorAll('video');
        videos.forEach(video => {
            video.currentTime = 0;
            sharedVideoObserver.observe(video);
            video.play().catch(() => {});
        });

        if(failureHeading) failureHeading.textContent = currentCaseTemplate.getAttribute('data-heading');
        if(failurePrevBtn) failurePrevBtn.disabled = currentFailureIndex === 0;
        if(failureNextBtn) failureNextBtn.disabled = currentFailureIndex === failureTemplates.length - 1;
    }

    if (failureTemplates.length > 0) {
        renderFailureCase(0);
    }
    
    if(failurePrevBtn) failurePrevBtn.addEventListener('click', () => {
        if (currentFailureIndex > 0) renderFailureCase(currentFailureIndex - 1);
    });

    if(failureNextBtn) failureNextBtn.addEventListener('click', () => {
        if (currentFailureIndex < failureTemplates.length - 1) renderFailureCase(currentFailureIndex + 1);
    });
});