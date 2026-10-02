import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - m7f172e33", function () {
  it("should revert when sender balance equals transfer amount (mutant fails, original passes)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with 1000 tokens (decimals = 0, so supply = 1000)
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TST");
    await instance.waitForDeployment();
    
    // Transfer exactly the owner's full balance to addr1
    // In original: require(balanceOf[_from] >= _value) passes when equal
    // In mutant: require(balanceOf[_from] > _value) fails when equal
    const ownerBalance = await instance.balanceOf(owner.address);
    
    // This transfer should succeed on original but revert on mutant
    await expect(
      instance.transfer(addr1.address, ownerBalance)
    ).to.be.reverted;
  });
});