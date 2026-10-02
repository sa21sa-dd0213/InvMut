import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant test - mc2b85eb5", function () {
  it("should revert when sending less than betLimit in wager() (original) but pass on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr1.address, betLimit);
    await instance.waitForDeployment();

    // First open the contract to the public
    await instance.connect(owner).OpenToThePublic();

    // Try to wager with less than betLimit - should revert on original contract
    const smallAmount = ethers.parseEther("0.5");
    await expect(
      instance.connect(addr1).wager({ value: smallAmount })
    ).to.be.reverted;
  });
});