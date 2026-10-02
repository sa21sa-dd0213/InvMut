import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - setCfg", function () {
  it("should revert when calling setCfg with a positive value on the mutant where require uses < instead of >", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DCF with required constructor argument (liquidityReceiveAddress)
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();
    
    // Set a caller (cfo) first since setCfg has onlyCaller modifier
    await instance.setCaller(owner.address);
    
    // Test with a positive value (e.g., 2)
    // Original: require(_deadCfg > 0) - passes with positive value
    // Mutant: require(_deadCfg < 0) - reverts with positive value
    await expect(
      instance.setCfg(2)
    ).to.be.reverted;
  });
});