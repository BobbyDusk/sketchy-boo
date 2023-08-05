<script lang="ts">
	// @ts-ignore
	import RangeSlider from "svelte-range-slider-pips";
	let SERVER_URL: string;
	if (import.meta.env.PROD) {
		SERVER_URL = "https://api.edgeofdusk.com/digitizer";
	} else {
		SERVER_URL = "http://localhost:8000";
	}
	const WHITE_FILTER_MODELS: string[] = [
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

	const CROP_MIN_WIDTH = 40;
	const CROP_MIN_HEIGHT = 40;

	const PREVIEW_BACKGROUNDS: string[] = ["checkered", "solid"];

	let files: FileList;
	let isCropEnabled: boolean = true;
	let isAutoCropEnabled: boolean = true;
	let cropOpacityThreshold: number[] = [10];
	let isResizeEnabled: boolean = true;
	let resizeWidth: number;
	let resizeHeight: number;
	let isRemoveBackgroundEnabled: boolean = true;
	let selectedRemoveBackgroundModel: string = "u2net";
	let isRemoveBackgroundPostProcessEnabled: boolean = true;
	let isFilterWhiteEnabled: boolean = true;
	let selectedFilterWhiteModel: string = "luminocity";
	let filterWhiteRange: number[] = [230, 255];
	let originalImageBase64: string = "https://images.squarespace-cdn.com/content/v1/5ed4d5702067431c13c60b11/1593707628725-5VXVOK6ZD370T8L759X7/Crazy+Daisy.jpg?format=1000w";
	let processedImageSource: string;
	let proposedFileName: string = "processed.png";
	let points: number[][] = [];
	let isLoading: boolean = false;
	let previewBackground: string = "checkered";
	let backgroundColor: string = "#000000";
	let fileName: string;
	let originalImage: HTMLElement;
	let originalImageBoundingBox: DOMRect;
	let cropLeft: number = 0;
	let cropTop: number = 0;
	let cropWidth: number = 0;
	let cropHeight: number = 0;
	let cropBox: HTMLElement;

	$: if (originalImage) {
		originalImageBoundingBox = originalImage.getBoundingClientRect();
		cropWidth = originalImageBoundingBox.width;
		cropHeight = originalImageBoundingBox.height;
	}

	function getBase64Image(): Promise<any> {
		return new Promise((resolve, reject) => {
			let reader = new FileReader();
			reader.readAsDataURL(files[0]);
			reader.onload = () => {
				resolve(reader.result);
			};
			reader.onerror = (error) => {
				console.log("Error: ", error);
				reject();
			};
		});
	}

	$: if (files && files[0]) {
		proposedFileName = `${getBaseFilenameWithoutExtension(
			files[0].name
		)}_processed.png`;
	}

	$: if (files && files[0]) {
		getBase64Image().then((result) => (originalImageBase64 = result));
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
				auto: isAutoCropEnabled,
				threshold: cropOpacityThreshold[0]
			}
			const resize = {
				enabled: isResizeEnabled,
				width: resizeWidth,
				height: resizeHeight
			}
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
				points,
			};
			const data = {
				image: originalImageBase64,
				crop,
				resize,
				filterWhite,
				removeBackground,
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
			processedImageSource = responseData.image;
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
		img.src = originalImageBase64;
		let pointX = Math.round(
			(relativePointX / target.clientWidth) * img.width
		);
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
		cropTop = e.clientY - originalImageBoundingBox.y;
		cropLeft = e.clientX - originalImageBoundingBox.x;
		console.log(cropTop, cropLeft)
	}

	function resizeCropBox(e: DragEvent, top = false, left = false, bottom = false, right = false) {
		e.preventDefault();
		cropTop = e.clientY - originalImageBoundingBox.y;
		cropLeft = e.clientX - originalImageBoundingBox.x;
		console.log(cropTop, cropLeft)
	}

	function handleDragBottomRight(e: DragEvent) {

	}
</script>

