import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant m622a2908 test", function () {
  it("should revert when owner calls onlyOwner function after modifier change to !=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner should be able to call onlyOwner functions in original,
    // but mutant requires msg.sender != owner, so owner call reverts
    await expect(
      instance.connect(owner).transferOwnership(addr1.address)
    ).to.be.reverted;
  });
});