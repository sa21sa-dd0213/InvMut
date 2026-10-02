import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned mutant test - m836a3848", function () {
  it("should revert when non-owner calls setOwner after mutation removes require check", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call setOwner from a non-owner address
    // In the original contract this would revert due to the onlyOwner modifier
    // In the mutant, the require is removed so it would succeed
    await expect(
      instance.connect(nonOwner).setOwner(nonOwner.address)
    ).to.be.reverted;
  });
});