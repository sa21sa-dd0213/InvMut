import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - Mutant m3709eb8b test", function () {
  it("should revert when non-owner calls withdrawForeignTokens", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call withdrawForeignTokens from a non-owner address
    // The original contract has onlyOwner modifier, so this should revert
    // The mutant removes the modifier, so it would not revert (killing the mutant)
    await expect(
      instance.connect(addr1).withdrawForeignTokens("0x0000000000000000000000000000000000000001")
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});