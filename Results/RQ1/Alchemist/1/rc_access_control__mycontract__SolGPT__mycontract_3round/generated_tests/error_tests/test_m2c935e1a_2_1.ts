import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should succeed when non-owner calls sendTo on mutant, but revert on original", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // On the mutant, require(msg.sender != owner) allows non-owner to call successfully
    // On the original, require(msg.sender == owner) would revert for non-owner
    // This test passes on the mutant (non-owner succeeds) but fails on the original (non-owner reverts)
    await expect(
      instance.connect(addr1).sendTo(addr2.address, ethers.parseEther("1"))
    ).to.not.be.reverted;
  });
});