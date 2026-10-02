import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - m9e9fd625", function () {
  it("should revert when burning with balance less than burn amount (detects mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = ethers.parseUnits("1000", 0);
    const name = "TestToken";
    const symbol = "TST";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, name, symbol);
    await instance.waitForDeployment();

    // Owner has all 1000 tokens
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.equal(initialSupply);

    // Burn 100 tokens - should succeed on original (balance >= 100) but revert on mutant (balance <= 100 is false)
    await expect(
      instance.connect(owner).burn(ethers.parseUnits("100", 0))
    ).to.not.be.reverted;

    // Verify balance decreased correctly (if burn succeeded)
    const newBalance = await instance.balanceOf(owner.address);
    expect(newBalance).to.equal(initialSupply - ethers.parseUnits("100", 0));
  });
});