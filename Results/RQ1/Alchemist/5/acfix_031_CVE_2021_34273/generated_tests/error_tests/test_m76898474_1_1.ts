import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant m76898474 - onlyOwner modifier", function () {
  it("should kill mutant by calling transferOwnership from owner and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // On the original contract, owner can call transferOwnership successfully
    // On the mutant (require(msg.sender != owner)), owner call will revert
    await expect(
      instance.connect(owner).transferOwnership(addr1.address)
    ).to.not.be.reverted;
  });
});