import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy - Kill mutant mbad7758a (supportsToken modifier removed)", function () {
  let instance: any;
  let bank: any;
  let attacker: any;

  beforeEach(async function () {
    const [owner, addr1] = await ethers.getSigners();
    attacker = addr1;

    // Deploy Bank contract
    const BankFactory = await ethers.getContractFactory("Bank");
    bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    instance = await Factory.deploy();
    await instance.waitForDeployment();
  });

  it("should revert when called from an EOA (non-Bank contract) on original, but should succeed on mutant due to missing supportsToken check", async function () {
    // Try to call airDrop from an externally owned account (not a Bank contract)
    // The original contract would revert because msg.sender is not a Bank contract
    // The mutant (with supportsToken modifier removed) would not revert
    await expect(
      instance.connect(attacker).airDrop()
    ).to.be.reverted;
  });
});