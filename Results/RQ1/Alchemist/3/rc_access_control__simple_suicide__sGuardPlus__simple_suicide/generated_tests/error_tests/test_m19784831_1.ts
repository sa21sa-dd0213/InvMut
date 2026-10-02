import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleSuicide mutant test - m19784831", function () {
  it("should revert when non-owner calls sudicideAnyone due to onlyOwner modifier", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleSuicide");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call sudicideAnyone from a non-owner address
    await expect(
      instance.connect(nonOwner).sudicideAnyone()
    ).to.be.revertedWith("");

    // Verify the contract still exists (selfdestruct did not happen)
    expect(await ethers.provider.getCode(await instance.getAddress())).to.not.equal("0x");
  });
});