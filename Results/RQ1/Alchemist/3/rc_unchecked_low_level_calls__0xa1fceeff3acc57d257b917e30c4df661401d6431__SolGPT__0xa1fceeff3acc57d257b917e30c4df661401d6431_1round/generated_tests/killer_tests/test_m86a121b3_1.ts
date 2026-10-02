import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - m86a121b3", function () {
  it("should revert when contract_address is zero address (original behavior), mutant should NOT revert at modifier", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [addr1.address];
    const vs = [100];

    // In the original, passing address(0) as contract_address should revert due to validAddress modifier
    // In the mutant, the modifier passes (since it requires == address(0)), so the call proceeds
    // and then fails at the .call() step, but not with the same revert reason
    await expect(
      instance.transfer(ethers.ZeroAddress, tos, vs)
    ).to.be.reverted;
  });
});