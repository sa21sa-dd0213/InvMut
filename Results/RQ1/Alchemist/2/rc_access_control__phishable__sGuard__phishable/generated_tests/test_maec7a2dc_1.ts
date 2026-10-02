import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant maec7a2dc detection", function () {
  it("should detect mutant that sets owner to address(0) instead of the provided address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    
    // Deploy with owner's address as constructor argument
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // On original: owner is set to owner.address, so this call succeeds
    // On mutant: owner is set to address(0), so require(msg.sender == owner) fails
    await expect(
      instance.connect(owner).withdrawAll(addr1.address)
    ).to.not.be.reverted;
  });
});