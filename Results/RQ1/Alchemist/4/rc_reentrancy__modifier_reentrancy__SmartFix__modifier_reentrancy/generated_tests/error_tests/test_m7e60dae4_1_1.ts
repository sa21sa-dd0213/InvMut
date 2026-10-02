import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test - m7e60dae4", function () {
  it("should revert when calling airDrop from an address with non-zero balance (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Bank contract first (required by supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: addr1 has zero balance, should succeed
    await instance.connect(addr1).airDrop();

    // Verify balance is now 20
    expect(await instance.tokenBalance(addr1.address)).to.equal(20);

    // Second call: addr1 now has non-zero balance (20)
    // In original: should revert because balance != 0
    // In mutant: would succeed because mutant requires balance != 0
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
  });
});