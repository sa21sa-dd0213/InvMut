import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant kill test - onlyOwner modifier inverted (== changed to !=)", function () {
  it("should revert when owner calls a function with onlyOwner modifier (mutant blocks owner)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant's onlyOwner modifier requires msg.sender != owner,
    // so calling setOwner (which has onlyOwner modifier) from the owner should revert
    await expect(
      instance.connect(owner).setOwner(addr1.address)
    ).to.be.reverted;
  });
});