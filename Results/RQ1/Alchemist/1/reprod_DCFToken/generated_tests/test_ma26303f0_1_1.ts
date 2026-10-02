import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant ma26303f0 by calling distributeToken() when distributeAddress is not set", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with a valid liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();
    
    // Set the caller (cfo) to addr1 so we can call distributeToken
    await instance.connect(owner).setCaller(addr1.address);
    
    // Ensure distributeAddress is NOT set (remains address(0))
    // Try to call distributeToken() - this should revert in original because
    // distributeAddress is not set, but mutant removes that check
    await expect(
      instance.connect(addr1).distributeToken()
    ).to.be.reverted;
  });
});