import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant detection - m80c01d95", function () {
  it("should detect mutant that logs msg.value+1 instead of msg.value", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy LogFile first (required by DEP_BANK constructor)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy DEP_BANK with LogFile address
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set up the contract (initialize and set min sum)
    await instance.connect(owner).SetMinSum(0);
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).Initialized();

    // Deposit exactly 1 ether
    const depositAmount = ethers.parseEther("1.0");
    const tx = await instance.connect(user).Deposit({ value: depositAmount });
    await tx.wait();

    // Read the last logged message from LogFile
    const historyLength = await logFile["History(uint256)"](0); // Get array length using getter
    // Actually use the length property - in newer ethers, it's accessed differently
    const length = await logFile["History(uint256)"](0).then(() => {
      // Fallback: use ethers to get array length
      return ethers.provider.getStorage(await logFile.getAddress(), 0);
    });
    
    // Better approach: get the last element by counting pushes
    const historyCount = await ethers.provider.getStorage(
      await logFile.getAddress(),
      0
    );
    const lastIndex = BigInt(historyCount) - 1n;
    
    // Access the last message using the public array getter
    const lastMessage = await logFile["History(uint256)"](lastIndex);
    const loggedVal = lastMessage.Val;

    // The mutant logs msg.value+1, so loggedVal will be 1 wei higher
    // Original would log exactly depositAmount
    expect(loggedVal).to.equal(depositAmount);
  });
});