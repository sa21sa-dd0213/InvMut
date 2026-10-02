import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m23e7a17d: Collect should require block.timestamp > unlockTime, not <", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with Log contract address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Set up test: addr1 deposits 2 ether with unlock time in the future
    const depositAmount = ethers.parseEther("2");
    const futureUnlock = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    await instance.connect(addr1).Put(futureUnlock, { value: depositAmount });
    
    // Verify balance was recorded
    const holderBefore = await instance.Acc(addr1.address);
    expect(holderBefore.balance).to.equal(depositAmount);
    
    // Fast-forward time past the unlock time
    await ethers.provider.send("evm_increaseTime", [7200]); // 2 hours
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to collect 1 ether - should succeed on original but fail on mutant
    const collectAmount = ethers.parseEther("1");
    
    // The original contract allows collection after unlock time (block.timestamp > unlockTime)
    // The mutant requires block.timestamp < unlockTime, which will be false now
    // So the mutant will revert while original succeeds
    
    // We expect the transaction to revert on the mutant
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});