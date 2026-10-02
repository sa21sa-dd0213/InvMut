import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m8dfbb895 test", function () {
  it("should detect mutant that changed >= to > in Collect condition", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (MONEY_BOX requires Log address)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy MONEY_BOX
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).Initialized();

    // Set MinSum to 1 ether
    await instance.connect(owner).SetMinSum(ethers.parseEther("1"));

    // Set LogFile
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());

    // User deposits exactly 1 ether (balance == MinSum)
    const depositAmount = ethers.parseEther("1");
    await instance.connect(user).Put(0, { value: depositAmount });

    // Advance time past unlockTime (unlockTime was set to block.timestamp + 0 = block.timestamp)
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);

    // User tries to collect exactly 1 ether (balance == MinSum)
    // In original: acc.balance >= MinSum (1 >= 1) is true -> should succeed
    // In mutant: acc.balance > MinSum (1 > 1) is false -> should revert
    const collectAmount = ethers.parseEther("1");

    // The test expects success (original behavior), but mutant will revert
    // So we expect a revert to detect the mutant
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});