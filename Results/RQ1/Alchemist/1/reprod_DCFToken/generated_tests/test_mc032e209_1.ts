import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant mc032e209 - setCaller zero address validation", function () {
  it("should kill mutant by calling setCaller with a non-zero address and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DCF with required constructor argument (liquidityReceiveAddress)
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();
    
    // First set the caller (cfo) to a non-zero address
    // In original contract, require(_cfo != address(0)) allows this
    // In mutant, require(_cfo == address(0)) would revert
    await expect(
      instance.connect(owner).setCaller(addr1.address)
    ).to.not.be.reverted;
    
    // Verify the caller was set correctly
    // Note: cfo is private, but we can verify by calling a function restricted to onlyCaller
    // First set distribute address as cfo
    await instance.connect(owner).setCaller(addr1.address);
    
    // Now try calling a onlyCaller function from addr1 to confirm setCaller worked
    await instance.connect(addr1).setDistributeAddress(addr1.address);
    
    // Verify we can call distributeToken (onlyCaller) without revert
    await expect(
      instance.connect(addr1).distributeToken()
    ).to.not.be.reverted;
  });
});