import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - m65e3cff5", function () {
  it("should revert when non-owner calls burn (onlyOwner modifier removed)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    
    // Deploy with initial supply of 1000 tokens (decimals = 0, so 1000 * 10^0 = 1000)
    const instance = await Factory.deploy(1000, "TestToken", "TST");
    await instance.waitForDeployment();
    
    // Give addr1 some tokens to burn by transferring from owner
    await instance.transfer(addr1.address, 100);
    
    // Attempt to burn from non-owner address - should revert in original, pass in mutant
    await expect(
      instance.connect(addr1).burn(50)
    ).to.be.reverted;
  });
});