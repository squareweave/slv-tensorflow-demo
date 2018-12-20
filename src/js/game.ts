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

export interface Reference {
    [index: string] : Array<Number>
}
interface CameraDimensions {
  [index: number]: number;
}


/** Manages game state and various tasks related to game events. */
export class Game {
  /** Our MobileNet instance and how we get access to our trained model. */
  objectScavengerMobileNet: MobileNet;
  isRunning: boolean;
  cameraPaused: boolean;
  objectsFound: Array<ExhibitItem>;
  objects: Array<ExhibitItem>;
  foundObject: ExhibitItem;
  /** Speak interval for reading out objects from the camera every x seconds. */
  speakInterval: number;
  /** An array of snapshots taken when the model finds an emoji. */
  endGamePhotos: Array<HTMLImageElement>;
  debugMode = false;
  gameIsPaused = false;
  firstRun = true;
  stats: Stats;
  resultObj: Reference;
  constructor() {
    this.objectScavengerMobileNet = new MobileNet();
    this.isRunning = false;
    this.cameraPaused = false;
    this.endGamePhotos = [];
    this.objectsFound = [];
    this.resultObj = {}; 
    this.objects = Array.from(OBJECTS);
  }

  averageObjects() {
    for (var key in this.resultObj) {
        if (this.resultObj.hasOwnProperty(key)) {
            let test = this.resultObj[key].reduce((accumulator: number, currentValue: number) => accumulator + currentValue);
            let average = (Number(test) / this.resultObj[key].length);
            //todo: fix up this confidence depending on the objects and their relative complexities.
            if (average > 0.94) {
                this.objects.map((el) => {
                    if (el.name === key) {
                        this.foundObject = el;
                        this.objectFound();
                    }
                });
            }
        } 
     }
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

        return this.objectScavengerMobileNet.predict(pixelsCropped);
      });

      // This call retrieves the topK matches from our MobileNet for the
      // provided image data.
      const topK =
          await this.objectScavengerMobileNet.getTopKClasses(result, 2);

      // Match the top 2 matches against our current active emoji.
      for (const item of topK) {
          if (!this.resultObj.hasOwnProperty(item.label)) {
              this.resultObj[item.label] = [];
          }
      }

      for (const item of topK) {
        this.resultObj[item.label].push(item.value);
      }

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

    } else {
        if (this.debugMode) {
            ui.predictionResultsEl.style.display = 'none';
            ui.predictionResultsEl.innerText = '';
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
   * Ensures the MobileNet prediction model in tensorflow.js is ready to
   * accept data when we need it by triggering a predict call with zeros to
   * preempt the predict tensor setups.
   */
  warmUpModel() {
    this.objectScavengerMobileNet.predict(
        tfc.zeros([VIDEO_PIXELS, VIDEO_PIXELS, 3]));
  }

 
  /**
   * Initializes the game and sets up camera and MobileNet access. Once ready
   * shows the countdown to start the game.
   */
  initGame() {
    if (this.firstRun) {

      ui.showView(VIEWS.LOADING);

      if (getQueryParam('debug') === 'true') {
        this.debugMode = true;
        this.stats = new Stats();
        this.stats.dom.style.position = 'relative';
        this.stats.showPanel(0);
        ui.cameraFPSEl.appendChild(this.stats.dom);
    }

      Promise.all([
        this.objectScavengerMobileNet.load().then(() => this.warmUpModel()),
        camera.setupCamera().then((value: CameraDimensions) => {
          camera.setupVideoDimensions(value[0], value[1]);
        }),
      ]).then(values => {
        this.firstRun = false;
        this.predict();
        ui.showCamera();
      }).catch(error => {
        ui.startGameBtn.style.display = 'none';
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

  collectPredictions() {
    this.resultObj = {};
    if (!this.isRunning) {
        this.startGame();
    }
  }

  reportPredictions() {
    this.isRunning = false;
    this.averageObjects()
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
    this.endGamePhotos = [];
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
   * Triggers the camera flash and updates the score when we find an object.
   */
  objectFound() {
    this.pauseGame();
    this.objectsFound.push(this.foundObject);
    this.endGamePhotos.push(camera.snapshot())
    ui.cameraFlash();
    ui.showItemsFoundView(this.endGamePhotos);
  }
}

export let game = new Game();
