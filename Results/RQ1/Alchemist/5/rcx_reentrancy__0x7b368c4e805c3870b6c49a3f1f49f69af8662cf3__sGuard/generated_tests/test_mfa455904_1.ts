import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant mfa455904 test", function () {
  it("should detect the < instead of > in Collect condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Set unlock time to current block timestamp + 100 seconds (future)
    const currentTime = await ethers.provider.getBlock("latest").then(b => b!.timestamp);
    const unlockTime = currentTime + 100;
    
    // Put some ether with future unlock time
    const depositAmount = ethers.parseEther("2.0");
    await instance.connect(addr1).Put(unlockTime, { value: depositAmount });
    
    // Wait until block timestamp exceeds unlock time
    await ethers.provider.send("evm_increaseTime", [120]); // increase by 120 seconds
    await ethers.provider.send("evm_mine", []);
    
    // Now try to collect after unlock time - should succeed in original but fail in mutant
    const collectAmount = ethers.parseEther("1.0");
    
    // The mutant uses < instead of >, so block.timestamp < acc.unlockTime is now false
    // (since we waited past unlock time), meaning the transaction should revert or do nothing
    const tx = instance.connect(addr1).Collect(collectAmount);
    
    // On the original contract this would succeed, on the mutant it should fail
    await expect(tx).to.be.reverted;
  });
});