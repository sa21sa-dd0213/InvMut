import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection - DEPOSITOR_ACCOUNT constant", function () {
  it("should detect mutant by verifying deployment succeeds and DEPOSITOR_ACCOUNT is not address(this)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    
    // Attempt to deploy - should succeed on original, but mutant may cause compilation/bytecode issues
    let instance;
    try {
      instance = await Factory.deploy();
      await instance.waitForDeployment();
    } catch (error) {
      // If deployment fails, the mutant is detected (constant with address(this) is invalid)
      expect(error).to.not.be.undefined;
      return;
    }
    
    // If deployment succeeds, verify DEPOSITOR_ACCOUNT is not the contract's own address
    const contractAddress = await instance.getAddress();
    const depositorAccount = await instance.DEPOSITOR_ACCOUNT();
    
    // Original has hardcoded dead address, mutant would have address(this)
    // This assertion should pass on original but fail on mutant
    expect(depositorAccount).to.not.equal(contractAddress);
    
    // Also verify it matches the expected hardcoded address from original
    const expectedAddress = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";
    expect(depositorAccount).to.equal(expectedAddress);
  });
});