import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-admin tries to setOwner on original, but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not the admin (admin is msg.sender during deploy = owner)
    // On the original contract, this should revert with the onlyAdmin modifier
    await expect(
      instance.connect(addr1).setOwner(addr2.address)
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});