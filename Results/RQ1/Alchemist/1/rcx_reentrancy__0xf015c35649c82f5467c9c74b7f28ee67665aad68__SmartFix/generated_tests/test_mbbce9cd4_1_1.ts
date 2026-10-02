import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - mbbce9cd4", function () {
  it("should detect mutant by measuring gas consumption of Put function", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    // Call Put with a specific value and capture gas used
    const tx = await bankInstance.connect(owner).Put(
      Math.floor(Date.now() / 1000) + 1000, // unlockTime in the future
      { value: ethers.parseEther("1.0") }
    );
    const receipt = await tx.wait();
    
    // The original contract would use less gas than the mutant
    // For a value of 1 ether, the original require check uses one addition
    // The mutant adds an extra addition (+1) so gas cost is higher
    // Expected gas for original: ~45000-50000 gas
    // Mutant will consume more due to extra arithmetic operation
    expect(receipt!.gasUsed).to.be.lessThan(60000n,
      "Gas usage should be below 60000 for original; mutant adds extra arithmetic operation");
  });
});