# Football Analytics

Football analytics (xG model, score predictions) using data from [statsbomb](https://github.com/statsbomb/open-data).

## Setup

Ensure you have Python 3.10 installed. You can install it using [pyenv](https://github.com/pyenv/pyenv).

```bash
make install
```

## Usage

TODO!

## xG model

Our xG model uses the following features:

- Shot distance
- Shot angle
- Shot type
- Player skill
- Opponent goalie skill

We use a multi-layer perceptron (MLP) model to predict the probability of a shot being successful.

## Score predictions

TODO!
