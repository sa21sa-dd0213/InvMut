import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant m72696d25 - missing hasNoBalance check", function () {
  it("should revert when calling airDrop() twice from the same address (original contract enforces zero balance)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Bank contract first (needed by supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy (no constructor arguments)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First airdrop should succeed
    const tx1 = await instance.connect(addr1).airDrop();
    await tx1.wait();

    // Check balance is now 20
    expect(await instance.tokenBalance(addr1.address)).to.equal(20);

    // Second airdrop from same address should revert (original contract behavior)
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
  });
});