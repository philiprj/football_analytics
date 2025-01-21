# Football Analytics

Football analytics (xG model, score predictions) using data from [statsbomb](https://github.com/statsbomb/open-data).

## Setup

Ensure you have Python 3.10 installed. You can install it using [pyenv](https://github.com/pyenv/pyenv).

```bash
make install
```

## xG model

Our xG model uses the following features:

![SHAP summary plot](notebooks/shap_summary_plot.png)

We use a multi-layer perceptron (MLP) model to predict the probability of a shot being successful.

## Score predictions

We run a score prediction model using the xG model as the base model, by summing the xG of all shots for each team. Using this approach we calculate the final score of the champions league final between AC Milan and Liverpool.

AC Milan: 2.75 xG, Liverpool: 1.41 xG

## Model calibration

We use the [CalibratedClassifierCV](https://scikit-learn.org/stable/modules/calibration.html#calibration) class from scikit-learn to calibrate our model. In the end our initial model is highly calibrated already.
