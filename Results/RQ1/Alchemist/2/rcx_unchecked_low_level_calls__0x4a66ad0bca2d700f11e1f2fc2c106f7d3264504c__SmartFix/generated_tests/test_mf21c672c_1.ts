import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EBU mutant mf21c672c - detect >= change", function () {
  it("should kill mutant by using a v value where multiplication overflows and produces result >= 1e18", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the hardcoded from address from the contract
    const from = await instance.from();
    
    // Use a v value that causes overflow: 2^256 / 1e18 rounded up
    // This ensures (v * 1e18) / v >= 1e18 due to overflow wrapping
    const overflowValue = ethers.parseEther("1");
    const v = ethers.MaxUint256 / overflowValue + 1n;
    
    // Array with one recipient (any address)
    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [v];

    // The original requires (v[i] * 1e18) / v[i] == 1e18, which fails on overflow
    // The mutant requires >= 1e18, which passes due to overflow wrapping producing larger value
    await expect(
      instance.connect(owner).transfer(tos, values)
    ).to.be.reverted;
  });
});