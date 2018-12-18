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
import {game} from './game';
import {addClass, removeClass} from './classes';
import {camera} from './camera';
import {isMobile, isChromeIOS, getQueryParam} from './utils';

export const VIEWS = {
  LOADING: 'loading',
  QUIT: 'quit',
  ABOUT: 'about',
  LANDING: 'landing',
  CAMERA: 'camera',
  SLEUTH: 'sleuth',
  FOUND_X_ITEMS: 'foundxitems',
  FOUND_ALL_ITEMS: 'foundallitems',
  FOUND_ITEM: 'founditem'
};

const SELECTORS = {
  VIEWS_LOADING: '.view__loading--js',
  VIEWS_QUIT: '.view__quit--js',
  VIEWS_ABOUT: '.view__about--js',
  VIEWS_LANDING: '.view__landing--js',
  VIEWS_CAMERA: '.view__camera--js',
  VIEWS_SLEUTH: '.view__sleuth--js',
  VIEWS_FOUND_X_ITEMS: '.view__found-x-items--js',
  VIEWS_FOUND_NO_ITEMS: '.view__found-no-items--js',
  VIEWS_FOUND_ALL_ITEMS: '.view__found-all-items--js',
  VIEWS_FOUND_ITEM: '.view__found-item--js',
  PREDICTION_RESULTS_EL: '.view__camera__prediction-results--js',
  START_GAME_BTN: '.landing__play-btn--js',
  REPLAY_GAME_BTN: '.play-again-btn--js',
  CLOSE_BTN: '.view__info-bar__close-btn--js',
  ABOUT_BTN: '.view__info-bar__about-btn--js',
  HOME_BTN: '.view__info-bar__home-btn--js',
  CAMERA_QUIT_BTN: '.view__camera__quit-btn--js',
  QUIT_CANCEL_BTN: '.quit-cancel-btn--js',
  QUIT_BTN: '.quit-btn--js',
  NEXT_object_BTN: '.next-object-btn--js',
  SLEUTH_object: '.view__sleuth__object--js',
  SLEUTH_SPEAKING_EL: '.view__sleuth__speaking--js',
  STATUS_BAR_object_EL: '.view__status-bar__find__object--js',
  CAMERA_FLASH_EL: '.camera__capture-flash--js',
  CAMERA_CAPTURE_EL: '.camera__capture-wrapper--js',
  CAMERA_DESKTOP_MSG_EL: '.view__camera__desktop-msg',
  TIMER_EL: '.view__status-bar__info__timer--js',
  TIMER_FLASH_EL: '.view__status-bar__info__timer-flash--js',
  SCORE_EL: '.view__status-bar__info__score--js',
  NR_FOUND_EL: '.view__found-x-items__nr-found--js',
  NR_MAX_FOUND_EL: '.view__found-all-items__nr-found--js',
  OBJECT_FOUND_LIST: '.view__found-x-items__objects--js',
  OBJECT_MAX_FOUND_LIST: '.view__found-all-items__objects--js',
  LANDING_DESKTOP_MSG_EL: '.view__landing__desktop-msg--js',
  LANDING_PLATFORM_MSG_EL: '.view__landing__platform-msg--js',
  LANDING_INFO_MSG_EL: '.view__landing__intro--js',
  AGE_DISCLAIMER_MSG_EL: '.view__landing__age-msg--js',
  CAMERA_FPS_EL: '.view__camera__fps--js',
  LANG_SELECTOR_EL: '.view__landing__lang-selector',
};

export const CSS_CLASSES = {
  SLIDE_UP: 'slideUp',
  SLIDE_DOWN: 'slideDown'
};

const GAME_OUTCOME = {
  WIN: 'Win',
  END: 'End'
};

