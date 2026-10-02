import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m1ce04c21 - constructor access control", function () {
  it("should revert when owner deploys the contract due to mutated require(msg.sender != owner)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    
    // The mutant constructor has require(msg.sender != owner) instead of require(msg.sender == owner)
    // When deploying from the owner address, the condition evaluates to false (owner != owner is false)
    // causing a revert, while the original contract would succeed.
    await expect(
      Factory.connect(owner).deploy()
    ).to.be.reverted;
  });
});