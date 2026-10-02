import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant test - hasNoBalance removal", function () {
  it("should revert on second airdrop call from same address when hasNoBalance modifier is present", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Bank contract first (needed for supportsToken check)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy - no constructor arguments needed
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First airdrop call from addr1 should succeed
    const tx1 = await instance.connect(addr1).airDrop();
    await tx1.wait();

    // Verify balance is now 20
    expect(await instance.tokenBalance(addr1.address)).to.equal(20);

    // Second airdrop call from the same address should revert
    // due to hasNoBalance modifier checking balance != 0
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
  });
});