export const GAME_STRINGS = {
  CAMERA_NO_ACCESS: 'Hey! To play you’ll need to enable camera access in ' +
      'your browser address bar 👆. Your camera is how you’ll ' +
      'find objects in the real world. We won’t store any ' +
      'images from your camera. 👍',
  SAFARI_WEBVIEW: '🚨 To play this game, please open it directly in Safari. ' +
      'If needed, copy/paste or type the URL into the address bar. ' +
      'https://g.co/objectscavengerhunt 🚨',
  CAMERA_GENERAL_ERROR: 'It looks like your browser or device doesn’t ' +
      'support this experiment. It’s designed to work best ' +
      'on mobile (iOS/Safari or Android/Chrome). 😭'
};

export interface ViewsListTypes {
  [index: string]: HTMLElement;
}

export class Ui {

  viewsList: ViewsListTypes;
  startGameBtn: HTMLButtonElement;
  predictionResultsEl: HTMLElement;
  replayGameBtns: NodeListOf<Element>;
  nextobjectBtn: HTMLElement;
  closeAboutBtn: HTMLElement;
  homeBtns: NodeListOf<Element>;
  aboutBtns: NodeListOf<Element>;
  cameraQuitBtn: HTMLElement;
  quitCancelBtn: HTMLElement;
  quitBtn: HTMLElement;
  sleuthobjectEl: HTMLImageElement;
  sleuthSpeakingEl: HTMLElement;
  statusBarobjectEl: HTMLElement;
  cameraFlashEl: HTMLElement;
  cameraCaptureEl: HTMLElement;
  cameraDesktopMsgEl: HTMLElement;
  timerEl: HTMLElement;
  timerFlashEl: HTMLElement;
  scoreEl: HTMLElement;
  nrobjectsFoundEl: HTMLElement;
  nrMaxobjectsFoundEl: HTMLElement;
  objectsFoundListEl: HTMLElement;
  objectsMaxFoundListEl: HTMLElement;
  landingDesktopMsgEl: HTMLElement;
  landingPlatformMsgEl: HTMLElement;
  landingInfoMsgEl: HTMLElement;
  ageDisclaimerMsgEl: HTMLElement;
  cameraFPSEl: HTMLElement;
  langSelectorEl: HTMLElement;
  sleuthSpeakingPrefixes: Array<string>;
  activeView: string;
  prevActiveView: string;

