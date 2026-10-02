import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection - m435e5258", function () {
  it("should kill mutant by verifying owner is set correctly after deployment", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy with a specific non-zero owner address
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Verify owner was set correctly - this will fail on mutant where owner = address(0)
    expect(await instance.owner()).to.equal(owner.address);
  });
});