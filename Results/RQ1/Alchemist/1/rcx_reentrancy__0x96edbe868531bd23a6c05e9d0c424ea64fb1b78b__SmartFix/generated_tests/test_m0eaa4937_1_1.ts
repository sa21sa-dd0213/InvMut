import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m0eaa4937 test", function () {
  it("should allow SetLogFile before initialization, but mutant always reverts", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy LogFile first
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy PENNY_BY_PENNY (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call SetLogFile before Initialized() - should succeed on original, fail on mutant
    await expect(
      instance.connect(owner).SetLogFile(await logFile.getAddress())
    ).to.not.be.reverted;

    // Now initialize the contract
    await instance.connect(owner).Initialized();

    // Verify the log file was set by making a deposit and checking the LogFile
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).Put(0, { value: depositAmount });

    // Check that a message was added to the LogFile history
    const history = await logFile.History(0);
    expect(history.Sender).to.equal(await addr1.getAddress());
    expect(history.Val).to.equal(depositAmount);
    expect(history.Data).to.equal("Put");
  });
});