  constructor() {
    this.viewsList = {
      [VIEWS.LOADING]: document.querySelector(SELECTORS.VIEWS_LOADING),
      [VIEWS.QUIT]: document.querySelector(SELECTORS.VIEWS_QUIT),
      [VIEWS.ABOUT]: document.querySelector(SELECTORS.VIEWS_ABOUT),
      [VIEWS.LANDING]: document.querySelector(SELECTORS.VIEWS_LANDING),
      [VIEWS.CAMERA]: document.querySelector(SELECTORS.VIEWS_CAMERA),
      [VIEWS.SLEUTH]: document.querySelector(SELECTORS.VIEWS_SLEUTH),
      [VIEWS.FOUND_X_ITEMS]:
          document.querySelector(SELECTORS.VIEWS_FOUND_X_ITEMS),
      [VIEWS.FOUND_ALL_ITEMS]:
          document.querySelector(SELECTORS.VIEWS_FOUND_ALL_ITEMS),
      [VIEWS.FOUND_ITEM]: document.querySelector(SELECTORS.VIEWS_FOUND_ITEM)
    };

    this.startGameBtn = document.querySelector(SELECTORS.START_GAME_BTN);
    this.replayGameBtns = document.querySelectorAll(SELECTORS.REPLAY_GAME_BTN);
    this.nextobjectBtn = document.querySelector(SELECTORS.NEXT_object_BTN);
    this.closeAboutBtn = document.querySelector(SELECTORS.CLOSE_BTN);
    this.aboutBtns = document.querySelectorAll(SELECTORS.ABOUT_BTN);
    this.homeBtns = document.querySelectorAll(SELECTORS.HOME_BTN);
    this.cameraQuitBtn = document.querySelector(SELECTORS.CAMERA_QUIT_BTN);
    this.quitCancelBtn = document.querySelector(SELECTORS.QUIT_CANCEL_BTN);
    this.quitBtn = document.querySelector(SELECTORS.QUIT_BTN);
    this.sleuthobjectEl = document.querySelector(SELECTORS.SLEUTH_object);
    this.sleuthSpeakingEl =
        document.querySelector(SELECTORS.SLEUTH_SPEAKING_EL);
    this.statusBarobjectEl =
        document.querySelector(SELECTORS.STATUS_BAR_object_EL);
    this.cameraFlashEl = document.querySelector(SELECTORS.CAMERA_FLASH_EL);
    this.cameraCaptureEl = document.querySelector(SELECTORS.CAMERA_CAPTURE_EL);
    this.cameraDesktopMsgEl =
        document.querySelector(SELECTORS.CAMERA_DESKTOP_MSG_EL);
    this.timerEl = document.querySelector(SELECTORS.TIMER_EL);
    this.timerFlashEl = document.querySelector(SELECTORS.TIMER_FLASH_EL);
    this.scoreEl = document.querySelector(SELECTORS.SCORE_EL);
    this.nrobjectsFoundEl = document.querySelector(SELECTORS.NR_FOUND_EL);
    this.nrMaxobjectsFoundEl = document.querySelector(SELECTORS.NR_MAX_FOUND_EL);
    this.objectsFoundListEl = document.querySelector(SELECTORS.OBJECT_FOUND_LIST);
    this.objectsMaxFoundListEl =
        document.querySelector(SELECTORS.OBJECT_MAX_FOUND_LIST);
    this.predictionResultsEl =
        document.querySelector(SELECTORS.PREDICTION_RESULTS_EL);
    this.landingDesktopMsgEl =
        document.querySelector(SELECTORS.LANDING_DESKTOP_MSG_EL);
    this.landingPlatformMsgEl =
        document.querySelector(SELECTORS.LANDING_PLATFORM_MSG_EL);
    this.landingInfoMsgEl =
        document.querySelector(SELECTORS.LANDING_INFO_MSG_EL);
    this.ageDisclaimerMsgEl =
        document.querySelector(SELECTORS.AGE_DISCLAIMER_MSG_EL);
    this.cameraFPSEl = document.querySelector(SELECTORS.CAMERA_FPS_EL);
    this.langSelectorEl = document.querySelector(SELECTORS.LANG_SELECTOR_EL);

    this.sleuthSpeakingPrefixes = [
      'Is that a ',
      'Do I see a ',
      'Do I spy a ',
      'Did I just see a ',
      'Was that a ',
      'I think I saw a ',
      'Am I seeing a ',
      'Could that be a ',
      'Did I spot a ',
      'Might I see a '
    ];

    this.activeView = VIEWS.LANDING;
    this.prevActiveView = this.activeView;
  }

  /**
   * Initialize the UI by checking the platform the game is running on and
   * registering events.
   */
  init() {
    this.setPlatformMessages();
    this.setCameraFacing();
    this.addEvents();

    if (getQueryParam('about') === 'true') {
      this.showView(VIEWS.ABOUT);
    }
  }

  /**
   * Sets various messages related to platform support and info relating to
   * the game being best experienced on mobile.
   */
  setPlatformMessages() {
    if (isMobile()) {
      if (isChromeIOS()) {
        this.startGameBtn.disabled = true;
        addClass(this.viewsList[VIEWS.LANDING], 'not-supported');
        this.landingPlatformMsgEl.style.display = 'block';
        this.ageDisclaimerMsgEl.style.display = 'none';
      }
    } else {
      this.landingDesktopMsgEl.style.display = 'block';
      this.cameraDesktopMsgEl.style.display = 'block';
    }
  }

  /**
   * If the game is played on desktop we flip the camera assuming the front
   * facing camera is used on desktop.
   */
  setCameraFacing() {
    if (!isMobile()) {
      camera.setFrontFacingCamera();
    }
  }

  /**
   * Registers various UI events for buttons.
   */



