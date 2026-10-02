import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant m9cfb03ab test", function () {
  it("should revert when contract_address is zero address due to validAddress modifier", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [addr1.address];
    const vs = [100];

    // This call should revert on the original contract (due to validAddress modifier)
    // but the mutant removes the modifier, so it will not revert
    // We expect it to NOT revert on the mutant (kill condition)
    await expect(
      instance.transfer(ethers.ZeroAddress, tos, vs)
    ).to.not.be.reverted;
  });
});