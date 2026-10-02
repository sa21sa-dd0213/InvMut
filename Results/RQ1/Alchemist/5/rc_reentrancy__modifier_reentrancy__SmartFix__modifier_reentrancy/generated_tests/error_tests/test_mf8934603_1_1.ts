import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test - mf8934603", function () {
  it("should revert when supportsToken() returns a smaller hash (original == behavior) but mutant <= allows it", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the ModifierEntrancy contract (no constructor arguments needed)
    const ModifierEntrancy = await ethers.getContractFactory("ModifierEntrancy");
    const modEntrancy = await ModifierEntrancy.deploy();
    await modEntrancy.waitForDeployment();

    // Deploy an attacker contract that acts as a Bank and returns a smaller hash
    const AttackerContract = await ethers.getContractFactory(
      "contracts/AttackerBank.sol:AttackerBank"
    );
    const attackerContract = await AttackerContract.deploy(modEntrancy.target);
    await attackerContract.waitForDeployment();

    // Verify that the attacker contract returns a smaller hash
    const expectedHash = ethers.keccak256(ethers.toUtf8Bytes("Nu Token"));
    const smallerHash = ethers.keccak256(ethers.toUtf8Bytes("A Token"));
    expect(smallerHash < expectedHash).to.be.true;

    // Test the original behavior (should revert because hash doesn't match)
    // For mutant: this should pass (incorrectly) but we're testing the original
    await expect(
      attackerContract.attack()
    ).to.be.reverted;

    // After the reverted call, check that attackerContract's token balance is still 0
    const balance = await modEntrancy.tokenBalance(attackerContract.target);
    expect(balance).to.equal(0);
  });
});