  addEvents() {

    window.addEventListener('popstate', (event: Event) => {
      this.hideView(VIEWS.ABOUT);
    });

    if (this.startGameBtn) {
      this.startGameBtn.addEventListener('click', () => {
        game.initGame();

        (<any>window).gtag('event', 'Click', {
          'event_category': 'Button',
          'event_label': 'Let\'s Play'
        });
      });
    }

    if(this.replayGameBtns.length > 0) {

      for (const item of Array.from(this.replayGameBtns)) {
        item.addEventListener('click', () => {
          game.resetGame();
          if (this.activeView === VIEWS.FOUND_ALL_ITEMS) {
            this.resetCameraAfterFlash();
          }
          if (this.activeView === VIEWS.FOUND_X_ITEMS ||
            this.activeView === VIEWS.FOUND_ALL_ITEMS) {
              removeClass(this.viewsList[this.activeView],
                  CSS_CLASSES.SLIDE_DOWN);
          } else {
            this.hideView(this.activeView);
          }

          this.showView(VIEWS.LANDING);

          (<any>window).gtag('event', 'Click', {
            'event_category': 'Button',
            'event_label': 'Play Again'
          });
        });
      }
    }

    if (this.nextobjectBtn) {
      this.nextobjectBtn.addEventListener('click',
          this.nextobjectBtnClick.bind(this));
    }

    if (this.cameraQuitBtn) {
      this.cameraQuitBtn.addEventListener('click', () => {
        game.pauseGame();
        this.showView(VIEWS.QUIT);

        (<any>window).gtag('event', 'Click', {
          'event_category': 'Link',
          'event_label': 'Quit (in-game)'
        });
      });
    }

    if (this.quitCancelBtn) {
      this.quitCancelBtn.addEventListener('click', () => {
        this.hideView(VIEWS.QUIT);
        game.resumeGame();
      });
    }

    if (this.quitBtn) {
      this.quitBtn.addEventListener('click', () => {
        game.resetGame();
        this.hideView(VIEWS.QUIT);
        this.showView(VIEWS.LANDING);

        (<any>window).gtag('event', 'Click', {
          'event_category': 'Link',
          'event_label': 'Quit (confirm)'
        });
      });
    }

    if (this.closeAboutBtn) {
      this.closeAboutBtn.addEventListener('click', () => {
        this.hideView(VIEWS.ABOUT);
        history.replaceState({page: '/'}, 'object Scavenger Hunt', '/');
      });
    }

    if(this.homeBtns.length > 0) {
      for (const item of Array.from(this.homeBtns)) {

        item.addEventListener('click', () => {
          game.resetGame();
          if (this.activeView === VIEWS.FOUND_ALL_ITEMS) {
            this.resetCameraAfterFlash();
          }
          if (this.activeView === VIEWS.FOUND_X_ITEMS ||
            this.activeView === VIEWS.FOUND_ALL_ITEMS) {
              removeClass(this.viewsList[this.activeView],
                  CSS_CLASSES.SLIDE_DOWN);
          } else {
            this.hideView(this.activeView);
          }

          this.showView(VIEWS.LANDING);

          (<any>window).gtag('event', 'Click', {
            'event_category': 'Icon',
            'event_label': 'Home'
          });
        });

      }
    }
  }

  /**
   * The found message shown in the sleuth UI which includes an object icon.
   *
   * @returns The sleuth found message display string.
   */
  get sleuthSpeakingFoundItMsg(): string {
    return `Hey you found ${game.foundObject}`;
  }

  /**
   * The message shown and spoken when your time is up and you haven't found
   * any items.
   *
   * @returns Your time is up message string.
   */
  get sleuthSpeakingFoundNoMsg(): string {
    return 'Oh no! Your time is up.';
  }

  /**
   * The message shown and spoken when you win the game.
   *
   * @returns You did it message string.
   */
  get sleuthSpeakingFoundAllMsg(): string {
    return 'You did it!';
  }

 /**
   * The message shown and spoken when the model sees items in the real world.
   *
   * @returns A message constructed with our sleuthSpeakingPrefixes plus some
   * item seen in the real world.
   */
  get sleuthSpeakingSeeingMsg(): string {
    let randomIndex = Math.floor(this.sleuthSpeakingPrefixes.length *
        Math.random());
    return this.sleuthSpeakingPrefixes[randomIndex] +
           game.topItemGuess.toString() + ' ?';
  }

