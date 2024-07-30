# Local Modeler

Wouldn't it be great if you didn't need to own, manage, or keep track of participants' data when estimating models to answer your research questions? That is exactly what Local Modeler aims to achieve.

Local Modeler is based on [data donation](https://datadonation.eu) principles. However, Local Modeler takes it a step further by training models directly on the devices of participants and only sending the model parameters back to the researcher.

This approach offers several benefits:

1. Researchers do not need to manage participants' data.
2. This framework enables research on extremely sensitive topics where data collection by researchers is restricted.

The trade-off of this framework is that researchers never have access to the original data.

This repository contains a proof of concept and is notably built with:

* [Port](https://github.com/eyra/port)
* [Pyodide](https://pyodide.org/en/stable/index.html)


## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [License](#license)

## Introduction

## Features

## Installation

```bash
git clone https://github.com/trbknl/local-modeler.git
cd local-modeler
npm i
```

Make sure you have [Poetry](https://python-poetry.org/) installed.

Make sure you have a Redis database running, for example with Docker:

```bash
docker run --rm -p 0.0.0.0:6379:6379 redis:7
```

Start development server with 

```
npm run dev
```

## Usage