<div class="app_root">
	<div class="buttons_container">
		<div class="button_group">
			<div class="button_item">
				<label for="images">Select images:</label>
				<input
					accept="image/png, image/jpeg"
					bind:files
					id="images"
					name="images"
					type="file"
				/>
			</div>
		</div>

		<div class="button_group">
			<div class="button_item_horizontal">
				<input
					type="checkbox"
					id="enable_crop"
					name="enable_crop"
					bind:checked={isCropEnabled}
				/>
				<label for="enable_crop">enable crop</label>
			</div>
			<div class="button_item_horizontal {!isCropEnabled && 'disabled'}">
				<input
					type="checkbox"
					id="enable_auto_crop"
					name="enable_auto_crop"
					bind:checked={isAutoCropEnabled}
				/>
				<label for="enable_crop">enable auto crop</label>
			</div>
			<div class="button_item {(!isCropEnabled || !isAutoCropEnabled) && 'disabled'}">
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

		<div class="button_group">
			<div class="button_item_horizontal">
				<input
					type="checkbox"
					id="enable_resize"
					name="enable_resize"
					bind:checked={isResizeEnabled}
				/>
				<label for="enable_resize">enable resize</label>
			</div>
			<div class="button_item {!isResizeEnabled && 'disabled'}">
				<label for="resize_width">width</label>
				<input
					type="number"
					id="resize_width"
					name="resize_width"
					bind:value={resizeWidth}
				/>
			</div>
			<div class="button_item {!isResizeEnabled && 'disabled'}">
				<label for="resize_height">height</label>
				<input
					type="number"
					id="resize_height"
					name="resize_height"
					bind:value={resizeHeight}
				/>
			</div>
		</div>



		<div class="button_group">
			<div class="button_item_horizontal">
				<input
					type="checkbox"
					id="enable_background_removal"
					name="enable_background_removal"
					bind:checked={isRemoveBackgroundEnabled}
				/>
				<label for="enable_background_removal"
					>enable background removal</label
				>
			</div>
			<div class="button_item {!isRemoveBackgroundEnabled && 'disabled'}">
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
			<div
				class="button_item_horizontal {!isRemoveBackgroundEnabled &&
					'disabled'}"
			>
				<input
					type="checkbox"
					id="enable_background_removal_post_process"
					name="enable_background_removal_post_process"
					bind:checked={isRemoveBackgroundPostProcessEnabled}
				/>
				<label for="enable_background_removal_post_process"
					>enable post process mask</label
				>
			</div>
		</div>

		<div class="button_group">
			<div class="button_item_horizontal">
				<input
					type="checkbox"
					id="enable_filter_white"
					name="enable_filter_white"
					bind:checked={isFilterWhiteEnabled}
				/>
				<label for="enable_filter_white">enable filter white</label>
			</div>
			<div class="button_item {!isFilterWhiteEnabled && 'disabled'}">
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
			<div class="button_item {!isFilterWhiteEnabled && 'disabled'}">
				<label for="range_container">range</label>
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

		<div class="button_group">
			{#if isLoading}
				<div class="loader" />
			{:else}
				<button class="button_item button" on:click={uploadImage}>
					process
				</button>
			{/if}
		</div>

		{#if processedImageSource}
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

				<div
					class="button_item_horizontal {previewBackground ==
						'checkered' && 'disabled'}"
				>
					<input
						type="color"
						bind:value={backgroundColor}
						name="background_color"
					/>
					<label for="background_color">color</label>
				</div>
			</div>
		{/if}

		{#if processedImageSource}
			<div class="button_group">

			<div class="button_item">
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
					href={processedImageSource}
					download={fileName || proposedFileName}
					class="button_item button"
				>
					Download
				</a>
			</div>
		{/if}
	</div>

	<div class="image_row">
		<div class="image_container original_image_container">

			{#if originalImageBase64}
				<img
					src={originalImageBase64}
					alt="selected img"
					class="original_image image"
					bind:this={originalImage}
				/>
				{#if isCropEnabled && originalImageBoundingBox}
					<div 
						class="crop_box" 
						bind:this={cropBox}
						style="
							top: {Math.round(originalImageBoundingBox.top + cropTop)}px;
							left: {Math.round(originalImageBoundingBox.left + cropLeft)}px;
							height: {cropHeight}px;
							width: {cropWidth}px;
						"
						role="presentation"
					>
						<div 
							class="corner top left" 
							role="presentation"
						/>
						<div 
							class="side top left right" 
							role="presentation"
						/>
						<div 
							class="corner top right" 
							role="presentation"
						/>
						<div 
							class="side right top bottom" 
							role="presentation"
						/>
						<div 
							class="corner bottom right" 
							role="presentation"
						/>
						<div 
							class="side bottom left right" 
							role="presentation"
						/>
						<div 
							class="corner bottom left" 
							role="presentation"
						/>
						<div 
							class="side left top bottom" 
							role="presentation"
						/>
					</div>
				{/if}
			{:else}
				<p>No image selected</p>
			{/if}

		</div>
		<div class="image_container">
			{#if processedImageSource}
				<img
					src={processedImageSource}
					class="image {previewBackground}"
					alt="processed img"
					style={previewBackground == "solid"
						? `background-color: ${backgroundColor}`
						: ""}
				/>
			{/if}
		</div>
	</div>
</div>

<style>
	.app_root {
		width: 100%;
		min-height: calc(100vh - var(--header-height));
		margin: 0;
		padding: 0 10%;
		display: flex;
		flex-direction: column;
		gap: 25px;
		box-sizing: border-box;
		align-items: stretch;
	}

	.buttons_container {
		width: 100%;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		gap: 10px;
	}

	.button_group {
		/* border: 1px solid black; */
		border-radius: 15px;
		padding: 20px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 20px;
		height: 200px;
	}

	.button_item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
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
		font-size: 12pt;
		color: black;
		text-decoration: none;
		background-color: lightgray;
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

	:global(#range_container) {
		width: 100%;
		background-image: linear-gradient(to right, black, white);
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

	.image_row {
		width: 100%;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}

	.left,
	.right {
		display: flex;
		flex-direction: row;
		gap: 20px;
	}

	.left {
		grid-column: 1;
	}

	.right {
		grid-column: 2;
	}

	.image_container {
		display: flex;
		justify-self: center;
		align-self: center;
		justify-content: center;
		align-items: center;
		width: 40vw;
		height: 60vh;
	}

	.original_image_container {
		position: relative;
	}

	.image {
		max-width: 100%;
		max-height: 100%;
		background-color: blue;
	}

	.checkered {
		background: -webkit-linear-gradient(
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
		background: -moz-linear-gradient(
				45deg,
				rgba(0, 0, 0, 0.0980392) 25%,
				transparent 25%,
				transparent 75%,
				rgba(0, 0, 0, 0.0980392) 75%,
				rgba(0, 0, 0, 0.0980392) 0
			),
			-moz-linear-gradient(45deg, rgba(0, 0, 0, 0.0980392) 25%, transparent
						25%, transparent 75%, rgba(0, 0, 0, 0.0980392) 75%, rgba(
							0,
							0,
							0,
							0.0980392
						)
						0),
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
		background-position: 0px 0, 5px 5px;
		-webkit-transform-origin: 0 0 0;
		transform-origin: 0 0 0;
		-webkit-background-origin: padding-box, padding-box;
		background-origin: padding-box, padding-box;
		-webkit-background-clip: border-box, border-box;
		background-clip: border-box, border-box;
		-webkit-background-size: 10px 10px, 10px 10px;
		background-size: 10px 10px, 10px 10px;
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
		opacity: 0.4;
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

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 5px;
		position: absolute;
		box-sizing: border-box;
		z-index: 1001;
		background-color: red;
	}

	.dot:hover {
		cursor: move;
	}

	.top {
		top: 0;
	}

	.left {
		left: 0;
	}

	.right {
		right: 0;
	}

	.bottom {
		bottom: -5px;
	}



</style>