  /**
   * Sets the sleuth UI element text.
   * @param msg The message to update the speaker text to.
   * @param msgMarkup If true the message contains markup and we set that
   * directly.
   */
  setSleuthSpeakerText(msg: string, msgMarkup = false) {

    if (msgMarkup) {
      this.sleuthSpeakingEl.innerHTML = msg;
    } else {
      this.sleuthSpeakingEl.textContent = msg;
    }

    this.sleuthSpeakingEl.style.display = 'block';
  }

  /**
   * Resets the sleuth speaker text.
   */
  resetSleuthSpeakerText() {
    this.sleuthSpeakingEl.textContent = '';
  }

  /**
   * Hides the sleuth speaker UI element.
   */
  hideSleuthSpeakerText() {
    this.sleuthSpeakingEl.style.display = 'none';
    this.sleuthSpeakingEl.textContent = '';
  }

  /**
   * Updates the win and end screens UI elements with the list of objects icons
   * that the user found.
   * @param endGamePhotos An array of images matching the object found.
   * @param screen Which screen this was called from, either 'Win' or 'End'.
   */
  setobjectsFoundList(
    endGamePhotos: Array<HTMLImageElement>, screen: string) {

      let objectFoundString = '';
      let spacer = '';
  
      let photoContainer = document.createElement('div');
      addClass(photoContainer, 'view__found-x-items__objects__grid');
      addClass(photoContainer, 'view__found-x-items__objects__grid--js');
  
      if (endGamePhotos[0].width >= endGamePhotos[0].height) {
        addClass(photoContainer, 'landscape');
      } else {
        addClass(photoContainer, 'portrait');
      }
  
      let item = game.foundObject;
      spacer = ' ';
      objectFoundString = objectFoundString + item.object + spacer;

      let figure = document.createElement('figure');
      addClass(figure, 'view__found-x-items__objects__grid__item');
      addClass(figure, 'view__found-x-items__objects__grid__item--js');

      figure.appendChild(endGamePhotos[0]);

      let caption = document.createElement('figcaption');

      figure.appendChild(caption);
      caption.innerText = `You found the ${item.name}!`;

      photoContainer.appendChild(figure);
     console.log(this.objectsFoundListEl);
      while (this.objectsFoundListEl.firstChild) {
        this.objectsFoundListEl.removeChild(this.objectsFoundListEl.firstChild);
      }
  
      while (this.objectsMaxFoundListEl.firstChild) {
        this.objectsMaxFoundListEl.removeChild(
            this.objectsMaxFoundListEl.firstChild);
      }
  
      addClass(photoContainer, 'photos-' + 1);
  
      this.objectsFoundListEl.appendChild(photoContainer.cloneNode(true));
      this.objectsMaxFoundListEl.appendChild(photoContainer);

  }

  /**
   * Resets the UI after an object was found and shows the UI for the next object.
   */
  nextobjectBtnClick() {
    this.resetSleuthSpeakerText();
    this.hideSleuthSpeakerText();
    this.resetCameraAfterFlash();
    this.hideView(VIEWS.FOUND_ITEM);
    game.resumeGame();
  }

  /**
   * Triggers a camera flash animation on the screen when an item has been
   * found.
   */
  cameraFlash() {
    const animationEnded = (e: Event) => {
      addClass(this.cameraFlashEl,'freeze');
      addClass(this.cameraCaptureEl, 'capture');
      this.cameraFlashEl.removeEventListener('animationend', animationEnded);
    };
    this.cameraQuitBtn.style.display = 'none';
    this.cameraFlashEl.addEventListener('animationend', animationEnded);
    addClass(this.cameraFlashEl,'flash');
  }

  /**
   * Resets the camera to the default state after a camera flash occured.
   */
  resetCameraAfterFlash() {
    if (game.cameraPaused) {
      camera.unPauseCamera();
    }
    this.cameraQuitBtn.style.display = 'block';
    removeClass(this.cameraFlashEl,'flash');
    removeClass(this.cameraFlashEl,'freeze');
    removeClass(this.cameraCaptureEl, 'capture');
  }

