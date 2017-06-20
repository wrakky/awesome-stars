import jQuery from 'jquery';

import anime from 'animejs';
import { Client } from 'chomex';
import numeral from 'numeral';

import { ERROR, TextColor } from './constants';

const messageClient = new Client(chrome.runtime);

function colorFromPercentage(percentage) {
  switch (true) {
    case (percentage < 2):
      return TextColor.RED;
    case (percentage >= 2 && percentage < 48):
      return TextColor.ORANGE;
    default:
      return TextColor.GREEN;
  }
}

async function fetchAccessTokenAsync(elems) {
  const { data } = await messageClient.message('/access-token/get');

  if (data === ERROR) {
    return elems.ACCESS_TOKEN_FIELD.val('N/A');
  }

  return elems.ACCESS_TOKEN_FIELD.val(data);
}

async function fetchRateLimitAsync(elems) {
  const $accessTokenSaveButton = elems.ACCESS_TOKEN_SAVE_BUTTON;
  const $progressBarFilled = elems.PROGRESS_BAR_FILLED;
  $accessTokenSaveButton.attr('disabled', true);
  $progressBarFilled.css({ width: '0%' });

  const { data } = await messageClient.message('/rate-limit');

  if (data === ERROR) {
    elems.PROGRESS_BAR_TEXT.css({ color: colorFromPercentage(0) }).text('N/A');
    return false;
  }

  const { remaining, limit } = data;
  const formattedRateLimit = numeral(remaining).format('0,0');
  const percentage = limit > 0 ? parseInt((remaining / limit) * 100, 10) : 0;
  const finalbackgroundColor = colorFromPercentage(percentage);
  const textStyle = { color: finalbackgroundColor };

  $progressBarFilled.css({ background: colorFromPercentage(0) });

  // NOTE returns finished Promise of animation
  await anime({
    backgroundColor: finalbackgroundColor,
    duration: 750,
    easing: 'easeInOutQuad',
    targets: $progressBarFilled.get(0),
    width: `${percentage}%`,
    begin: () => elems.PROGRESS_BAR_TEXT.css(textStyle).text(formattedRateLimit),
  }).finished;

  return $accessTokenSaveButton.attr('disabled', false);
}

async function sendAccessTokenAsync(elems) {
  const $accessTokenSaveButton = elems.ACCESS_TOKEN_SAVE_BUTTON;
  const accessToken = elems.ACCESS_TOKEN_FIELD.val();
  const originLabel = $accessTokenSaveButton.text();

  $accessTokenSaveButton.text('saved!');

  await messageClient.message('/access-token/set', { accessToken });
  fetchAccessTokenAsync(elems);
  await fetchRateLimitAsync(elems);

  return $accessTokenSaveButton.text(originLabel);
}

jQuery(document).ready(() => {
  const ELEMENTS = {
    ACCESS_TOKEN_FIELD: jQuery('#access-token-field'),
    ACCESS_TOKEN_SAVE_BUTTON: jQuery('#access-token-save-button'),
    PROGRESS_BAR_FILLED: jQuery('.progress-bar-filled'),
    PROGRESS_BAR_TEXT: jQuery('.progress-bar-text'),
  };

  ELEMENTS.ACCESS_TOKEN_SAVE_BUTTON.click(() => sendAccessTokenAsync(ELEMENTS));

  fetchAccessTokenAsync(ELEMENTS);
  fetchRateLimitAsync(ELEMENTS);
});
