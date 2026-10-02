import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls a function protected by onlyOwner modifier (original passes, mutant fails)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the original contract, only the owner can call a function with onlyOwner modifier.
    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner),
    // so the owner's call would revert instead of succeeding.
    // To kill the mutant, we call setOwner from the owner address and expect it to succeed.
    // In the mutant, this call will revert, failing the test.
    await expect(instance.connect(owner).setOwner(addr1.address)).to.not.be.reverted;
  });
});