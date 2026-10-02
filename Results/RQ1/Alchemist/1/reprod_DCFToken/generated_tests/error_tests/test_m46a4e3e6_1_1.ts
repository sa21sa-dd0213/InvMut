import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m46a4e3e6 - setCfg with zero value", function () {
  it("should revert when setCfg is called with value 0 on original contract", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DCF with required constructor arguments
    const liquidityReceiveAddress = addr1.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();
    
    // First set the caller (cfo) to owner
    await instance.setCaller(owner.address);
    
    // Try to call setCfg with value 0 - this should revert in original
    // because require(_deadCfg > 0) fails, but in mutant require(_deadCfg >= 0) would pass
    await expect(
      instance.setCfg(0)
    ).to.be.reverted;
  });
});