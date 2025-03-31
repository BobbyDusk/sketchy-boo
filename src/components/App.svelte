<!--
Copyright (C) 2023 Edge of Dusk

This file is part of Sketchy Boo.

Sketchy Boo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Sketchy Boo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Sketchy Boo. If not, see <https://www.gnu.org/licenses/>.
-->

<script lang="ts">
  import RangeSlider from "svelte-range-slider-pips";
  let SERVER_URL: string;
  if (import.meta.env.PROD) {
    SERVER_URL = "https://api.edgeofdusk.com/Sketchy Boo";
  } else {
    SERVER_URL = "http://localhost:8000";
  }

  enum Dir {
    top,
    right,
    bottom,
    left,
  }

  const WHITE_FILTER_MODELS: string[] = [
    "pillow",
    "luminocity",
    "average",
    "lightness",
  ];
  // TODO: the sam model seems awesome, but there is currently a bug. Implement it once fixed
  // see https://github.com/danielgatis/rembg/issues/459
  const BACKGROUND_REMOVAL_MODELS: string[] = [
    "u2net",
    "u2netp",
    "silueta",
    "isnet_general_use",
    "isnet_anime",
    // "sam", TODO: enable once fixed
  ];

  const MODES: string[] = ["automatic", "manual"];
  const FORMATS: string[] = ["PNG", "WEBP", "SVG"];
  const BACKGROUND_COLORS: string[] = ["white", "black"];

  const CROP_MIN_WIDTH = 20;
  const CROP_MIN_HEIGHT = 20;

  const PREVIEW_BACKGROUNDS: string[] = ["checkered", "solid", "none"];

  let selectedMode: string = "automatic";
  let selectedBackgroundColor: string = "white";
  let isCropEnabled: boolean = false;
  let isAutoCropEnabled: boolean = true;
  let cropOpacityThreshold: number[] = [10];
  let isResizeEnabled: boolean = false;
  // TODO: max 2000 size
  let resizeWidth: number;
  let resizeHeight: number;
  let isRemoveBackgroundEnabled: boolean = false;
  let selectedRemoveBackgroundModel: string = "u2netp";
  let isRemoveBackgroundPostProcessEnabled: boolean = true;
  let isRemoveBackgroundEdgeWhiteFilterEnabled: boolean = true;
  let removeBackgroundEdgeWhiteFilterWidth: number = 4;
  let removeBackgroundEdgeWhiteFilterRange: number[] = [100, 195];
  let isFilterWhiteEnabled: boolean = false;
  let selectedFilterWhiteModel: string = "pillow";
  let filterWhiteRange: number[] = [230, 255];
  let originalImageBase64: string | null = null;
  let processedImageSources: string[] = [];
  let processedImages: HTMLImageElement[] = [];
  let processedImagesData: { width: number; height: number; size: number }[] =
    [];
  let processedZip: string;
  let proposedFileName: string = "processed.png";
  let points: number[][] = [];
  let isLoading: boolean = false;
  let previewBackground: string = "checkered";
  let previewBackgroundColor: string = "#000000";
  let fileName: string;
  let originalImage: HTMLImageElement;
  let originalImageBoundingBox: DOMRect;
  let cropTop: number = 0;
  let cropLeft: number = 0;
  // TODO: change everything in terms of width and height instead of right and bottom
  let cropRight: number = 0;
  let cropBottom: number = 0;
  let cropBox: HTMLElement;
  let croppingDirs: Dir[] = [];
  let cropMoveRelativeTop: number;
  let cropMoveRelativeLeft: number;
  let cropMoveRelativeBottom: number;
  let cropMoveRelativeRight: number;
  let originalImageWidth: number;
  let originalImageHeight: number;
  let cropRealWidth: number;
  let cropRealHeight: number;
  let svgSimplify: boolean = true;
  let svgApproximationLengthPercentage: number[] = [0.1];
  let webpLossless: boolean = false;
  let webpQuality: number[] = [75];
  let webpMethod: number = 5;
  let resizeWidthInput: HTMLInputElement;
  let resizeHeightInput: HTMLInputElement;
  let isImageLoading: boolean = false;
  let format: string = "PNG";

  function updateResizeWidth() {
    resizeWidth = Math.round((resizeHeight / cropRealHeight) * cropRealWidth);
  }

  function updateResizeHeight() {
    resizeHeight = Math.round((resizeWidth / cropRealWidth) * cropRealHeight);
  }

  function resetCropBox() {
    // reset cropBox if new image
    cropTop = 0;
    cropRight = 0;
    cropBottom = 0;
    cropLeft = 0;
  }

  function transformScreenToimageCoordinates(num: number) {
    return Math.round(
      (originalImageHeight / originalImageBoundingBox.height) * num
    );
  }

  $: if (
    originalImageWidth &&
    originalImageHeight &&
    originalImageBoundingBox
  ) {
    cropRealWidth = transformScreenToimageCoordinates(
      originalImageBoundingBox.width - cropLeft - cropRight
    );
    cropRealHeight = transformScreenToimageCoordinates(
      originalImageBoundingBox.height - cropTop - cropBottom
    );
  }

  $: if (cropRealHeight && cropRealWidth) {
    resizeHeightInput.value = cropRealHeight.toString();
    resizeWidthInput.value = cropRealWidth.toString();
  }

  $: if (originalImageBoundingBox && cropBox) {
    const top = originalImageBoundingBox.top + cropTop;
    const left = originalImageBoundingBox.left + cropLeft;
    const height = originalImageBoundingBox.height - cropTop - cropBottom;
    const width = originalImageBoundingBox.width - cropLeft - cropRight;

    cropBox.style.top = `${Math.round(top)}px`;
    cropBox.style.left = `${Math.round(left)}px`;
    cropBox.style.height = `${Math.round(height)}px`;
    cropBox.style.width = `${Math.round(width)}px`;
  }

  $: for (let i = 0; i < processedImageSources.length; i++) {
    let img = new Image();

    img.onload = function () {
      var height = img.height;
      var width = img.width;
      // file size in bytes, assuming source is base64
      var size = processedImageSources[i].length * (3 / 4);
      processedImagesData[i] = { width, height, size };
    };

    img.src = processedImageSources[i];
  }

  function getBase64Image(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = (error) => {
        console.log("Error: ", error);
        reject();
      };
    });
  }

  function updateOriginalImage(e: any) {
    const fileInput = e.target as HTMLInputElement;
    const fileList: FileList | null = fileInput.files;
    if (fileList && fileList[0]) {
      isImageLoading = true;
      originalImageBase64 = null;
      getBase64Image(fileList[0]).then((result) => {
        originalImageBase64 = result;
        resetCropBox();
        originalImage.onload = () => {
          originalImageBoundingBox = originalImage?.getBoundingClientRect();
          setProposedFileName(fileList[0]);
          isImageLoading = false;
        };

        const img = new Image();
        img.onload = () => {
          originalImageHeight = img.height;
          originalImageWidth = img.width;
        };

        originalImage.src = originalImageBase64!;
        img.src = originalImageBase64!;
      });
    }
  }

  function setProposedFileName(file: File) {
    proposedFileName = `${getBaseFilenameWithoutExtension(
      file.name
    )}_processed.${format.toLowerCase()}`;
  }

  function getBaseFilenameWithoutExtension(filename: string): string {
    // Remove the path (if any) and then remove the extension
    const baseFilename = filename!
      .split("/")!
      .pop()!
      .split(".")
      .slice(0, -1)
      .join(".");
    return baseFilename;
  }

  async function uploadImage(): Promise<undefined> {
    try {
      isLoading = true;
      const crop = {
        enabled: isCropEnabled,
        top: transformScreenToimageCoordinates(cropTop),
        left: transformScreenToimageCoordinates(cropLeft),
        width: cropRealWidth,
        height: cropRealHeight,
        autoEnabled: isAutoCropEnabled,
        threshold: cropOpacityThreshold[0],
      };
      const resize = {
        enabled: isResizeEnabled,
        width: resizeWidth,
        height: resizeHeight,
      };
      const filterWhite = {
        enabled: isFilterWhiteEnabled,
        model: selectedFilterWhiteModel,
        threshold: filterWhiteRange[0],
        max: filterWhiteRange[1],
      };
      const removeBackground = {
        enabled: isRemoveBackgroundEnabled,
        model: selectedRemoveBackgroundModel,
        postProcess: isRemoveBackgroundPostProcessEnabled,
        edgeWhiteFilter: isRemoveBackgroundEdgeWhiteFilterEnabled,
        edgeWhiteFilterWidth: removeBackgroundEdgeWhiteFilterWidth,
        edgeWhiteFilterThreshold: removeBackgroundEdgeWhiteFilterRange[0],
        edgeWhiteFilterMax: removeBackgroundEdgeWhiteFilterRange[1],
        points,
      };
      let formatOptions = {};
      if (format == "SVG") {
        formatOptions = {
          simplify: svgSimplify,
          approximationLengthPercentage: svgApproximationLengthPercentage[0],
        };
      } else if (format == "WEBP") {
        formatOptions = {
          lossless: webpLossless,
          quality: webpQuality[0],
          method: webpMethod,
        };
      }
      const data = {
        image: originalImageBase64,
        mode: selectedMode,
        backgroundColor: selectedBackgroundColor,
        crop,
        resize,
        filterWhite,
        removeBackground,
        format,
        formatOptions,
      };
      const response = await fetch(`${SERVER_URL}/upload`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const responseData = await response.json();
      processedImageSources = responseData.images;
      processedZip = responseData.zip;
      console.log(responseData.message);
    } catch (error) {
      console.log(`Error: ${error}`);
    } finally {
      isLoading = false;
    }
    return;
  }

  function getPosition(e: MouseEvent) {
    console.log(e.target);
    let target: HTMLElement = e.target as HTMLElement;
    let rect = target.getBoundingClientRect();
    let relativePointX = e.clientX - rect.left; //x position within the element.
    let relativePointY = e.clientY - rect.top; //y position within the element.
    let img = new Image();
    img.src = originalImageBase64!;
    let pointX = Math.round((relativePointX / target.clientWidth) * img.width);
    let pointY = Math.round(
      (relativePointY / target.clientHeight) * img.height
    );
    let point = [pointX, pointY];
    points.push(point);
    console.log(point);
  }

  // https://stackoverflow.com/questions/64690514/creating-a-resizable-draggable-rotate-view-in-javascript
  function moveCropBox(e: MouseEvent) {
    e.preventDefault();
    if (e.y - cropMoveRelativeTop < originalImageBoundingBox.top) {
      if (e.y < originalImageBoundingBox.top) {
        cropMoveRelativeTop = 0;
        cropMoveRelativeBottom = cropBox.getBoundingClientRect().height;
      }
    } else if (e.y + cropMoveRelativeBottom > originalImageBoundingBox.bottom) {
      if (e.y > originalImageBoundingBox.bottom) {
        cropMoveRelativeTop = cropBox.getBoundingClientRect().height;
        cropMoveRelativeBottom = 0;
      }
    } else {
      cropTop = Math.max(
        0,
        e.y - originalImageBoundingBox.top - cropMoveRelativeTop
      );
      cropBottom = Math.max(
        0,
        originalImageBoundingBox.bottom - e.y - cropMoveRelativeBottom
      );
    }

    if (e.x - cropMoveRelativeLeft < originalImageBoundingBox.left) {
      if (e.x < originalImageBoundingBox.left) {
        cropMoveRelativeLeft = 0;
        cropMoveRelativeRight = cropBox.getBoundingClientRect().width;
      }
    } else if (e.x + cropMoveRelativeRight > originalImageBoundingBox.right) {
      if (e.x > originalImageBoundingBox.right) {
        cropMoveRelativeLeft = cropBox.getBoundingClientRect().width;
        cropMoveRelativeRight = 0;
      }
    } else {
      cropLeft = Math.max(
        0,
        e.x - originalImageBoundingBox.left - cropMoveRelativeLeft
      );
      cropRight = Math.max(
        0,
        originalImageBoundingBox.right - e.x - cropMoveRelativeRight
      );
    }
  }

  function stopMoveCropBox() {
    window.removeEventListener("mousemove", moveCropBox, false);
    window.removeEventListener("mouseup", stopMoveCropBox, false);
  }

  function startMoveCropBox(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    cropMoveRelativeTop = e.y - cropBox.getBoundingClientRect().top;
    cropMoveRelativeLeft = e.x - cropBox.getBoundingClientRect().left;
    cropMoveRelativeBottom = cropBox.getBoundingClientRect().bottom - e.y;
    cropMoveRelativeRight = cropBox.getBoundingClientRect().right - e.x;
    window.addEventListener("mousemove", moveCropBox, false);
    window.addEventListener("mouseup", stopMoveCropBox, false);
  }

  function resizeCropBox(e: MouseEvent) {
    e.preventDefault();
    if (croppingDirs.includes(Dir.top)) {
      cropTop = Math.max(0, e.y - originalImageBoundingBox.top);
      cropTop = Math.min(
        cropTop,
        originalImageBoundingBox.height - cropBottom - CROP_MIN_HEIGHT
      );
    }
    if (croppingDirs.includes(Dir.right)) {
      cropRight = Math.max(0, originalImageBoundingBox.right - e.x);
      cropRight = Math.min(
        cropRight,
        originalImageBoundingBox.width - cropLeft - CROP_MIN_WIDTH
      );
    }
    if (croppingDirs.includes(Dir.bottom)) {
      cropBottom = Math.max(0, originalImageBoundingBox.bottom - e.y);
      cropBottom = Math.min(
        cropBottom,
        originalImageBoundingBox.height - cropTop - CROP_MIN_HEIGHT
      );
    }
    if (croppingDirs.includes(Dir.left)) {
      cropLeft = Math.max(0, e.x - originalImageBoundingBox.left);
      cropLeft = Math.min(
        cropLeft,
        originalImageBoundingBox.width - cropRight - CROP_MIN_WIDTH
      );
    }
  }

  function stopResizeCropBox() {
    window.removeEventListener("mousemove", resizeCropBox, false);
    window.removeEventListener("mouseup", stopResizeCropBox, false);
    croppingDirs = [];
  }

  function startResizeCropBox(e: MouseEvent, dirs: Dir[]) {
    e.preventDefault();
    e.stopPropagation();
    croppingDirs = dirs;
    window.addEventListener("mousemove", resizeCropBox, false);
    window.addEventListener("mouseup", stopResizeCropBox, false);
  }

  function condDisabled(condition: any): string {
    if (condition) {
      return "disabled";
    } else {
      return "";
    }
  }

  $: disabledIfNoImage = condDisabled(!originalImageBase64);
  $: disabledIfNoManual = condDisabled(
    !originalImageBase64 || selectedMode != "manual"
  );
  $: disabledIfNoRemoveBackground = condDisabled(!isRemoveBackgroundEnabled);
  $: disabledIfNoEdgeWhiteFilter = condDisabled(
    !isRemoveBackgroundEnabled || !isRemoveBackgroundEdgeWhiteFilterEnabled
  );
  $: disabledIfNoFilterWhite = condDisabled(!isFilterWhiteEnabled);
  $: disabledIfNoResize = condDisabled(!isResizeEnabled);
  $: disabledIfNotSolid = condDisabled(previewBackground != "solid");
  $: disabledIfMultipleImages = condDisabled(processedImageSources.length > 1);
</script>

<div
  class="app_root"
  style={`--backgroundColor: ${
    selectedBackgroundColor == "white" ? "white" : "black"
  }; --foregroundColor: ${
    selectedBackgroundColor == "white" ? "black" : "white"
  };
  height: calc(100vh - var(--header-height));`
  }
>
  <div class="left buttons_container">
    <div class="button_group">
      <div class="button_item">
        <label for="images" class="button">Select image</label>
        <input
          accept="image/png, image/jpeg, image/webp"
          id="images"
          name="images"
          type="file"
          class="file_input"
          on:change={updateOriginalImage}
        />
      </div>
    </div>

    <div class="button_group {disabledIfNoImage}">
      <div class="button_item_horizontal">
        <label for="model">mode:</label>
        <select name="mode" bind:value={selectedMode} class="button-item">
          {#each MODES as mode}
            <option value={mode}>
              {mode}
            </option>
          {/each}
        </select>
      </div>

      <div class="button_item_horizontal">
        <label for="backgroundColor">background color:</label>
        <select
          name="backgroundColor"
          bind:value={selectedBackgroundColor}
          class="button-item"
        >
          {#each BACKGROUND_COLORS as color}
            <option value={color}>
              {color}
            </option>
          {/each}
        </select>
      </div>
    </div>

    <div class="button_group {disabledIfNoManual}">
      <div class="button_item_horizontal">
        <input
          type="checkbox"
          id="enable_crop"
          name="enable_crop"
          bind:checked={isCropEnabled}
        />
        <label for="enable_crop">crop</label>
      </div>
      <div class="button_item_horizontal {!isCropEnabled && 'disabled'}">
        <input
          type="checkbox"
          id="enable_auto_crop"
          name="enable_auto_crop"
          bind:checked={isAutoCropEnabled}
        />
        <label for="enable_auto_crop">auto crop</label>
      </div>
      <div
        class="button_item stretch {(!isCropEnabled || !isAutoCropEnabled) &&
          'disabled'}"
      >
        <label for="opacity_threshold">opacity threshold</label>
        <RangeSlider
          id="range_container"
          bind:values={cropOpacityThreshold}
          float
          min={0}
          max={255}
          step={1}
        />
      </div>
    </div>

    <div class="button_group {disabledIfNoManual}">
      <div class="button_item_horizontal">
        <input
          type="checkbox"
          id="enable_background_removal"
          name="enable_background_removal"
          bind:checked={isRemoveBackgroundEnabled}
        />
        <label for="enable_background_removal">background removal</label>
      </div>
      <div class="button_item_horizontal {disabledIfNoRemoveBackground}">
        <label for="model">model:</label>
        <select
          name="model"
          bind:value={selectedRemoveBackgroundModel}
          class="button-item"
        >
          {#each BACKGROUND_REMOVAL_MODELS as model}
            <option value={model}>
              {model}
            </option>
          {/each}
        </select>
      </div>
      <div class="button_item_horizontal {disabledIfNoRemoveBackground}">
        <input
          type="checkbox"
          id="enable_background_removal_post_process"
          name="enable_background_removal_post_process"
          bind:checked={isRemoveBackgroundPostProcessEnabled}
        />
        <label for="enable_background_removal_post_process">
          post process mask
        </label>
      </div>
      <div class="button_item_horizontal {disabledIfNoRemoveBackground}">
        <input
          type="checkbox"
          id="enable_background_removal_edge_white_filter"
          name="enable_background_removal_edge_white_filter"
          bind:checked={isRemoveBackgroundEdgeWhiteFilterEnabled}
        />
        <label for="enable_background_removal_edge_white_filter">
          edge {selectedBackgroundColor} filter
        </label>
      </div>
      <div class="button_item_horizontal {disabledIfNoEdgeWhiteFilter}">
        <label for="edge_white_filter_width">edge width </label>
        <input
          name="edge_white_filter_width"
          id="edge_white_filter_width"
          type="number"
          min="1"
          max="100"
          bind:value={removeBackgroundEdgeWhiteFilterWidth}
        />
      </div>

      <div
        class="button_item stretch {disabledIfNoEdgeWhiteFilter}
			"
      >
        <RangeSlider
          id="range_container"
          range
          pushy
          bind:values={removeBackgroundEdgeWhiteFilterRange}
          float
          min={0}
          max={255}
          step={1}
        />
      </div>
    </div>

    <div class="button_group {disabledIfNoManual}">
      <div class="button_item_horizontal">
        <input
          type="checkbox"
          id="enable_filter_white"
          name="enable_filter_white"
          bind:checked={isFilterWhiteEnabled}
        />
        <label for="enable_filter_white">filter {selectedBackgroundColor}</label
        >
      </div>
      <div class="button_item {disabledIfNoFilterWhite}">
        <label for="model">model:</label>
        <select
          name="model"
          bind:value={selectedFilterWhiteModel}
          class="button-item"
        >
          {#each WHITE_FILTER_MODELS as model}
            <option value={model}>
              {model}
            </option>
          {/each}
        </select>
      </div>
      <div class="button_item stretch {disabledIfNoFilterWhite}">
        <RangeSlider
          id="range_container"
          range
          pushy
          bind:values={filterWhiteRange}
          float
          min={0}
          max={255}
          step={1}
        />
      </div>
    </div>

    <div class="button_group {disabledIfNoManual}">
      <div class="button_item_horizontal">
        <input
          type="checkbox"
          id="enable_resize"
          name="enable_resize"
          bind:checked={isResizeEnabled}
        />
        <label for="enable_resize">resize</label>
      </div>
      <div class="button_item {disabledIfNoResize}">
        <label for="resize_width">width</label>
        <input
          type="number"
          id="resize_width"
          name="resize_width"
          bind:value={resizeWidth}
          on:change={updateResizeHeight}
          bind:this={resizeWidthInput}
        />
      </div>
      <div class="button_item {disabledIfNoResize}">
        <label for="resize_height">height</label>
        <input
          type="number"
          id="resize_height"
          name="resize_height"
          bind:value={resizeHeight}
          on:change={updateResizeWidth}
          bind:this={resizeHeightInput}
        />
      </div>
    </div>

    <div class="button_group {disabledIfNoImage}">
      <div class="button_item">
        <label for="format">output format:</label>
        <select name="format" bind:value={format} class="button-item">
          {#each FORMATS as format}
            <option value={format}>
              {format}
            </option>
          {/each}
        </select>
      </div>
    </div>

    <div class="button_group {disabledIfNoImage}">
      {#if format == "SVG"}
        <div class="button_item_horizontal">
          <input
            type="checkbox"
            id="simplify_svg"
            name="simplify_svg"
            bind:checked={svgSimplify}
          />
          <label for="simplify_svg">simplify svg</label>
        </div>
        <div class="button_item stretch {!svgSimplify && 'disabled'}">
          <label for="approximation_length"> approximation length</label>
          <RangeSlider
            id="range_container"
            bind:values={svgApproximationLengthPercentage}
            float
            min={0}
            max={1}
            step={0.01}
          />
        </div>
      {:else if format == "WEBP"}
        <div class="button_item_horizontal">
          <input
            type="checkbox"
            id="lossless_webp"
            name="lossless_webp"
            bind:checked={webpLossless}
          />
          <label for="lossless_webp">losless</label>
        </div>
        <div class="button_item stretch">
          <label for="webp_quality">quality</label>
          <RangeSlider
            id="range_container"
            bind:values={webpQuality}
            float
            min={0}
            max={100}
            step={1}
          />
        </div>
        <div class="button_item">
          <label for="webp_method">method</label>
          <select
            name="webp_method"
            bind:value={webpMethod}
            class="button-item"
          >
            {#each Array(7).keys() as num}
              <option value={num}>
                {num}
              </option>
            {/each}
          </select>
        </div>
        <a
          href="https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html"
          target="_blank"
        >
          See here for more info
        </a>
      {:else}
        <p>No format settings</p>
      {/if}
    </div>

    <div class="button_group {disabledIfNoImage}">
      {#if isLoading}
        <div class="loader" />
      {:else}
        <button class="button_item button" on:click={uploadImage}>
          process
        </button>
      {/if}
    </div>
  </div>

  <div class="right buttons_container">
    {#if processedImageSources.length > 0}
      <div class="button_group">
        <div class="button_item">
          <label for="preview_background">preview background:</label>
          <select
            name="preview_background"
            bind:value={previewBackground}
            class="button-item"
          >
            {#each PREVIEW_BACKGROUNDS as background}
              <option value={background}>
                {background}
              </option>
            {/each}
          </select>
        </div>

        <div class="button_item_horizontal {disabledIfNotSolid}">
          <input
            type="color"
            bind:value={previewBackgroundColor}
            name="background_color"
          />
          <label for="background_color">color</label>
        </div>
      </div>
    {/if}

    {#if processedImageSources.length > 0}
      <div class="button_group">
        <div class="button_item {disabledIfMultipleImages}">
          <label for="file_name">file name</label>
          <input
            type="text"
            id="file_name"
            name="file_name"
            bind:value={fileName}
          />
        </div>
        <a
          target="_blank"
          href={processedImageSources.length > 1
            ? processedZip
            : processedImageSources[0]}
          download={processedImageSources.length > 1
            ? "processed_images.zip"
            : fileName || proposedFileName}
          class="button_item button"
        >
          Download
        </a>
      </div>
    {/if}
  </div>

  <div class="image_container left">
    <div
      class="loader original_image_content"
      style="visibility: {isImageLoading ? 'visible' : 'hidden'};"
    />
    <p
      class="original_image_content"
      style="visibility: {!isImageLoading && !originalImageBase64
        ? 'visible'
        : 'hidden'};"
    >
      No image selected
    </p>
    <img
      alt="selected img"
      class="original_image image original_image_content checkered"
      bind:this={originalImage}
      style="visibility: {!isImageLoading && originalImageBase64
        ? 'visible'
        : 'hidden'};"
    />
    <div
      class="crop_box original_image_content"
      bind:this={cropBox}
      role="presentation"
      on:mousedown={startMoveCropBox}
      style="visibility: {!isImageLoading &&
      originalImageBase64 &&
      isCropEnabled
        ? 'visible'
        : 'hidden'};"
    >
      <p class="crop_dimensions">
        {cropRealWidth} × {cropRealHeight}
      </p>
      <div
        class="corner top left"
        role="presentation"
        on:mousedown={(e) => startResizeCropBox(e, [Dir.top, Dir.left])}
      />
      <div
        class="side top"
        role="presentation"
        on:mousedown={(e) => startResizeCropBox(e, [Dir.top])}
      />
      <div
        class="corner top right"
        role="presentation"
        on:mousedown={(e) => startResizeCropBox(e, [Dir.top, Dir.right])}
      />
      <div
        class="side right"
        role="presentation"
        on:mousedown={(e) => startResizeCropBox(e, [Dir.right])}
      />
      <div
        class="corner bottom right"
        role="presentation"
        on:mousedown={(e) => startResizeCropBox(e, [Dir.bottom, Dir.right])}
      />
      <div
        class="side bottom"
        role="presentation"
        on:mousedown={(e) => startResizeCropBox(e, [Dir.bottom])}
      />
      <div
        class="corner bottom left"
        role="presentation"
        on:mousedown={(e) => startResizeCropBox(e, [Dir.bottom, Dir.left])}
      />
      <div
        class="side left"
        role="presentation"
        on:mousedown={(e) => startResizeCropBox(e, [Dir.left])}
      />
    </div>
  </div>
  <div class="image_container right">
    {#each processedImageSources as processedImageSource, i}
      <div class="image_card">
        <img
          src={processedImageSource}
          class="image {previewBackground}"
          alt="processed img"
          style={previewBackground == "solid"
            ? `background-color: ${previewBackgroundColor}`
            : ""}
          bind:this={processedImages[i]}
        />
        {#if processedImagesData[i]}
          <div class="image_data">
            <p>
              {processedImagesData[i].width}x{processedImagesData[i].height}
            </p>
            <p>
              {#if processedImagesData[i].size < 1000}
                {Math.round(processedImagesData[i].size)}B
              {:else if processedImagesData[i].size < 1000000}
                {Math.round(processedImagesData[i].size / 1000)}kB
              {:else}
                {Math.round(processedImagesData[i].size / 1000000)}MB
              {/if}
            </p>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .app_root {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 3fr 3fr 1fr;
    column-gap: 15px;
    box-sizing: border-box;
    font-size: 10pt;
  }

  .buttons_container {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    gap: 10px;
    grid-row: 1;
    padding: 10px;
    overflow-y: auto;
    overflow-x: hidden;
    /* background-color: hsl(0, 0%, 80%); */
  }

  .buttons_container.left {
    grid-column: 1;
  }

  .buttons_container.right {
    grid-column: 4;
  }

  .button_group {
    /* border: 1px solid black; */
    border-radius: 15px;
    padding: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 10px;
    background-color: hsl(0, 0%, 90%);
    border-radius: 5px;
  }

  .button_item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }

  label {
    text-align: center;
  }

  .button_item_horizontal {
    display: flex;
    flex-direction: row;
    justify-content: center;
    gap: 8px;
  }

  .button {
    border: none;
    border-radius: 10px;
    padding: 15px 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10pt;
    color: black;
    text-decoration: none;
    background-color: white;
  }

  .button:hover {
    filter: brightness(0.8);
    cursor: pointer;
  }

  .process_buttons {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }

  .stretch {
    align-self: stretch;
  }

  :global(#range_container) {
    width: 100%;
    background-image: linear-gradient(
      to right,
      var(--backgroundColor),
      var(--foregroundColor)
    );
  }

  :global(#range_container .rangeHandle) {
    height: 13px;
    width: 13px;
  }

  :global(#range_container .rangeHandle > .rangeNub) {
    background-color: blue;
  }

  :global(#range_container .rangeBar) {
    background-color: blue;
    opacity: 0.3;
  }

  .threshold_text {
    width: 3ch;
    line-height: 0;
    height: 0;
  }

  .image_container.left {
    position: relative;
    grid-column: 2;
    display: grid;
    grid-template-columns: 100%;
    grid-template-rows: 100%;
    align-items: center;
    justify-items: center;
    grid-row: 1;
  }

  .image_container.right {
    position: relative;
    grid-column: 3;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    align-items: center;
    justify-items: center;
    grid-gap: 10px;
    overflow-y: auto;
  }

  .original_image_content {
    grid-row: 1;
    grid-column: 1;
  }

  .image {
    max-width: 100%;
    max-height: 100vh;
  }

  .real_size {
    max-width: 100%;
    max-height: 100vh;
  }

  .contained_size {
    width: 100%;
    height: 100%;
    max-height: 100vh;
    object-fit: contain;
  }

  .checkered {
    background:
      -webkit-linear-gradient(
        45deg,
        rgba(0, 0, 0, 0.0980392) 25%,
        transparent 25%,
        transparent 75%,
        rgba(0, 0, 0, 0.0980392) 75%,
        rgba(0, 0, 0, 0.0980392) 0
      ),
      -webkit-linear-gradient(45deg, rgba(0, 0, 0, 0.0980392) 25%, transparent
            25%, transparent 75%, rgba(0, 0, 0, 0.0980392) 75%, rgba(
              0,
              0,
              0,
              0.0980392
            )
            0),
      white;
    background:
      -moz-linear-gradient(
        45deg,
        rgba(0, 0, 0, 0.0980392) 25%,
        transparent 25%,
        transparent 75%,
        rgba(0, 0, 0, 0.0980392) 75%,
        rgba(0, 0, 0, 0.0980392) 0
      ),
      -moz-linear-gradient(45deg, rgba(0, 0, 0, 0.0980392) 25%, transparent 25%, transparent
            75%, rgba(0, 0, 0, 0.0980392) 75%, rgba(0, 0, 0, 0.0980392) 0),
      white;
    background: linear-gradient(
        45deg,
        rgba(0, 0, 0, 0.0980392) 25%,
        transparent 25%,
        transparent 75%,
        rgba(0, 0, 0, 0.0980392) 75%,
        rgba(0, 0, 0, 0.0980392) 0
      ),
      linear-gradient(
        45deg,
        rgba(0, 0, 0, 0.0980392) 25%,
        transparent 25%,
        transparent 75%,
        rgba(0, 0, 0, 0.0980392) 75%,
        rgba(0, 0, 0, 0.0980392) 0
      ),
      white;
    background-repeat: repeat, repeat;
    background-position:
      0px 0,
      5px 5px;
    -webkit-transform-origin: 0 0 0;
    transform-origin: 0 0 0;
    -webkit-background-origin: padding-box, padding-box;
    background-origin: padding-box, padding-box;
    -webkit-background-clip: border-box, border-box;
    background-clip: border-box, border-box;
    -webkit-background-size:
      10px 10px,
      10px 10px;
    background-size:
      10px 10px,
      10px 10px;
    -webkit-box-shadow: none;
    box-shadow: none;
    text-shadow: none;
    -webkit-transition: none;
    -moz-transition: none;
    -o-transition: none;
    transition: none;
    -webkit-transform: scaleX(1) scaleY(1) scaleZ(1);
    transform: scaleX(1) scaleY(1) scaleZ(1);
  }

  .loader {
    border: 6px solid #f3f3f3; /* Light grey */
    border-top: 6px solid hsla(0, 0%, 13%);
    border-radius: 50%;
    width: 10px;
    height: 10px;
    animation: spin 2s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .point {
    position: absolute;
  }

  .disabled {
    display: none;
  }

  .crop_box {
    position: fixed;
    border: 2px solid red;
    background: none;
    z-index: 1000;
    box-sizing: border-box;
  }

  .crop_box:hover {
    cursor: move;
  }

  .corner,
  .side {
    position: absolute;
    box-sizing: border-box;
    background-color: red;
  }

  .corner {
    --cornerDiameter: 12px;

    width: var(--cornerDiameter);
    height: var(--cornerDiameter);
    border-radius: calc(var(--cornerDiameter) / 2);
    z-index: 1002;
  }

  .side {
    --borderWidth: 4px;

    z-index: 1001;
  }

  .corner.top {
    top: calc(-1 * var(--cornerDiameter) / 2);
  }

  .corner.bottom {
    bottom: calc(-1 * var(--cornerDiameter) / 2);
  }

  .corner.left {
    left: calc(-1 * var(--cornerDiameter) / 2);
  }

  .corner.right {
    right: calc(-1 * var(--cornerDiameter) / 2);
  }

  .corner.top.left:hover {
    cursor: nw-resize;
  }

  .corner.top.right {
    cursor: ne-resize;
  }

  .corner.bottom.right {
    cursor: se-resize;
  }

  .corner.bottom.left {
    cursor: sw-resize;
  }

  .side.top,
  .side.bottom {
    left: 0;
    right: 0;
    height: var(--borderWidth);
  }

  .side.right,
  .side.left {
    top: 0;
    bottom: 0;
    width: var(--borderWidth);
  }

  .side.top {
    top: calc(-1 * var(--borderWidth) / 2);
  }

  .side.top:hover {
    cursor: n-resize;
  }

  .side.left {
    left: calc(-1 * var(--borderWidth) / 2);
  }

  .side.left:hover {
    cursor: w-resize;
  }

  .side.bottom {
    bottom: calc(-1 * var(--borderWidth) / 2);
  }

  .side.bottom:hover {
    cursor: s-resize;
  }

  .side.right {
    right: calc(-1 * var(--borderWidth) / 2);
  }

  .side.right:hover {
    cursor: e-resize;
  }

  .crop_dimensions {
    font-size: 0.5em;
    position: absolute;
    top: -2.5em;
    right: 0.5em;
    color: red;
  }

  .file_input {
    display: none;
  }

  .image_card {
    position: relative;
  }
  .image_data {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 2;
    background-color: hsla(0, 100%, 100%, 0.8);
    margin: 0;
    padding: 5px 10px;
    display: flex;
    flex-direction: column;
    align-items: end;
  }
  .image_data p {
    margin: 2px;
  }
</style>
