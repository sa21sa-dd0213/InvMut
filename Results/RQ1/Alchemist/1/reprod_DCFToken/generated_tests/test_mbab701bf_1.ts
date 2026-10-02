import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant mbab701bf - setWhite access control", function () {
  it("should revert when unauthorized address calls setWhite on original, but succeed on mutant", async function () {
    const [owner, unauthorized, addr1] = await ethers.getSigners();
    
    // Deploy DCF with required constructor argument (liquidityReceiveAddress)
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Set the cfo to owner for proper access control
    await instance.connect(owner).setCaller(owner.address);
    
    // Attempt to call setWhite from unauthorized address
    // The original contract has onlyCaller modifier, so it should revert
    // The mutant removes onlyCaller, so it should succeed
    await expect(
      instance.connect(unauthorized).setWhite(addr1.address, true)
    ).to.be.revertedWith("onlyCaller");
  });
});