# Lock In-inator

A distraction blocker for macOS and Linux that allows users to block chosen domains.

<div align="center">
<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/170449321/591998299-3b12d999-de1b-47a1-880a-5e8cce9a9a92.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20260513%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260513T183559Z&X-Amz-Expires=300&X-Amz-Signature=dd52475b07307860f7e1a52341b48b762268e042a1b4b938991fd4a381f54088&X-Amz-SignedHeaders=host&response-content-type=image%2Fpng" width="66%"/>
</div>

### Supported platforms

**Supported:** macOS, Linux

**Not Supported:** Windows

## Setup

Make sure you have the latest version of **Node.js** installed

Clone the git repository on your computer:

```bash
git clone https://github.com/illtrythisout/lock-in-inator.git
```

Navigate to the directory and run:

```bash
npm install
```

### Set up a terminal shortcut to run

Run the following in the project directory:

```bash
chmod +x index.js
```

Then **replace the path to your correct path** and run:

```bash
sudo ln -s /absolute/path/to/your/project/index.js /usr/local/bin/lock-in
```

**Example:**

```bash
sudo ln -s /Users/john/Documents/lock-in-inator/index.js /usr/local/bin/lock-in
```

## How to run

Run the following anywhere:

```bash
sudo lock-in
```

**Or the following if the shortcut is not setup:**

Run the following in the project directory:

```bash
sudo node index.js
```

## Limitations

This script blocks domains by rerouting them to 127.0.0.1 (localhost). This means that the tool can only block **entire domains** and it is **not** possible to block specific paths like **instagram.com/reels** or **youtube.com/shorts**

## Safety

A backup of `/etc/hosts` is created before every run

To restore to the last backup run:

```bash
sudo cp /etc/hosts.backup /etc/hosts
```

To remove the changes made by this program, edit the contents of `/etc/hosts` and remove the section:

```txt
# BEGIN Distraction Blocker
your blocked links will be here
# END Distraction Blocker
```
