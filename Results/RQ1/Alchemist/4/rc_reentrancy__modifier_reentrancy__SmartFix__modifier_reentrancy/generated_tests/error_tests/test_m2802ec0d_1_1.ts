import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection", function () {
  it("should detect mutation where + is replaced with - in require statement", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Bank contract (needed for supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy contract
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const modEntrancy = await ModifierEntrancyFactory.deploy();
    await modEntrancy.waitForDeployment();

    // Call airDrop from addr1 (which has zero balance)
    // Original: require((0 + 20) >= 0) passes
    // Mutant: require((0 - 20) >= 0) reverts due to underflow
    await expect(
      modEntrancy.connect(addr1).airDrop()
    ).to.not.be.reverted;

    // Verify the balance was increased to 20
    const balance = await modEntrancy.tokenBalance(addr1.address);
    expect(balance).to.equal(20);
  });
});