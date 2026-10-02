import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection - m12dbf5b3", function () {
  it("should detect mutant that sets owner to address(0) instead of the constructor argument", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    
    // Deploy with a non-zero owner address (addr1)
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();

    // Verify the owner is correctly set to addr1 in the original contract
    // In the mutant, owner will be address(0), so calling withdrawAll from addr1 will revert
    await expect(
      instance.connect(addr1).withdrawAll(addr1.address)
    ).to.not.be.reverted;
  });
});