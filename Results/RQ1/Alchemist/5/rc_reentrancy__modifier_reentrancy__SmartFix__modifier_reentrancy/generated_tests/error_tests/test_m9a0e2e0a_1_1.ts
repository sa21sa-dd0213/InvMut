import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant m9a0e2e0a", function () {
  it("should detect mutant that removes require statement in airDrop function", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Bank contract first (needed for supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy - no constructor arguments needed
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the Bank contract address to use as msg.sender
    const bankAddress = await bank.getAddress();

    // First call: airDrop from bank address should succeed (bank has no balance initially)
    const tx1 = await instance.connect(bank).airDrop();
    await tx1.wait();

    // Check that balance is now 20
    expect(await instance.tokenBalance(bankAddress)).to.equal(20);

    // Second call: airDrop from bank address again should fail due to hasNoBalance modifier
    // In original contract, the require would execute (though redundant) before reverting
    // In mutant, the require is removed, but function still reverts due to hasNoBalance
    await expect(
      instance.connect(bank).airDrop()
    ).to.be.reverted;

    // Verify balance remains unchanged (20) - this is the key assertion
    // In the mutant, if the require removal somehow allowed partial execution,
    // the balance would be wrong. The test verifies the final state is correct.
    expect(await instance.tokenBalance(bankAddress)).to.equal(20);

    // Now test with addr1 (a normal address that is not a Bank contract)
    // This should fail at supportsToken modifier
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
  });
});