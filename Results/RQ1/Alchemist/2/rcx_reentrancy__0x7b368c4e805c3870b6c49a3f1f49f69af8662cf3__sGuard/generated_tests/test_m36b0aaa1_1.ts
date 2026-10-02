import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m36b0aaa1 - kill test", function () {
  it("should revert when balance is below MinSum but unlock time has passed (original requires all conditions, mutant allows with ||)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Add funds to addr1's account via Put
    const depositAmount = ethers.parseEther("0.5"); // Less than MinSum (1 ether)
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Wait for block timestamp to advance past unlockTime (unlockTime was set to block.timestamp since we passed 0)
    await ethers.provider.send("evm_increaseTime", [3600]); // Advance 1 hour
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to collect amount equal to balance (0.5 ether) - should revert in original
    // because balance (0.5) < MinSum (1.0), even though block.timestamp > unlockTime
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});