import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant ma918b807 - onlyOwner modifier removal", function () {
  it("should revert when non-owner calls transferOwnership on original, but not on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call transferOwnership from a non-owner address
    // On the original, this would revert due to the require statement.
    // On the mutant (where the require is removed), it will succeed.
    // The test expects revert, thus it will kill the mutant.
    await expect(
      instance.connect(addr1).transferOwnership(addr2.address)
    ).to.be.reverted;
  });
});