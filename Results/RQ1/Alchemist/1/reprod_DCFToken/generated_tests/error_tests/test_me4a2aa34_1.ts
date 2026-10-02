import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant me4a2aa34 - setCaller", function () {
  it("should detect mutant by verifying setCaller correctly sets the cfo address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const liquidityReceiveAddress = addr1.address;
    
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // Set addr1 as the cfo using setCaller (onlyOwner function)
    await instance.connect(owner).setCaller(addr1.address);

    // Now try to call a function restricted by onlyCaller modifier from addr1
    // In the original, this should succeed because addr1 is set as cfo
    // In the mutant, this should revert because cfo is set to contract address instead
    
    // First set a distribute address so distributeToken can work
    await instance.connect(addr1).setDistributeAddress(addr2.address);
    
    // Try to call distributeToken from addr1 (should succeed in original, fail in mutant)
    await expect(
      instance.connect(addr1).distributeToken()
    ).to.be.revertedWith("onlyCaller");
  });
});