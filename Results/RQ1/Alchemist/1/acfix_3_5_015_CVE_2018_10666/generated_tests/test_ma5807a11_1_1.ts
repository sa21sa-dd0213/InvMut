import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant ma5807a11 test", function () {
  it("should revert when non-owner calls a function with onlyOwner modifier", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Since the contract has no public function using onlyOwner modifier,
    // we test the onlyAdmin modifier on setOwner which is the only accessible function
    await expect(
      instance.connect(addr1).setOwner(addr2.address)
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});