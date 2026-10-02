import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant kill test (mb1449ed7)", function () {
  it("should revert when _tos array has exactly one element due to out-of-bounds access in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: create a single-element array and a mock token address
    const tokenAddress = addr1.address;
    const recipients = [owner.address]; // exactly one recipient
    const value = ethers.parseEther("1");

    // The mutant uses i <= _tos.length, so with one element it will try index 1
    // This should cause a revert due to out-of-bounds access
    await expect(
      instance.transfer(owner.address, tokenAddress, recipients, value)
    ).to.be.reverted;
  });
});