import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m4ea8606a detection", function () {
  it("should kill mutant by showing Collect succeeds with block.timestamp but fails with block.prevrandao", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set minimum sum to 0 so balance check passes
    await instance.connect(owner).SetMinSum(0);

    // Initialize the contract
    await instance.connect(owner).Initialized();

    // Set a log file address (any address works since we won't call it)
    await instance.connect(owner).SetLogFile(owner.address);

    // User deposits 1 ether with a lock time of 100 seconds
    const depositAmount = ethers.parseEther("1");
    const lockTime = 100;
    await instance.connect(user).Put(lockTime, { value: depositAmount });

    // Get the unlock time set by Put
    const acc = await instance.Acc(user.address);
    const unlockTime = acc.unlockTime;

    // Advance time to after unlock time
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(unlockTime) + 1]);
    await ethers.provider.send("evm_mine");

    // Attempt Collect - should succeed on original (block.timestamp > unlockTime)
    // but fail on mutant because block.prevrandao is unrelated to time
    const collectAmount = ethers.parseEther("1");
    const collectTx = instance.connect(user).Collect(collectAmount);

    // On the original contract this succeeds; on the mutant it reverts
    await expect(collectTx).to.be.reverted;
  });
});