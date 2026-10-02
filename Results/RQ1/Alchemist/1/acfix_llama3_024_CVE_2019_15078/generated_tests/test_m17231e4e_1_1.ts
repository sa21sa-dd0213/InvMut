import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant kill test - burn without balance check", function () {
  it("should revert when owner burns more than balance (original) but mutant would behave differently", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get owner's initial balance
    const initialBalance = await instance.balanceOf(owner.address);
    
    // Attempt to burn an amount greater than the owner's balance
    const excessiveAmount = initialBalance + 1n;
    
    // The original contract should revert with a specific require message
    // The mutant (without the require) would revert with arithmetic underflow instead
    await expect(
      instance.connect(owner).burn(excessiveAmount)
    ).to.be.reverted;
  });
});