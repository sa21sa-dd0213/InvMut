import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection", function () {
  it("should revert on second airdrop call for same address due to hasNoBalance modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First airdrop call - should succeed for address with zero balance
    await expect(instance.connect(addr1).airDrop()).to.not.be.reverted;

    // Second airdrop call from same address - should revert due to hasNoBalance modifier
    // Original contract reverts; mutant allows it
    await expect(instance.connect(addr1).airDrop()).to.be.reverted;
  });
});