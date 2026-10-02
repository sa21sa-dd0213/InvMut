import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m3066fa16 by calling owned() from owner and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TT");
    await instance.waitForDeployment();

    // The owned() function is public and only has a require statement.
    // In the original, it passes when msg.sender == owner.
    // In the mutant, it reverts when msg.sender == owner (because != is used).
    // Calling from the owner should succeed on the original, but fail on the mutant.
    await expect(
      instance.connect(owner).owned()
    ).to.not.be.reverted;
  });
});