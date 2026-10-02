import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m7a380cdf by verifying owner is set to the provided address, not zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial owner should be the deployer (owner)
    expect(await instance.owner()).to.equal(owner.address);

    // Transfer ownership to addr1
    await instance.connect(owner).transferOwnership(addr1.address);

    // Assert that owner is now addr1, not address(0)
    expect(await instance.owner()).to.equal(addr1.address);
  });
});