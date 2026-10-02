import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant md9825658 detection", function () {
  it("should revert when collecting before unlock time if balance conditions are met (detect || mutant)", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy MONEY_BOX (no constructor arguments)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy Log contract (needed for Put/Collect)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).SetMinSum(ethers.parseEther("1"));
    await instance.connect(owner).Initialized();

    // User deposits 2 ether (meets MinSum of 1)
    await instance.connect(user).Put(100, { value: ethers.parseEther("2") });

    // Get the unlock time set by Put
    const userAcc = await instance.Acc(user.address);
    const unlockTime = userAcc.unlockTime;

    // Fast forward to just before unlock time
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(unlockTime) - 1]);

    // Attempt to collect 1 ether before unlock time - should revert in original, succeed in mutant
    await expect(
      instance.connect(user).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});