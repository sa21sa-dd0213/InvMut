import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m435e5258 test", function () {
  it("should kill the mutant by verifying owner is set correctly", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract with the owner as the deployer
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Verify that the owner is set to the expected address (not address(0))
    const storedOwner = await instance.owner();
    expect(storedOwner).to.equal(owner.address);

    // Attempt to withdrawAll from the owner address - this should succeed on original
    // but fail on mutant because owner is address(0)
    await expect(
      instance.connect(owner).withdrawAll(addr1.address)
    ).to.not.be.reverted;
  });
});