  /**
   * Sets the active UI view.
   * @param view The view to set as the active view.
   */
  setActiveView(view: string) {
    this.prevActiveView = this.activeView;
    this.activeView = view;
  }

  /**
   * Sets the active object we are currently trying to find.
   * @param objectPath The object object path to the icon file.
   */
  setActiveobject(objectPath: string) {
    this.statusBarobjectEl.textContent = objectPath;
  }

  /**
   * Updates the landing page body copy with a message. Used for showing
   * platform messages.
   * @param msg The message to show.
   */
  setLandingInfoMsg(msg: string) {
    this.landingInfoMsgEl.textContent = msg;
  }

  /**
   * Hides a UI view.
   * @param view The view to hide.
   */
  hideView(view: string) {
    this.viewsList[view].style.display = 'none';
    this.activeView = this.prevActiveView;
  }

  /**
   * Shows a UI view.
   * @param view The view to show.
   */
  showView(view: string) {
    this.viewsList[view].style.display = 'flex';
    this.prevActiveView = this.activeView;
    this.activeView = view;
  }

  /**
   * Triggers the actions related to finding an object. Updating the view, score
   * and timer.
   */
  showItemFoundView() {
    this.showView(VIEWS.FOUND_ITEM);
  }

  /**
   * Triggers the actions related to the game ending with the user having found
   * all objects for this game instance. NOTE this view slides in from the top
   * and doesn't simply display like other views. Before sliding in this view
   * we update relevant UI elements related to it.
   */
  showItemsFoundView(endGamePhotos: Array<HTMLImageElement>) {
    game.pauseGame();

    this.setobjectsFoundList(endGamePhotos, GAME_OUTCOME.WIN);

    let msg = this.sleuthSpeakingFoundAllMsg;
    this.setSleuthSpeakerText(msg);

    this.setActiveView(VIEWS.FOUND_ALL_ITEMS);
    this.slideView(VIEWS.FOUND_ALL_ITEMS, CSS_CLASSES.SLIDE_DOWN, false);
  }

  /**
   * A generic view function that enables the slide in of UI views.
   * @param view The view to slide in
   * @param cssClass The css class to apply to the view
   * @param hideAfter Indicating if we need to hide the view after the
   * transition ends.
   *
   * @returns A Promise when the slide transition ends.
   */
  slideView(view: string, cssClass: string, hideAfter = true) {
    return new Promise(resolve => {

      const transitionEnded = (e: Event) => {

        if (hideAfter) {
          this.hideView(view);
          removeClass(this.viewsList[view], cssClass);
        }
        this.viewsList[view].removeEventListener('transitionend',
            transitionEnded);
        resolve(true);
      };

      this.viewsList[view].addEventListener('transitionend', transitionEnded);
      addClass(this.viewsList[view], cssClass);
    });
  }

  showCamera() {
    this.hideView(VIEWS.LANDING);
    this.hideView(VIEWS.LOADING);
    //this.hideView(VIEWS.FOUND_ALL_ITEMS);
    if (!game.isRunning) {
      game.startGame();
    }
    this.showView(VIEWS.CAMERA);
    this.setActiveView(VIEWS.CAMERA);
  }


  /**
   * Resets the scroll position of any scrollable elements.
   */
   resetScrollPositions() {
     this.viewsList[VIEWS.FOUND_ALL_ITEMS].scrollTop = 0;
     this.viewsList[VIEWS.FOUND_X_ITEMS].scrollTop = 0;
   }

  resetCssClasses() {
    // We triggered this countdown from one of the Found states using the
    // "Play again" btn and thus need to reset their slide transition so they
    // are ready to be used again.
    if (this.activeView === VIEWS.FOUND_X_ITEMS ||
      this.activeView === VIEWS.FOUND_ALL_ITEMS) {
        removeClass(this.viewsList[this.activeView], CSS_CLASSES.SLIDE_UP);
    } 
  }
}

export let ui = new Ui();
