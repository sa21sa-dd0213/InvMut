import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - block.prevrandao vs block.timestamp", function () {
  it("should kill mutant madf38510 by verifying that Collect uses block.timestamp, not block.prevrandao", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Set a future unlock time (e.g., 1 hour from now)
    const currentTime = (await ethers.provider.getBlock("latest"))!.timestamp;
    const futureUnlockTime = currentTime + 3600; // 1 hour in the future
    
    // Deposit funds with the future unlock time (owner calls Put)
    const depositAmount = ethers.parseEther("2");
    await instance.connect(owner).Put(futureUnlockTime, { value: depositAmount });
    
    // Verify MinSum is 1 ether (default) - our balance of 2 ether meets it
    expect(await instance.MinSum()).to.equal(ethers.parseEther("1"));
    
    // Attempt to collect 1 ether BEFORE unlock time - should fail regardless
    const collectAmount = ethers.parseEther("1");
    await expect(
      instance.connect(owner).Collect(collectAmount)
    ).to.be.reverted;
    
    // Now we need to fast-forward time past the unlock time
    await ethers.provider.send("evm_increaseTime", [3601]); // advance 1 hour + 1 second
    await ethers.provider.send("evm_mine", []);
    
    // Verify current time is now after unlock time
    const newTime = (await ethers.provider.getBlock("latest"))!.timestamp;
    expect(newTime).to.be.greaterThan(futureUnlockTime);
    
    // Now attempt to collect - on ORIGINAL this should succeed
    // On MUTANT (using block.prevrandao), it will revert because prevrandao is unlikely > unlockTime
    const tx = instance.connect(owner).Collect(collectAmount);
    
    // The mutant will revert, so we expect the transaction to succeed on original
    // If it reverts, the test fails (killing the mutant means it behaves differently)
    await expect(tx).to.not.be.reverted;
    
    // Verify balance decreased
    const holderInfo = await instance.Acc(owner.address);
    expect(holderInfo.balance).to.equal(ethers.parseEther("1")); // 2 - 1 = 1
  });
});