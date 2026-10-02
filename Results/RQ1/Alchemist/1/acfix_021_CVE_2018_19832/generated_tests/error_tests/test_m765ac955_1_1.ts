import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m765ac955: transfer with standard 68-byte calldata should succeed on original but fail on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, distribute tokens to owner so they can transfer
    await instance.connect(owner).NETM();

    // Perform a standard transfer with exactly 68 bytes of calldata
    // This should succeed on the original contract but fail on the mutant
    // because mutant requires calldata.length >= 2*32*4 = 256 instead of 2*32+4 = 68
    const amount = ethers.parseEther("1");
    const tx = instance.connect(owner).transfer(addr1.address, amount);

    // The transfer should succeed - if it reverts, the mutant is killed
    await expect(tx).to.not.be.reverted;
  });
});