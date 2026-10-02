import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned mutant kill test - m1b16d27a", function () {
  it("should kill the mutant by verifying onlyOwner modifier allows owner to call setOwner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original onlyOwner modifier requires msg.sender == owner
    // The mutant changes it to msg.sender != owner, which would revert for the owner
    // Calling setOwner from the owner should succeed in the original, but revert in the mutant
    await expect(instance.connect(owner).setOwner(addr1.address)).to.not.be.reverted;
  });
});