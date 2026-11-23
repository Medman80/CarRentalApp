# Cars Pod
A desktop application for managing car rental agencies, built with Electron, React, and SQLite.
Features
- Manage cars and customers.
- Create rental contracts and track their status.
- Record payments and review reports.
- Dashboard for monitoring rental activity.
- Multilingual interface (Arabic, French, and English).
- Backup and data recovery tools.
Requirements
- Node.js and npm.
- Windows for building the Windows version.
Development Setup
git clone https://github.com/Medman80/CarRentalApp.git
cd CarRentalApp
npm install
npm start


The npm start command launches the React interface and the Electron application together.
Build
To build the application for the current platform:
npm run build


To build the Windows version:
npm run build-win


The generated build files are saved in the dist/ directory, which is not included in the repository.
Useful Commands
Command	Description
npm start	Run the application in development mode
npm run electron-dev	Launch Electron with the development interface
npm run react-build	Build the React interface
npm run electron-build	Build the application for the current platform
npm run build-win	Build the Windows version
npm run react-test	Run React tests

Project Structure
- main.js and src/preload.js: Electron startup and communication with the interface.
- src/: React interface and car rental management components.
- src/database.js: Database operations.
- src/backupManager.js: Backup management.
- public/ and assets/: Static files and application icons.
