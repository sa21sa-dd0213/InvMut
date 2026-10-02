import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m2c935e1a by calling sendTo from owner and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner sends 1 ether to addr1 - should succeed on original, revert on mutant
    const tx = instance.connect(owner).sendTo(addr1.address, ethers.parseEther("1"));
    await expect(tx).to.not.be.reverted;
  });
});