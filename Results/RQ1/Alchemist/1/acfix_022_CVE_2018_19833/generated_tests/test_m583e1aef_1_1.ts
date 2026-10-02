import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m583e1aef test", function () {
  it("should revert when transferring more tokens than sender balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TST");
    await instance.waitForDeployment();

    // Owner has all initialSupply tokens
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.equal(initialSupply);

    // Attempt to transfer more than owner's balance (should revert)
    const excessiveAmount = initialSupply + 1n;
    await expect(
      instance.connect(owner).transfer(addr1.address, excessiveAmount)
    ).to.be.reverted;
  });
});