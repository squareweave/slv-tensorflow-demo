/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import 'babel-polyfill';
import * as Stats from 'stats.js';
import {MobileNet} from './mobilenet';
import {camera, VIDEO_PIXELS} from './camera';
import {VIEWS, ui, GAME_STRINGS} from './ui';
import {getQueryParam, isIOS} from './utils';
import * as tfc from '@tensorflow/tfjs-core';
import {ExhibitItem, OBJECTS} from './game_levels';

export const GAME_MAX_ITEMS = 1;

export interface EmojiLevelsLookup {
  [index: string]: Array<ExhibitItem>;
}

interface CameraDimentions {
  [index: number]: number;
}

/** Manages game state and various tasks related to game events. */
export class Game {
  /** Our MobileNet instance and how we get access to our trained model. */
  emojiScavengerMobileNet: MobileNet;
  isRunning: boolean;
  cameraPaused: boolean;
  objectsFound: Array<ExhibitItem>;
  objects: Array<ExhibitItem>;
  foundObject: ExhibitItem;
  /**
   * The current top ranked item the model has predicted and identified from
   * the camera.
   */
  topItemGuess: string;
  currentEmoji: string;
  /** An array of snapshots taken when the model finds an emoji. */
  endGamePhotos: Array<HTMLImageElement>;
  debugMode = false;
  gameIsPaused = false;
  firstRun = true;
  firstSpeak = true;
  stats: Stats;

  constructor() {
    this.emojiScavengerMobileNet = new MobileNet();
    this.isRunning = false;
    this.cameraPaused = false;
    this.endGamePhotos = [];
    this.objectsFound = [];
    this.topItemGuess = null;
    this.currentEmoji = 'derrick';
    this.objects = Array.from(OBJECTS);
    if (getQueryParam('debug') === 'true') {
      this.debugMode = true;
    }
  }
  /**
   * Ensures the MobileNet prediction model in tensorflow.js is ready to
   * accept data when we need it by triggering a predict call with zeros to
   * preempt the predict tensor setups.
   */
  warmUpModel() {
    this.emojiScavengerMobileNet.predict(
        tfc.zeros([VIDEO_PIXELS, VIDEO_PIXELS, 3]));
  }

  /**
   * The game MobileNet predict call used to identify content from the camera
   * and make predictons about what it is seeing.
   * @async
   */
  async predict() {

    // Only do predictions if the game is running, ensures performant view
    // transitions and saves battery life when the game isn't in running mode.
    if (this.isRunning) {

      if(this.debugMode) {
        this.stats.begin();
      }

      // Run the tensorflow predict logic inside a tfc.tidy call which helps
      // to clean up memory from tensorflow calls once they are done.
      const result = tfc.tidy(() => {

        // For UX reasons we spread the video element to 100% of the screen
        // but our traning data is trained against 244px images. Before we
        // send image data from the camera to the predict engine we slice a
        // 244 pixel area out of the center of the camera screen to ensure
        // better matching against our model.
        const pixels = tfc.fromPixels(camera.videoElement);
        const centerHeight = pixels.shape[0] / 2;
        const beginHeight = centerHeight - (VIDEO_PIXELS / 2);
        const centerWidth = pixels.shape[1] / 2;
        const beginWidth = centerWidth - (VIDEO_PIXELS / 2);
        const pixelsCropped =
              pixels.slice([beginHeight, beginWidth, 0],
                           [VIDEO_PIXELS, VIDEO_PIXELS, 3]);

        return this.emojiScavengerMobileNet.predict(pixelsCropped);
      });

      // This call retrieves the topK matches from our MobileNet for the
      // provided image data.
      const topK =
          await this.emojiScavengerMobileNet.getTopKClasses(result, 10);

      // Match the top 2 matches against our current active emoji.
      this.checkEmojiMatch(topK[0].label, topK[1].label);

      // if ?debug=true is passed in as a query param show the topK classes
      // on screen to help with debugging.
      if (this.debugMode) {
        ui.predictionResultsEl.style.display = 'block';
        ui.predictionResultsEl.innerText = '';

        for (const item of topK) {
          ui.predictionResultsEl.innerText +=
                `${item.value.toFixed(5)}: ${item.label}\n`;
        }
      }
    }

    if(this.debugMode) {
      this.stats.end();
    }

    // To ensure better page responsiveness we call our predict function via
    // requestAnimationFrame - see goo.gl/1d9cJa
    requestAnimationFrame(() => this.predict());
  }

