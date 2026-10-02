import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when v[i] causes overflow in multiplication (mutant mbdac3c09)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // This value when multiplied by 1e18 will overflow uint256
    // 2^256 / 1e18 ≈ 1.1579e59, so any value > 1.1579e59 will overflow
    const overflowValue = ethers.parseEther("115792089237316195423570985008687907853269984665640564039457.584007913129639936");
    // Use a value slightly larger than max possible to ensure overflow
    const overflowTrigger = overflowValue + 1n;

    const addresses = [owner.address];
    const values = [overflowTrigger];

    // Original contract would revert at the require statement
    // Mutant would proceed and potentially cause unexpected behavior
    await expect(
      instance.transfer(addresses, values)
    ).to.be.reverted;
  });
});