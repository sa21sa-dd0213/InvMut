import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m700a56f4 test", function () {
  it("should detect mutant that uses < instead of > in Put lock time update", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await (await instance.connect(owner).SetMinSum(ethers.parseEther("0.1"))).wait();
    await (await instance.connect(owner).SetLogFile(await owner.getAddress())).wait();
    await (await instance.connect(owner).Initialized()).wait();

    // First Put with a long lock time (1 hour)
    const longLock = 3600;
    await (await instance.connect(addr1).Put(longLock, { value: ethers.parseEther("1") })).wait();

    // Record the unlock time after first Put
    const holderAfterFirst = await instance.Acc(addr1.address);
    const firstUnlockTime = holderAfterFirst.unlockTime;

    // Second Put with a shorter lock time (1 second) - this should NOT reduce unlockTime in original
    const shortLock = 1;
    await (await instance.connect(addr1).Put(shortLock, { value: ethers.parseEther("0.1") })).wait();

    // Check unlock time after second Put
    const holderAfterSecond = await instance.Acc(addr1.address);
    const secondUnlockTime = holderAfterSecond.unlockTime;

    // In original contract, unlockTime should still be the longer one (unchanged)
    // In mutant, unlockTime would be reduced to the shorter time
    expect(secondUnlockTime).to.equal(firstUnlockTime);

    // Now try to collect before the long lock expires but after the short lock would have expired
    // Advance time by 2 seconds (past short lock but well before long lock)
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect - should revert on original because unlockTime hasn't been reached
    // On mutant it would succeed because unlockTime was incorrectly reduced
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("0.1"))
    ).to.be.reverted;
  });
});