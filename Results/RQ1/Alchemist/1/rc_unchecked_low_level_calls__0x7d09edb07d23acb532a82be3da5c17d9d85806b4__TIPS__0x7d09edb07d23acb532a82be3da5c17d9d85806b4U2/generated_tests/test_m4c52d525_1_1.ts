import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - onlyOwner modifier", function () {
  it("should revert when owner calls onlyOwner function on mutated contract", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr1.address, ethers.parseEther("1"));
    await instance.waitForDeployment();

    // Owner tries to call OpenToThePublic() which uses onlyOwner modifier
    // In the original, this should succeed; in the mutant (== changed to !=), it should revert
    await expect(
      instance.connect(owner).OpenToThePublic()
    ).to.be.reverted;
  });
});