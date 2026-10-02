import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - mde89a0c8", function () {
  it("should revert when transferring a non-zero amount due to mutated require statement", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TTK");
    await instance.waitForDeployment();

    // Attempt to transfer a non-zero amount from owner to addr1
    // Original: requires balanceOf[_to] + _value >= balanceOf[_to] (always true for non-zero _value)
    // Mutant:  requires balanceOf[_to] + _value == balanceOf[_to] (only true if _value == 0)
    await expect(
      instance.transfer(addr1.address, 100)
    ).to.be.reverted;
  });
});