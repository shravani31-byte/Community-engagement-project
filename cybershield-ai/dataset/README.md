# SMS dataset

The training script uses the **SMS Spam Collection** maintained by the UCI Machine Learning Repository. It contains SMS messages labeled `spam` or `ham` and is intended for research and learning.

- Dataset page: https://archive.ics.uci.edu/dataset/228/sms+spam+collection
- The script downloads the official ZIP archive from UCI the first time it runs and extracts only `SMSSpamCollection` into this folder.
- To prepare it yourself, download the ZIP from the dataset page, extract the tab-separated `SMSSpamCollection` file here, then run `python train_model.py` from the project directory.
- You can also train from another copy of the extracted file with `python train_model.py --dataset path\to\SMSSpamCollection`.

The downloaded data file is intentionally not committed to the source tree. Check the UCI dataset page for current terms of use and citation guidance.