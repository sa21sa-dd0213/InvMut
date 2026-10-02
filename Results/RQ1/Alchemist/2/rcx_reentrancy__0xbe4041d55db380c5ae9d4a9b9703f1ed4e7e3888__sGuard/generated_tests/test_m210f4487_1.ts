import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m210f4487 test", function () {
  it("should detect mutant by verifying Collect succeeds only after unlockTime has passed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 so balance >= MinSum always passes
    await instance.SetMinSum(0);

    // Set LogFile (needed for Collect to work, but can be any address since we don't check return)
    await instance.SetLogFile(owner.address);

    // Initialize the contract
    await instance.Initialized();

    // Deposit 1 ether with a lock time of 1 hour (3600 seconds)
    const depositAmount = ethers.parseEther("1");
    const lockTime = 3600;
    await instance.connect(addr1).Put(lockTime, { value: depositAmount });

    // Wait until block.timestamp exceeds the unlockTime
    // Get the unlockTime set for addr1
    const acc = await instance.Acc(addr1.address);
    const unlockTime = acc.unlockTime;

    // Mine blocks to advance time past unlockTime
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(unlockTime) + 1]);
    await ethers.provider.send("evm_mine");

    // Now try to collect - should succeed on original, fail on mutant
    const collectAmount = ethers.parseEther("0.5");
    await expect(instance.connect(addr1).Collect(collectAmount)).to.not.be.reverted;

    // Verify balance decreased
    const accAfter = await instance.Acc(addr1.address);
    expect(accAfter.balance).to.equal(ethers.parseEther("0.5"));
  });
});