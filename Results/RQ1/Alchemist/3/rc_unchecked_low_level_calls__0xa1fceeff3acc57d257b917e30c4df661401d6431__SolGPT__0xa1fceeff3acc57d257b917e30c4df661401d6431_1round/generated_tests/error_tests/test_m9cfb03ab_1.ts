import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant detection test", function () {
  it("should kill mutant m9cfb03ab by calling transfer with contract's own address", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const contractAddress = await instance.getAddress();

    // Create dummy recipient arrays - these won't matter as the call should revert
    const tos = [ethers.ZeroAddress];
    const vs = [100];

    // On original contract, calling transfer with contract's own address should revert
    // due to validAddress modifier. On mutant, it will proceed and likely fail differently
    // or succeed unexpectedly, thus killing the mutant.
    await expect(
      instance.transfer(contractAddress, tos, vs)
    ).to.be.reverted;
  });
});