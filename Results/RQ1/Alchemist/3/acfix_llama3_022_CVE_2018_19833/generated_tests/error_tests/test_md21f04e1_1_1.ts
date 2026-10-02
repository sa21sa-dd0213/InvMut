import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - md21f04e1", function () {
  it("should revert when transferring more than balance (original) but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "Test", "TST");
    await instance.waitForDeployment();

    // Transfer all owner balance to addr1 first (so owner has 0 balance)
    const ownerBalance = await instance.balanceOf(owner.address);
    await instance.transfer(addr1.address, ownerBalance);

    // Now try to transfer from owner (0 balance) to addr1 - should revert in original
    await expect(
      instance.transfer(addr1.address, 1)
    ).to.be.reverted;
  });
});