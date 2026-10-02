import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m5c6e085c", function () {
  it("should revert when _tos array is empty (length 0) for original, but pass for mutant", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the from address from the contract
    const from = await instance.from();

    // Call transfer with empty array - original should revert, mutant should not
    await expect(
      instance.connect(owner).transfer([], [])
    ).to.be.reverted;
  });
});