  /**
   * Initializes the game and sets up camera and MobileNet access. Once ready
   * shows the countdown to start the game.
   */
  initGame() {
    if (this.firstRun) {

      if(this.debugMode) {
        this.stats = new Stats();
        this.stats.dom.style.position = 'relative';
        this.stats.showPanel(0);
        ui.cameraFPSEl.appendChild(this.stats.dom);
      }

      ui.showView(VIEWS.LOADING);

      Promise.all([
        this.emojiScavengerMobileNet.load().then(() => this.warmUpModel()),
        camera.setupCamera().then((value: CameraDimentions) => {
          camera.setupVideoDimensions(value[0], value[1]);
        }),
      ]).then(values => {
        // Both the MobileNet and the camera has been loaded.
        // We can start the game by starting the predict engine and showing the
        // game countdown.
        // NOTE the predict engine will only do calculations if game.isRunning
        // is set to true. We trigger that inside our countdown Promise.
        this.firstRun = false;
        this.predict();
        ui.showCamera();
      }).catch(error => {
        ui.startGameBtn.style.display = 'none';
        ui.ageDisclaimerMsgEl.style.display = 'none';
        ui.hideView(VIEWS.LOADING);

        // iOS does not provide access to mediaDevices.getUserMedia via
        // UiWebviews in iOS 11.2 - This causes a TypeError to be returned
        // which we handle to display a relevant message to encourage the user
        // to open the game in the standard Safari app.
        if (error.name === 'TypeError' && isIOS()) {
          ui.setLandingInfoMsg(GAME_STRINGS.SAFARI_WEBVIEW);
        } else if (error.name === 'NotAllowedError') {
          // Users that explicitly deny camera access get a message that
          // encourages them to enable camera access.
          ui.setLandingInfoMsg(GAME_STRINGS.CAMERA_NO_ACCESS);
        } else {
          // General error message for issues getting camera access via
          // mediaDevices.getUserMedia.
          ui.setLandingInfoMsg(GAME_STRINGS.CAMERA_GENERAL_ERROR);
        }
      });
    } else {
      ui.showCamera();
    }
  }

  /**
   * Starts the game by setting the game to running, playing audio and
   * registering the game timer and speech intervals.
   */
  startGame() {
    camera.unPauseCamera();
    this.isRunning = true;
  }

  /**
   * Resets all game variables and UI so we can start a new game instance.
   */
  resetGame() {
    ui.resetScrollPositions();
    this.pauseGame();
    this.topItemGuess = null;
    this.endGamePhotos = [];
    this.firstSpeak = true;
    ui.resetSleuthSpeakerText();
    ui.hideSleuthSpeakerText();
  }

  /**
   * Pauses the game.
   */
  pauseGame() {
    this.gameIsPaused = true;
    this.isRunning = false;
    camera.pauseCamera();
  }

  /**
   * Resumes the game.
   */
  resumeGame() {
    if (this.gameIsPaused) {
      this.startGame();
    }
  }

  /**
   * Determines if our top 2 matches from the MobileNet is the emoji we are
   * currently looking to find.
   * @param emojiNameTop1 Top guess emoji name.
   * @param emojiNameTop2 Second place guess emoji name.
   */
  checkEmojiMatch(emojiNameTop1: string, emojiNameTop2: string) {
    // If our top guess is different from when we last checked update the
    // top guess.

    if (this.topItemGuess !== emojiNameTop1) {
      this.topItemGuess = emojiNameTop1;
    }

    let finder = this.objects.find(element => element.name === emojiNameTop1 || element.name === emojiNameTop2);

    if (finder) {
      this.foundObject = finder;
      this.emojiFound();
    }

  }


  /**
   * Triggers the camera flash and updates the score when we find an emoji.
   */
  emojiFound() {
    this.pauseGame();
    this.objectsFound.push(this.foundObject);
    console.log(this.foundObject);
    this.endGamePhotos.push(camera.snapshot())
    ui.cameraFlash();
    ui.showAllItemsFoundView(this.endGamePhotos);
  }
}

export let game = new Game();
