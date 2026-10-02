import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant m16a8f199 detection test", function () {
  it("should detect the off-by-one error in Log.AddMessage for Deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy LogFile contract first (no constructor arguments)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy DEP_BANK (no constructor arguments)
    const DEP_BANKFactory = await ethers.getContractFactory("DEP_BANK");
    const depBank = await DEP_BANKFactory.deploy();
    await depBank.waitForDeployment();

    // Set the log file address in DEP_BANK
    await depBank.connect(owner).SetLogFile(await logFile.getAddress());

    // Initialize the contract
    await depBank.connect(owner).Initialized();

    // Deposit exactly 1 ether from addr1
    const depositAmount = ethers.parseEther("1");
    await depBank.connect(addr1).Deposit({ value: depositAmount });

    // Check the recorded value in the LogFile's History
    const historyLength = await logFile["History(uint256)"](0).then(() => 1).catch(() => 0);
    // Actually we need to get length via the auto-generated getter
    const length = await logFile["getHistoryLength"]();
    // But there is no such getter, so we use the array length property
    const historyLength2 = await ethers.provider.getStorage(
      await logFile.getAddress(),
      0
    );
    // Simpler: just read the first element
    const lastMessage = await logFile["History(uint256)"](0);
    
    expect(lastMessage.Val).to.equal(depositAmount);
  });
});